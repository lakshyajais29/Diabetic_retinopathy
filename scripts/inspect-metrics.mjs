/**
 * Diagnostic: recompute the stage-1 raw measurements for a file, using the
 * same definitions as lib/vision/quality.ts, so a surprising score can be
 * traced back to the pixels rather than argued about.
 *
 *   node scripts/inspect-metrics.mjs public/samples/phantom-unusable.jpg
 */
import sharp from 'sharp';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/inspect-metrics.mjs <image>');
  process.exit(1);
}

const { data, info } = await sharp(file)
  .rotate()
  .resize({ width: 640, fit: 'inside' })
  .removeAlpha()
  .toColourspace('srgb')
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;
const n = width * height;
const lum = new Float32Array(n);
const green = new Float32Array(n);
for (let i = 0; i < n; i++) {
  lum[i] = 0.2126 * data[i * 3] + 0.7152 * data[i * 3 + 1] + 0.0722 * data[i * 3 + 2];
  green[i] = data[i * 3 + 1];
}

const mask = new Uint8Array(n);
let count = 0;
for (let i = 0; i < n; i++) {
  if (lum[i] > 18) {
    mask[i] = 1;
    count++;
  }
}

let lapSum = 0;
let lapSq = 0;
let lapN = 0;
for (let y = 1; y < height - 1; y++) {
  for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    if (!mask[i] || !mask[i - 1] || !mask[i + 1] || !mask[i - width] || !mask[i + width]) continue;
    const lap = 4 * green[i] - green[i - 1] - green[i + 1] - green[i - width] - green[i + width];
    lapSum += lap;
    lapSq += lap * lap;
    lapN++;
  }
}
const lapMean = lapN ? lapSum / lapN : 0;
const lapVar = lapN ? lapSq / lapN - lapMean * lapMean : 0;

let sum = 0;
let sq = 0;
let m = 0;
for (let i = 0; i < n; i++) {
  if (!mask[i]) continue;
  sum += lum[i];
  sq += lum[i] * lum[i];
  m++;
}
const meanLum = m ? sum / m : 0;
const rms = m ? Math.sqrt(Math.max(0, sq / m - meanLum ** 2)) : 0;

// Illumination CV across an 8x8 grid of block means.
const g = 8;
const bw = Math.ceil(width / g);
const bh = Math.ceil(height / g);
const blocks = [];
for (let by = 0; by < g; by++) {
  for (let bx = 0; bx < g; bx++) {
    let s = 0;
    let c = 0;
    for (let y = by * bh; y < Math.min(height, (by + 1) * bh); y++) {
      for (let x = bx * bw; x < Math.min(width, (bx + 1) * bw); x++) {
        const i = y * width + x;
        if (!mask[i]) continue;
        s += lum[i];
        c++;
      }
    }
    if (c > (bw * bh) / 6) blocks.push(s / c);
  }
}
const bMean = blocks.reduce((a, b) => a + b, 0) / (blocks.length || 1);
const bVar = blocks.reduce((a, b) => a + (b - bMean) ** 2, 0) / (blocks.length || 1);
const cv = bMean > 0 ? Math.sqrt(bVar) / bMean : 0;

const logScore = (v, lo, hi) =>
  Math.max(
    0,
    Math.min(
      100,
      ((Math.log10(Math.max(v, 0) + 1) - Math.log10(lo + 1)) /
        (Math.log10(hi + 1) - Math.log10(lo + 1))) *
        100,
    ),
  );

console.log(`${file}  (${width}x${height})`);
console.log(`  retinal mask coverage : ${((count / n) * 100).toFixed(1)}%`);
console.log(`  laplacian variance    : ${lapVar.toFixed(1)}  -> sharpness ${logScore(lapVar, 12, 350).toFixed(0)}/100`);
console.log(`  mean luminance        : ${meanLum.toFixed(1)}`);
console.log(`  rms contrast          : ${rms.toFixed(1)}`);
console.log(`  illumination CV       : ${(cv * 100).toFixed(1)}%`);
