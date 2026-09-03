import type { DRLevel, LesionClass, Quadrant, StageId } from './types';

/* ------------------------------------------------------------------ */
/* DR severity scale (ICDR)                                             */
/* ------------------------------------------------------------------ */

export interface DRLevelSpec {
  level: DRLevel;
  short: string;
  clinical: string;
  meaning: string;
  referable: boolean;
  urgency: 'routine' | 'early' | 'prompt' | 'urgent';
  followUp: string;
  recommendation: string;
  actions: string[];
  colour: string;
}

/** The referable threshold. Level 2 (Moderate NPDR) and above needs an ophthalmologist. */
export const REFERABLE_THRESHOLD: DRLevel = 2;

export const DR_SCALE: Record<DRLevel, DRLevelSpec> = {
  0: {
    level: 0,
    short: 'No DR',
    clinical: 'No apparent retinopathy',
    meaning: 'No retinal lesions attributable to diabetic retinopathy.',
    referable: false,
    urgency: 'routine',
    followUp: 'Re-screen in 12 months',
    recommendation: 'No retinopathy detected. Continue routine annual screening.',
    actions: [
      'Reinforce glycaemic, blood-pressure and lipid control',
      'Schedule the next PHC screening visit in 12 months',
      'Counsel the patient on symptoms that warrant earlier review',
    ],
    colour: 'emerald',
  },
  1: {
    level: 1,
    short: 'Mild NPDR',
    clinical: 'Mild non-proliferative diabetic retinopathy',
    meaning: 'Microaneurysms only.',
    referable: false,
    urgency: 'routine',
    followUp: 'Re-screen in 12 months',
    recommendation:
      'Earliest changes present. Not yet referable — manage systemically and re-screen annually.',
    actions: [
      'Tighten glycaemic control; review HbA1c',
      'Re-screen in 12 months, or sooner if control deteriorates',
      'Record baseline image for future comparison',
    ],
    colour: 'lime',
  },
  2: {
    level: 2,
    short: 'Moderate NPDR',
    clinical: 'Moderate non-proliferative diabetic retinopathy',
    meaning:
      'More than microaneurysms alone, but less than severe non-proliferative disease.',
    referable: true,
    urgency: 'early',
    followUp: 'Ophthalmology review within 3 months',
    recommendation:
      'Referable diabetic retinopathy. Refer to the district ophthalmologist for confirmatory assessment.',
    actions: [
      'Refer to district hospital ophthalmology within 3 months',
      'Assess for diabetic macular oedema at review',
      'Intensify systemic risk-factor control',
    ],
    colour: 'amber',
  },
  3: {
    level: 3,
    short: 'Severe NPDR',
    clinical: 'Severe non-proliferative diabetic retinopathy',
    meaning:
      'Extensive intraretinal haemorrhages, venous beading or IRMA — high risk of progression.',
    referable: true,
    urgency: 'prompt',
    followUp: 'Ophthalmology review within 2–4 weeks',
    recommendation:
      'Severe non-proliferative disease. Prompt ophthalmology assessment required; high risk of progression to proliferative DR.',
    actions: [
      'Refer to ophthalmology within 2–4 weeks',
      'Flag for possible panretinal photocoagulation assessment',
      'Arrange transport support if the patient is remote from the district hospital',
    ],
    colour: 'orange',
  },
  4: {
    level: 4,
    short: 'Proliferative DR',
    clinical: 'Proliferative diabetic retinopathy',
    meaning: 'Neovascularisation and/or vitreous or preretinal haemorrhage.',
    referable: true,
    urgency: 'urgent',
    followUp: 'Ophthalmology review within 1 week',
    recommendation:
      'Sight-threatening proliferative disease suspected. Urgent ophthalmology referral.',
    actions: [
      'Urgent referral — ophthalmology assessment within 1 week',
      'Escalate to the district DR programme coordinator today',
      'Counsel the patient that treatment is time-critical to preserve vision',
    ],
    colour: 'red',
  },
};

export const DR_LEVELS: DRLevel[] = [0, 1, 2, 3, 4];

/* ------------------------------------------------------------------ */
/* Lesion taxonomy                                                      */
/* ------------------------------------------------------------------ */

export interface LesionSpec {
  key: LesionClass;
  label: string;
  shortLabel: string;
  appearance: string;
  significance: string;
  /** Overlay colour, as a raw hex so canvas and SVG can share it. */
  colour: string;
  /** Is this a "red lesion" for the purposes of the 4-2-1 rule? */
  red: boolean;
}

