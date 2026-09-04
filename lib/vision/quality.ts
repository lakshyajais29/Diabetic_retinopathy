import type { QualityMetric, QualityMetricKey, QualityVerdict } from '../pipeline/types';
import { QUALITY_THRESHOLDS } from '../pipeline/constants';
import {
  bandScore,
  boxBlur,
  clamp,
  logScore,
  round,
  type RasterImage,
  type RetinalMask,
} from './raster';

/**
 * Stage 1 measurements.
 *
 * These are genuine image statistics, not model opinion. Each one is reported
 * alongside its raw physical value so a clinician or a judge can audit why a
 * photograph was called ungradeable.
 */

export interface RawQualityMeasurements {
  laplacianVariance: number;
  meanLuminance: number;
  rmsContrast: number;
  illuminationCv: number;
  clippedHighPct: number;
  clippedLowPct: number;
  coverage: number;
  bboxFill: number;
  clippedEdges: number;
  meanSaturation: number;
}

/** Weights sum to 1. Sharpness dominates because a blurred image hides microaneurysms. */
const WEIGHTS: Record<QualityMetricKey, number> = {
  sharpness: 0.3,
  illumination: 0.16,
  contrast: 0.18,
  exposure: 0.16,
  fieldCoverage: 0.12,
  colourFidelity: 0.08,
};

export function measureQuality(
  img: RasterImage,
  field: RetinalMask,
): RawQualityMeasurements {
  const { width, height, lum, green, data } = img;
  const { mask } = field;

  /* Sharpness — variance of the 4-neighbour Laplacian on the green channel,
     evaluated only where the full neighbourhood lies inside the retina. */
  let lapSum = 0;
  let lapSqSum = 0;
  let lapN = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (!mask[i] || !mask[i - 1] || !mask[i + 1] || !mask[i - width] || !mask[i + width])
        continue;
      const lap =
        4 * green[i] - green[i - 1] - green[i + 1] - green[i - width] - green[i + width];
      lapSum += lap;
      lapSqSum += lap * lap;
      lapN++;
    }
  }
  const lapMean = lapN ? lapSum / lapN : 0;
  const laplacianVariance = lapN ? lapSqSum / lapN - lapMean * lapMean : 0;

  /* Luminance statistics and clipping, inside the field only. */
  let lumSum = 0;
  let lumSq = 0;
  let clipHigh = 0;
  let clipLow = 0;
  let satSum = 0;
  let n = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const l = lum[i];
    lumSum += l;
    lumSq += l * l;
    if (l > 248) clipHigh++;
    if (l < 12) clipLow++;
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    satSum += mx > 0 ? (mx - mn) / mx : 0;
    n++;
  }
  const meanLuminance = n ? lumSum / n : 0;
  const rmsContrast = n ? Math.sqrt(Math.max(0, lumSq / n - meanLuminance ** 2)) : 0;
  const meanSaturation = n ? satSum / n : 0;

  /* Illumination uniformity — coefficient of variation across an 8x8 grid of
     block means. Vignetting and single-sided flash both show up here. */
  const gridN = 8;
  const blockW = Math.ceil(width / gridN);
  const blockH = Math.ceil(height / gridN);
  const blockMeans: number[] = [];
  for (let by = 0; by < gridN; by++) {
    for (let bx = 0; bx < gridN; bx++) {
      let s = 0;
      let c = 0;
      for (let y = by * blockH; y < Math.min(height, (by + 1) * blockH); y++) {
        for (let x = bx * blockW; x < Math.min(width, (bx + 1) * blockW); x++) {
          const i = y * width + x;
          if (!mask[i]) continue;
          s += lum[i];
          c++;
        }
      }
      if (c > (blockW * blockH) / 6) blockMeans.push(s / c);
    }
  }
  let illuminationCv = 0;
  if (blockMeans.length > 2) {
    const bm = blockMeans.reduce((a, b) => a + b, 0) / blockMeans.length;
    const bv =
      blockMeans.reduce((a, b) => a + (b - bm) ** 2, 0) / blockMeans.length;
    illuminationCv = bm > 0 ? Math.sqrt(bv) / bm : 0;
  }

  const bboxArea =
    (field.bbox.x1 - field.bbox.x0 + 1) * (field.bbox.y1 - field.bbox.y0 + 1);

  return {
    laplacianVariance,
    meanLuminance,
    rmsContrast,
    illuminationCv,
    clippedHighPct: n ? (clipHigh / n) * 100 : 0,
    clippedLowPct: n ? (clipLow / n) * 100 : 0,
    coverage: field.coverage,
    bboxFill: bboxArea > 0 ? field.count / bboxArea : 0,
    clippedEdges: field.clippedEdges,
    meanSaturation,
  };
}

