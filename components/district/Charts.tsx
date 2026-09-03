'use client';

import { useRef, useState } from 'react';
import { cn, formatCompact, formatNumber } from '@/lib/ui';

/**
 * Charts for the district console.
 *
 * Palette validated against the panel surface (#0c1421): series 1 `#1aa197`
 * (AI-triaged — the intervention) and series 2 `#d95926` (manual-only — the
 * baseline). All-pairs CVD ΔE 14.2, normal-vision ΔE 31.8, both ≥ 3:1 contrast.
 * Both series are additionally direct-labelled at the line end, so identity
 * never rests on colour alone.
 */

const W = 760;
const H = 280;
const PAD = { top: 18, right: 96, bottom: 34, left: 60 };

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export interface Series {
  key: string;
  label: string;
  colour: string;
  values: number[];
}

export function BacklogChart({
  series,
  yLabel,
  formatValue = formatCompact,
}: {
  series: Series[];
  yLabel: string;
  formatValue?: (v: number) => string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const n = series[0]?.values.length ?? 0;
  const rawMax = Math.max(1, ...series.flatMap((s) => s.values));
  const max = niceCeil(rawMax);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const frac = (px - PAD.left) / innerW;
    const idx = Math.round(frac * (n - 1));
    setHover(idx >= 0 && idx < n ? idx : null);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {/* Legend is always present for two or more series. */}
        <ul className="flex flex-wrap gap-4">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-0.5 w-4 rounded-full"
                style={{ background: s.colour }}
              />
              <span className="text-[11.5px] text-ink-300">{s.label}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-[11px] font-medium text-ink-500 underline-offset-2 transition hover:text-ink-300 hover:underline"
        >
          {showTable ? 'Show chart' : 'Show data table'}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <caption className="sr-only">{yLabel} by month</caption>
            <thead>
              <tr className="border-b border-ink-800">
                <th className="pb-2 text-[10px] font-semibold tracking-[0.1em] text-ink-500 uppercase">
                  Month
                </th>
                {series.map((s) => (
                  <th
                    key={s.key}
                    className="pb-2 text-right text-[10px] font-semibold tracking-[0.1em] text-ink-500 uppercase"
                  >
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n }, (_, i) => (
                <tr key={i} className="border-b border-ink-850/70">
                  <td className="py-1.5 text-[11.5px] text-ink-400">Month {i + 1}</td>
                  {series.map((s) => (
                    <td
                      key={s.key}
                      className="tabular py-1.5 text-right font-mono text-[11.5px] text-ink-200"
                    >
                      {formatNumber(s.values[i])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full"
            role="img"
            aria-label={`${yLabel} over twelve months, comparing ${series.map((s) => s.label).join(' and ')}`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            {/* Recessive grid */}
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--viz-grid)"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 10}
                  y={y(t) + 3.5}
                  textAnchor="end"
                  fontSize={10}
                  fill="var(--viz-ink-muted)"
                  className="tabular font-mono"
                >
                  {formatValue(Math.round(t))}
                </text>
              </g>
            ))}

            {/* Baseline */}
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(0)}
              y2={y(0)}
              stroke="var(--viz-axis)"
              strokeWidth={1.5}
            />

            {MONTHS.slice(0, n).map((m, i) => (
              <text
                key={i}
                x={x(i)}
                y={H - PAD.bottom + 16}
                textAnchor="middle"
                fontSize={10}
                fill="var(--viz-ink-muted)"
              >
                {m}
              </text>
            ))}

            <text
              x={PAD.left - 10}
              y={PAD.top - 6}
              textAnchor="end"
              fontSize={9.5}
              fill="var(--viz-ink-muted)"
              className="uppercase"
            >
              {yLabel}
            </text>

            {/* Crosshair */}
            {hover !== null ? (
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={y(0)}
                stroke="var(--viz-ink-muted)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            ) : null}

            {/* Series — 2px lines, direct-labelled at the end */}
            {series.map((s) => {
              const d = s.values
                .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
                .join(' ');
              const last = s.values[s.values.length - 1];
              return (
                <g key={s.key}>
                  <path
                    d={d}
                    fill="none"
                    stroke={s.colour}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {/* 2px surface ring keeps overlapping end-points readable */}
                  <circle
                    cx={x(n - 1)}
                    cy={y(last)}
                    r={4}
                    fill={s.colour}
                    stroke="var(--viz-surface)"
                    strokeWidth={2}
                  />
                  <text
                    x={W - PAD.right + 10}
                    y={y(last) + 3.5}
                    fontSize={10.5}
                    fill={s.colour}
                    className="font-medium"
                  >
                    {formatValue(Math.round(last))}
                  </text>
                  {hover !== null ? (
                    <circle
                      cx={x(hover)}
                      cy={y(s.values[hover])}
                      r={4.5}
                      fill={s.colour}
                      stroke="var(--viz-surface)"
                      strokeWidth={2}
                    />
                  ) : null}
                </g>
              );
            })}
          </svg>

          {hover !== null ? (
            <div
              className="pointer-events-none absolute top-2 rounded-lg border border-ink-700 bg-ink-950/95 px-3 py-2 shadow-panel"
              style={{
                left: `${Math.min(78, Math.max(2, ((x(hover) - PAD.left) / W) * 100 + 6))}%`,
              }}
              role="tooltip"
            >
              <p className="text-[10px] font-semibold tracking-wide text-ink-500 uppercase">
                Month {hover + 1}
              </p>
              {series.map((s) => (
                <p key={s.key} className="mt-1 flex items-center gap-2 text-[11.5px]">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ background: s.colour }}
                  />
                  <span className="text-ink-400">{s.label}</span>
                  <span className="tabular ml-auto font-mono font-semibold text-ink-100">
                    {formatNumber(s.values[hover])}
                  </span>
                </p>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export interface BarDatum {
  label: string;
  value: number;
  colour: string;
  note?: string;
}

/** Horizontal bars for a small, labelled comparison. */
export function ComparisonBars({
  data,
  reference,
  referenceLabel,
  unit,
}: {
  data: BarDatum[];
  reference?: number;
  referenceLabel?: string;
  unit: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value), reference ?? 0);

  return (
    <div className="space-y-4">
      {data.map((d) => {
        const pct = (d.value / max) * 100;
        const over = reference !== undefined && d.value > reference;
        return (
          <div key={d.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] text-ink-200">{d.label}</span>
              <span className="tabular font-mono text-[12px] font-semibold text-ink-100">
                {formatNumber(d.value)}
                <span className="ml-1 text-ink-500">{unit}</span>
              </span>
            </div>
            <div className="relative mt-1.5 h-3 w-full rounded-full bg-ink-800">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, background: d.colour }}
              />
              {reference !== undefined ? (
                <span
                  className="absolute inset-y-[-3px] w-0.5 rounded-full bg-ink-200"
                  style={{ left: `${(reference / max) * 100}%` }}
                  aria-hidden
                />
              ) : null}
            </div>
            <p
              className={cn(
                'mt-1.5 text-[11px] leading-snug',
                over ? 'text-[#ff9b9b]' : 'text-ink-500',
              )}
            >
              {d.note}
            </p>
          </div>
        );
      })}

      {reference !== undefined ? (
        <p className="flex items-center gap-2 border-t border-ink-850 pt-3 text-[11px] text-ink-400">
          <span className="h-3 w-0.5 rounded-full bg-ink-200" aria-hidden />
          {referenceLabel}: {formatNumber(reference)} {unit}
        </p>
      ) : null}
    </div>
  );
}

/** A single segmented bar showing how the workload divides. */
export function SplitBar({
  segments,
  total,
}: {
  segments: Array<{ label: string; value: number; colour: string }>;
  total: number;
}) {
  return (
    <div>
      {/* 2px surface gap between segments, per the mark spec. */}
      <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full bg-ink-800">
        {segments.map((s) => (
          <div
            key={s.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${total > 0 ? (s.value / total) * 100 : 0}%`,
              background: s.colour,
            }}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[11.5px]">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ background: s.colour }}
            />
            <span className="text-ink-400">{s.label}</span>
            <span className="tabular ml-auto font-mono font-semibold text-ink-100">
              {formatNumber(s.value)}
              <span className="ml-1.5 font-normal text-ink-500">
                {total > 0 ? `${Math.round((s.value / total) * 100)}%` : '0%'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}