export const LESION_TAXONOMY: Record<LesionClass, LesionSpec> = {
  microaneurysm: {
    key: 'microaneurysm',
    label: 'Microaneurysm',
    shortLabel: 'MA',
    appearance: 'Tiny, sharply-defined deep-red dots, typically 15–60 µm.',
    significance:
      'The earliest ophthalmoscopically visible sign of diabetic retinopathy. Presence alone defines Mild NPDR.',
    colour: '#f43f5e',
    red: true,
  },
  haemorrhage: {
    key: 'haemorrhage',
    label: 'Retinal haemorrhage',
    shortLabel: 'HAEM',
    appearance: 'Larger dark-red blot or flame-shaped intraretinal blood.',
    significance:
      'Indicates increasing vascular leakage. Extensive haemorrhage across four quadrants is a severe-NPDR criterion.',
    colour: '#b91c1c',
    red: true,
  },
  hard_exudate: {
    key: 'hard_exudate',
    label: 'Hard exudate',
    shortLabel: 'HE',
    appearance: 'Bright yellow, waxy, sharply-marginated lipid deposits.',
    significance:
      'Marks chronic vascular leakage. Exudate approaching the fovea raises concern for diabetic macular oedema.',
    colour: '#facc15',
    red: false,
  },
  soft_exudate: {
    key: 'soft_exudate',
    label: 'Cotton-wool spot',
    shortLabel: 'CWS',
    appearance: 'Pale, fluffy, indistinct white patches in the nerve fibre layer.',
    significance:
      'Represents focal retinal ischaemia (axoplasmic stasis). Multiple spots suggest advancing ischaemic disease.',
    colour: '#e2e8f0',
    red: false,
  },
  neovascularisation: {
    key: 'neovascularisation',
    label: 'Neovascularisation',
    shortLabel: 'NV',
    appearance:
      'Fine, irregular, tortuous new vessel networks, often at the disc (NVD) or elsewhere (NVE).',
    significance:
      'Defines proliferative diabetic retinopathy. Sight-threatening — carries risk of vitreous haemorrhage and traction detachment.',
    colour: '#a855f7',
    red: false,
  },
  irma: {
    key: 'irma',
    label: 'IRMA',
    shortLabel: 'IRMA',
    appearance:
      'Intraretinal microvascular abnormality — dilated, shunt-like vessels within the retina.',
    significance:
      'A severe-NPDR criterion; represents remodelling around areas of capillary closure.',
    colour: '#22d3ee',
    red: false,
  },
  venous_beading: {
    key: 'venous_beading',
    label: 'Venous beading',
    shortLabel: 'VB',
    appearance: 'Localised, sausage-like calibre variation along retinal veins.',
    significance:
      'One of the strongest predictors of progression to proliferative disease; a severe-NPDR criterion.',
    colour: '#60a5fa',
    red: false,
  },
};

export const LESION_CLASSES: LesionClass[] = [
  'microaneurysm',
  'haemorrhage',
  'hard_exudate',
  'soft_exudate',
  'irma',
  'venous_beading',
  'neovascularisation',
];

export function emptyLesionCounts(): Record<LesionClass, number> {
  return {
    microaneurysm: 0,
    haemorrhage: 0,
    hard_exudate: 0,
    soft_exudate: 0,
    neovascularisation: 0,
    irma: 0,
    venous_beading: 0,
  };
}

export function emptyQuadrantBurden(): Record<Quadrant, number> {
  return {
    superotemporal: 0,
    superonasal: 0,
    inferotemporal: 0,
    inferonasal: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Stage catalogue                                                      */
/* ------------------------------------------------------------------ */

export interface StageSpec {
  id: StageId;
  index: number;
  title: string;
  subtitle: string;
  question: string;
  provenanceLabel: string;
}

export const STAGES: StageSpec[] = [
  {
    id: 'quality',
    index: 1,
    title: 'Image Quality Assessment',
    subtitle: 'Sharpness · illumination · contrast · field coverage',
    question: 'Is this photograph good enough to grade?',
    provenanceLabel: 'Computer vision + model review',
  },
  {
    id: 'structures',
    index: 2,
    title: 'Retinal Structure Analysis',
    subtitle: 'Optic disc · fovea · vascular arcades',
    question: 'Where is the anatomy, and is the whole retina represented?',
    provenanceLabel: 'Computer vision + model corroboration',
  },
  {
    id: 'lesions',
    index: 3,
    title: 'Lesion Detection',
    subtitle: 'Microaneurysms · haemorrhages · exudates · neovascularisation',
    question: 'What disease-specific findings are present, and where?',
    provenanceLabel: 'Model detection + CV corroboration',
  },
  {
    id: 'grading',
    index: 4,
    title: 'DR Severity Grading',
    subtitle: 'ICDR Level 0–4 with full probability breakdown',
    question: 'How severe is the retinopathy?',
    provenanceLabel: 'Rule engine + model, fused',
  },
  {
    id: 'explainability',
    index: 5,
    title: 'Explainability',
    subtitle: 'Attention heatmap · evidence map · overlap score',
    question: 'Why did the system reach that conclusion?',
    provenanceLabel: 'Derived from stages 3 & 4',
  },
  {
    id: 'confidence',
    index: 6,
    title: 'Confidence & Human-in-the-Loop',
    subtitle: 'Fused confidence · triage decision · safety overrides',
    question: 'Are we confident enough for this to stand without a doctor?',
    provenanceLabel: 'Deterministic safety logic',
  },
  {
    id: 'report',
    index: 7,
    title: 'Doctor-Ready Report',
    subtitle: 'Grade · evidence · recommendation · audit trail',
    question: 'What does the clinician need to see?',
    provenanceLabel: 'Assembled from all stages',
  },
];

export function stageSpec(id: StageId): StageSpec {
  const found = STAGES.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown stage: ${id}`);
  return found;
}

/* ------------------------------------------------------------------ */
/* Quality thresholds — documented so the score is auditable            */
/* ------------------------------------------------------------------ */

export const QUALITY_THRESHOLDS = {
  ungradeableBelow: 40,
  borderlineBelow: 68,
  /** Any single metric below this forces at least a borderline verdict. */
  criticalMetricFloor: 30,
} as const;

export const CONFIDENCE_THRESHOLDS = {
  highAbove: 78,
  lowBelow: 58,
} as const;
