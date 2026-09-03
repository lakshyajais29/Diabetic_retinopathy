/**
 * Generates the synthetic fundus phantoms used by the workspace's
 * "load a sample" affordance.
 *
 * These are RENDERED test images, not photographs of real people, and the UI
 * says so wherever they appear. They exist so a demo, a CI run, or a first-time
 * user always has something to push through the pipeline — and so the quality
 * gate, the lesion detector and the halt path can each be exercised
 * deliberately rather than hoping an uploaded image happens to trigger them.
 *
 *   node scripts/generate-samples.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'samples');
const SIZE = 1024;
const R = SIZE * 0.46;
const CX = SIZE / 2;
const CY = SIZE / 2;

/* Anatomy is placed to scale: disc nasal to the macula, arcades sweeping
   temporally around it. Right-eye layout (disc on the image right). */
const DISC = { x: CX + R * 0.44, y: CY - R * 0.02, r: R * 0.13 };
const MACULA = { x: CX - R * 0.28, y: CY + R * 0.03 };

/** Deterministic PRNG so the phantoms are byte-identical on every machine. */
function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function vesselPaths() {
  const d = DISC;
  const paths = [];
  const arcades = [
    { dy: -1, spread: 0.62 },
    { dy: 1, spread: 0.62 },
  ];

  for (const a of arcades) {
    paths.push({
      d: `M ${d.x - d.r} ${d.y + a.dy * d.r * 0.3}
          C ${d.x - R * 0.35} ${d.y + a.dy * R * 0.42},
            ${MACULA.x - R * 0.1} ${d.y + a.dy * R * a.spread},
            ${CX - R * 0.86} ${d.y + a.dy * R * 0.42}`,
      w: R * 0.026,
    });
    paths.push({
      d: `M ${d.x - d.r * 0.6} ${d.y + a.dy * d.r * 0.5}
          C ${d.x - R * 0.22} ${d.y + a.dy * R * 0.3},
            ${d.x - R * 0.3} ${d.y + a.dy * R * 0.7},
            ${d.x - R * 0.42} ${d.y + a.dy * R * 0.85}`,
      w: R * 0.016,
    });
    paths.push({
      d: `M ${d.x + d.r * 0.4} ${d.y + a.dy * d.r * 0.6}
          C ${d.x + R * 0.16} ${d.y + a.dy * R * 0.24},
            ${d.x + R * 0.3} ${d.y + a.dy * R * 0.34},
            ${d.x + R * 0.46} ${d.y + a.dy * R * 0.46}`,
      w: R * 0.015,
    });
    // Finer branches keep the vessel-density statistic in a realistic range.
    for (let i = 0; i < 4; i++) {
      const t = 0.25 + i * 0.18;
      paths.push({
        d: `M ${d.x - R * t} ${d.y + a.dy * R * (0.2 + t * 0.4)}
            C ${d.x - R * (t + 0.12)} ${d.y + a.dy * R * (0.32 + t * 0.5)},
              ${d.x - R * (t + 0.24)} ${d.y + a.dy * R * (0.3 + t * 0.6)},
              ${d.x - R * (t + 0.34)} ${d.y + a.dy * R * (0.18 + t * 0.7)}`,
        w: R * 0.008,
      });
    }
  }
  return paths;
}

