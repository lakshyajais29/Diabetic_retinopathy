'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  ExplainabilityResult,
  Lesion,
  LesionAnalysis,
  LesionClass,
  StructureAnalysis,
} from '@/lib/pipeline/types';
import { LESION_TAXONOMY, LESION_CLASSES } from '@/lib/pipeline/constants';
import { cn } from '@/lib/ui';

export interface ViewerLayers {
  anatomy: boolean;
  lesions: boolean;
  heatmap: boolean;
}

/**
 * The reading canvas.
 *
 * Overlays are drawn in image-normalised coordinates against the measured pixel
 * size of the rendered photograph, so a marker sits on the same retinal spot at
 * any window size. Every lesion class carries its own MARKER SHAPE as well as
 * its colour — identity never rests on hue alone, which matters both for
 * colour-vision deficiency and for the greyscale printout of a report.
 */
export function ImageViewer({
  src,
  alt,
  structures,
  lesions,
  explainability,
  layers,
  visibleClasses,
  heatmapOpacity = 0.75,
  scanning,
  className,
}: {
  src: string;
  alt: string;
  structures: StructureAnalysis | null;
  lesions: LesionAnalysis | null;
  explainability: ExplainabilityResult | null;
  layers: ViewerLayers;
  visibleClasses: Set<LesionClass>;
  heatmapOpacity?: number;
  scanning?: boolean;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState<Lesion | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [src]);

  /* Attention heatmap: a coarse grid painted at grid resolution and scaled up
     with smoothing, which is exactly how a saliency map should be shown — the
     underlying evidence is coarse and the picture should not pretend otherwise. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !explainability || !layers.heatmap) return;

    const n = explainability.gridSize;
    const off = document.createElement('canvas');
    off.width = n;
    off.height = n;
    const octx = off.getContext('2d');
    if (!octx) return;

    const img = octx.createImageData(n, n);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const v = Math.max(0, Math.min(1, explainability.attentionGrid[r]?.[c] ?? 0));
        const i = (r * n + c) * 4;
        // Single hue (brand teal), magnitude carried by lightness and alpha.
        const t = v ** 1.15;
        img.data[i] = Math.round(18 + 145 * t);
        img.data[i + 1] = Math.round(120 + 116 * t);
        img.data[i + 2] = Math.round(112 + 100 * t);
        img.data[i + 3] = Math.round(255 * Math.min(1, t * 0.92));
      }
    }
    octx.putImageData(img, 0, 0);

    canvas.width = Math.max(1, size.w);
    canvas.height = Math.max(1, size.h);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
  }, [explainability, layers.heatmap, size.w, size.h]);

  const { w, h } = size;
  const px = (nx: number) => nx * w;
  const py = (ny: number) => ny * h;
  const scale = Math.min(w, h) || 1;

  const shown = lesions?.lesions.filter((l) => visibleClasses.has(l.lesionClass)) ?? [];

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative overflow-hidden rounded-xl border border-ink-800 bg-black select-none',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block h-auto w-full" draggable={false} />

      {layers.heatmap && explainability ? (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full mix-blend-screen"
          style={{ opacity: heatmapOpacity }}
          aria-hidden
        />
      ) : null}

      {w > 0 && h > 0 ? (
        <svg
          className="absolute inset-0"
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          aria-hidden={!shown.length}
          role={shown.length ? 'img' : undefined}
          aria-label={
            shown.length
              ? `${shown.length} detected lesions marked on the retinal photograph`
              : undefined
          }
        >
          {layers.anatomy && structures ? (
            <g>
              {structures.opticDisc.detected ? (
                <>
                  <circle
                    cx={px(structures.opticDisc.centre.x)}
                    cy={py(structures.opticDisc.centre.y)}
                    r={structures.opticDisc.radius * w}
                    fill="none"
                    stroke="var(--viz-series-1)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                  <text
                    x={px(structures.opticDisc.centre.x)}
                    y={py(structures.opticDisc.centre.y) - structures.opticDisc.radius * w - 8}
                    textAnchor="middle"
                    className="font-mono"
                    fontSize={11}
                    fill="var(--viz-series-1)"
                    stroke="#04121a"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    OPTIC DISC
                  </text>
                </>
              ) : null}

              {structures.fovea.detected ? (
                <>
                  <circle
                    cx={px(structures.macula.centre.x)}
                    cy={py(structures.macula.centre.y)}
                    r={structures.macula.radius * w}
                    fill="none"
                    stroke="var(--viz-series-3)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                  <g
                    stroke="var(--viz-series-3)"
                    strokeWidth={1.6}
                    transform={`translate(${px(structures.fovea.centre.x)}, ${py(structures.fovea.centre.y)})`}
                  >
                    <line x1={-7} y1={0} x2={7} y2={0} />
                    <line x1={0} y1={-7} x2={0} y2={7} />
                  </g>
                  <text
                    x={px(structures.macula.centre.x)}
                    y={py(structures.macula.centre.y) + structures.macula.radius * w + 16}
                    textAnchor="middle"
                    className="font-mono"
                    fontSize={11}
                    fill="var(--viz-series-3)"
                    stroke="#04121a"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    MACULA
                  </text>
                </>
              ) : null}
            </g>
          ) : null}

          {layers.lesions
            ? shown.map((lesion) => (
                <LesionMarker
                  key={lesion.id}
                  lesion={lesion}
                  x={px(lesion.centre.x)}
                  y={py(lesion.centre.y)}
                  size={Math.max(7, Math.min(34, lesion.radius * scale * 1.9))}
                  onEnter={() => setHovered(lesion)}
                  onLeave={() => setHovered((c) => (c?.id === lesion.id ? null : c))}
                />
              ))
            : null}
        </svg>
      ) : null}

      {scanning ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="animate-sweep h-1/3 w-full bg-gradient-to-b from-transparent via-brand-400/18 to-transparent" />
        </div>
      ) : null}

      {hovered ? (
        <div
          className="pointer-events-none absolute z-10 max-w-[240px] rounded-lg border border-ink-700 bg-ink-950/95 px-3 py-2 shadow-panel"
          style={{
            left: Math.min(Math.max(8, px(hovered.centre.x) + 14), Math.max(8, w - 250)),
            top: Math.min(Math.max(8, py(hovered.centre.y) - 10), Math.max(8, h - 96)),
          }}
          role="tooltip"
        >
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-100">
            <span
              className="h-2 w-2 rounded-[2px]"
              style={{ background: LESION_TAXONOMY[hovered.lesionClass].colour }}
              aria-hidden
            />
            {LESION_TAXONOMY[hovered.lesionClass].label}
          </p>
          <p className="tabular mt-1 font-mono text-[10px] text-ink-400">
            {hovered.id} · {hovered.confidence}% conf ·{' '}
            {hovered.source === 'both'
              ? 'corroborated'
              : hovered.source === 'cv'
                ? 'CV candidate'
                : 'model only'}
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-ink-400">{hovered.note}</p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One marker shape per lesion class, so the overlay stays readable in
 * greyscale, under colour-vision deficiency, and on a printed report.
 * Corroborated findings get a solid ring; model-only findings a dashed one.
 */
function LesionMarker({
  lesion,
  x,
  y,
  size,
  onEnter,
  onLeave,
}: {
  lesion: Lesion;
  x: number;
  y: number;
  size: number;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const colour = LESION_TAXONOMY[lesion.lesionClass].colour;
  const r = size / 2;
  const dashed = lesion.source === 'model';
  const common = {
    fill: 'none',
    stroke: colour,
    strokeWidth: 2,
    strokeDasharray: dashed ? '3 2.5' : undefined,
  } as const;

  let shape: React.ReactNode;
  switch (lesion.lesionClass) {
    case 'microaneurysm':
      shape = <circle cx={0} cy={0} r={r} {...common} />;
      break;
    case 'haemorrhage':
      shape = <circle cx={0} cy={0} r={r} {...common} strokeWidth={2.6} />;
      break;
    case 'hard_exudate':
      shape = <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={1.5} {...common} />;
      break;
    case 'soft_exudate':
      shape = <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={r * 0.55} {...common} />;
      break;
    case 'irma':
      shape = <polygon points={`0,${-r} ${r},0 0,${r} ${-r},0`} {...common} />;
      break;
    case 'venous_beading':
      shape = <polygon points={`0,${-r} ${r},${r} ${-r},${r}`} {...common} />;
      break;
    case 'neovascularisation':
      shape = (
        <polygon
          points={[0, 60, 120, 180, 240, 300]
            .map((deg) => {
              const a = (deg * Math.PI) / 180;
              return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
            })
            .join(' ')}
          {...common}
          strokeWidth={2.6}
        />
      );
      break;
    default:
      shape = <circle cx={0} cy={0} r={r} {...common} />;
  }

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ cursor: 'pointer' }}
    >
      {/* Hit target larger than the mark. */}
      <circle cx={0} cy={0} r={Math.max(r + 6, 12)} fill="transparent" />
      {/* 2px dark ring so the marker survives on a bright exudate. */}
      <g stroke="#04121a" strokeWidth={4} opacity={0.55} fill="none">
        {shape}
      </g>
      {shape}
    </g>
  );
}

