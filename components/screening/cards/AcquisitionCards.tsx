'use client';

import { useState } from 'react';
import { Crosshair, Eye, Layers, ScanEye, Sparkles, TriangleAlert } from 'lucide-react';
import type {
  LesionAnalysis,
  QualityAssessment,
  StructureAnalysis,
} from '@/lib/pipeline/types';
import { LESION_TAXONOMY, LESION_CLASSES } from '@/lib/pipeline/constants';
import {
  Chip,
  KeyValue,
  Meter,
  Panel,
  PanelHeader,
  SectionLabel,
  StatTile,
  StatusBadge,
} from '@/components/ui/primitives';
import { cn, quadrantLabel, qualityStatus, scoreStatus, titleCase } from '@/lib/ui';

/* ================================================================== */
/* Stage 1 — Image quality                                             */
/* ================================================================== */

export function QualityCard({ data }: { data: QualityAssessment }) {
  const status = qualityStatus(data.verdict);

  return (
    <Panel className="animate-fade-up">
      <PanelHeader
        icon={<Eye className="h-4 w-4" aria-hidden />}
        title="Stage 1 · Image quality assessment"
        subtitle="Is this photograph good enough to grade? Measured, not estimated."
        right={
          <StatusBadge status={status} size="md">
            {data.verdict === 'good'
              ? 'Gradable'
              : data.verdict === 'borderline'
                ? 'Borderline — gradable with caution'
                : 'Ungradeable'}
          </StatusBadge>
        }
      />

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-lg font-bold text-slate-900">
            Image Quality: {data.overallScore}/100
          </p>
          <p className="text-sm font-medium text-slate-800">
            Status: {data.verdict === 'good' ? 'Gradable' : data.verdict === 'borderline' ? 'Gradable with caution' : 'Ungradeable'}
          </p>
          <p className="text-sm text-slate-600">
            Main issue: {data.failureReasons.length > 0 ? data.failureReasons[0] : 'None'}
          </p>
        </div>

        <div>
          <SectionLabel>Measured sub-scores</SectionLabel>
          <div className="mt-2.5 grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
            {data.metrics.map((m) => (
              <Meter
                key={m.key}
                label={m.label}
                value={m.score}
                status={scoreStatus(m.score)}
                note={
                  <span className="font-mono text-[10.5px]">
                    {m.rawLabel}: {m.raw}
                  </span>
                }
              />
            ))}
          </div>
        </div>

        {data.enhancement ? <EnhancementBlock enhancement={data.enhancement} /> : null}

        {data.failureReasons.length > 0 ? (
          <div>
            <SectionLabel>Findings that reduced the score</SectionLabel>
            <ul className="mt-2 space-y-1.5">
              {data.failureReasons.slice(0, 6).map((r) => (
                <li key={r} className="flex gap-2 text-xs leading-relaxed text-slate-600">
                  <TriangleAlert
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                    aria-hidden
                  />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function EnhancementBlock({
  enhancement,
}: {
  enhancement: NonNullable<QualityAssessment['enhancement']>;
}) {
  const [split, setSplit] = useState(50);
  const gain = enhancement.scoreAfter - enhancement.scoreBefore;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Sparkles className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
          Retinal enhancement {enhancement.applied ? 'applied' : 'attempted and rejected'}
        </p>
        <span
          className={cn(
            'tabular font-mono text-xs font-bold',
            gain > 0 ? 'text-emerald-700' : 'text-slate-500',
          )}
        >
          {enhancement.scoreBefore} → {enhancement.scoreAfter} ({gain >= 0 ? '+' : ''}
          {gain})
        </span>
      </div>

      {!enhancement.applied ? (
        <p className="mt-1.5 text-xs text-slate-500">
          Enhancement did not measurably improve the composite score, so the original
          capture was kept.
        </p>
      ) : null}

      <div className="relative mt-2.5 overflow-hidden rounded-lg border border-slate-700 bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={enhancement.imageAfter}
          alt="Enhanced fundus photograph"
          className="block h-auto w-full"
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${split}%` }}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enhancement.imageBefore}
            alt=""
            className="block h-full w-auto max-w-none object-cover"
            style={{ width: `${(100 / Math.max(split, 1)) * 100}%` }}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-emerald-400 shadow-sm"
          style={{ left: `${split}%` }}
          aria-hidden
        />
        <span className="pointer-events-none absolute top-2 left-2 rounded bg-slate-900/80 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide text-slate-200">
          BEFORE
        </span>
        <span className="pointer-events-none absolute top-2 right-2 rounded bg-emerald-950/80 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide text-emerald-300">
          AFTER
        </span>
      </div>

      <label className="mt-2.5 block">
        <span className="sr-only">Before / after comparison position</span>
        <input
          type="range"
          min={0}
          max={100}
          value={split}
          onChange={(e) => setSplit(Number(e.target.value))}
          className="w-full accent-emerald-600"
        />
      </label>

      <div className="mt-2.5 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {enhancement.deltas
          .filter((d) => d.after !== d.before)
          .map((d) => (
            <KeyValue
              key={d.key}
              label={d.label}
              value={
                <span className="tabular font-mono">
                  {d.before} →{' '}
                  <span className={d.after > d.before ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                    {d.after}
                  </span>
                </span>
              }
            />
          ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Stage 2 — Retinal structures                                        */
/* ================================================================== */

export function StructureCard({ data }: { data: StructureAnalysis }) {
  return (
    <Panel className="animate-fade-up">
      <PanelHeader
        icon={<Crosshair className="h-4 w-4" aria-hidden />}
        title="Stage 2 · Retinal structure analysis"
        subtitle="Establishing anatomical landmarks: optic disc, macula, and vessel arcades."
        right={
          <StatusBadge status={data.anatomyComplete ? 'good' : 'warning'} size="md">
            {data.anatomyComplete ? 'Anatomy located' : 'Anatomy incomplete'}
          </StatusBadge>
        }
      />

      <div className="space-y-4 p-4 sm:p-5">
        <p className="text-xs sm:text-[13px] leading-relaxed text-slate-600">{data.narrative}</p>

        <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Optic Disc"
            value={data.opticDisc.detected ? 'Detected' : 'Not Detected'}
            status={data.opticDisc.detected ? 'good' : 'warning'}
          />
          <StatTile
            label="Macula/Fovea"
            value={data.fovea.detected ? 'Detected' : 'Not Detected'}
            status={data.fovea.detected ? 'good' : 'warning'}
          />
          <StatTile
            label="Blood Vessels"
            value={data.vessels.densityPct > 5 ? 'Clearly visible' : 'Poorly visible'}
            status={data.vessels.densityPct > 5 ? 'good' : 'warning'}
          />
          <StatTile
            label="Eye"
            value={data.laterality === 'indeterminate' ? 'Unknown' : titleCase(data.laterality)}
            status={data.laterality === 'indeterminate' ? 'warning' : 'neutral'}
          />
        </div>

        <div className="space-y-2.5 pt-1">
          <DetailRow label="Optic disc" text={data.opticDisc.note} />
          <DetailRow label="Fovea" text={data.fovea.note} />
          <DetailRow label="Vasculature" text={data.vessels.note} />
          <DetailRow label="Laterality" text={data.lateralityRationale} />
          <DetailRow
            label="Independent corroboration"
            text={data.modelAgreement.note}
            status={
              data.modelAgreement.status === 'disagree'
                ? 'warn'
                : data.modelAgreement.status === 'agree'
                  ? 'ok'
                  : undefined
            }
          />
        </div>
      </div>
    </Panel>
  );
}

function DetailRow({
  label,
  text,
  status,
}: {
  label: string;
  text: string;
  status?: 'ok' | 'warn';
}) {
  return (
    <div className="grid gap-1 border-l-2 border-slate-200 pl-3 sm:grid-cols-[130px_1fr] sm:gap-3">
      <p
        className={cn(
          'text-[10.5px] font-bold tracking-wide uppercase',
          status === 'warn' ? 'text-amber-800' : status === 'ok' ? 'text-emerald-800' : 'text-slate-500',
        )}
      >
        {label}
      </p>
      <p className="text-xs leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}

/* ================================================================== */
/* Stage 3 — Lesion detection                                          */
/* ================================================================== */

export function LesionCard({ data }: { data: LesionAnalysis }) {
  const present = LESION_CLASSES.filter((c) => data.counts[c] > 0);
  const total = present.reduce((sum, c) => sum + data.counts[c], 0);

  return (
    <Panel className="animate-fade-up">
      <PanelHeader
        icon={<ScanEye className="h-4 w-4" aria-hidden />}
        title="Stage 3 · Lesion detection"
        subtitle="What disease-specific findings are present, and where on the retina?"
        right={
          <StatusBadge status={total === 0 ? 'good' : total > 12 ? 'serious' : 'warning'} size="md">
            {total === 0 ? 'No lesions found' : `${total} findings`}
          </StatusBadge>
        }
      />

      <div className="space-y-4 p-4 sm:p-5">
        <p className="text-xs sm:text-[13px] leading-relaxed text-slate-600">{data.narrative}</p>

        {present.length > 0 ? (
          <div>
            <SectionLabel>Lesion inventory</SectionLabel>
            <div className="mt-2.5 space-y-2.5">
              {present.map((c) => {
                const spec = LESION_TAXONOMY[c];
                const share = total ? (data.counts[c] / total) * 100 : 0;
                return (
                  <div key={c}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 shrink-0"
                          style={{
                            border: `1.5px solid ${spec.colour}`,
                            background: `${spec.colour}40`,
                            borderRadius:
                              c === 'microaneurysm' || c === 'haemorrhage' ? '999px' : '2px',
                            transform:
                              c === 'irma' || c === 'venous_beading' ? 'rotate(45deg)' : undefined,
                          }}
                        />
                        {spec.label}
                      </span>
                      <span className="tabular text-xs font-bold text-slate-900">
                        {data.counts[c]}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${share}%`, background: spec.colour }}
                      />
                    </div>
                    <p className="mt-1 text-[10.5px] text-slate-500">
                      {spec.significance}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
            No lesions were located. On a gradable image this is a meaningful negative — the
            primary evidence for a Level 0 grade.
          </p>
        )}

        <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">
          <StatTile label="Microaneurysms" value={data.counts['microaneurysm'] || 0} />
          <StatTile label="Haemorrhages" value={data.counts['haemorrhage'] || 0} />
          <StatTile label="Hard Exudates" value={data.counts['hard_exudate'] || 0} />
          <StatTile label="Soft Exudates" value={data.counts['soft_exudate'] || 0} />
          <StatTile label="IRMA" value={data.counts['irma'] || 0} />
          <StatTile label="Venous Beading" value={data.counts['venous_beading'] || 0} />
          <StatTile 
            label="Neovascularisation" 
            value={data.neovascularisation.suspected ? 'Suspected' : 'None'} 
            status={data.neovascularisation.suspected ? 'critical' : 'good'} 
          />
        </div>

        <div>
          <SectionLabel>Quadrant distribution of red lesions</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(data.quadrantBurden).map(([q, count]) => (
              <Chip key={q}>
                {quadrantLabel(q)} <span className="tabular font-bold text-slate-900">{count}</span>
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {data.fourTwoOne.explanation}
          </p>
        </div>

        <div
          className={cn(
            'rounded-lg border px-3.5 py-2.5 text-xs',
            data.neovascularisation.suspected
              ? 'border-rose-300 bg-rose-50 text-rose-800'
              : 'border-slate-200 bg-slate-50 text-slate-700',
          )}
        >
          <p className="flex items-center gap-1.5 font-bold">
            <Layers className="h-3.5 w-3.5" aria-hidden />
            Neovascularisation:{' '}
            {data.neovascularisation.suspected
              ? `suspected (${data.neovascularisation.confidence}% confidence)`
              : 'not identified'}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
            {data.neovascularisation.rationale}
          </p>
        </div>

        {data.lesions.length > 0 ? <LesionTable lesions={data.lesions} /> : null}
      </div>
    </Panel>
  );
}

function LesionTable({ lesions }: { lesions: LesionAnalysis['lesions'] }) {
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? lesions : lesions.slice(0, 8);

  return (
    <div className="border-t border-slate-100 pt-3">
      <SectionLabel>Located findings</SectionLabel>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[500px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              {['ID', 'Finding', 'Position', 'Quadrant', 'Conf.', 'Source'].map((h) => (
                <th
                  key={h}
                  className="pb-2 text-[10px] font-bold tracking-wider uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50 transition">
                <td className="tabular py-1.5 font-mono text-[11px] text-slate-500">{l.id}</td>
                <td className="py-1.5 text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-[2px]"
                      style={{ background: LESION_TAXONOMY[l.lesionClass].colour }}
                    />
                    {LESION_TAXONOMY[l.lesionClass].label}
                  </span>
                </td>
                <td className="tabular py-1.5 font-mono text-[11px] text-slate-500">
                  {l.centre.x.toFixed(2)}, {l.centre.y.toFixed(2)}
                </td>
                <td className="py-1.5 text-slate-600">{quadrantLabel(l.quadrant)}</td>
                <td className="tabular py-1.5 font-mono text-slate-800">
                  {l.confidence}%
                </td>
                <td className="py-1.5">
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                      l.source === 'both'
                        ? 'bg-emerald-100 text-emerald-800'
                        : l.source === 'cv'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-amber-100 text-amber-800',
                    )}
                  >
                    {l.source === 'both' ? 'corroborated' : l.source === 'cv' ? 'CV' : 'model'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lesions.length > 8 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
        >
          {expanded ? 'Show fewer' : `Show all ${lesions.length} findings`}
        </button>
      ) : null}
    </div>
  );
}
