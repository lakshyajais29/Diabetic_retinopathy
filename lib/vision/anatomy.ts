import type { Laterality, Point, Quadrant } from '../pipeline/types';
import { boxBlur, clamp, round, type RasterImage, type RetinalMask } from './raster';

/**
 * Stage 2 measurements — where the anatomy is.
 *
 * The optic disc and fovea are located with classical image analysis rather than
 * a model, because their appearance is highly stereotyped and because every
 * downstream measurement (lesion distance from the fovea, disc-diameter units,
 * quadrant assignment) needs a stable, reproducible frame of reference.
 */

export interface DiscResult {
  centre: Point;
  radiusPx: number;
  radiusNorm: number;
  confidence: number;
  peak: number;
  detected: boolean;
}

export interface FoveaResult {
  centre: Point;
  confidence: number;
  discDiameters: number;
  detected: boolean;
}

export interface VesselResult {
  densityPct: number;
  arcadeContinuity: number;
  tortuosityIndex: number;
  calibreVariation: number;
  vesselMask: Uint8Array;
}

/** Optic disc diameter is ≈ 12–14% of the width of a 45° fundus field. */
const EXPECTED_DISC_RADIUS_FRACTION = 0.058;

export function locateOpticDisc(img: RasterImage, field: RetinalMask): DiscResult {
  const { width, height, data } = img;
  const n = width * height;

  // The disc is the brightest structure in the red+green channels; blue adds
  // mostly noise in fundus imagery so it is left out.
  const bright = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    bright[i] = 0.5 * (data[i * 3] + data[i * 3 + 1]);
  }

  const r = Math.max(3, Math.round(EXPECTED_DISC_RADIUS_FRACTION * width));
  const blurred = boxBlur(bright, width, height, r);

  // Restrict the search to well inside the retinal field — the bright rim at
  // the mask boundary would otherwise win every time.
  const inner = field.radius * 0.86;
  let best = -Infinity;
  let bestIdx = -1;
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!field.mask[i]) continue;
      const dx = x - field.centroid.x;
      const dy = y - field.centroid.y;
      if (dx * dx + dy * dy > inner * inner) continue;
      const v = blurred[i];
      sum += v;
      sumSq += v * v;
      count++;
      if (v > best) {
        best = v;
        bestIdx = i;
      }
    }
  }

  if (bestIdx < 0 || count < 50) {
    return {
      centre: { x: 0.5, y: 0.5 },
      radiusPx: r,
      radiusNorm: r / width,
      confidence: 0,
      peak: 0,
      detected: false,
    };
  }

  const mean = sum / count;
  const std = Math.sqrt(Math.max(1, sumSq / count - mean * mean));
  const z = (best - mean) / std;
  // A real disc stands 2–5 standard deviations above the retinal background.
  const confidence = clamp(((z - 1.0) / 3.0) * 100);

  const cx = bestIdx % width;
  const cy = (bestIdx - cx) / width;

  // Estimate the radius by growing the region that sits above the midpoint
  // between the peak and the retinal background.
  const level = (best + mean) / 2;
  let area = 0;
  const searchR = r * 3;
  for (let y = Math.max(0, cy - searchR); y < Math.min(height, cy + searchR); y++) {
    for (let x = Math.max(0, cx - searchR); x < Math.min(width, cx + searchR); x++) {
      const i = y * width + x;
      if (field.mask[i] && blurred[i] >= level) area++;
    }
  }
  const measured = Math.sqrt(Math.max(area, 1) / Math.PI);
  const radiusPx = Math.min(width * 0.11, Math.max(width * 0.03, measured));

  return {
    centre: { x: cx / width, y: cy / height },
    radiusPx,
    radiusNorm: radiusPx / width,
    confidence: Math.round(confidence),
    peak: best,
    detected: confidence > 25,
  };
}

