import type { Point } from '../pipeline/types';
import {
  boxBlur,
  connectedComponents,
  type Blob,
  type RasterImage,
  type RetinalMask,
} from './raster';
import type { DiscResult, VesselResult } from './anatomy';

/**
 * Classical lesion *candidate* detection.
 *
 * This deliberately does not attempt to be the final word on what a lesion is —
 * that is the reasoning stage's job. What it provides is an independent,
 * deterministic second opinion: a set of morphologically plausible red and
 * bright candidates, which stage 3 uses to corroborate (or contradict) the
 * model's findings. Two independent methods agreeing is evidence; one method
 * asserting alone is not.
 */

export interface Candidate {
  centre: Point;
  radiusNorm: number;
  areaPx: number;
  strength: number;
  kind: 'dark' | 'bright';
  /** Small, round dark candidates are microaneurysm-like; larger ones are blot-like. */
  size: 'punctate' | 'blot';
}

export interface CandidateSet {
  dark: Candidate[];
  bright: Candidate[];
  /** Detection thresholds actually used, kept for the audit trail. */
  darkThreshold: number;
  brightThreshold: number;
}

function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const f = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i++) f[i] = mask[i];
  const blurred = boxBlur(f, width, height, radius);
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = blurred[i] > 0.0001 ? 1 : 0;
  return out;
}

/**
 * Build the exclusion mask used to keep vessels out of the red-lesion search.
 *
 * The vessel extractor keys on "locally darker than background", and a
 * microaneurysm is exactly that — so lesions land in the raw vessel mask and
 * would be excluded as vasculature. Before using it as a guard, every compact,
 * small component is removed from it: vessels are elongated and sparsely fill
 * their bounding box, lesions are round and dense, and only the elongated parts
 * belong in a vessel guard.
 */
function buildVesselGuard(
  vesselMask: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const guard = Uint8Array.from(vesselMask);
  const ones = new Float32Array(vesselMask.length).fill(1);
  const scale = width / 640;

  const components = connectedComponents(
    vesselMask,
    ones,
    width,
    height,
    1,
    Math.round(2200 * scale * scale),
  );

  for (const c of components) {
    if (!compact(c)) continue;
    // A compact component this small is a lesion candidate, not a vessel.
    for (let y = c.y0; y <= c.y1; y++) {
      for (let x = c.x0; x <= c.x1; x++) {
        const i = y * width + x;
        if (vesselMask[i]) guard[i] = 0;
      }
    }
  }

  return dilate(guard, width, height, 2);
}

function compact(b: Blob): boolean {
  const w = b.x1 - b.x0 + 1;
  const h = b.y1 - b.y0 + 1;
  const aspect = Math.max(w, h) / Math.max(1, Math.min(w, h));
  const fill = b.pixels / (w * h);
  // Vessels and their crossings are elongated and sparsely fill their bounding
  // box; lesions are compact.
  return aspect <= 2.6 && fill >= 0.42;
}

export function detectCandidates(
  img: RasterImage,
  field: RetinalMask,
  disc: DiscResult,
  vessels: VesselResult,
): CandidateSet {
  const { width, height, green, data } = img;
  const n = width * height;

  // Only look well inside the retinal field: the mask rim produces strong,
  // meaningless responses.
  const inner = field.radius * 0.94;
  const eligible = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!field.mask[i]) continue;
      const dx = x - field.centroid.x;
      const dy = y - field.centroid.y;
      if (dx * dx + dy * dy > inner * inner) continue;
      eligible[i] = 1;
    }
  }

  const vesselGuard = buildVesselGuard(vessels.vesselMask, width, height);

  // Background estimate at a radius larger than any lesion we care about, so a
  // lesion never contributes meaningfully to its own background.
  const bgRadius = Math.max(4, Math.round(width * 0.024));
  const background = boxBlur(green, width, height, bgRadius);

  const darkResp = new Float32Array(n);
  const brightResp = new Float32Array(n);
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (!eligible[i]) continue;
    const d = background[i] - green[i];
    darkResp[i] = d > 0 ? d : 0;
    brightResp[i] = d < 0 ? -d : 0;
    sum += d;
    sumSq += d * d;
    count++;
  }
  const mean = count ? sum / count : 0;
  const std = count ? Math.sqrt(Math.max(0.01, sumSq / count - mean * mean)) : 1;

  const darkThreshold = mean + 2.6 * std;
  const brightThreshold = -mean + 2.9 * std;

  /* ---- Red (dark) candidates: microaneurysms and haemorrhages ---- */
  const darkBinary = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!eligible[i] || vesselGuard[i]) continue;
    if (darkResp[i] <= darkThreshold) continue;
    // Red lesions stay red: reject anything that is not red-dominant.
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    if (r <= g + 8 || r <= b + 8) continue;
    darkBinary[i] = 1;
  }

  const scale = width / 640; // area thresholds are calibrated at 640px width
  const darkBlobs = connectedComponents(
    darkBinary,
    darkResp,
    width,
    height,
    Math.max(2, Math.round(3 * scale * scale)),
    Math.round(1500 * scale * scale),
  ).filter(compact);

  /* ---- Bright candidates: hard exudates and cotton-wool spots ---- */
  const discCx = disc.centre.x * width;
  const discCy = disc.centre.y * height;
  const discGuard = disc.radiusPx * 1.6;

  const brightBinary = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!eligible[i]) continue;
    if (brightResp[i] <= brightThreshold) continue;
    const x = i % width;
    const y = (i - x) / width;
    // The optic disc is legitimately bright — exclude it, or every image would
    // report a large exudate at the disc.
    if (Math.hypot(x - discCx, y - discCy) < discGuard) continue;
    const b = data[i * 3 + 2];
    const g = data[i * 3 + 1];
    // Exudates are yellow/white: blue must not dominate.
    if (b > g + 6) continue;
    brightBinary[i] = 1;
  }

  const brightBlobs = connectedComponents(
    brightBinary,
    brightResp,
    width,
    height,
    Math.max(2, Math.round(4 * scale * scale)),
    Math.round(1200 * scale * scale),
  ).filter((b) => {
    const w = b.x1 - b.x0 + 1;
    const h = b.y1 - b.y0 + 1;
    return Math.max(w, h) / Math.max(1, Math.min(w, h)) <= 3.2;
  });

  const toCandidate = (b: Blob, kind: 'dark' | 'bright'): Candidate => ({
    centre: { x: b.cx / width, y: b.cy / height },
    radiusNorm: Math.sqrt(b.pixels / Math.PI) / width,
    areaPx: b.pixels,
    strength: Math.round(b.strength * 10) / 10,
    kind,
    size: b.pixels <= 22 * scale * scale ? 'punctate' : 'blot',
  });

  return {
    dark: darkBlobs.map((b) => toCandidate(b, 'dark')),
    bright: brightBlobs.map((b) => toCandidate(b, 'bright')),
    darkThreshold: Math.round(darkThreshold * 10) / 10,
    brightThreshold: Math.round(brightThreshold * 10) / 10,
  };
}

/** Nearest candidate to a point, in normalised units. Used for corroboration. */
export function nearestCandidate(
  candidates: Candidate[],
  p: Point,
): { candidate: Candidate | null; distance: number } {
  let best: Candidate | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = Math.hypot(c.centre.x - p.x, c.centre.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return { candidate: best, distance: bestD };
}