export function scoreQuality(m: RawQualityMeasurements): QualityMetric[] {
  /* Sharpness: below ~12 the image cannot resolve a microaneurysm at all;
     above ~350 further sharpness buys nothing diagnostically. */
  const sharpness = logScore(m.laplacianVariance, 12, 350);

  const contrast = bandScore(m.rmsContrast, 10, 36, 82, 125);

  const brightness = bandScore(m.meanLuminance, 22, 74, 158, 218);
  const clipPenalty = clamp(m.clippedHighPct * 7 + m.clippedLowPct * 2.5, 0, 60);
  const exposure = clamp(brightness - clipPenalty);

  const illumination = clamp(((0.45 - m.illuminationCv) / (0.45 - 0.12)) * 100);

  // A tight rectangular crop (fill ≈ 1) is a legitimate dataset convention.
  // A circular field that runs off three or more frame edges is not.
  const coverageBase = bandScore(m.coverage, 0.12, 0.42, 1.0, 1.02);
  const circleCut =
    m.coverage < 0.9 && m.bboxFill > 0.88
      ? 28
      : m.coverage < 0.9 && m.clippedEdges >= 3
        ? 22
        : 0;
  const fieldCoverage = clamp(coverageBase - circleCut);

  const colourFidelity = bandScore(m.meanSaturation, 0.05, 0.28, 0.82, 0.97);

  const build = (
    key: QualityMetricKey,
    label: string,
    score: number,
    raw: number,
    rawLabel: string,
    notes: { pass: string; warn: string; fail: string },
  ): QualityMetric => {
    const status: QualityMetric['status'] =
      score >= 70 ? 'pass' : score >= 45 ? 'warn' : 'fail';
    return {
      key,
      label,
      score: Math.round(score),
      raw: round(raw, 2),
      rawLabel,
      status,
      note: notes[status],
    };
  };

  return [
    build('sharpness', 'Sharpness / focus', sharpness, m.laplacianVariance, 'Laplacian variance', {
      pass: 'Fine retinal detail is resolved — microaneurysm-scale features are visible.',
      warn: 'Softer than ideal. The smallest lesions may be missed.',
      fail: 'Out of focus or motion-blurred. Microaneurysms cannot be resolved at this level of detail.',
    }),
    build('illumination', 'Illumination uniformity', illumination, m.illuminationCv * 100, '% brightness variation across field', {
      pass: 'Evenly lit across the retinal field.',
      warn: 'Uneven lighting across the field; peripheral findings may be obscured.',
      fail: 'Severe vignetting or single-sided flash — large parts of the retina are unreadable.',
    }),
    build('contrast', 'Contrast', contrast, m.rmsContrast, 'RMS luminance contrast', {
      pass: 'Lesion-to-background separation is adequate.',
      warn: 'Low contrast — subtle red lesions may blend into the background.',
      fail: 'Washed out. Lesions cannot be separated from background retina.',
    }),
    build('exposure', 'Exposure', exposure, m.meanLuminance, 'mean luminance (0–255)', {
      pass: 'Well exposed with no significant clipping.',
      warn: `Sub-optimal exposure (${round(m.clippedHighPct, 1)}% blown highlights, ${round(m.clippedLowPct, 1)}% crushed shadows).`,
      fail: 'Badly over- or under-exposed; large regions carry no recoverable detail.',
    }),
    build('fieldCoverage', 'Retinal field coverage', fieldCoverage, m.coverage * 100, '% of frame occupied by retina', {
      pass: 'The retinal field is well framed within the image.',
      warn: 'Framing is off-centre or the field is partly cut off.',
      fail: 'The retinal field is badly cropped or too small — the gradable area is incomplete.',
    }),
    build('colourFidelity', 'Colour fidelity', colourFidelity, m.meanSaturation, 'mean saturation (0–1)', {
      pass: 'Normal fundus colour balance.',
      warn: 'Colour cast or desaturation may affect exudate/haemorrhage discrimination.',
      fail: 'Colour information is largely absent — red and bright lesions cannot be distinguished by hue.',
    }),
  ];
}

