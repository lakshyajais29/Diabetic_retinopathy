import type {
  EngineKind,
  Lesion,
  LesionAnalysis,
  LesionClass,
  Quadrant,
  StructureAnalysis,
} from '../types';
import { LESION_TAXONOMY, emptyLesionCounts, emptyQuadrantBurden } from '../constants';
import { round, toDataUrl, type RasterImage, type RetinalMask } from '../../vision/raster';
import { detectCandidates, nearestCandidate, type Candidate } from '../../vision/lesions';
import { quadrantOf, type DiscResult, type VesselResult } from '../../vision/anatomy';
import { callModel } from '../../mistral/client';
import { CLINICAL_SYSTEM, lesionPrompt } from '../../mistral/prompts';
import { lesionDetectionSchema } from '../../mistral/schemas';

export interface LesionStageResult {
  analysis: LesionAnalysis;
  candidates: { dark: Candidate[]; bright: Candidate[] };
  degraded: boolean;
  degradedReason?: string;
}

/** Two detections of the same lesion should agree to well within a disc radius. */
const MATCH_TOLERANCE = 0.035;

export async function runLesionStage(
  raster: RasterImage,
  field: RetinalMask,
  workingBuffer: Buffer,
  disc: DiscResult,
  vessels: VesselResult,
  structures: StructureAnalysis,
  qualityScore: number,
  engine: EngineKind,
  onProgress: (message: string, pct: number) => void,
): Promise<LesionStageResult> {
  onProgress('Running classical blob detection for red and bright candidates', 20);
  const candidates = detectCandidates(raster, field, disc, vessels);
  const punctate = candidates.dark.filter((c) => c.size === 'punctate').length;

  let lesions: Lesion[] = [];
  let counts = emptyLesionCounts();
  let nvSuspected = false;
  let nvConfidence = 0;
  let nvRationale =
    'Neovascularisation cannot be established from blob morphology alone; new-vessel networks require pattern recognition over the vascular tree.';
  let narrative = '';
  let degraded = false;
  let degradedReason: string | undefined;
  let modelReported = false;
  let quadrantsWithRedFromModel = 0;

  if (engine === 'mistral') {
    onProgress('Vision model examining the retina lesion by lesion', 55);
    try {
      const detection = await callModel(
        {
          label: 'Stage 3 lesion detection',
          system: CLINICAL_SYSTEM,
          user: lesionPrompt({
            discX: disc.centre.x,
            discY: disc.centre.y,
            discRadius: disc.radiusNorm,
            foveaX: structures.fovea.centre.x,
            foveaY: structures.fovea.centre.y,
            darkCandidates: candidates.dark.length,
            brightCandidates: candidates.bright.length,
            punctateCandidates: punctate,
            qualityScore,
          }),
          image: await toDataUrl(workingBuffer),
          temperature: 0.15,
          maxTokens: 3000,
        },
        lesionDetectionSchema,
      );

      modelReported = true;
      narrative = detection.narrative;
      nvSuspected = detection.neovascularisation.suspected;
      nvConfidence = Math.round(detection.neovascularisation.confidence * 100);
      nvRationale =
        detection.neovascularisation.rationale ||
        (nvSuspected
          ? 'New-vessel pattern reported without further detail.'
          : 'No new-vessel network identified on the disc or elsewhere.');
      quadrantsWithRedFromModel = detection.quadrantsWithRedLesions;

      lesions = detection.findings.map((f, i) => {
        const centre = {
          x: Math.min(1, Math.max(0, f.x)),
          y: Math.min(1, Math.max(0, f.y)),
        };
        const pool = isRedClass(f.lesionClass) ? candidates.dark : candidates.bright;
        const { distance } = nearestCandidate(pool, centre);
        const corroborated = distance <= MATCH_TOLERANCE;
        return {
          id: `L${String(i + 1).padStart(3, '0')}`,
          lesionClass: f.lesionClass as LesionClass,
          centre,
          radius: f.radius,
          confidence: Math.round(f.confidence * 100),
          quadrant: quadrantOf(centre, disc.centre, structures.laterality),
          source: corroborated ? 'both' : 'model',
          note:
            f.note ||
            `${LESION_TAXONOMY[f.lesionClass as LesionClass].label} identified by the vision model.`,
        } satisfies Lesion;
      });

      counts = { ...emptyLesionCounts(), ...detection.estimatedCounts };
      // The plotted findings are the floor: never report fewer than we can show.
      for (const l of lesions) {
        const plotted = lesions.filter((x) => x.lesionClass === l.lesionClass).length;
        if (counts[l.lesionClass] < plotted) counts[l.lesionClass] = plotted;
      }
    } catch (err) {
      degraded = true;
      degradedReason = err instanceof Error ? err.message : 'Lesion detection model unavailable.';
    }
  }

  if (!modelReported) {
    onProgress('Deriving lesion set from classical detection', 60);
    const derived = lesionsFromCandidates(candidates, disc, structures);
    lesions = derived.lesions;
    counts = derived.counts;
    narrative = derived.narrative;
  }

  onProgress('Cross-checking model findings against independent detection', 82);

  const corroborationScore = computeCorroboration(lesions, candidates, modelReported);

  const quadrantBurden = emptyQuadrantBurden();
  const quadrantByClass: Record<string, Set<Quadrant>> = {};
  for (const l of lesions) {
    if (isRedClass(l.lesionClass)) quadrantBurden[l.quadrant] += 1;
    (quadrantByClass[l.lesionClass] ??= new Set()).add(l.quadrant);
  }

  const haemQuadrants = new Set<Quadrant>();
  for (const l of lesions) {
    if (l.lesionClass === 'haemorrhage') haemQuadrants.add(l.quadrant);
  }

  const severeHaemorrhageQuadrants = Math.max(
    haemQuadrants.size >= 4 && counts.haemorrhage >= 16 ? 4 : 0,
    countQuadrantsWithAtLeast(lesions, 'haemorrhage', 4),
  );
  const venousBeadingQuadrants = quadrantByClass['venous_beading']?.size ?? 0;
  const irmaQuadrants = quadrantByClass['irma']?.size ?? 0;

  const triggered =
    severeHaemorrhageQuadrants >= 4 || venousBeadingQuadrants >= 2 || irmaQuadrants >= 1;

  const totalRed = counts.microaneurysm + counts.haemorrhage;
  const discArea = Math.PI * disc.radiusNorm ** 2;
  const retinaArea = Math.max(0.05, field.coverage);
  const densityPerDiscArea = round((totalRed * discArea) / retinaArea, 2);

  const quadrantsWithRed = Math.max(
    Object.values(quadrantBurden).filter((v) => v > 0).length,
    modelReported ? quadrantsWithRedFromModel : 0,
  );

  const analysis: LesionAnalysis = {
    lesions,
    counts,
    quadrantBurden,
    densityPerDiscArea,
    cvCandidates: {
      darkBlobs: candidates.dark.length,
      brightBlobs: candidates.bright.length,
    },
    corroborationScore,
    neovascularisation: {
      suspected: nvSuspected,
      confidence: nvConfidence,
      rationale: nvRationale,
    },
    fourTwoOne: {
      severeHaemorrhageQuadrants,
      venousBeadingQuadrants,
      irmaQuadrants,
      triggered,
      explanation: explainFourTwoOne(
        severeHaemorrhageQuadrants,
        venousBeadingQuadrants,
        irmaQuadrants,
        quadrantsWithRed,
      ),
    },
    narrative,
  };

  onProgress('Lesion inventory complete', 100);
  return { analysis, candidates, degraded, degradedReason };
}

