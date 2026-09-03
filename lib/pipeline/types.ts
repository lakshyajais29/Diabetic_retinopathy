/**
 * RetinaSetu — canonical pipeline contracts.
 *
 * Every stage of the screening pipeline is an isolated module with a typed input
 * and a typed, structured output. Nothing downstream (including the entire UI)
 * knows or cares whether a given stage was computed by classical computer vision,
 * by a rule engine, or by a large model. That is deliberate: it is what lets a
 * stage's "brain" be swapped for a purpose-trained retinal model later without
 * touching anything else.
 */

/* ------------------------------------------------------------------ */
/* Shared primitives                                                    */
/* ------------------------------------------------------------------ */

/** A point in normalised image space. (0,0) = top-left, (1,1) = bottom-right. */
export interface Point {
  x: number;
  y: number;
}

export type StageId =
  | 'quality'
  | 'structures'
  | 'lesions'
  | 'grading'
  | 'explainability'
  | 'confidence'
  | 'report';

/** Where a stage's numbers actually came from — surfaced in the UI for honesty. */
export type Provenance = 'cv' | 'model' | 'rules' | 'hybrid';

/** Which engine backed the reasoning portion of a stage on this particular run. */
export type EngineKind = 'mistral' | 'deterministic';

export interface StageTelemetry {
  id: StageId;
  index: number;
  title: string;
  provenance: Provenance;
  engine: EngineKind | null;
  durationMs: number;
  degraded: boolean;
  degradedReason?: string;
}

export type Quadrant =
  | 'superotemporal'
  | 'superonasal'
  | 'inferotemporal'
  | 'inferonasal';

export const QUADRANTS: Quadrant[] = [
  'superotemporal',
  'superonasal',
  'inferotemporal',
  'inferonasal',
];

/* ------------------------------------------------------------------ */
/* Stage 1 — Image Quality Assessment                                   */
/* ------------------------------------------------------------------ */

export type QualityMetricKey =
  | 'sharpness'
  | 'illumination'
  | 'contrast'
  | 'exposure'
  | 'fieldCoverage'
  | 'colourFidelity';

export interface QualityMetric {
  key: QualityMetricKey;
  label: string;
  /** Normalised 0–100 sub-score. */
  score: number;
  /** The underlying physical measurement, kept visible so the score is auditable. */
  raw: number;
  rawLabel: string;
  status: 'pass' | 'warn' | 'fail';
  note: string;
}

export type QualityVerdict = 'good' | 'borderline' | 'ungradeable';

export interface EnhancementRecord {
  applied: boolean;
  operations: string[];
  scoreBefore: number;
  scoreAfter: number;
  verdictBefore: QualityVerdict;
  verdictAfter: QualityVerdict;
  imageBefore: string;
  imageAfter: string;
  deltas: Array<{
    key: QualityMetricKey;
    label: string;
    before: number;
    after: number;
  }>;
}

export interface QualityAssessment {
  overallScore: number;
  verdict: QualityVerdict;
  gradable: boolean;
  metrics: QualityMetric[];
  failureReasons: string[];
  recaptureGuidance: string[];
  enhancement: EnhancementRecord | null;
  /** Dimensions of the working image, for overlay geometry. */
  imageWidth: number;
  imageHeight: number;
  narrative: string;
}

/* ------------------------------------------------------------------ */
/* Stage 2 — Retinal Structure Analysis                                 */
/* ------------------------------------------------------------------ */

export interface OpticDisc {
  detected: boolean;
  centre: Point;
  /** Normalised radius, as a fraction of image width. */
  radius: number;
  confidence: number;
  cupToDiscEstimate: number | null;
  note: string;
}

export interface Fovea {
  detected: boolean;
  centre: Point;
  /** Distance from disc centre expressed in disc diameters — normally ~2.5 DD. */
  discDiameters: number;
  confidence: number;
  note: string;
}

export interface VesselAnalysis {
  /** Percentage of retinal area occupied by detectable vasculature. */
  densityPct: number;
  /** 0–100: how continuous the major arcades appear. */
  arcadeContinuity: number;
  tortuosityIndex: number;
  calibreVariation: number;
  note: string;
}

