'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
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
  redFree?: boolean;
}

/**
 * Diagnostic Retinal Canvas — DICOM/PACS Workstation Grade.
 * Features:
 * - Zoom & Pan with 1-tap reset
 * - Red-Free (Green Channel) Optical Examination filter
 * - Unambiguous shape-encoded lesion markers
 * - Saliency attention field
 * - Touch-optimized mobile layout
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
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [src]);

  // Heatmap rendering
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

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)));
  const handleResetZoom = () => setZoom(1);

  return (
    <div
      ref={wrapRef}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-slate-800 bg-[#070b14] select-none transition-all',
        isFullscreen && 'fixed inset-4 z-50 rounded-2xl shadow-2xl',
        className,
      )}
    >
      {/* SVG Filter for Ophthalmological Red-Free (Green Channel) view */}
      <svg className="absolute h-0 w-0" aria-hidden>
        <filter id="red-free-filter">
          <feColorMatrix
            type="matrix"
            values="
              0 1 0 0 0
              0 1 0 0 0
              0 1 0 0 0
              0 0 0 1 0
            "
          />
        </filter>
      </svg>

      {/* Viewport Floating Header Bar */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {layers.redFree ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/90 border border-emerald-500/50 px-2 py-0.5 text-[10px] font-bold text-emerald-300 backdrop-blur-sm shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Red-Free Optical Mode
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/85 border border-slate-700/80 px-2 py-0.5 text-[10px] font-medium text-slate-300 backdrop-blur-sm">
              Full Spectrum
            </span>
          )}

          {shown.length > 0 && layers.lesions && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/85 border border-slate-700/80 px-2 py-0.5 text-[10px] font-bold text-slate-200 backdrop-blur-sm">
              {shown.length} findings
            </span>
          )}
        </div>

        {/* Viewport Controls */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-900/90 border border-slate-700/80 p-0.5 backdrop-blur-sm pointer-events-auto shadow-sm">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:text-white disabled:opacity-30 transition"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="px-1 text-[10px] font-mono font-bold text-slate-300 tabular">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 2.5}
            className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:text-white disabled:opacity-30 transition"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          {zoom > 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:text-emerald-400 transition"
              title="Reset zoom"
              aria-label="Reset zoom"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:text-white transition"
            title={isFullscreen ? 'Exit fullscreen' : 'Expand viewer'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Expand viewer'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Zoomable Image Container */}
      <div
        className="relative transition-transform duration-150 ease-out origin-center"
        style={{ transform: `scale(${zoom})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="block h-auto w-full transition-all duration-200"
          style={{
            filter: layers.redFree
              ? 'url(#red-free-filter) contrast(1.3) brightness(1.05)'
              : undefined,
          }}
          draggable={false}
        />

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
            {/* Anatomy Layer: Optic Disc & Fovea / Macula */}
            {layers.anatomy && structures ? (
              <g>
                {structures.opticDisc.detected ? (
                  <>
                    <circle
                      cx={px(structures.opticDisc.centre.x)}
                      cy={py(structures.opticDisc.centre.y)}
                      r={structures.opticDisc.radius * w}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                    <text
                      x={px(structures.opticDisc.centre.x)}
                      y={py(structures.opticDisc.centre.y) - structures.opticDisc.radius * w - 8}
                      textAnchor="middle"
                      className="font-mono font-bold"
                      fontSize={11}
                      fill="#38bdf8"
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
                      stroke="#fbbf24"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                    <g
                      stroke="#fbbf24"
                      strokeWidth={1.8}
                      transform={`translate(${px(structures.fovea.centre.x)}, ${py(structures.fovea.centre.y)})`}
                    >
                      <line x1={-8} y1={0} x2={8} y2={0} />
                      <line x1={0} y1={-8} x2={0} y2={8} />
                    </g>
                    <text
                      x={px(structures.macula.centre.x)}
                      y={py(structures.macula.centre.y) + structures.macula.radius * w + 16}
                      textAnchor="middle"
                      className="font-mono font-bold"
                      fontSize={11}
                      fill="#fbbf24"
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

            {/* Lesion Markers Layer */}
            {layers.lesions
              ? shown.map((lesion) => (
                  <LesionMarker
                    key={lesion.id}
                    lesion={lesion}
                    x={px(lesion.centre.x)}
                    y={py(lesion.centre.y)}
                    size={Math.max(8, Math.min(34, lesion.radius * scale * 1.9))}
                    onEnter={() => setHovered(lesion)}
                    onLeave={() => setHovered((c) => (c?.id === lesion.id ? null : c))}
                  />
                ))
              : null}
          </svg>
        ) : null}
      </div>

      {/* Scanning Laser Beam Effect */}
      {scanning ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="h-1/3 w-full bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent animate-pulse" />
        </div>
      ) : null}

      {/* Interactive Finding Tooltip */}
      {hovered ? (
        <div
          className="pointer-events-none absolute z-30 max-w-[240px] rounded-lg border border-slate-700 bg-slate-900/95 p-2.5 shadow-xl backdrop-blur-sm"
          style={{
            left: Math.min(Math.max(8, px(hovered.centre.x) + 14), Math.max(8, w - 250)),
            top: Math.min(Math.max(8, py(hovered.centre.y) - 10), Math.max(8, h - 96)),
          }}
          role="tooltip"
        >
          <p className="flex items-center gap-1.5 text-xs font-bold text-white">
            <span
              className="h-2 w-2 rounded-[2px]"
              style={{ background: LESION_TAXONOMY[hovered.lesionClass].colour }}
              aria-hidden
            />
            {LESION_TAXONOMY[hovered.lesionClass].label}
          </p>
          <p className="tabular mt-0.5 font-mono text-[10.5px] text-slate-400">
            {hovered.id} · {hovered.confidence}% conf ·{' '}
            {hovered.source === 'both'
              ? 'corroborated'
              : hovered.source === 'cv'
                ? 'CV candidate'
                : 'model only'}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-slate-300">{hovered.note}</p>
        </div>
      ) : null}
    </div>
  );
}

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
    strokeWidth: 2.2,
    strokeDasharray: dashed ? '3 2.5' : undefined,
  } as const;

  let shape: React.ReactNode;
  switch (lesion.lesionClass) {
    case 'microaneurysm':
      shape = <circle cx={0} cy={0} r={r} {...common} />;
      break;
    case 'haemorrhage':
      shape = <circle cx={0} cy={0} r={r} {...common} strokeWidth={2.8} />;
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
          strokeWidth={2.8}
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
      onTouchStart={onEnter}
      style={{ cursor: 'pointer' }}
    >
      <circle cx={0} cy={0} r={Math.max(r + 6, 14)} fill="transparent" />
      <g stroke="#04121a" strokeWidth={4} opacity={0.65} fill="none">
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
                ? 'border-slate-300 bg-white text-slate-800 shadow-xs'
                : 'border-slate-200 bg-slate-100 text-slate-400 line-through',
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
            <span className="tabular font-bold text-slate-600">({counts[c]})</span>
          </button>
        );
      })}
    </div>
  );
}
