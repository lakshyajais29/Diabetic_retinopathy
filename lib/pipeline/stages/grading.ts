import type { DRLevel, EngineKind, GradingResult, LesionAnalysis } from '../types';
import { DR_SCALE, REFERABLE_THRESHOLD } from '../constants';
import { toDataUrl } from '../../vision/raster';
import { callModel } from '../../mistral/client';
import { CLINICAL_SYSTEM, gradingPrompt } from '../../mistral/prompts';
import { gradingSchema, type GradingReview } from '../../mistral/schemas';

export interface GradingStageResult {
  result: GradingResult;
  /** Attention regions from the model, consumed by the explainability stage. */
  attentionRegions: GradingReview['attentionRegions'];
  keyEvidence: string[];
  degraded: boolean;
  degradedReason?: string;
}

/* ------------------------------------------------------------------ */
/* The transparent rule engine                                          */
/* ------------------------------------------------------------------ */

export interface RuleGrade {
  level: DRLevel;
  rationale: string[];
  triggeredRule: string;
}

/**
 * ICDR criteria applied literally to the lesion inventory.
 *
 * This engine exists so that there is always one path to the grade a human can
 * fully audit: no weights, no embeddings, just the published criteria and the
 * counts from stage 3.
 */
export function applyIcdrRules(lesions: LesionAnalysis): RuleGrade {
  const c = lesions.counts;
  const rationale: string[] = [];

  const nv = lesions.neovascularisation.suspected || c.neovascularisation > 0;
  if (nv) {
    rationale.push(
      `Neovascularisation reported (${lesions.neovascularisation.confidence}% confidence) — the defining feature of proliferative disease.`,
    );
    return {
      level: 4,
      rationale,
      triggeredRule: 'ICDR Level 4 — neovascularisation present',
    };
  }

  if (lesions.fourTwoOne.triggered) {
    rationale.push(lesions.fourTwoOne.explanation);
    return {
      level: 3,
      rationale,
      triggeredRule: 'ICDR Level 3 — a 4-2-1 severe-NPDR criterion is met',
    };
  }

  const beyondMa =
    c.haemorrhage + c.hard_exudate + c.soft_exudate + c.irma + c.venous_beading;

  if (beyondMa > 0) {
    rationale.push(
      `${beyondMa} lesion${beyondMa === 1 ? '' : 's'} beyond microaneurysms alone (haemorrhages ${c.haemorrhage}, hard exudates ${c.hard_exudate}, cotton-wool spots ${c.soft_exudate}, IRMA ${c.irma}, venous beading ${c.venous_beading}).`,
    );
    rationale.push('No 4-2-1 criterion met, so the grade stops short of severe NPDR.');
    return {
      level: 2,
      rationale,
      triggeredRule: 'ICDR Level 2 — more than microaneurysms, less than severe NPDR',
    };
  }

  if (c.microaneurysm > 0) {
    rationale.push(
      `${c.microaneurysm} microaneurysm${c.microaneurysm === 1 ? '' : 's'} and no other lesion class.`,
    );
    if (c.microaneurysm >= 15) {
      rationale.push(
        'Microaneurysm burden is high for mild disease; strict ICDR still grades microaneurysms-only as Level 1, but this warrants a shorter re-screening interval.',
      );
    }
    return { level: 1, rationale, triggeredRule: 'ICDR Level 1 — microaneurysms only' };
  }

  rationale.push('No microaneurysms, haemorrhages, exudates or vascular abnormalities identified.');
  return { level: 0, rationale, triggeredRule: 'ICDR Level 0 — no apparent retinopathy' };
}

/**
 * A soft distribution around a hard rule decision, for fusion.
 *
 * Decisiveness reflects how far the counts sit from the decision boundary that
 * produced the level — a single borderline lesion is not a confident Level 2.
 * Zero findings is treated as decisive in its own right: a clean retina is a
 * positive result, not an uncertain one, and the earlier version of this
 * function penalised exactly the confident-negative case.
 */
function ruleDistribution(level: DRLevel, lesions: LesionAnalysis): number[] {
  const c = lesions.counts;
  const total =
    c.microaneurysm + c.haemorrhage + c.hard_exudate + c.soft_exudate + c.irma + c.venous_beading;

  let decisiveness: number;
  if (level === 0) {
    decisiveness = 0.78;
  } else if (level === 1) {
    // One microaneurysm is a coin-toss against zero; twenty is not.
    decisiveness = Math.min(0.86, 0.56 + c.microaneurysm * 0.03);
  } else if (level === 4) {
    decisiveness = Math.min(0.88, 0.58 + lesions.neovascularisation.confidence / 250);
  } else {
    decisiveness = Math.min(0.88, 0.58 + total / 30);
  }

  const dist = [0, 0, 0, 0, 0];
  dist[level] = decisiveness;

  // Spill goes to the levels that actually exist. At the ends of the scale the
  // single neighbour receives the whole remainder — never twice over.
  const neighbours = [level - 1, level + 1].filter((l) => l >= 0 && l <= 4);
  const spill = (1 - decisiveness) / neighbours.length;
  for (const n of neighbours) dist[n] += spill;

  return normalise(dist);
}

function normalise(dist: number[]): number[] {
  const sum = dist.reduce((a, b) => a + Math.max(0, b), 0);
  if (sum <= 0) return [0.2, 0.2, 0.2, 0.2, 0.2];
  return dist.map((v) => Math.max(0, v) / sum);
}

