import { z } from 'zod';

/**
 * Output contracts for every model-backed stage.
 *
 * These are the actual interface between a general-purpose vision-language
 * model and a clinical pipeline. Anything the model returns that does not fit
 * these shapes is rejected and the stage degrades to the deterministic engine —
 * the UI never renders unvalidated model text.
 */

const unit = z.coerce.number().min(0).max(1);
const norm = z.coerce.number().min(-0.2).max(1.2);
const nonNegInt = z.coerce.number().int().min(0).max(500);

export const lesionClassEnum = z.enum([
  'microaneurysm',
  'haemorrhage',
  'hard_exudate',
  'soft_exudate',
  'neovascularisation',
  'irma',
  'venous_beading',
]);

/* ---- Stage 1: qualitative image review ---- */

export const qualityReviewSchema = z.object({
  gradable: z.boolean(),
  observations: z.array(z.string().min(3)).min(1).max(6),
  artefacts: z.array(z.string().min(2)).max(6).default([]),
  narrative: z.string().min(20).max(900),
});
export type QualityReview = z.infer<typeof qualityReviewSchema>;

/* ---- Stage 2: structural corroboration ---- */

export const structureReviewSchema = z.object({
  opticDiscVisible: z.boolean(),
  opticDisc: z.object({ x: norm, y: norm }).nullable().default(null),
  maculaVisible: z.boolean(),
  macula: z.object({ x: norm, y: norm }).nullable().default(null),
  vesselAssessment: z
    .enum(['normal', 'attenuated', 'dilated', 'tortuous', 'obscured'])
    .default('normal'),
  laterality: z.enum(['OD', 'OS', 'uncertain']).default('uncertain'),
  narrative: z.string().min(20).max(900),
});
export type StructureReview = z.infer<typeof structureReviewSchema>;

/* ---- Stage 3: lesion detection ---- */

export const lesionFindingSchema = z.object({
  lesionClass: lesionClassEnum,
  x: norm,
  y: norm,
  radius: z.coerce.number().min(0.002).max(0.25).default(0.02),
  confidence: unit.default(0.6),
  note: z.string().max(320).default(''),
});

export const lesionDetectionSchema = z.object({
  findings: z.array(lesionFindingSchema).max(60).default([]),
  estimatedCounts: z
    .object({
      microaneurysm: nonNegInt.default(0),
      haemorrhage: nonNegInt.default(0),
      hard_exudate: nonNegInt.default(0),
      soft_exudate: nonNegInt.default(0),
      neovascularisation: nonNegInt.default(0),
      irma: nonNegInt.default(0),
      venous_beading: nonNegInt.default(0),
    })
    .default({
      microaneurysm: 0,
      haemorrhage: 0,
      hard_exudate: 0,
      soft_exudate: 0,
      neovascularisation: 0,
      irma: 0,
      venous_beading: 0,
    }),
  quadrantsWithRedLesions: nonNegInt.max(4).default(0),
  neovascularisation: z.object({
    suspected: z.boolean(),
    confidence: unit.default(0),
    rationale: z.string().max(500).default(''),
  }),
  narrative: z.string().min(20).max(1200),
});
export type LesionDetection = z.infer<typeof lesionDetectionSchema>;

/* ---- Stage 4: severity grading ---- */

export const attentionRegionSchema = z.object({
  x: norm,
  y: norm,
  radius: z.coerce.number().min(0.02).max(0.6).default(0.12),
  weight: unit.default(0.5),
  label: z.string().max(160).default(''),
});

export const gradingSchema = z.object({
  level: z.coerce.number().int().min(0).max(4),
  distribution: z.array(z.coerce.number().min(0).max(1)).length(5),
  confidence: unit.default(0.6),
  rationale: z.string().min(20).max(1400),
  keyEvidence: z.array(z.string().min(3)).max(8).default([]),
  attentionRegions: z.array(attentionRegionSchema).min(1).max(8),
  narrative: z.string().min(20).max(1200),
});
export type GradingReview = z.infer<typeof gradingSchema>;
