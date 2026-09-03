import sharp from 'sharp';

/**
 * Low-level raster primitives.
 *
 * Everything the vision stages measure runs on a normalised working image of a
 * fixed width, so that thresholds expressed in pixels (blob areas, blur radii,
 * Laplacian variance) mean the same thing regardless of what the field camera
 * or the uploaded dataset produced.
 */

export const WORKING_WIDTH = 640;

export interface RasterImage {
  width: number;
  height: number;
  /** Interleaved RGB, 3 bytes per pixel. */
  data: Uint8Array;
  /** Per-pixel Rec.709 luminance, 0–255. */
  lum: Float32Array;
  /** Green channel, 0–255 — the channel with the best lesion contrast. */
  green: Float32Array;
}

export interface RetinalMask {
  /** 1 inside the retinal field of view, 0 in the camera's black surround. */
  mask: Uint8Array;
  count: number;
  centroid: { x: number; y: number };
  /** Estimated radius of the circular field, in pixels. */
  radius: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  /** Fraction of the frame occupied by retina. */
  coverage: number;
  /** How many frame edges the field runs into (a cropped/clipped field). */
  clippedEdges: number;
}

export async function loadRaster(
  input: Buffer,
  width = WORKING_WIDTH,
): Promise<RasterImage> {
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width, fit: 'inside', withoutEnlargement: false })
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  return rasterFromRaw(new Uint8Array(data), info.width, info.height);
}

export function rasterFromRaw(
  data: Uint8Array,
  width: number,
  height: number,
): RasterImage {
  const n = width * height;
  const lum = new Float32Array(n);
  const green = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    green[i] = g;
  }
  return { width, height, data, lum, green };
}

/**
 * Isolate the circular retinal field of view. Fundus cameras render the retina
 * as a bright disc on a near-black surround, so a low luminance cut separates
 * them robustly. Every statistic in the pipeline is computed inside this mask —
 * including the black surround would make every image look under-exposed.
 */
export function retinalMask(img: RasterImage, threshold = 18): RetinalMask {
  const { width, height, lum } = img;
  const n = width * height;
  const mask = new Uint8Array(n);
  let count = 0;
  let sx = 0;
  let sy = 0;
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (lum[i] > threshold) {
        mask[i] = 1;
        count++;
        sx += x;
        sy += y;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }

  if (count === 0) {
    // Degenerate (all-black) image — treat the whole frame as field so the
    // quality stage can still report why it is unusable rather than crashing.
    mask.fill(1);
    return {
      mask,
      count: n,
      centroid: { x: width / 2, y: height / 2 },
      radius: Math.min(width, height) / 2,
      bbox: { x0: 0, y0: 0, x1: width - 1, y1: height - 1 },
      coverage: 1,
      clippedEdges: 4,
    };
  }

  const centroid = { x: sx / count, y: sy / count };
  const radius = Math.sqrt(count / Math.PI);

  const margin = 2;
  let clippedEdges = 0;
  if (x0 <= margin) clippedEdges++;
  if (y0 <= margin) clippedEdges++;
  if (x1 >= width - 1 - margin) clippedEdges++;
  if (y1 >= height - 1 - margin) clippedEdges++;

  return {
    mask,
    count,
    centroid,
    radius,
    bbox: { x0, y0, x1, y1 },
    coverage: count / n,
    clippedEdges,
  };
}

/* ------------------------------------------------------------------ */
/* Integral image + box blur (O(n) regardless of radius)                */
/* ------------------------------------------------------------------ */

export interface Integral {
  sum: Float64Array;
  width: number;
  height: number;
}

export function integralImage(
  src: Float32Array,
  width: number,
  height: number,
): Integral {
  const w = width + 1;
  const sum = new Float64Array(w * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += src[y * width + x];
      sum[(y + 1) * w + (x + 1)] = sum[y * w + (x + 1)] + rowSum;
    }
  }
  return { sum, width, height };
}

function integralBoxSum(
  ii: Integral,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const w = ii.width + 1;
  const a = ii.sum[y0 * w + x0];
  const b = ii.sum[y0 * w + x1];
  const c = ii.sum[y1 * w + x0];
  const d = ii.sum[y1 * w + x1];
  return d - b - c + a;
}

/** Mean value over a (2r+1) square window, clamped at the borders. */
export function boxBlur(
  src: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  const r = Math.max(1, Math.round(radius));
  const ii = integralImage(src, width, height);
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(height, y + r + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(width, x + r + 1);
      const area = (x1 - x0) * (y1 - y0);
      out[y * width + x] = integralBoxSum(ii, x0, y0, x1, y1) / area;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Connected components                                                 */
/* ------------------------------------------------------------------ */

export interface Blob {
  pixels: number;
  cx: number;
  cy: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Mean response strength of the pixels in the blob. */
  strength: number;
}

/** 8-connected component labelling over a binary map, with an area filter. */
export function connectedComponents(
  binary: Uint8Array,
  response: Float32Array,
  width: number,
  height: number,
  minArea: number,
  maxArea: number,
): Blob[] {
  const seen = new Uint8Array(width * height);
  const blobs: Blob[] = [];
  const stack: number[] = [];

  for (let start = 0; start < binary.length; start++) {
    if (!binary[start] || seen[start]) continue;
    seen[start] = 1;
    stack.length = 0;
    stack.push(start);

    let pixels = 0;
    let sx = 0;
    let sy = 0;
    let strength = 0;
    let bx0 = width;
    let by0 = height;
    let bx1 = 0;
    let by1 = 0;

    while (stack.length) {
      const i = stack.pop()!;
      const x = i % width;
      const y = (i - x) / width;
      pixels++;
      sx += x;
      sy += y;
      strength += response[i];
      if (x < bx0) bx0 = x;
      if (y < by0) by0 = y;
      if (x > bx1) bx1 = x;
      if (y > by1) by1 = y;

      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const j = ny * width + nx;
          if (binary[j] && !seen[j]) {
            seen[j] = 1;
            stack.push(j);
          }
        }
      }

      // Guard against pathological floods swallowing the whole retina.
      if (pixels > maxArea * 4) break;
    }

    if (pixels >= minArea && pixels <= maxArea) {
      blobs.push({
        pixels,
        cx: sx / pixels,
        cy: sy / pixels,
        x0: bx0,
        y0: by0,
        x1: bx1,
        y1: by1,
        strength: strength / pixels,
      });
    }
  }

  return blobs;
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                        */
/* ------------------------------------------------------------------ */

export function clamp(v: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, v));
}

export function round(v: number, dp = 1): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

/** Score that peaks at 100 inside [idealLo, idealHi] and falls to 0 at the outer bounds. */
export function bandScore(
  value: number,
  hardLo: number,
  idealLo: number,
  idealHi: number,
  hardHi: number,
): number {
  if (value >= idealLo && value <= idealHi) return 100;
  if (value <= hardLo || value >= hardHi) return 0;
  if (value < idealLo) return clamp(((value - hardLo) / (idealLo - hardLo)) * 100);
  return clamp(((hardHi - value) / (hardHi - idealHi)) * 100);
}

/** Monotonic score: 0 at `lo`, 100 at `hi`, log-scaled for wide-dynamic-range metrics. */
export function logScore(value: number, lo: number, hi: number): number {
  const v = Math.max(value, 0);
  const a = Math.log10(lo + 1);
  const b = Math.log10(hi + 1);
  return clamp(((Math.log10(v + 1) - a) / (b - a)) * 100);
}

export async function toDataUrl(buffer: Buffer, mime = 'image/jpeg'): Promise<string> {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}
