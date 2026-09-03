import type {
  ConfidenceAssessment,
  ConfidenceFactor,
  ExplainabilityResult,
  GradingResult,
  LesionAnalysis,
  QualityAssessment,
  StructureAnalysis,
  TriageDecision,
} from '../types';
import { CONFIDENCE_THRESHOLDS } from '../constants';

/**
 * Stage 6 — the safety mechanism.
 *
 * Entirely deterministic and entirely auditable. Two things happen here:
 *
 *  1. A single confidence number is fused from five independent signals, each
 *     of which is shown to the user with its own weight and contribution.
 *  2. A set of hard safety rules runs *after* the number. Any one of them can
 *     force a case to a human regardless of how confident the system is. A
 *     confidence score can be wrong; a rule that says "we disagreed with
 *     ourselves by two ICDR levels, send it to a doctor" cannot.
 */
export function runConfidenceStage(
  quality: QualityAssessment,
  structures: StructureAnalysis,
  lesions: LesionAnalysis,
  grading: GradingResult,
  explainability: ExplainabilityResult,
): ConfidenceAssessment {
  const marginScore = Math.round(Math.min(100, grading.margin * 165));
  const anatomyScore = Math.round(
    structures.modelAgreement.status === 'disagree'
      ? Math.min(40, structures.opticDisc.confidence)
      : structures.anatomyComplete
        ? Math.min(100, 0.6 * structures.opticDisc.confidence + 0.4 * structures.fovea.confidence + 25)
        : Math.min(55, structures.opticDisc.confidence),
  );

  const factors: ConfidenceFactor[] = [
    {
      key: 'quality',
      label: 'Image quality',
      value: quality.overallScore,
      weight: 0.26,
      note:
        quality.verdict === 'good'
          ? 'A clean field supports the findings at face value.'
          : 'Reduced image quality limits how much can be concluded from an absence of findings.',
    },
    {
      key: 'margin',
      label: 'Grade decisiveness',
      value: marginScore,
      weight: 0.22,
      note: `Top grade leads the runner-up by ${(grading.margin * 100).toFixed(1)} percentage points (normalised entropy ${grading.entropy.toFixed(2)}).`,
    },
    {
      key: 'overlap',
      label: 'Evidence alignment',
      // When the attention field and the lesion list come from the same image
      // analysis, the overlap score is not an independent check. It is scored
      // neutrally rather than being allowed to either flatter or damn the run.
      value: explainability.overlapAssessed ? explainability.evidenceOverlapScore : 60,
      weight: 0.2,
      note: explainability.overlapAssessed
        ? `Attention and detected evidence are ${explainability.overlapInterpretation}.`
        : 'Not independently assessed — no model-backed attention field was available, so this factor is scored neutrally.',
    },
    {
      key: 'corroboration',
      label: 'Detector corroboration',
      value: lesions.corroborationScore,
      weight: 0.18,
      note: 'Agreement between the vision model and independent classical detection.',
    },
    {
      key: 'anatomy',
      label: 'Anatomical certainty',
      value: anatomyScore,
      weight: 0.14,
      note:
        structures.modelAgreement.status === 'disagree'
          ? 'The two methods place the optic disc differently, so quadrant assignment is unreliable.'
          : 'Disc and macula are localised well enough to anchor lesion positions.',
    },
  ];

  const finalConfidence = Math.round(
    factors.reduce((sum, f) => sum + f.value * f.weight, 0),
  );

  const band: ConfidenceAssessment['band'] =
    finalConfidence >= CONFIDENCE_THRESHOLDS.highAbove
      ? 'high'
      : finalConfidence >= CONFIDENCE_THRESHOLDS.lowBelow
        ? 'moderate'
        : 'low';

  /* ---- Hard safety rules ---- */
  const safetyOverrides: string[] = [];
  let urgent = false;

  if (grading.level === 4 || lesions.neovascularisation.suspected) {
    urgent = true;
    safetyOverrides.push(
      'Proliferative disease or neovascularisation is suspected — every such case is escalated for urgent specialist review, irrespective of confidence.',
    );
  }
  if (grading.level === 3) {
    safetyOverrides.push(
      'Severe non-proliferative disease carries a high risk of progression and is always confirmed by a human grader.',
    );
  }
  if (grading.agreement.delta >= 2) {
    safetyOverrides.push(
      `The rule engine and the vision model disagree by ${grading.agreement.delta} ICDR levels. The system does not resolve its own contradictions.`,
    );
  }
  if (explainability.overlapAssessed && explainability.overlapInterpretation === 'misaligned') {
    safetyOverrides.push(
      'The grade was driven by image regions that contain no independently detected evidence.',
    );
  }
  if (quality.verdict === 'borderline' && quality.overallScore < 55) {
    safetyOverrides.push(
      `Image quality of ${quality.overallScore}/100 is too low for an absence of findings to be trusted.`,
    );
  }
  if (!structures.anatomyComplete) {
    safetyOverrides.push(
      'The anatomical frame of reference is incomplete, so lesion localisation and quadrant counts cannot be relied on.',
    );
  }
  if (lesions.corroborationScore < 40) {
    safetyOverrides.push(
      `Independent detectors agree on only ${lesions.corroborationScore}% of findings.`,
    );
  }

  const lowConfidence = finalConfidence < CONFIDENCE_THRESHOLDS.highAbove;

  const decision: TriageDecision = urgent
    ? 'urgent_referral'
    : safetyOverrides.length > 0 || lowConfidence
      ? 'doctor_review_required'
      : 'ai_recommendation';

  const reasons: string[] = [...safetyOverrides];
  if (lowConfidence && !urgent) {
    reasons.push(
      `Fused confidence of ${finalConfidence}/100 is below the ${CONFIDENCE_THRESHOLDS.highAbove} threshold required for an AI result to stand without a human re-read.`,
    );
  }
  if (decision === 'ai_recommendation') {
    reasons.push(
      `All five confidence signals are strong and no safety rule was triggered. The AI assessment stands as the screening result${grading.referable ? ', and the patient is referred on the strength of it' : ' and the patient continues on routine annual screening'}.`,
    );
  }

  return {
    finalConfidence,
    band,
    factors,
    decision,
    decisionLabel: decisionLabel(decision),
    reasons,
    safetyOverrides,
    narrative: buildNarrative(decision, finalConfidence, band, safetyOverrides.length),
  };
}

export function decisionLabel(decision: TriageDecision): string {
  switch (decision) {
    case 'urgent_referral':
      return 'Urgent Referral — Priority Specialist Review';
    case 'doctor_review_required':
      return 'Doctor Review Required';
    default:
      return 'AI Recommendation Stands';
  }
}

function buildNarrative(
  decision: TriageDecision,
  confidence: number,
  band: string,
  overrides: number,
): string {
  if (decision === 'urgent_referral') {
    return `Routed for urgent specialist review. Confidence is ${confidence}/100 (${band}), but confidence is not what decides this case: suspected sight-threatening disease is escalated to a human on every occasion.`;
  }
  if (decision === 'doctor_review_required') {
    return overrides > 0
      ? `Routed to a human grader. ${overrides} safety rule${overrides === 1 ? '' : 's'} fired, so this case is queued for an ophthalmologist re-read rather than reported as an AI result.`
      : `Routed to a human grader. Fused confidence of ${confidence}/100 (${band}) is below the threshold at which an AI result is allowed to stand alone.`;
  }
  return `The AI assessment stands as the screening result. Fused confidence is ${confidence}/100 (${band}), every contributing signal is strong, and no safety rule was triggered. A human grader is not required for this case, which is what frees specialist time for the cases that are.`;
}