export function LesionLegend({
  counts,
  visible,
  onToggle,
}: {
  counts: Record<LesionClass, number>;
  visible: Set<LesionClass>;
  onToggle: (c: LesionClass) => void;
}) {
  const present = LESION_CLASSES.filter((c) => counts[c] > 0);
  if (present.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {present.map((c) => {
        const spec = LESION_TAXONOMY[c];
        const on = visible.has(c);
        return (
          <button
            key={c}
            type="button"
            onClick={() => onToggle(c)}
            aria-pressed={on}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition',
              on
                ? 'border-ink-600 bg-ink-800/80 text-ink-100'
                : 'border-ink-850 bg-ink-900/50 text-ink-500 line-through',
            )}
          >
            <span
              aria-hidden
              className="h-2 w-2 shrink-0"
              style={{
                background: on ? spec.colour : 'transparent',
                border: `1.5px solid ${spec.colour}`,
                borderRadius:
                  c === 'microaneurysm' || c === 'haemorrhage'
                    ? '999px'
                    : c === 'soft_exudate'
                      ? '3px'
                      : '1px',
                transform: c === 'irma' || c === 'venous_beading' ? 'rotate(45deg)' : undefined,
              }}
            />
            {spec.shortLabel}
            <span className="tabular text-ink-400">{counts[c]}</span>
          </button>
        );
      })}
    </div>
  );
}