function lesionSvg(spec, rand) {
  const parts = [];

  // Microaneurysms — small, sharply-defined, deep red.
  for (let i = 0; i < spec.microaneurysms; i++) {
    const a = rand() * Math.PI * 2;
    const rr = R * (0.15 + rand() * 0.72);
    const x = CX + Math.cos(a) * rr;
    const y = CY + Math.sin(a) * rr * 0.95;
    if (Math.hypot(x - DISC.x, y - DISC.y) < DISC.r * 1.8) continue;
    parts.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(R * (0.006 + rand() * 0.004)).toFixed(2)}" fill="#6d0f0f"/>`,
    );
  }

  // Haemorrhages — larger, softer-edged blots.
  for (let i = 0; i < spec.haemorrhages; i++) {
    const a = rand() * Math.PI * 2;
    const rr = R * (0.2 + rand() * 0.68);
    const x = CX + Math.cos(a) * rr;
    const y = CY + Math.sin(a) * rr * 0.95;
    if (Math.hypot(x - DISC.x, y - DISC.y) < DISC.r * 2) continue;
    const w = R * (0.018 + rand() * 0.022);
    parts.push(
      `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${w.toFixed(1)}" ry="${(w * (0.7 + rand() * 0.5)).toFixed(1)}" fill="#7c1212" opacity="0.94"/>`,
    );
  }

  // Hard exudates — bright yellow, clustered temporal to the macula as they are
  // in real circinate rings.
  for (let i = 0; i < spec.exudates; i++) {
    const a = rand() * Math.PI * 2;
    const rr = R * (0.1 + rand() * 0.34);
    const x = MACULA.x + Math.cos(a) * rr;
    const y = MACULA.y + Math.sin(a) * rr;
    const w = R * (0.01 + rand() * 0.016);
    parts.push(
      `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${w.toFixed(1)}" ry="${(w * 0.8).toFixed(1)}" fill="#f2dc9d"/>`,
    );
  }

  // Cotton-wool spots — pale, indistinct.
  for (let i = 0; i < (spec.cottonWool ?? 0); i++) {
    const a = rand() * Math.PI * 2;
    const rr = R * (0.25 + rand() * 0.45);
    const x = CX + Math.cos(a) * rr;
    const y = CY + Math.sin(a) * rr;
    const w = R * (0.024 + rand() * 0.018);
    parts.push(
      `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${w.toFixed(1)}" ry="${(w * 0.68).toFixed(1)}" fill="#e8e6dc" opacity="0.72" filter="url(#soft)"/>`,
    );
  }

  // Neovascular tuft — a fine, chaotic vessel network at the disc.
  if (spec.neovascular) {
    const strands = [];
    for (let i = 0; i < 26; i++) {
      const a1 = rand() * Math.PI * 2;
      const a2 = a1 + (rand() - 0.5) * 2.4;
      const r1 = DISC.r * (0.4 + rand() * 0.9);
      const r2 = DISC.r * (0.8 + rand() * 1.5);
      strands.push(
        `M ${(DISC.x + Math.cos(a1) * r1).toFixed(1)} ${(DISC.y + Math.sin(a1) * r1).toFixed(1)}
         Q ${(DISC.x + Math.cos((a1 + a2) / 2) * r2 * 1.3).toFixed(1)} ${(DISC.y + Math.sin((a1 + a2) / 2) * r2 * 1.3).toFixed(1)},
           ${(DISC.x + Math.cos(a2) * r2).toFixed(1)} ${(DISC.y + Math.sin(a2) * r2).toFixed(1)}`,
      );
    }
    parts.push(
      `<g fill="none" stroke="#8f1616" stroke-width="${(R * 0.005).toFixed(2)}" stroke-linecap="round" opacity="0.9">
        ${strands.map((d) => `<path d="${d}"/>`).join('')}
      </g>`,
    );
  }

  return parts.join('\n');
}

