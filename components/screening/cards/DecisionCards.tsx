'use client';

import { Activity, BarChart3, ShieldCheck, Target, UserCheck } from 'lucide-react';
import type {
  ConfidenceAssessment,
  ExplainabilityResult,
  GradingResult,
} from '@/lib/pipeline/types';
import { DR_LEVELS, DR_SCALE } from '@/lib/pipeline/constants';
import {
  Meter,
  Panel,
  PanelHeader,
  SectionLabel,
  StatTile,
  StatusBadge,
} from '@/components/ui/primitives';
import { cn, decisionStatus, levelStatus, quadrantLabel, scoreStatus } from '@/lib/ui';

/* ================================================================== */
/* Stage 4 — Severity grading                                          */
/* ================================================================== */

export function GradingCard({ data }: { data: GradingResult }) {
  const spec = DR_SCALE[data.level];
  const status = levelStatus(data.level);

  return (
    <Panel className="animate-fade-up">
      <PanelHeader
        icon={<Activity className="h-4 w-4" aria-hidden />}
        title="Stage 4 · DR severity grading"
        subtitle="ICDR Level 0–4, with the full probability breakdown rather than only the winner."
        right={
          <StatusBadge status={data.referable ? status : 'good'} size="md">
            {data.referable ? 'Referable DR' : 'Not referable'}
          </StatusBadge>
        }
      />

      <div className="space-y-6 p-5">
        {/* Headline grade. Status colour appears once, always beside the numeral
            and the clinical name — never carrying the meaning by itself. */}
        <div className="flex flex-wrap items-center gap-5 rounded-lg border border-ink-800 bg-ink-900/50 px-5 py-4">
          <div
            className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-3xl font-bold text-ink-950"
            style={{ background: `var(--dr-${data.level})` }}
            aria-hidden
          >
            {data.level}
          </div>
          <div className="min-w-[220px] flex-1">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">
              ICDR Level {data.level}
            </p>
            <p className="mt-1 text-xl font-semibold text-ink-50">{spec.clinical}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-400">{spec.meaning}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">
              Follow-up
            </p>
            <p className="mt-1 text-[13px] font-semibold text-ink-100">{spec.followUp}</p>
            <p className="mt-1 font-mono text-[10.5px] tracking-wide text-ink-500 uppercase">
              Urgency: {data.urgency}
            </p>
          </div>
        </div>

        {/* Probability breakdown. Magnitude = bar length in ONE hue; severity is
            carried by row order, the level numeral and the clinical name. */}
        <div>
          <SectionLabel>Probability across all five levels</SectionLabel>
          <div className="mt-3 space-y-2">
            {DR_LEVELS.map((level) => {
              const p = data.distribution[level] ?? 0;
              const isTop = level === data.level;
              return (
                <div
                  key={level}
                  className={cn(
                    'grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md px-2 py-1.5 transition',
                    isTop && 'bg-brand-600/10 ring-1 ring-brand-600/30 ring-inset',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full"
                      style={{ background: `var(--dr-${level})` }}
                    />
                    <span className="tabular font-mono text-[11px] font-semibold text-ink-400">
                      L{level}
                    </span>
                    <span
                      className={cn(
                        'w-[124px] text-[12px]',
                        isTop ? 'font-semibold text-ink-100' : 'text-ink-400',
                      )}
                    >
                      {DR_SCALE[level].short}
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-ink-800">
                    <div
                      className="h-full rounded-full transition-[width] duration-700 ease-out"
                      style={{
                        width: `${Math.max(0, Math.min(100, p * 100))}%`,
                        background: isTop ? 'var(--viz-series-1)' : 'var(--color-ink-600)',
                      }}
                    />
                  </div>

                  <span
                    className={cn(
                      'tabular w-[52px] text-right font-mono text-[12px]',
                      isTop ? 'font-semibold text-ink-50' : 'text-ink-400',
                    )}
                  >
                    {(p * 100).toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Decision margin"
            value={(data.margin * 100).toFixed(1)}
            unit="pts"
            hint="Top level minus runner-up"
            status={data.margin > 0.35 ? 'good' : data.margin > 0.15 ? 'warning' : 'critical'}
          />
          <StatTile
            label="Distribution entropy"
            value={data.entropy.toFixed(2)}
            hint="0 = certain · 1 = no information"
            status={data.entropy < 0.55 ? 'good' : data.entropy < 0.8 ? 'warning' : 'critical'}
          />
          <StatTile
            label="Grader agreement"
            value={data.agreement.agrees ? 'Agree' : `${data.agreement.delta} levels apart`}
            status={data.agreement.agrees ? 'good' : 'critical'}
            hint="Rule engine vs. vision model"
          />
        </div>

        {/* Two independent opinions, shown side by side rather than merged away. */}
        <div className="grid gap-3 md:grid-cols-2">
          <GraderPanel
            title="Transparent rule engine"
            subtitle="ICDR criteria applied literally to the lesion counts"
            level={data.ruleBased.level}
            body={
              <>
                <p className="font-mono text-[11px] text-brand-300">
                  {data.ruleBased.triggeredRule}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {data.ruleBased.rationale.map((r) => (
                    <li key={r} className="text-[11.5px] leading-relaxed text-ink-400">
                      · {r}
                    </li>
                  ))}
                </ul>
              </>
            }
          />
          <GraderPanel
            title="Vision model"
            subtitle={`Independent read · ${data.modelBased.confidence}% self-reported confidence`}
            level={data.modelBased.level}
            body={
              <p className="text-[11.5px] leading-relaxed text-ink-400">
                {data.modelBased.rationale}
              </p>
            }
          />
        </div>

        <div
          className={cn(
            'rounded-lg border px-4 py-3 text-[12px] leading-relaxed',
            data.agreement.agrees
              ? 'border-ink-800 bg-ink-900/40 text-ink-400'
              : 'border-[#d03b3b]/40 bg-[#d03b3b]/10 text-[#ffb3b3]',
          )}
        >
          {data.agreement.note}
        </div>
      </div>
    </Panel>
  );
}

function GraderPanel({
  title,
  subtitle,
  level,
  body,
}: {
  title: string;
  subtitle: string;
  level: number;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-900/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-ink-100">{title}</p>
          <p className="mt-0.5 text-[11px] text-ink-500">{subtitle}</p>
        </div>
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-sm font-bold text-ink-950"
          style={{ background: `var(--dr-${level})` }}
        >
          {level}
        </span>
      </div>
      <div className="mt-3">{body}</div>
    </div>
  );
}

/* ================================================================== */
/* Stage 5 — Explainability                                            */
/* ================================================================== */

export function ExplainCard({ data }: { data: ExplainabilityResult }) {
  const status = !data.overlapAssessed
    ? 'neutral'
    : data.overlapInterpretation === 'aligned'
      ? 'good'
      : data.overlapInterpretation === 'partial'
        ? 'warning'
        : 'critical';

  return (
    <Panel className="animate-fade-up">
      <PanelHeader
        icon={<Target className="h-4 w-4" aria-hidden />}
        title="Stage 5 · Explainability"
        subtitle="Where the grading signal came from, and whether it lands on real evidence."
        right={
          <StatusBadge status={status} size="md">
            {data.overlapAssessed ? `Evidence ${data.overlapInterpretation}` : 'Not independently assessed'}
          </StatusBadge>
        }
      />

      <div className="space-y-5 p-5">
        <p className="text-[12.5px] leading-relaxed text-ink-300">{data.narrative}</p>

        <div className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900/40 px-3.5 py-2.5">
          <span className="text-[10.5px] font-semibold tracking-[0.1em] text-ink-500 uppercase">
            Attention source
          </span>
          <span className="font-mono text-[11.5px] text-brand-300">
            {data.attentionSource === 'model'
              ? 'grading model — the regions it reported as driving the grade'
              : 'on-device lesion-response energy (vasculature suppressed)'}
          </span>
        </div>

        <div className="rounded-lg border border-ink-800 bg-ink-900/50 px-4 py-4">
          <Meter
            label="Evidence overlap score"
            value={data.evidenceOverlapScore}
            status={status}
            note={data.overlapExplanation}
          />
        </div>

        <div>
          <SectionLabel>Where the attention mass actually landed</SectionLabel>
          <div className="mt-3 space-y-3">
            <Meter
              label="On detected lesions"
              value={data.attentionOnLesionsPct}
              suffix="%"
              colour="var(--viz-series-1)"
              compact
            />
            <Meter
              label="On normal anatomy (disc, macula)"
              value={data.attentionOnAnatomyPct}
              suffix="%"
              colour="var(--viz-series-3)"
              compact
            />
            <Meter
              label="Unaccounted for"
              value={data.attentionUnexplainedPct}
              suffix="%"
              colour="var(--color-ink-500)"
              compact
            />
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-ink-500">
            Strict cell-level decomposition. Attention is coarse and lesions are small, so a
            low “on lesions” share is normal — the overlap score above measures proximity
            rather than pixel coincidence, which is the fairer question.
          </p>
        </div>

        {data.topRegions.length > 0 ? (
          <div>
            <SectionLabel>Highest-weighted regions</SectionLabel>
            <div className="mt-2.5 space-y-1.5">
              {data.topRegions.map((r) => (
                <div
                  key={`${r.row}-${r.col}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-ink-850 bg-ink-900/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-[11.5px] text-ink-200">{quadrantLabel(r.quadrant)}</p>
                    <p className="mt-0.5 text-[10.5px] text-ink-500">
                      {r.contains.length ? r.contains.join(', ') : 'no located finding in this cell'}
                    </p>
                  </div>
                  <span className="tabular shrink-0 font-mono text-[11px] text-brand-300">
                    {(r.weight * 100).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {data.evidenceNotes.length > 0 ? (
          <div>
            <SectionLabel>Why each finding matters</SectionLabel>
            <div className="mt-2.5 space-y-2.5">
              {data.evidenceNotes.map((n) => (
                <div key={n.lesionClass} className="border-l-2 border-brand-600/50 pl-3">
                  <p className="text-[12px] font-semibold text-ink-100">
                    {n.label} <span className="tabular text-ink-400">× {n.count}</span>
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-400">{n.why}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

/* ================================================================== */
/* Stage 6 — Confidence & human-in-the-loop                            */
/* ================================================================== */

export function ConfidenceCard({ data }: { data: ConfidenceAssessment }) {
  const status = decisionStatus(data.decision);

  return (
    <Panel className="animate-fade-up">
      <PanelHeader
        icon={<UserCheck className="h-4 w-4" aria-hidden />}
        title="Stage 6 · Confidence & human-in-the-loop"
        subtitle="Is the system confident enough for this result to stand without a doctor?"
      />

      <div className="space-y-5 p-5">
        <div
          className={cn(
            'rounded-xl border px-5 py-4',
            status === 'good' && 'border-[#0ca30c]/40 bg-[#0ca30c]/8',
            status === 'warning' && 'border-[#fab219]/45 bg-[#fab219]/8',
            status === 'critical' && 'border-[#d03b3b]/50 bg-[#d03b3b]/10',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-[240px] flex-1">
              <StatusBadge status={status} size="lg">
                {data.decisionLabel}
              </StatusBadge>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-300">{data.narrative}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">
                Fused confidence
              </p>
              <p className="tabular mt-1 text-4xl leading-none font-semibold text-ink-50">
                {data.finalConfidence}
                <span className="text-base font-medium text-ink-500">/100</span>
              </p>
              <p className="mt-1 font-mono text-[10.5px] tracking-wide text-ink-500 uppercase">
                {data.band} band
              </p>
            </div>
          </div>
        </div>

        <div>
          <SectionLabel>How the confidence was built</SectionLabel>
          <div className="mt-3 space-y-4">
            {data.factors.map((f) => (
              <div key={f.key}>
                <Meter
                  label={
                    <span className="flex items-center gap-2">
                      {f.label}
                      <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
                        weight {f.weight.toFixed(2)}
                      </span>
                    </span>
                  }
                  value={f.value}
                  status={scoreStatus(f.value)}
                  note={
                    <>
                      {f.note}{' '}
                      <span className="tabular font-mono text-ink-400">
                        (contributes {(f.value * f.weight).toFixed(1)} pts)
                      </span>
                    </>
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {data.safetyOverrides.length > 0 ? (
          <div className="rounded-lg border border-[#d03b3b]/40 bg-[#d03b3b]/8 p-4">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-[#ffb3b3]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Safety rules triggered ({data.safetyOverrides.length})
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {data.safetyOverrides.map((o) => (
                <li key={o} className="text-[11.5px] leading-relaxed text-ink-300">
                  · {o}
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-[#d03b3b]/25 pt-2.5 text-[11px] leading-relaxed text-ink-400">
              Safety rules run after the confidence number and outrank it. A high score
              cannot release a case that a rule has held back.
            </p>
          </div>
        ) : null}

        <div>
          <SectionLabel>Reasoning</SectionLabel>
          <ul className="mt-2.5 space-y-1.5">
            {data.reasons.map((r) => (
              <li key={r} className="flex gap-2 text-[12px] leading-relaxed text-ink-400">
                <span
                  className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-500"
                  aria-hidden
                />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

/* Small shared export used by the workspace header. */
export function GradeSummaryStrip({
  grading,
  confidence,
}: {
  grading: GradingResult;
  confidence: ConfidenceAssessment;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span
        className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-extrabold text-white shadow-sm border border-black/10"
        style={{ background: `var(--dr-${grading.level})` }}
      >
        <BarChart3 className="h-3.5 w-3.5" aria-hidden />
        Level {grading.level} · {DR_SCALE[grading.level].short}
      </span>
      <StatusBadge status={decisionStatus(confidence.decision)} size="md">
        {confidence.decisionLabel}
      </StatusBadge>
      <span className="tabular rounded-lg border border-slate-200 bg-white shadow-2xs px-3 py-1.5 font-mono text-[11.5px] font-bold text-slate-800">
        {confidence.finalConfidence}/100 confidence
      </span>
    </div>
  );
}