export function locateFovea(
  img: RasterImage,
  field: RetinalMask,
  disc: DiscResult,
): FoveaResult {
  const { width, height, lum } = img;
  const r = Math.max(3, Math.round(disc.radiusPx * 0.9));
  const dark = boxBlur(lum, width, height, r);

  const dd = disc.radiusPx * 2; // one disc diameter, in pixels
  const dcx = disc.centre.x * width;
  const dcy = disc.centre.y * height;
  const inner = field.radius * 0.82;

  let bestScore = Infinity;
  let bx = -1;
  let by = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!field.mask[i]) continue;
      const fx = x - field.centroid.x;
      const fy = y - field.centroid.y;
      if (fx * fx + fy * fy > inner * inner) continue;

      const ddx = x - dcx;
      const ddy = y - dcy;
      const dist = Math.hypot(ddx, ddy);
      // The fovea sits 2–3 disc diameters temporal to the disc, close to the
      // horizontal meridian. Both facts are encoded as a search prior.
      if (dist < dd * 1.7 || dist > dd * 3.6) continue;
      const verticalPenalty = (Math.abs(ddy) / dd) * 22;
      const score = dark[i] + verticalPenalty;
      if (score < bestScore) {
        bestScore = score;
        bx = x;
        by = y;
      }
    }
  }

  if (bx < 0) {
    return {
      centre: { x: disc.centre.x > 0.5 ? 0.28 : 0.72, y: 0.5 },
      confidence: 0,
      discDiameters: 0,
      detected: false,
    };
  }

  // Confidence from how much darker the macula is than the retinal background.
  let sum = 0;
  let count = 0;
  for (let i = 0; i < field.mask.length; i++) {
    if (!field.mask[i]) continue;
    sum += dark[i];
    count++;
  }
  const mean = count ? sum / count : 1;
  const depth = mean > 0 ? (mean - bestScore) / mean : 0;
  const confidence = clamp(depth * 320);

  return {
    centre: { x: bx / width, y: by / height },
    confidence: Math.round(confidence),
    discDiameters: round(Math.hypot(bx - dcx, by - dcy) / dd, 2),
    detected: confidence > 20,
  };
}

export function analyseVessels(
  img: RasterImage,
  field: RetinalMask,
  disc: DiscResult,
): VesselResult {
  const { width, height, green } = img;
  const n = width * height;

  // Vessels are locally darker than their surroundings in the green channel.
  // A small-radius background estimate turns that into a positive response.
  const r = Math.max(2, Math.round(width * 0.013));
  const background = boxBlur(green, width, height, r);

  const response = new Float32Array(n);
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (!field.mask[i]) continue;
    const v = background[i] - green[i];
    response[i] = v;
    sum += v;
    sumSq += v * v;
    count++;
  }
  const mean = count ? sum / count : 0;
  const std = count ? Math.sqrt(Math.max(0.01, sumSq / count - mean * mean)) : 1;
  const threshold = mean + 1.15 * std;

  const vesselMask = new Uint8Array(n);
  let vesselCount = 0;
  let strengthSum = 0;
  let strengthSq = 0;
  for (let i = 0; i < n; i++) {
    if (field.mask[i] && response[i] > threshold) {
      vesselMask[i] = 1;
      vesselCount++;
      strengthSum += response[i];
      strengthSq += response[i] * response[i];
    }
  }

  const densityPct = count ? (vesselCount / count) * 100 : 0;

  // Boundary-to-area ratio as a shape proxy: thin, winding vasculature has a
  // much higher perimeter per unit area than blob-like artefacts.
  let boundary = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (!vesselMask[i]) continue;
      if (
        !vesselMask[i - 1] ||
        !vesselMask[i + 1] ||
        !vesselMask[i - width] ||
        !vesselMask[i + width]
      )
        boundary++;
    }
  }
  const perimeterRatio = vesselCount ? boundary / vesselCount : 0;
  const tortuosityIndex = round(clamp(((perimeterRatio - 0.35) / 0.75) * 100) / 100, 2);

  const sMean = vesselCount ? strengthSum / vesselCount : 0;
  const sStd = vesselCount
    ? Math.sqrt(Math.max(0, strengthSq / vesselCount - sMean * sMean))
    : 0;
  const calibreVariation = round(sMean ? clamp((sStd / sMean) * 100) / 100 : 0, 2);

  /* Arcade continuity — is vasculature visible all the way around the disc, or
     only on one side (which usually means vignetting or a cut-off field)? */
  const dcx = disc.centre.x * width;
  const dcy = disc.centre.y * height;
  const rIn = disc.radiusPx * 1.5;
  const rOut = disc.radiusPx * 4.5;
  const quadTotals = [0, 0, 0, 0];
  const quadVessels = [0, 0, 0, 0];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!field.mask[i]) continue;
      const dx = x - dcx;
      const dy = y - dcy;
      const d = Math.hypot(dx, dy);
      if (d < rIn || d > rOut) continue;
      const q = (dy < 0 ? 0 : 2) + (dx < 0 ? 0 : 1);
      quadTotals[q]++;
      if (vesselMask[i]) quadVessels[q]++;
    }
  }
  const quadDensities = quadTotals.map((t, i) => (t > 40 ? quadVessels[i] / t : 0));
  const dMean = quadDensities.reduce((a, b) => a + b, 0) / 4;
  const dMin = Math.min(...quadDensities);
  const arcadeContinuity = Math.round(dMean > 0 ? clamp((dMin / dMean) * 100) : 0);

  return {
    densityPct: round(densityPct, 2),
    arcadeContinuity,
    tortuosityIndex,
    calibreVariation,
    vesselMask,
  };
}