function isRedClass(c: string): boolean {
  return c === 'microaneurysm' || c === 'haemorrhage' || c === 'irma' || c === 'venous_beading';
}

function countQuadrantsWithAtLeast(
  lesions: Lesion[],
  lesionClass: LesionClass,
  min: number,
): number {
  const byQuadrant: Record<string, number> = {};
  for (const l of lesions) {
    if (l.lesionClass !== lesionClass) continue;
    byQuadrant[l.quadrant] = (byQuadrant[l.quadrant] ?? 0) + 1;
  }
  return Object.values(byQuadrant).filter((n) => n >= min).length;
}

/**
 * Agreement between two independent detectors.
 *
 * Deliberately two-sided: a model that plots lesions nothing else can see scores
 * badly, and so does a model that ignores strong objective candidates.
 */
function computeCorroboration(
  lesions: Lesion[],
  candidates: { dark: Candidate[]; bright: Candidate[] },
  modelReported: boolean,
): number {
  if (!modelReported) {
    // The lesions *are* the candidates in deterministic mode, so agreement is
    // definitional and reporting 100 would be meaningless.
    return 55;
  }

  const strongCandidates = [
    ...candidates.dark.filter((c) => c.areaPx >= 4),
    ...candidates.bright.filter((c) => c.areaPx >= 5),
  ];

  if (lesions.length === 0 && strongCandidates.length === 0) return 100;
  if (lesions.length === 0) {
    // Model saw nothing where classical detection found objects.
    return Math.round(Math.max(20, 100 - strongCandidates.length * 6));
  }

  let matchedFindings = 0;
  for (const l of lesions) {
    const pool = isRedClass(l.lesionClass) ? candidates.dark : candidates.bright;
    if (nearestCandidate(pool, l.centre).distance <= MATCH_TOLERANCE) matchedFindings++;
  }
  const precision = matchedFindings / lesions.length;

  let matchedCandidates = 0;
  for (const c of strongCandidates) {
    const near = lesions.some(
      (l) => Math.hypot(l.centre.x - c.centre.x, l.centre.y - c.centre.y) <= MATCH_TOLERANCE,
    );
    if (near) matchedCandidates++;
  }
  const recall = strongCandidates.length ? matchedCandidates / strongCandidates.length : 1;

  return Math.round(100 * (0.65 * precision + 0.35 * recall));
}

