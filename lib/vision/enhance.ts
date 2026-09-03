import sharp from 'sharp';
import { boxBlur, retinalMask, rasterFromRaw, type RasterImage } from './raster';

/**
 * Borderline-image enhancement.
 *
 * Three classical operations, in the order a retinal reading centre would apply
 * them. Nothing here invents detail — it redistributes the detail already
 * captured so that the grading stages, and the human reviewer, can see it.
 */

export interface EnhancementResult {
  buffer: Buffer;
  operations: string[];
}

export async function enhanceFundus(input: Buffer, width = 900): Promise<EnhancementResult> {
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width, fit: 'inside', withoutEnlargement: false })
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const img = rasterFromRaw(new Uint8Array(data), info.width, info.height);
  const field = retinalMask(img);
  const out = new Uint8Array(img.data.length);

  /* 1. Illumination flattening — divide out the low-frequency lighting field so
        a flash hot-spot on one side stops masking the opposite side. */
  const radius = Math.round(Math.min(img.width, img.height) / 7);
  const lighting = boxBlur(img.lum, img.width, img.height, radius);

  let refSum = 0;
  let refN = 0;
  for (let i = 0; i < field.mask.length; i++) {
    if (!field.mask[i]) continue;
    refSum += lighting[i];
    refN++;
  }
  const reference = refN ? refSum / refN : 128;

  for (let i = 0; i < field.mask.length; i++) {
    if (!field.mask[i]) {
      out[i * 3] = img.data[i * 3];
      out[i * 3 + 1] = img.data[i * 3 + 1];
      out[i * 3 + 2] = img.data[i * 3 + 2];
      continue;
    }
    // Bounded gain: correction never exceeds ±60%, so noise in dark corners
    // is not amplified into false lesions.
    const gain = Math.min(1.6, Math.max(0.6, reference / Math.max(8, lighting[i])));
    for (let c = 0; c < 3; c++) {
      out[i * 3 + c] = Math.min(255, Math.max(0, Math.round(img.data[i * 3 + c] * gain)));
    }
  }

  /* 2. Per-channel percentile contrast stretch, computed inside the retina only
        so the black surround does not anchor the histogram. */
  const flattened = rasterFromRaw(out, img.width, img.height);
  stretchChannels(flattened, field.mask);

  /* 3. Mild unsharp mask + noise floor control. */
  const buffer = await sharp(Buffer.from(flattened.data), {
    raw: { width: img.width, height: img.height, channels: 3 },
  })
    .median(3)
    .sharpen({ sigma: 1.1, m1: 0.6, m2: 2.2 })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer();

  return {
    buffer,
    operations: [
      `Illumination flattening (low-pass field, r=${radius}px, gain clamped to 0.6–1.6×)`,
      'Per-channel percentile contrast stretch (2nd–98th percentile, inside retinal mask)',
      'Median denoise (3×3) followed by unsharp mask (σ = 1.1) — for viewing only; the sharpness sub-score is always carried from the original capture, because sharpening cannot restore optical resolution',
    ],
  };
}

function stretchChannels(img: RasterImage, mask: Uint8Array): void {
  for (let c = 0; c < 3; c++) {
    const hist = new Uint32Array(256);
    let n = 0;
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i]) continue;
      hist[img.data[i * 3 + c]]++;
      n++;
    }
    if (!n) continue;

    const lowTarget = n * 0.02;
    const highTarget = n * 0.98;
    let acc = 0;
    let lo = 0;
    let hi = 255;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= lowTarget) {
        lo = v;
        break;
      }
    }
    acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= highTarget) {
        hi = v;
        break;
      }
    }
    if (hi - lo < 12) continue;

    const scale = 255 / (hi - lo);
    const lut = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      lut[v] = Math.min(255, Math.max(0, Math.round((v - lo) * scale)));
    }
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i]) continue;
      img.data[i * 3 + c] = lut[img.data[i * 3 + c]];
    }
  }
}

/** Re-encode an arbitrary upload to a normalised JPEG for display and transport. */
export async function normaliseForDisplay(input: Buffer, width = 900): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width, fit: 'inside', withoutEnlargement: false })
    .removeAlpha()
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
    .toBuffer();
}