/**
 * Laterality from disc-to-fovea geometry.
 *
 * The optic disc lies nasal to the fovea. In a standard (non-mirrored) fundus
 * photograph of the RIGHT eye the nasal side of the retina is rendered on the
 * right of the frame, so a disc sitting to the right of the macula indicates OD.
 * The rule is surfaced in the UI so a clinician can audit rather than trust it.
 */
export function inferLaterality(
  disc: DiscResult,
  fovea: FoveaResult,
): { laterality: Laterality; rationale: string } {
  if (!disc.detected || !fovea.detected) {
    return {
      laterality: 'indeterminate',
      rationale:
        'Laterality not inferred — the disc–fovea geometry could not be established with sufficient confidence.',
    };
  }
  const dx = disc.centre.x - fovea.centre.x;
  if (Math.abs(dx) < 0.06) {
    return {
      laterality: 'indeterminate',
      rationale:
        'Disc and macula are almost vertically aligned; the horizontal separation is too small to infer laterality.',
    };
  }
  const laterality: Laterality = dx > 0 ? 'OD' : 'OS';
  return {
    laterality,
    rationale:
      dx > 0
        ? 'The optic disc lies temporal-to-nasal on the right of the macula, which in a non-mirrored fundus photograph indicates the right eye (OD).'
        : 'The optic disc lies to the left of the macula, which in a non-mirrored fundus photograph indicates the left eye (OS).',
  };
}

/** Field definition: what the photographer actually centred on. */
export function classifyField(
  disc: DiscResult,
  fovea: FoveaResult,
  field: RetinalMask,
  img: RasterImage,
): 'macula-centred' | 'disc-centred' | 'peripheral' | 'indeterminate' {
  if (!disc.detected) return 'indeterminate';
  const cx = field.centroid.x / img.width;
  const cy = field.centroid.y / img.height;
  const discDist = Math.hypot(disc.centre.x - cx, disc.centre.y - cy);
  const fovDist = fovea.detected
    ? Math.hypot(fovea.centre.x - cx, fovea.centre.y - cy)
    : Infinity;
  if (fovDist < 0.13) return 'macula-centred';
  if (discDist < 0.13) return 'disc-centred';
  if (fovDist < discDist) return 'macula-centred';
  return 'peripheral';
}

/**
 * Quadrant of a point relative to the optic disc, named in retinal terms.
 * Temporal/nasal depends on which eye we are looking at.
 */
export function quadrantOf(p: Point, disc: Point, laterality: Laterality): Quadrant {
  const dx = p.x - disc.x;
  const dy = p.y - disc.y;
  const superior = dy < 0;
  // For OD the temporal side is image-left; for OS it is image-right.
  const temporal = laterality === 'OS' ? dx > 0 : dx < 0;
  if (superior) return temporal ? 'superotemporal' : 'superonasal';
  return temporal ? 'inferotemporal' : 'inferonasal';
}
