import type {
  ConfidenceAssessment,
  ExplainabilityResult,
  GradingResult,
  LesionAnalysis,
  PatientContext,
  QualityAssessment,
  ScreeningReport,
  StageTelemetry,
  StructureAnalysis,
} from '../types';
import { DR_SCALE, LESION_TAXONOMY } from '../constants';

/**
 * Stage 7 — assemble what the clinician actually reads.
 *
 * No new inference happens here. Every number on the report already exists
 * upstream; this stage's only job is to select, order and phrase them so that a
 * district ophthalmologist can act on the case in under a minute, and so that a
 * medical officer auditing the programme six months later can reconstruct
 * exactly how the system arrived at its answer.
 */
export function runReportStage(
  patient: PatientContext,
  quality: QualityAssessment,
  structures: StructureAnalysis,
  lesions: LesionAnalysis,
  grading: GradingResult,
  explainability: ExplainabilityResult,
  confidence: ConfidenceAssessment,
  telemetry: StageTelemetry[],
  runId: string,
): ScreeningReport {
  const spec = DR_SCALE[grading.level];
  const totalLesions = Object.values(lesions.counts).reduce((a, b) => a + b, 0);

  /* ---- Recommendation: the grade sets the clinical action, the triage
     decision sets who is accountable for it. ---- */
  const actions = [...spec.actions];
  if (confidence.decision === 'urgent_referral') {
    actions.unshift(
      'PRIORITY: flag this case to the district DR programme coordinator today — do not wait for the routine referral cycle.',
    );
  } else if (confidence.decision === 'doctor_review_required') {
    actions.unshift(
      'This screening result has NOT been auto-issued — the image is queued for an ophthalmologist re-read before the patient is advised.',
    );
  }
  if (quality.verdict === 'borderline') {
    actions.push(
      'Consider a repeat photograph at the next visit; this image was gradable but below optimal quality.',
    );
  }

  const headline =
    confidence.decision === 'urgent_referral'
      ? `Urgent referral — ${spec.clinical} suspected`
      : confidence.decision === 'doctor_review_required'
        ? `Pending specialist confirmation — provisional ${spec.clinical}`
        : spec.recommendation;

  /* ---- Key findings, ordered by what changes management ---- */
  const keyFindings: string[] = [];

  if (lesions.neovascularisation.suspected) {
    keyFindings.push(
      `Neovascularisation suspected (${lesions.neovascularisation.confidence}% confidence) — ${lesions.neovascularisation.rationale}`,
    );
  }

  const presentClasses = (Object.keys(lesions.counts) as Array<keyof typeof lesions.counts>)
    .filter((k) => lesions.counts[k] > 0)
    .sort((a, b) => lesions.counts[b] - lesions.counts[a]);

  if (presentClasses.length === 0) {
    keyFindings.push(
      'No diabetic retinopathy lesions identified across a gradable retinal field.',
    );
  } else {
    keyFindings.push(
      presentClasses
        .map((k) => `${LESION_TAXONOMY[k].label}: ${lesions.counts[k]}`)
        .join(' · '),
    );
  }

  const burdenedQuadrants = Object.entries(lesions.quadrantBurden).filter(([, v]) => v > 0);
  if (burdenedQuadrants.length > 0) {
    keyFindings.push(
      `Red lesions distributed across ${burdenedQuadrants.length}/4 retinal quadrants (${burdenedQuadrants
        .map(([q, v]) => `${q.replace('o', 'o-')} ${v}`)
        .join(', ')}).`,
    );
  }

  if (lesions.fourTwoOne.triggered) {
    keyFindings.push(`4-2-1 rule: ${lesions.fourTwoOne.explanation}`);
  }

  keyFindings.push(
    `Grading: rule engine Level ${grading.ruleBased.level}, vision model Level ${grading.modelBased.level}. ${grading.agreement.note}`,
  );

  keyFindings.push(
    `Anatomy: ${structures.laterality === 'indeterminate' ? 'laterality not established' : `inferred ${structures.laterality}`}, ${structures.fieldDefinition} field, optic disc localised at ${structures.opticDisc.confidence}/100 confidence.`,
  );

  /* ---- Limitations: stated plainly, because a screening report that hides
     its own weaknesses is not safe to act on. ---- */
  const limitations: string[] = [
    'This is an automated decision-support output, not a diagnosis. It does not replace a dilated fundus examination by an ophthalmologist.',
    'A single 45° posterior-pole photograph cannot exclude peripheral retinopathy, and this system does not assess diabetic macular oedema thickness, which requires OCT.',
  ];

  if (quality.verdict === 'borderline') {
    limitations.push(
      `Image quality was ${quality.overallScore}/100 (borderline). Small lesions may have been missed; a negative result carries less weight than it would on a clean image.`,
    );
  }
  if (!explainability.overlapAssessed) {
    limitations.push(
      'Attention–evidence alignment could not be independently assessed: no model-backed attention field was available, so the grade has not been cross-checked against where the system was looking.',
    );
  } else if (explainability.overlapInterpretation !== 'aligned') {
    limitations.push(
      `Attention–evidence alignment was ${explainability.evidenceOverlapScore}/100 (${explainability.overlapInterpretation}); part of the grading signal is not accounted for by located findings.`,
    );
  }
  if (lesions.corroborationScore < 60) {
    limitations.push(
      `Independent detectors corroborated only ${lesions.corroborationScore}% of findings, so individual lesion positions should be verified visually.`,
    );
  }
  if (!structures.anatomyComplete) {
    limitations.push(
      'The optic disc and/or macula could not be confidently localised, so quadrant assignments and distance-from-fovea measures are approximate.',
    );
  }
  if (telemetry.some((t) => t.degraded)) {
    const degradedStages = telemetry.filter((t) => t.degraded).map((t) => t.title);
    limitations.push(
      `Stage${degradedStages.length === 1 ? '' : 's'} run in degraded mode without model support: ${degradedStages.join(', ')}.`,
    );
  }

  return {
    reportId: `RS-${runId.slice(0, 8).toUpperCase()}`,
    generatedAt: new Date().toISOString(),
    patient,
    grade: {
      level: grading.level,
      label: spec.clinical,
      referable: grading.referable,
      urgency: grading.urgency,
    },
    confidence: {
      value: confidence.finalConfidence,
      band: confidence.band,
      decision: confidence.decision,
      decisionLabel: confidence.decisionLabel,
    },
    imageQuality: {
      score: quality.overallScore,
      verdict: quality.verdict,
      enhanced: quality.enhancement?.applied ?? false,
    },
    evidence: {
      counts: lesions.counts,
      totalLesions,
      evidenceOverlapScore: explainability.evidenceOverlapScore,
      corroborationScore: lesions.corroborationScore,
    },
    recommendation: {
      headline,
      followUpInterval: spec.followUp,
      actions,
    },
    keyFindings,
    limitations,
    auditTrail: telemetry,
  };
}