function entropyOf(dist: number[]): number {
  let h = 0;
  for (const p of dist) if (p > 0) h -= p * Math.log(p);
  return h / Math.log(dist.length);
}

/* ------------------------------------------------------------------ */
/* Stage 4                                                              */
/* ------------------------------------------------------------------ */

export async function runGradingStage(
  workingBuffer: Buffer,
  lesions: LesionAnalysis,
  qualityScore: number,
  engine: EngineKind,
  onProgress: (message: string, pct: number) => void,
): Promise<GradingStageResult> {
  onProgress('Applying ICDR criteria to the lesion inventory', 22);
  const rule = applyIcdrRules(lesions);
  const ruleDist = ruleDistribution(rule.level, lesions);

  let modelLevel: DRLevel = rule.level;
  let modelDist = ruleDist;
  let modelRationale =
    'No independent model grade available — the grade rests entirely on the transparent rule engine.';
  let modelConfidence = 50;
  let attentionRegions: GradingReview['attentionRegions'] = [];
  let keyEvidence: string[] = [];
  let narrative = '';
  let degraded = false;
  let degradedReason: string | undefined;
  let modelUsed = false;

  if (engine === 'mistral') {
    onProgress('Vision model grading the image against the ICDR scale', 58);
    try {
      const review = await callModel(
        {
          label: 'Stage 4 severity grading',
          system: CLINICAL_SYSTEM,
          user: gradingPrompt({
            counts: lesions.counts,
            quadrantsWithRedLesions: Object.values(lesions.quadrantBurden).filter((v) => v > 0)
              .length,
            nvSuspected: lesions.neovascularisation.suspected,
            ruleLevel: rule.level,
            ruleRationale: rule.triggeredRule,
            qualityScore,
            corroboration: lesions.corroborationScore,
            lesionNarrative: lesions.narrative.slice(0, 600),
          }),
          image: await toDataUrl(workingBuffer),
          temperature: 0.12,
          maxTokens: 2200,
        },
        gradingSchema,
      );

      modelUsed = true;
      modelLevel = review.level as DRLevel;
      modelDist = normalise(review.distribution);
      modelRationale = review.rationale;
      modelConfidence = Math.round(review.confidence * 100);
      attentionRegions = review.attentionRegions;
      keyEvidence = review.keyEvidence;
      narrative = review.narrative;
    } catch (err) {
      degraded = true;
      degradedReason = err instanceof Error ? err.message : 'Grading model unavailable.';
    }
  }

  onProgress('Fusing rule-based and model grades', 84);

  /* Fusion. The model carries more weight because it sees the image; the rule
     engine carries enough weight to pull back an ungrounded model grade. */
  const modelWeight = modelUsed ? 0.6 : 0;
  const ruleWeight = 1 - modelWeight;
  const fused = normalise(
    ruleDist.map((r, i) => ruleWeight * r + modelWeight * modelDist[i]),
  );

  const level = fused.indexOf(Math.max(...fused)) as DRLevel;
  const sorted = [...fused].sort((a, b) => b - a);
  const margin = Math.round((sorted[0] - sorted[1]) * 1000) / 1000;
  const entropy = Math.round(entropyOf(fused) * 1000) / 1000;

  const delta = Math.abs(modelLevel - rule.level);
  const agrees = !modelUsed || delta <= 1;

  const spec = DR_SCALE[level];

  /* Safety widening: the displayed grade is the fused grade, but referral is
     triggered if EITHER method reaches the referable threshold, and urgency is
     escalated if either method reaches proliferative disease. Averaging must
     never be able to hide sight-threatening findings. */
  const referable =
    level >= REFERABLE_THRESHOLD ||
    rule.level >= REFERABLE_THRESHOLD ||
    (modelUsed && modelLevel >= REFERABLE_THRESHOLD);

  const eitherProliferative = rule.level === 4 || (modelUsed && modelLevel === 4);
  const urgency = eitherProliferative ? 'urgent' : spec.urgency;

  const result: GradingResult = {
    level,
    label: spec.short,
    distribution: fused.map((v) => Math.round(v * 1000) / 1000),
    referable,
    urgency,
    ruleBased: {
      level: rule.level,
      rationale: rule.rationale,
      triggeredRule: rule.triggeredRule,
    },
    modelBased: {
      level: modelLevel,
      distribution: modelDist.map((v) => Math.round(v * 1000) / 1000),
      rationale: modelRationale,
      confidence: modelConfidence,
    },
    agreement: {
      agrees,
      delta,
      note: !modelUsed
        ? 'Only the rule engine contributed to this grade; there is no second opinion to compare against.'
        : delta === 0
          ? 'The rule engine and the vision model assigned the same ICDR level independently.'
          : delta === 1
            ? 'The rule engine and the vision model differ by one level — within normal inter-grader variation.'
            : `The rule engine (Level ${rule.level}) and the vision model (Level ${modelLevel}) disagree by ${delta} levels. This disagreement is carried into the confidence stage and forces human review.`,
    },
    margin,
    entropy,
    narrative:
      narrative ||
      `${spec.clinical}. ${rule.rationale.join(' ')} Referable status: ${referable ? 'yes — an ophthalmologist should see this patient' : 'no — routine re-screening is appropriate'}.`,
  };

  onProgress('Severity grade assigned', 100);
  return { result, attentionRegions, keyEvidence, degraded, degradedReason };
}
