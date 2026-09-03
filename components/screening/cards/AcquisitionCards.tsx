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

      <div className="space-y-5 p-5">
        <div className="flex items-center gap-5 rounded-lg border border-ink-800 bg-ink-900/50 px-4 py-4">
          <div className="shrink-0">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">
              Composite
            </p>
            <p className="tabular mt-1 text-4xl leading-none font-semibold text-ink-50">
              {data.overallScore}
              <span className="text-base font-medium text-ink-500">/100</span>
            </p>
          </div>
          <p className="text-[12.5px] leading-relaxed text-ink-300">{data.narrative}</p>
        </div>

        <div>
          <SectionLabel>Measured sub-scores</SectionLabel>
          <div className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2">
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
            <ul className="mt-2.5 space-y-1.5">
              {data.failureReasons.slice(0, 6).map((r) => (
                <li key={r} className="flex gap-2 text-[12px] leading-relaxed text-ink-400">
                  <TriangleAlert
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#fab219]"
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
    <div className="rounded-lg border border-ink-800 bg-ink-900/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-100">
          <Sparkles className="h-3.5 w-3.5 text-brand-300" aria-hidden />
          Retinal enhancement {enhancement.applied ? 'applied' : 'attempted and rejected'}
        </p>
        <span
          className={cn(
            'tabular font-mono text-[11px] font-semibold',
            gain > 0 ? 'text-[#3fce3f]' : 'text-ink-400',
          )}
        >
          {enhancement.scoreBefore} → {enhancement.scoreAfter} ({gain >= 0 ? '+' : ''}
          {gain})
        </span>
      </div>

      {!enhancement.applied ? (
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-500">
          Enhancement did not measurably improve the composite score, so the original
          capture was kept. Enhancement is only accepted when it demonstrably helps.
        </p>
      ) : null}

      <div className="relative mt-3 overflow-hidden rounded-lg border border-ink-800 bg-black">
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
          className="pointer-events-none absolute inset-y-0 w-px bg-brand-300"
          style={{ left: `${split}%` }}
          aria-hidden
        />
        <span className="pointer-events-none absolute top-2 left-2 rounded bg-ink-950/80 px-1.5 py-0.5 font-mono text-[9.5px] tracking-wide text-ink-300">
          BEFORE
        </span>
        <span className="pointer-events-none absolute top-2 right-2 rounded bg-ink-950/80 px-1.5 py-0.5 font-mono text-[9.5px] tracking-wide text-brand-300">
          AFTER
        </span>
      </div>

      <label className="mt-3 block">
        <span className="sr-only">Before / after comparison position</span>
        <input
          type="range"
          min={0}
          max={100}
          value={split}
          onChange={(e) => setSplit(Number(e.target.value))}
          className="w-full accent-[#1aa197]"
        />
      </label>

      <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {enhancement.deltas
          .filter((d) => d.after !== d.before)
          .map((d) => (
            <KeyValue
              key={d.key}
              label={d.label}
              value={
                <span className="tabular font-mono">
                  {d.before} →{' '}
                  <span className={d.after > d.before ? 'text-[#3fce3f]' : 'text-[#ff9b9b]'}>
                    {d.after}
                  </span>
                </span>
              }
            />
          ))}
      </div>

      <ul className="mt-3 space-y-1">
        {enhancement.operations.map((op) => (
          <li key={op} className="font-mono text-[10.5px] leading-relaxed text-ink-500">
            · {op}
          </li>
        ))}
      </ul>
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
        subtitle="Establishing the frame of reference every later measurement depends on."
        right={
          <StatusBadge status={data.anatomyComplete ? 'good' : 'warning'} size="md">
            {data.anatomyComplete ? 'Anatomy located' : 'Anatomy incomplete'}
          </StatusBadge>
        }
      />

      <div className="space-y-5 p-5">
        <p className="text-[12.5px] leading-relaxed text-ink-300">{data.narrative}</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Optic disc"
            value={data.opticDisc.detected ? `${data.opticDisc.confidence}` : '—'}
            unit={data.opticDisc.detected ? '/100 conf' : undefined}
            status={data.opticDisc.detected ? 'good' : 'warning'}
            hint={`r ≈ ${(data.opticDisc.radius * 100).toFixed(1)}% of width`}
          />
          <StatTile
            label="Fovea"
            value={data.fovea.detected ? `${data.fovea.discDiameters}` : '—'}
            unit={data.fovea.detected ? 'DD from disc' : undefined}
            status={data.fovea.detected ? 'good' : 'warning'}
            hint="Normal range 2.0–3.0 DD"
          />
          <StatTile
            label="Vessel density"
            value={data.vessels.densityPct}
            unit="% of retina"
            hint={`Arcade visibility ${data.vessels.arcadeContinuity}/100`}
          />
          <StatTile
            label="Laterality"
            value={data.laterality === 'indeterminate' ? '—' : data.laterality}
            hint={titleCase(data.fieldDefinition)}
            status={data.laterality === 'indeterminate' ? 'warning' : 'neutral'}
          />
        </div>

        <div className="space-y-3">
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
    <div className="grid gap-1 border-l-2 border-ink-800 pl-3 sm:grid-cols-[130px_1fr] sm:gap-3">
      <p
        className={cn(
          'text-[11px] font-semibold tracking-wide uppercase',
          status === 'warn' ? 'text-[#fab219]' : status === 'ok' ? 'text-[#3fce3f]' : 'text-ink-500',
        )}
      >
        {label}
      </p>
      <p className="text-[12px] leading-relaxed text-ink-400">{text}</p>
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

      <div className="space-y-5 p-5">
        <p className="text-[12.5px] leading-relaxed text-ink-300">{data.narrative}</p>

        {present.length > 0 ? (
          <div>
            <SectionLabel>Lesion inventory</SectionLabel>
            <div className="mt-3 space-y-3">
              {present.map((c) => {
                const spec = LESION_TAXONOMY[c];
                const share = total ? (data.counts[c] / total) * 100 : 0;
                return (
                  <div key={c}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex items-center gap-2 text-[12.5px] text-ink-200">
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
                      <span className="tabular text-[13px] font-semibold text-ink-100">
                        {data.counts[c]}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${share}%`, background: spec.colour }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] leading-snug text-ink-500">
                      {spec.significance}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-[#0ca30c]/30 bg-[#0ca30c]/8 px-4 py-3 text-[12.5px] leading-relaxed text-ink-300">
            No lesions were located. On a gradable image this is a meaningful negative — it
            is the evidence for a Level 0 grade, not an absence of evidence.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Detector corroboration"
            value={data.corroborationScore}
            unit="/100"
            status={scoreStatus(data.corroborationScore)}
            hint="Model findings vs. classical detection"
          />
          <StatTile
            label="CV candidates"
            value={`${data.cvCandidates.darkBlobs}/${data.cvCandidates.brightBlobs}`}
            hint="Dark / bright blob objects"
          />
          <StatTile
            label="Red-lesion density"
            value={data.densityPerDiscArea}
            unit="per disc area"
            hint="Microaneurysms + haemorrhages"
          />
          <StatTile
            label="Quadrants involved"
            value={`${Object.values(data.quadrantBurden).filter((v) => v > 0).length}/4`}
            hint="Feeds the 4-2-1 severe-NPDR rule"
            status={
              Object.values(data.quadrantBurden).filter((v) => v > 0).length >= 4
                ? 'serious'
                : 'neutral'
            }
          />
        </div>

        <div>
          <SectionLabel>Quadrant distribution of red lesions</SectionLabel>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {Object.entries(data.quadrantBurden).map(([q, count]) => (
              <Chip key={q}>
                {quadrantLabel(q)} <span className="tabular text-ink-100">{count}</span>
              </Chip>
            ))}
          </div>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-500">
            {data.fourTwoOne.explanation}
          </p>
        </div>

        <div
          className={cn(
            'rounded-lg border px-4 py-3',
            data.neovascularisation.suspected
              ? 'border-[#d03b3b]/45 bg-[#d03b3b]/10'
              : 'border-ink-800 bg-ink-900/40',
          )}
        >
          <p className="flex items-center gap-2 text-[12px] font-semibold text-ink-100">
            <Layers className="h-3.5 w-3.5" aria-hidden />
            Neovascularisation:{' '}
            {data.neovascularisation.suspected
              ? `suspected (${data.neovascularisation.confidence}% confidence)`
              : 'not identified'}
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-400">
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
    <div>
      <SectionLabel>Located findings</SectionLabel>
      <div className="mt-2.5 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="border-b border-ink-800">
              {['ID', 'Finding', 'Position', 'Quadrant', 'Conf.', 'Source'].map((h) => (
                <th
                  key={h}
                  className="pb-2 text-[10px] font-semibold tracking-[0.1em] text-ink-500 uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-b border-ink-850/70">
                <td className="tabular py-2 font-mono text-[11px] text-ink-500">{l.id}</td>
                <td className="py-2 text-[11.5px] text-ink-200">
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-[2px]"
                      style={{ background: LESION_TAXONOMY[l.lesionClass].colour }}
                    />
                    {LESION_TAXONOMY[l.lesionClass].label}
                  </span>
                </td>
                <td className="tabular py-2 font-mono text-[11px] text-ink-500">
                  {l.centre.x.toFixed(2)}, {l.centre.y.toFixed(2)}
                </td>
                <td className="py-2 text-[11px] text-ink-400">{quadrantLabel(l.quadrant)}</td>
                <td className="tabular py-2 font-mono text-[11px] text-ink-300">
                  {l.confidence}%
                </td>
                <td className="py-2 text-[10.5px]">
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 font-medium',
                      l.source === 'both'
                        ? 'bg-[#0ca30c]/15 text-[#3fce3f]'
                        : l.source === 'cv'
                          ? 'bg-ink-800 text-ink-300'
                          : 'bg-[#fab219]/12 text-[#fab219]',
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
          className="mt-3 text-[11.5px] font-semibold text-brand-300 hover:text-brand-200"
        >
          {expanded ? 'Show fewer' : `Show all ${lesions.length} findings`}
        </button>
      ) : null}
    </div>
  );
}