/**
 * Deterministic fallback: turn classical candidates directly into a lesion set.
 * Morphology alone can separate punctate red dots from blots and bright deposits
 * from cotton-wool spots; it cannot see IRMA, beading or neovascularisation, and
 * the narrative says so rather than pretending otherwise.
 */
function lesionsFromCandidates(
  candidates: { dark: Candidate[]; bright: Candidate[] },
  disc: DiscResult,
  structures: StructureAnalysis,
): { lesions: Lesion[]; counts: Record<LesionClass, number>; narrative: string } {
  const counts = emptyLesionCounts();
  const lesions: Lesion[] = [];
  let n = 0;

  const ranked = [
    ...candidates.dark.map((c) => ({ c, red: true })),
    ...candidates.bright.map((c) => ({ c, red: false })),
  ]
    .sort((a, b) => b.c.strength - a.c.strength)
    .slice(0, 40);

  for (const { c, red } of ranked) {
    const lesionClass: LesionClass = red
      ? c.size === 'punctate'
        ? 'microaneurysm'
        : 'haemorrhage'
      : c.areaPx > 120
        ? 'soft_exudate'
        : 'hard_exudate';
    counts[lesionClass] += 1;
    n += 1;
    lesions.push({
      id: `C${String(n).padStart(3, '0')}`,
      lesionClass,
      centre: c.centre,
      radius: Math.max(0.006, c.radiusNorm * 1.6),
      // Classical detection alone is a candidate, not a confirmed lesion.
      confidence: Math.round(Math.min(72, 34 + c.strength * 1.6)),
      quadrant: quadrantOf(c.centre, disc.centre, structures.laterality),
      source: 'cv',
      note: `${LESION_TAXONOMY[lesionClass].label} candidate — ${c.areaPx}px object, response strength ${c.strength}.`,
    });
  }

  const narrative =
    lesions.length === 0
      ? 'Classical detection found no red or bright objects meeting the morphological criteria for retinopathy lesions. Note that this engine cannot assess IRMA, venous beading or neovascularisation.'
      : `Classical detection identified ${counts.microaneurysm} microaneurysm-sized and ${counts.haemorrhage} blot-sized red objects, with ${counts.hard_exudate + counts.soft_exudate} bright deposits. These are morphological candidates rather than confirmed lesions; IRMA, venous beading and neovascularisation are outside this engine's reach and are reported as not assessed.`;

  return { lesions, counts, narrative };
}

function explainFourTwoOne(
  haem: number,
  beading: number,
  irma: number,
  quadrantsWithRed: number,
): string {
  const parts: string[] = [];
  parts.push(
    `Severe haemorrhage in ${haem}/4 quadrants (criterion: all 4); venous beading in ${beading} quadrant${beading === 1 ? '' : 's'} (criterion: 2 or more); IRMA in ${irma} quadrant${irma === 1 ? '' : 's'} (criterion: 1 or more).`,
  );
  parts.push(`Red lesions are present in ${quadrantsWithRed}/4 quadrants overall.`);
  if (haem >= 4 || beading >= 2 || irma >= 1) {
    parts.push('At least one 4-2-1 criterion is met, which defines severe non-proliferative disease.');
  } else {
    parts.push('No 4-2-1 criterion is met.');
  }
  return parts.join(' ');
}