function buildSvg(spec) {
  const rand = makeRandom(spec.seed);
  const vessels = vesselPaths();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <radialGradient id="fundus" cx="50%" cy="48%" r="62%">
      <stop offset="0%" stop-color="#e08a52"/>
      <stop offset="40%" stop-color="#cf6f3c"/>
      <stop offset="76%" stop-color="#a84a22"/>
      <stop offset="100%" stop-color="#6d2a12"/>
    </radialGradient>
    <radialGradient id="disc" cx="46%" cy="44%" r="58%">
      <stop offset="0%" stop-color="#fdf3d8"/>
      <stop offset="58%" stop-color="#f2cf87"/>
      <stop offset="100%" stop-color="#d29a4c"/>
    </radialGradient>
    <radialGradient id="macula" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4a1608" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#8d3418" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="${(R * 0.012).toFixed(2)}"/></filter>
    <clipPath id="fov"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath>
  </defs>

  <rect width="${SIZE}" height="${SIZE}" fill="#050505"/>
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#fundus)"/>

  <g clip-path="url(#fov)">
    <circle cx="${MACULA.x}" cy="${MACULA.y}" r="${R * 0.3}" fill="url(#macula)"/>

    <g fill="none" stroke="#8a2416" stroke-linecap="round" opacity="0.92">
      ${vessels.map((v) => `<path d="${v.d}" stroke-width="${v.w.toFixed(2)}"/>`).join('\n      ')}
    </g>

    <ellipse cx="${DISC.x}" cy="${DISC.y}" rx="${DISC.r}" ry="${DISC.r * 1.06}" fill="url(#disc)"/>
    <ellipse cx="${DISC.x}" cy="${DISC.y}" rx="${DISC.r * 0.42}" ry="${DISC.r * 0.46}" fill="#fffbef" opacity="0.5"/>

    ${lesionSvg(spec, rand)}
  </g>
</svg>`;
}

/**
 * Add fine grain. A perfectly smooth vector render has almost no high-frequency
 * energy, so the sharpness metric — which is genuinely measuring Laplacian
 * variance — would correctly call it out of focus. Real sensor noise is what
 * makes a real photograph measurably sharp.
 */
async function addGrain(buffer, sigma, seed) {
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rand = makeRandom(seed);
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 3) {
    // Box–Muller, shared across channels so the grain reads as luminance noise.
    const u1 = Math.max(1e-6, rand());
    const u2 = rand();
    const n = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma;
    for (let c = 0; c < 3; c++) {
      out[i + c] = Math.max(0, Math.min(255, out[i + c] + n));
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } });
}

/**
 * Single-sided illumination falloff — the signature of a capture taken with the
 * camera off-axis to the pupil, which is the most common real field-capture
 * fault after defocus. Drives the illumination-uniformity metric down.
 */
async function applyVignette(buffer, strength) {
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const { width, height } = info;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      // Falls off toward the left and downward, as an iris shadow does.
      const fx = x / width;
      const fy = y / height;
      const gain = 1 - strength * (1 - fx) * (0.55 + 0.45 * fy);
      for (let c = 0; c < 3; c++) {
        out[i + c] = Math.max(0, Math.min(255, out[i + c] * gain));
      }
    }
  }
  return sharp(out, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}

const SPECS = [
  {
    file: 'phantom-clean.jpg',
    seed: 11,
    microaneurysms: 0,
    haemorrhages: 0,
    exudates: 0,
    neovascular: false,
    grain: 3.2,
    describe: 'no lesions — exercises the Level 0 path and a confident auto-clear',
  },
  {
    file: 'phantom-moderate.jpg',
    seed: 27,
    microaneurysms: 16,
    haemorrhages: 5,
    exudates: 12,
    cottonWool: 1,
    neovascular: false,
    grain: 3.2,
    describe: 'microaneurysms, blot haemorrhages and a circinate exudate ring',
  },
  {
    file: 'phantom-proliferative.jpg',
    seed: 43,
    microaneurysms: 30,
    haemorrhages: 16,
    exudates: 14,
    cottonWool: 4,
    neovascular: true,
    grain: 3.2,
    describe: 'dense lesion burden plus a neovascular tuft at the disc',
  },
  {
    file: 'phantom-unusable.jpg',
    seed: 58,
    microaneurysms: 10,
    haemorrhages: 3,
    exudates: 6,
    neovascular: false,
    grain: 2.0,
    // What a genuinely bad field capture is: out of focus, under-exposed, and
    // lit from one side because the camera was off-axis to the pupil.
    blur: 14,
    darken: 0.34,
    vignette: 0.62,
    describe: 'defocused, under-exposed and unevenly lit — exercises the quality gate and halt path',
  },
];

async function main() {
  mkdirSync(OUT, { recursive: true });

  for (const spec of SPECS) {
    const svg = Buffer.from(buildSvg(spec));
    const flat = await sharp(svg, { density: 96 }).png().toBuffer();

    // Grain goes on FIRST, so that a defocused phantom has its fine detail
    // destroyed by the blur exactly as a real out-of-focus capture does.
    // Adding it afterwards would hand the sharpness metric back the very
    // high-frequency energy the defocus is supposed to have removed.
    let pipeline = await addGrain(flat, spec.grain, spec.seed + 1);

    if (spec.blur) pipeline = pipeline.blur(spec.blur);
    if (spec.darken) pipeline = pipeline.linear(spec.darken, spec.lift ?? 0);
    if (spec.vignette) {
      pipeline = sharp(await applyVignette(await pipeline.png().toBuffer(), spec.vignette));
    }

    const jpeg = await pipeline.jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer();

    writeFileSync(join(OUT, spec.file), jpeg);
    console.log(`${spec.file.padEnd(30)} ${(jpeg.length / 1024).toFixed(0).padStart(5)} KB  — ${spec.describe}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
