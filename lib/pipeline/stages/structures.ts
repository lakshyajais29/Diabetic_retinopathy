import type { EngineKind, StructureAnalysis } from '../types';
import type { RasterImage, RetinalMask } from '../../vision/raster';
import { round, toDataUrl } from '../../vision/raster';
import {
  analyseVessels,
  classifyField,
  inferLaterality,
  locateFovea,
  locateOpticDisc,
  type DiscResult,
  type FoveaResult,
  type VesselResult,
} from '../../vision/anatomy';
import { callModel } from '../../mistral/client';
import { CLINICAL_SYSTEM, structurePrompt } from '../../mistral/prompts';
import { structureReviewSchema } from '../../mistral/schemas';

export interface StructureStageResult {
  analysis: StructureAnalysis;
  disc: DiscResult;
  fovea: FoveaResult;
  vessels: VesselResult;
  degraded: boolean;
  degradedReason?: string;
}

/**
 * Stage 2 — establish the anatomical frame of reference.
 *
 * Everything after this point is measured relative to the disc and the fovea:
 * lesion quadrants, distance-from-macula, lesion density per disc area. Getting
 * the anatomy wrong quietly corrupts every later number, so the CV result is put
 * to the model for an independent second opinion and any disagreement is
 * surfaced rather than averaged away.
 */
export async function runStructureStage(
  raster: RasterImage,
  field: RetinalMask,
  workingBuffer: Buffer,
  engine: EngineKind,
  onProgress: (message: string, pct: number) => void,
): Promise<StructureStageResult> {
  onProgress('Locating the optic disc', 18);
  const disc = locateOpticDisc(raster, field);

  onProgress('Estimating the foveal centre from disc geometry', 38);
  const fovea = locateFovea(raster, field, disc);

  onProgress('Extracting the vascular map', 58);
  const vessels = analyseVessels(raster, field, disc);

  const { laterality, rationale } = inferLaterality(disc, fovea);
  const fieldDefinition = classifyField(disc, fovea, field, raster);

  const analysis: StructureAnalysis = {
    opticDisc: {
      detected: disc.detected,
      centre: disc.centre,
      radius: round(disc.radiusNorm, 4),
      confidence: disc.confidence,
      cupToDiscEstimate: null,
      note: disc.detected
        ? `Disc localised at ${(disc.confidence / 100).toFixed(2)} confidence with an estimated radius of ${(disc.radiusNorm * 100).toFixed(1)}% of image width.`
        : 'No structure stood far enough above the retinal background to be confidently identified as the optic disc.',
    },
    fovea: {
      detected: fovea.detected,
      centre: fovea.centre,
      discDiameters: fovea.discDiameters,
      confidence: fovea.confidence,
      note: fovea.detected
        ? `Macular centre estimated ${fovea.discDiameters} disc diameters from the disc — anatomically plausible (normal range 2.0–3.0 DD).`
        : 'Foveal centre could not be confidently localised; macular findings will be reported without a distance-from-fovea measure.',
    },
    macula: {
      centre: fovea.centre,
      // The clinically-defined macula is roughly two disc diameters across.
      radius: round(Math.max(0.08, disc.radiusNorm * 2), 4),
    },
    vessels: {
      densityPct: vessels.densityPct,
      arcadeContinuity: vessels.arcadeContinuity,
      tortuosityIndex: vessels.tortuosityIndex,
      calibreVariation: vessels.calibreVariation,
      note: describeVessels(vessels),
    },
    laterality,
    lateralityRationale: rationale,
    fieldDefinition,
    anatomyComplete: disc.detected && fovea.detected,
    modelAgreement: {
      status: 'not-assessed',
      note: 'Structural read not independently corroborated — the deterministic engine measured the anatomy without a second opinion.',
      discOffset: null,
    },
    narrative: buildNarrative(disc, fovea, vessels, laterality, fieldDefinition),
  };

  let degraded = false;
  let degradedReason: string | undefined;

  if (engine === 'mistral') {
    onProgress('Vision model corroborating anatomical landmarks', 80);
    try {
      const review = await callModel(
        {
          label: 'Stage 2 structure review',
          system: CLINICAL_SYSTEM,
          user: structurePrompt({
            discDetected: disc.detected,
            discX: disc.centre.x,
            discY: disc.centre.y,
            discConfidence: disc.confidence,
            foveaDetected: fovea.detected,
            foveaX: fovea.centre.x,
            foveaY: fovea.centre.y,
            vesselDensity: vessels.densityPct,
            arcadeContinuity: vessels.arcadeContinuity,
            lateralityGuess: laterality,
          }),
          image: await toDataUrl(workingBuffer),
          temperature: 0.1,
          maxTokens: 900,
        },
        structureReviewSchema,
      );

      analysis.narrative = review.narrative;

      if (review.opticDiscVisible && review.opticDisc) {
        const offset = Math.hypot(
          review.opticDisc.x - disc.centre.x,
          review.opticDisc.y - disc.centre.y,
        );
        // Agreement within one disc diameter is a match; beyond that the two
        // methods are pointing at different structures.
        const tolerance = Math.max(0.12, disc.radiusNorm * 2.2);
        analysis.modelAgreement = {
          status: offset <= tolerance ? 'agree' : 'disagree',
          discOffset: round(offset, 3),
          note:
            offset <= tolerance
              ? `Independent model localisation agrees with the classical detector to within ${(offset * 100).toFixed(1)}% of image width.`
              : `Model places the optic disc ${(offset * 100).toFixed(1)}% of image width away from the classical detection. The anatomical frame of reference is uncertain, and this is carried into the confidence calculation.`,
        };
        if (offset > tolerance) analysis.anatomyComplete = false;
      } else {
        analysis.modelAgreement = {
          status: disc.detected ? 'disagree' : 'agree',
          discOffset: null,
          note: disc.detected
            ? 'The model could not see an optic disc where the classical detector found one — landmark confidence is reduced.'
            : 'Both methods agree that no optic disc is clearly visible in this field.',
        };
      }

      if (review.vesselAssessment !== 'normal') {
        analysis.vessels.note += ` Model vascular read: ${review.vesselAssessment}.`;
      }
      if (
        review.laterality !== 'uncertain' &&
        laterality !== 'indeterminate' &&
        review.laterality !== laterality
      ) {
        analysis.lateralityRationale += ` Note: the model read this as ${review.laterality}; laterality is reported as inferred, not established.`;
      }
    } catch (err) {
      degraded = true;
      degradedReason =
        err instanceof Error ? err.message : 'Structural corroboration unavailable.';
    }
  }

  onProgress('Anatomical frame of reference established', 100);
  return { analysis, disc, fovea, vessels, degraded, degradedReason };
}