export type Laterality = 'OD' | 'OS' | 'indeterminate';

export interface StructureAnalysis {
  opticDisc: OpticDisc;
  fovea: Fovea;
  macula: { centre: Point; radius: number };
  vessels: VesselAnalysis;
  laterality: Laterality;
  lateralityRationale: string;
  fieldDefinition: 'macula-centred' | 'disc-centred' | 'peripheral' | 'indeterminate';
  anatomyComplete: boolean;
  modelAgreement: {
    status: 'agree' | 'disagree' | 'not-assessed';
    note: string;
    /** Distance between CV and model disc positions, in normalised units. */
    discOffset: number | null;
  };
  narrative: string;
}

/* ------------------------------------------------------------------ */
/* Stage 3 — Lesion Detection                                           */
/* ------------------------------------------------------------------ */

export type LesionClass =
  | 'microaneurysm'
  | 'haemorrhage'
  | 'hard_exudate'
  | 'soft_exudate'
  | 'neovascularisation'
  | 'irma'
  | 'venous_beading';

export interface Lesion {
  id: string;
  lesionClass: LesionClass;
  centre: Point;
  /** Normalised radius, fraction of image width. */
  radius: number;
  confidence: number;
  quadrant: Quadrant;
  /** Was this corroborated by classical CV, proposed by the model, or both? */
  source: 'cv' | 'model' | 'both';
  note: string;
}

export type LesionCounts = Record<LesionClass, number>;

export interface LesionAnalysis {
  lesions: Lesion[];
  counts: LesionCounts;
  /** Red-lesion burden per quadrant, feeding the 4-2-1 rule. */
  quadrantBurden: Record<Quadrant, number>;
  densityPerDiscArea: number;
  cvCandidates: { darkBlobs: number; brightBlobs: number };
  /** 0–100: agreement between classical CV candidates and model findings. */
  corroborationScore: number;
  neovascularisation: {
    suspected: boolean;
    confidence: number;
    rationale: string;
  };
  fourTwoOne: {
    severeHaemorrhageQuadrants: number;
    venousBeadingQuadrants: number;
    irmaQuadrants: number;
    triggered: boolean;
    explanation: string;
  };
  narrative: string;
}

/* ------------------------------------------------------------------ */
/* Stage 4 — DR Severity Grading                                        */
/* ------------------------------------------------------------------ */

export type DRLevel = 0 | 1 | 2 | 3 | 4;

export interface GradingResult {
  level: DRLevel;
  label: string;
  /** Probability-style mass across levels 0–4; sums to 1. */
  distribution: number[];
  referable: boolean;
  urgency: 'routine' | 'early' | 'prompt' | 'urgent';
  ruleBased: {
    level: DRLevel;
    rationale: string[];
    triggeredRule: string;
  };
  modelBased: {
    level: DRLevel;
    distribution: number[];
    rationale: string;
    confidence: number;
  };
  agreement: {
    agrees: boolean;
    delta: number;
    note: string;
  };
  /** Top-1 minus top-2 probability — how decisively the grade was won. */
  margin: number;
  /** Normalised Shannon entropy of the distribution, 0 (certain) → 1 (uniform). */
  entropy: number;
  narrative: string;
}

/* ------------------------------------------------------------------ */
/* Stage 5 — Explainability                                             */
/* ------------------------------------------------------------------ */

export interface AttentionRegion {
  row: number;
  col: number;
  weight: number;
  quadrant: Quadrant;
  contains: string[];
}

