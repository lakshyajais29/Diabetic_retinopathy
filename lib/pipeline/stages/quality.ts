import type { EnhancementRecord, QualityAssessment } from '../types';
import { QUALITY_THRESHOLDS } from '../constants';
import { loadRaster, retinalMask, toDataUrl, type RasterImage, type RetinalMask } from '../../vision/raster';
import {
  compositeScore,
  failureReasons,
  measureQuality,
  metricDeltas,
  recaptureGuidance,
  scoreQuality,
  verdictFor,
} from '../../vision/quality';
import { enhanceFundus, normaliseForDisplay } from '../../vision/enhance';
import { callModel, ModelUnavailableError } from '../../mistral/client';
import { CLINICAL_SYSTEM, qualityPrompt } from '../../mistral/prompts';
import { qualityReviewSchema } from '../../mistral/schemas';
import type { EngineKind } from '../types';

export interface QualityStageResult {
  assessment: QualityAssessment;
  /** The image the rest of the pipeline should work from. */
  workingBuffer: Buffer;
  raster: RasterImage;
  field: RetinalMask;
  degraded: boolean;
  degradedReason?: string;
}

/**
 * Stage 1 — is this photograph good enough to grade?
 *
 * The score is computed from real image statistics. The model contributes only
 * what statistics cannot see: dust, eyelashes, arc artefacts, media haze. If the
 * model says the image is unreadable when the numbers say it is fine, the image
 * is downgraded — a disagreement about safety always resolves conservatively.
 */
export async function runQualityStage(
  originalBuffer: Buffer,
  engine: EngineKind,
  onProgress: (message: string, pct: number) => void,
): Promise<QualityStageResult> {
  onProgress('Decoding image and isolating the retinal field of view', 10);

  let raster = await loadRaster(originalBuffer);
  let field = retinalMask(raster);

  onProgress('Measuring sharpness, illumination, contrast and framing', 28);
  let measurements = measureQuality(raster, field);
  let metrics = scoreQuality(measurements);
  let score = compositeScore(metrics);
  let verdict = verdictFor(score, metrics);

  const baselineMetrics = metrics;
  const baselineScore = score;
  const baselineVerdict = verdict;

  let workingBuffer = await normaliseForDisplay(originalBuffer);
  let enhancement: EnhancementRecord | null = null;

  /* Anything short of "good" earns one enhancement attempt. Enhancement is
     accepted only if it measurably improves the composite score. */
  if (verdict !== 'good') {
    onProgress('Image is sub-optimal — applying retinal enhancement', 44);
    try {
      const enhanced = await enhanceFundus(originalBuffer);
      const enhancedRaster = await loadRaster(enhanced.buffer);
      const enhancedField = retinalMask(enhancedRaster);
      const enhancedMeasurements = measureQuality(enhancedRaster, enhancedField);

      /* Optical resolution cannot be restored by post-processing.
         An unsharp mask raises measured Laplacian variance by amplifying noise,
         without adding one bit of diagnostic information — so an out-of-focus
         photograph would otherwise be able to *enhance its way past the quality
         gate*, which is the most dangerous thing this stage could permit.
         The sharpness sub-score is therefore always carried from the original
         capture. Enhancement may fix lighting, contrast and exposure. It may
         not claim to have fixed focus. */
      const originalSharpness = baselineMetrics.find((m) => m.key === 'sharpness')!;
      const enhancedMetrics = scoreQuality(enhancedMeasurements).map((m) =>
        m.key === 'sharpness' ? originalSharpness : m,
      );
      const enhancedScore = compositeScore(enhancedMetrics);
      const enhancedVerdict = verdictFor(enhancedScore, enhancedMetrics);

      const accepted = enhancedScore > baselineScore + 1;

      enhancement = {
        applied: accepted,
        operations: enhanced.operations,
        scoreBefore: baselineScore,
        scoreAfter: enhancedScore,
        verdictBefore: baselineVerdict,
        verdictAfter: accepted ? enhancedVerdict : baselineVerdict,
        imageBefore: await toDataUrl(workingBuffer),
        imageAfter: await toDataUrl(enhanced.buffer),
        deltas: metricDeltas(baselineMetrics, enhancedMetrics),
      };

      if (accepted) {
        raster = enhancedRaster;
        field = enhancedField;
        measurements = enhancedMeasurements;
        metrics = enhancedMetrics;
        score = enhancedScore;
        verdict = enhancedVerdict;
        workingBuffer = enhanced.buffer;
      }
    } catch {
      // Enhancement is an optimisation, never a hard dependency.
      enhancement = null;
    }
  }

  const assessment: QualityAssessment = {
    overallScore: score,
    verdict,
    gradable: verdict !== 'ungradeable',
    metrics,
    failureReasons: failureReasons(metrics),
    recaptureGuidance: recaptureGuidance(metrics),
    enhancement,
    imageWidth: raster.width,
    imageHeight: raster.height,
    narrative: defaultNarrative(score, verdict),
  };

  let degraded = false;
  let degradedReason: string | undefined;

  if (engine === 'mistral') {
    onProgress('Vision model reviewing for artefacts statistics cannot see', 72);
    try {
      const review = await callModel(
        {
          label: 'Stage 1 quality review',
          system: CLINICAL_SYSTEM,
          user: qualityPrompt({
            overallScore: score,
            verdict,
            metrics: metrics.map((m) => ({
              label: m.label,
              score: m.score,
              raw: m.raw,
              rawLabel: m.rawLabel,
            })),
          }),
          image: await toDataUrl(workingBuffer),
          temperature: 0.1,
          maxTokens: 900,
        },
        qualityReviewSchema,
      );

      assessment.narrative = review.narrative;

      for (const artefact of review.artefacts) {
        assessment.failureReasons.push(`Visual artefact — ${artefact}`);
      }
      for (const observation of review.observations) {
        if (!assessment.failureReasons.some((r) => r.includes(observation))) {
          assessment.failureReasons.push(observation);
        }
      }

      // Conservative resolution of disagreement: the model may only make the
      // verdict stricter, never more permissive.
      if (!review.gradable && assessment.verdict === 'good') {
        assessment.verdict = 'borderline';
        assessment.failureReasons.unshift(
          'Vision model judged the image unreadable for grading despite acceptable measured statistics — downgraded to borderline for safety.',
        );
      }
      if (!review.gradable && assessment.verdict === 'borderline' && score < QUALITY_THRESHOLDS.borderlineBelow - 12) {
        assessment.verdict = 'ungradeable';
        assessment.gradable = false;
      }
    } catch (err) {
      degraded = true;
      degradedReason =
        err instanceof ModelUnavailableError
          ? err.message
          : 'Model review unavailable; quality verdict rests on measured statistics alone.';
    }
  }

  onProgress('Quality verdict finalised', 100);

  return { assessment, workingBuffer, raster, field, degraded, degradedReason };
}

function defaultNarrative(score: number, verdict: string): string {
  if (verdict === 'ungradeable') {
    return `Composite quality ${score}/100 falls below the gradable threshold of ${QUALITY_THRESHOLDS.ungradeableBelow}. This photograph cannot support a safe retinopathy grade and should be recaptured before the patient leaves the centre.`;
  }
  if (verdict === 'borderline') {
    return `Composite quality ${score}/100 is usable but below the ${QUALITY_THRESHOLDS.borderlineBelow} threshold for a clean read. Grading will proceed, and the reduced quality is carried forward into the confidence calculation.`;
  }
  return `Composite quality ${score}/100. The retinal field is well framed, adequately exposed and sharp enough to resolve microaneurysm-scale detail.`;
}