function describeVessels(v: VesselResult): string {
  const parts: string[] = [];
  if (v.densityPct < 4)
    parts.push('Vascular signal is sparse — either an unusually clean field or poor vessel contrast.');
  else if (v.densityPct > 16)
    parts.push('Dense vascular signal; some of this may be pigment or noise rather than true vasculature.');
  else parts.push('Vascular density is within the expected range for a 45° field.');

  if (v.arcadeContinuity < 45)
    parts.push('Vasculature is visible unevenly around the disc, suggesting part of the field is obscured.');
  else parts.push('Major arcades are traceable in all four directions from the disc.');

  return parts.join(' ');
}

function buildNarrative(
  disc: DiscResult,
  fovea: FoveaResult,
  vessels: VesselResult,
  laterality: string,
  fieldDefinition: string,
): string {
  if (!disc.detected) {
    return 'The optic disc could not be confidently localised, so the anatomical frame of reference is incomplete. Lesion positions will still be reported, but quadrant assignment and disc-relative measurements are unreliable in this image.';
  }
  return `A ${fieldDefinition} ${laterality === 'indeterminate' ? 'field' : laterality} view. The optic disc is localised at ${Math.round(disc.confidence)}/100 confidence${fovea.detected ? ` with the macula ${fovea.discDiameters} disc diameters away` : ', but the macular centre remains uncertain'}. Vascular density measures ${vessels.densityPct}% of retinal area with arcade visibility of ${vessels.arcadeContinuity}/100.`;
}