export interface ExplainabilityResult {
  gridSize: number;
  /** gridSize x gridSize attention mass, values 0–1, normalised to max = 1. */
  attentionGrid: number[][];
  /**
   * Where the attention field came from. `model` is what actually drove the
   * grade; `image-energy` is the on-device lesion-response map used when no
   * model attention exists.
   */
  attentionSource: 'model' | 'image-energy';
  /**
   * Whether the overlap score is a genuine independent check. It is only that
   * when the attention came from the grader being checked — an image-derived
   * field and an image-derived lesion list are not independent enough for the
   * score to be used as a safety signal.
   */
  overlapAssessed: boolean;
  topRegions: AttentionRegion[];
  /** 0–100: share of attention mass landing on detected lesion evidence. */
  evidenceOverlapScore: number;
  overlapInterpretation: 'aligned' | 'partial' | 'misaligned';
  overlapExplanation: string;
  attentionOnLesionsPct: number;
  attentionOnAnatomyPct: number;
  attentionUnexplainedPct: number;
  evidenceNotes: Array<{
    lesionClass: LesionClass;
    label: string;
    count: number;
    why: string;
  }>;
  narrative: string;
}

/* ------------------------------------------------------------------ */
/* Stage 6 — Confidence & Human-in-the-Loop                             */
/* ------------------------------------------------------------------ */

export type TriageDecision =
  | 'ai_recommendation'
  | 'doctor_review_required'
  | 'urgent_referral';

export interface ConfidenceFactor {
  key: string;
  label: string;
  /** 0–100 contribution input. */
  value: number;
  weight: number;
  note: string;
}

export interface ConfidenceAssessment {
  finalConfidence: number;
  band: 'high' | 'moderate' | 'low';
  factors: ConfidenceFactor[];
  decision: TriageDecision;
  decisionLabel: string;
  reasons: string[];
  safetyOverrides: string[];
  narrative: string;
}

/* ------------------------------------------------------------------ */
/* Stage 7 — Doctor-Ready Report                                        */
/* ------------------------------------------------------------------ */

export interface PatientContext {
  patientId: string;
  age: string;
  sex: 'male' | 'female' | 'other' | 'unstated';
  diabetesDurationYears: string;
  eye: 'right' | 'left' | 'unstated';
  phc: string;
  operator: string;
  notes: string;
}

export interface ScreeningReport {
  reportId: string;
  generatedAt: string;
  patient: PatientContext;
  grade: {
    level: DRLevel;
    label: string;
    referable: boolean;
    urgency: GradingResult['urgency'];
  };
  confidence: {
    value: number;
    band: ConfidenceAssessment['band'];
    decision: TriageDecision;
    decisionLabel: string;
  };
  imageQuality: {
    score: number;
    verdict: QualityVerdict;
    enhanced: boolean;
  };
  evidence: {
    counts: LesionCounts;
    totalLesions: number;
    evidenceOverlapScore: number;
    corroborationScore: number;
  };
  recommendation: {
    headline: string;
    followUpInterval: string;
    actions: string[];
  };
  keyFindings: string[];
  limitations: string[];
  auditTrail: StageTelemetry[];
}

/* ------------------------------------------------------------------ */
/* Full pipeline result + streaming events                              */
/* ------------------------------------------------------------------ */

export interface PipelineResult {
  runId: string;
  startedAt: string;
  halted: boolean;
  haltedReason: string | null;
  images: {
    original: string;
    working: string;
    enhanced: string | null;
  };
  quality: QualityAssessment | null;
  structures: StructureAnalysis | null;
  lesions: LesionAnalysis | null;
  grading: GradingResult | null;
  explainability: ExplainabilityResult | null;
  confidence: ConfidenceAssessment | null;
  report: ScreeningReport | null;
  telemetry: StageTelemetry[];
}

export type PipelineEvent =
  | { type: 'run_start'; runId: string; engine: EngineKind }
  | { type: 'stage_start'; stage: StageId; index: number; title: string }
  | { type: 'stage_progress'; stage: StageId; message: string; pct: number }
  | {
      type: 'stage_complete';
      stage: StageId;
      telemetry: StageTelemetry;
      payload: unknown;
    }
  | { type: 'image_update'; key: 'working' | 'enhanced'; dataUrl: string }
  | { type: 'halted'; stage: StageId; reason: string; guidance: string[] }
  | { type: 'run_complete'; result: PipelineResult }
  | { type: 'error'; message: string };