export function compositeScore(metrics: QualityMetric[]): number {
  let total = 0;
  for (const m of metrics) total += m.score * WEIGHTS[m.key];
  return Math.round(total);
}

export function verdictFor(
  score: number,
  metrics: QualityMetric[],
): QualityVerdict {
  const worst = Math.min(...metrics.map((m) => m.score));
  if (score < QUALITY_THRESHOLDS.ungradeableBelow) return 'ungradeable';
  // A single catastrophic metric (e.g. total blur) makes an otherwise decent
  // average meaningless, so it is not allowed to be averaged away.
  if (worst < QUALITY_THRESHOLDS.criticalMetricFloor) {
    return score < QUALITY_THRESHOLDS.borderlineBelow ? 'ungradeable' : 'borderline';
  }
  if (score < QUALITY_THRESHOLDS.borderlineBelow) return 'borderline';
  return 'good';
}

export function failureReasons(metrics: QualityMetric[]): string[] {
  return metrics
    .filter((m) => m.status !== 'pass')
    .sort((a, b) => a.score - b.score)
    .map((m) => `${m.label} — ${m.score}/100 (${m.rawLabel}: ${m.raw}). ${m.note}`);
}

const GUIDANCE: Record<QualityMetricKey, string> = {
  sharpness:
    'Ask the patient to hold fixation, steady the camera, and re-acquire focus on the vessel arcades before capturing.',
  illumination:
    'Re-centre the camera on the pupil and check for iris shadowing on one side; reduce working distance slightly.',
  contrast:
    'Clean the objective lens, and confirm the room is dark enough for the pupil to stay dilated.',
  exposure:
    'Step the flash intensity down one level if highlights are blown, or up one level if the image is dark.',
  fieldCoverage:
    'Re-frame so the optic disc and macula both sit inside the field, with the retinal circle fully within the frame.',
  colourFidelity:
    'Check the camera white-balance preset is set to fundus/daylight rather than auto.',
};

export function recaptureGuidance(metrics: QualityMetric[]): string[] {
  return metrics
    .filter((m) => m.status !== 'pass')
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((m) => GUIDANCE[m.key]);
}

/** Utility used by the enhancement step to compare metric sets. */
export function metricDeltas(before: QualityMetric[], after: QualityMetric[]) {
  return before.map((b) => {
    const a = after.find((x) => x.key === b.key)!;
    return { key: b.key, label: b.label, before: b.score, after: a.score };
  });
}

/** Illumination-flattened luminance, exported for reuse by the enhancement pass. */
export function illuminationField(img: RasterImage, radius: number): Float32Array {
  return boxBlur(img.lum, img.width, img.height, radius);
}

/**
 * Validates whether an uploaded image matches basic spectral and anatomical
 * properties of a posterior-pole fundus photograph. Protects the pipeline
 * against non-retinal uploads (e.g. selfies, landscapes, objects).
 */
export function validateRetinalFundusImage(
  img: RasterImage,
  field: RetinalMask,
): { valid: boolean; reason?: string } {
  const { data, width, height } = img;
  const { mask, count } = field;
  const n = width * height;

  if (count === 0 || count < n * 0.05) {
    return { valid: false, reason: 'Image is completely dark or empty.' };
  }

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let sampleCount = 0;

  for (let i = 0; i < n; i += 2) {
    if (!mask[i]) continue;
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    totalR += r;
    totalG += g;
    totalB += b;
    sampleCount++;
  }

  if (sampleCount === 0) {
    return { valid: false, reason: 'No retinal field detected.' };
  }

  const avgR = totalR / sampleCount;
  const avgG = totalG / sampleCount;
  const avgB = totalB / sampleCount;

  const redToBlueRatio = avgR / (avgB + 1);

  if (avgR < 20 && avgG < 20 && avgB < 20) {
    return { valid: false, reason: 'Image is severely underexposed or pitch black.' };
  }

  if (avgB > avgR) {
    return { valid: false, reason: 'Photo has blue spectral dominance, not matching retinal tissue.' };
  }

  if (redToBlueRatio < 1.35) {
    return { valid: false, reason: 'Photo lacks characteristic red-channel dominance of fundus photography.' };
  }

  if (avgG > avgR * 1.4) {
    return { valid: false, reason: 'Photo has green dominance, uncharacteristic of fundus photography.' };
  }

  return { valid: true };
}

