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
        subtitle="ICDR Level 0–4 standard, with complete probability distribution across all five grades."
        right={
          <StatusBadge status={data.referable ? status : 'good'} size="md">
            {data.referable ? 'Referable DR' : 'Not referable'}
          </StatusBadge>
        }
      />

      <div className="space-y-5 p-4 sm:p-5">
        {/* Headline grade box */}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
          <div
            className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-3xl font-extrabold text-white shadow-sm"
            style={{ background: `var(--dr-${data.level})` }}
            aria-hidden
          >
            {data.level}
          </div>
          <div className="min-w-[200px] flex-1">
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              ICDR Classification
            </p>
            <p className="mt-0.5 text-xl font-bold text-slate-900">{spec.clinical}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{spec.meaning}</p>
          </div>
          <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-5">
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Clinical Action
            </p>
            <p className="mt-0.5 text-xs font-bold text-slate-900">{spec.followUp}</p>
            <p className="mt-0.5 font-mono text-[10px] font-semibold text-emerald-800 uppercase">
              Urgency: {data.urgency}
            </p>
          </div>
        </div>

        {/* Probability breakdown */}
        <div>
          <SectionLabel>Probability across all five levels</SectionLabel>
          <div className="mt-2.5 space-y-2">
            {DR_LEVELS.map((level) => {
              const p = data.distribution[level] ?? 0;
              const isTop = level === data.level;
              return (
                <div
                  key={level}
                  className={cn(
                    'grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg px-2.5 py-1.5 transition',
                    isTop ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full"
                      style={{ background: `var(--dr-${level})` }}
                    />
                    <span className="tabular font-mono text-[11px] font-bold text-slate-500">
                      L{level}
                    </span>
                    <span
                      className={cn(
                        'w-[110px] sm:w-[130px] text-xs',
                        isTop ? 'font-bold text-slate-900' : 'text-slate-600',
                      )}
                    >
                      {DR_SCALE[level].short}
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full transition-[width] duration-500 ease-out"
                      style={{
                        width: `${Math.max(0, Math.min(100, p * 100))}%`,
                        background: isTop ? '#059669' : '#94a3b8',
                      }}
                    />
                  </div>

                  <span
                    className={cn(
                      'tabular w-[50px] text-right font-mono text-xs',
                      isTop ? 'font-bold text-emerald-800' : 'text-slate-500',
                    )}
                  >
                    {(p * 100).toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-3">
          <StatTile
            label="Decision margin"
            value={(data.margin * 100).toFixed(1)}
            unit="pts"
            hint="Top level vs. runner-up"
            status={data.margin > 0.35 ? 'good' : data.margin > 0.15 ? 'warning' : 'critical'}
          />
          <StatTile
            label="Distribution entropy"
            value={data.entropy.toFixed(2)}
            hint="0 = certain · 1 = uniform"
            status={data.entropy < 0.55 ? 'good' : data.entropy < 0.8 ? 'warning' : 'critical'}
          />
          <StatTile
            label="Grader agreement"
            value={data.agreement.agrees ? 'Agree' : `${data.agreement.delta} lvl delta`}
            status={data.agreement.agrees ? 'good' : 'critical'}
            hint="Rule engine vs. vision model"
          />
        </div>

        {/* Two independent opinions */}
        <div className="grid gap-3 sm:grid-cols-2">
          <GraderPanel
            title="Rule-Based Decision Engine"
            subtitle="Deterministic clinical criteria from lesion counts"
            level={data.ruleBased.level}
            body={
              <>
                <p className="font-mono text-[11px] font-bold text-emerald-700">
                  {data.ruleBased.triggeredRule}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {data.ruleBased.rationale.map((r) => (
                    <li key={r} className="text-xs leading-relaxed text-slate-600">
                      · {r}
                    </li>
                  ))}
                </ul>
              </>
            }
          />
          <GraderPanel
            title="Vision Model Verification"
            subtitle={`Independent read · ${data.modelBased.confidence}% self-reported confidence`}
            level={data.modelBased.level}
            body={
              <p className="text-xs leading-relaxed text-slate-600">
                {data.modelBased.rationale}
              </p>
            }
          />
        </div>

        <div
          className={cn(
            'rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed',
            data.agreement.agrees
              ? 'border-slate-200 bg-slate-50 text-slate-600'
              : 'border-rose-300 bg-rose-50 text-rose-800',
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
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-900">{title}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>
        </div>
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-xs font-extrabold text-white shadow-xs"
          style={{ background: `var(--dr-${level})` }}
        >
          {level}
        </span>
      </div>
      <div className="mt-2.5">{body}</div>
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
        title="Stage 5 · Explainability & visual evidence"
        subtitle="Where the grading signal originated and whether it matches anatomical evidence."
        right={
          <StatusBadge status={status} size="md">
            {data.overlapAssessed ? `Evidence ${data.overlapInterpretation}` : 'Not independently assessed'}
          </StatusBadge>
        }
      />

      <div className="space-y-4 p-4 sm:p-5">
        <p className="text-xs sm:text-[13px] leading-relaxed text-slate-600">{data.narrative}</p>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <span className="text-[10.5px] font-bold tracking-wider text-slate-500 uppercase">
            Attention Source:
          </span>
          <span className="font-mono text-xs font-medium text-emerald-800">
            {data.attentionSource === 'model'
              ? 'Grading model saliency map (reported driver regions)'
              : 'On-device lesion-response energy (suppressed vasculature)'}
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4">
          <Meter
            label="Evidence overlap score"
            value={data.evidenceOverlapScore}
            status={status}
            note={data.overlapExplanation}
          />
        </div>

        <div>
          <SectionLabel>Where the attention mass landed</SectionLabel>
          <div className="mt-2.5 space-y-2.5">
            <Meter
              label="On detected lesions"
              value={data.attentionOnLesionsPct}
              suffix="%"
              colour="#059669"
              compact
            />
            <Meter
              label="On normal anatomy (disc, macula)"
              value={data.attentionOnAnatomyPct}
              suffix="%"
              colour="#3b82f6"
              compact
            />
            <Meter
              label="Background / unexplained"
              value={data.attentionUnexplainedPct}
              suffix="%"
              colour="#94a3b8"
              compact
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            Cell-level decomposition. Attention is coarse and lesions are punctate; the overlap score measures proximity rather than single-pixel coincidence.
          </p>
        </div>

        {data.topRegions.length > 0 ? (
          <div>
            <SectionLabel>Highest-weighted regions</SectionLabel>
            <div className="mt-2 space-y-1.5">
              {data.topRegions.map((r) => (
                <div
                  key={`${r.row}-${r.col}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800">{quadrantLabel(r.quadrant)}</p>
                    <p className="text-[10.5px] text-slate-500">
                      {r.contains.length ? r.contains.join(', ') : 'No located finding in this cell'}
                    </p>
                  </div>
                  <span className="tabular shrink-0 font-mono text-xs font-bold text-emerald-700">
                    {(r.weight * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {data.evidenceNotes.length > 0 ? (
          <div>
            <SectionLabel>Clinical Significance by Finding</SectionLabel>
            <div className="mt-2 space-y-2">
              {data.evidenceNotes.map((n) => (
                <div key={n.lesionClass} className="border-l-2 border-emerald-500 pl-3">
                  <p className="text-xs font-bold text-slate-900">
                    {n.label} <span className="tabular text-slate-500 font-normal">× {n.count}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">{n.why}</p>
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
        title="Stage 6 · Confidence & human-in-the-loop safety"
        subtitle="Evaluating multi-signal fusion to determine whether doctor sign-off is required."
      />

      <div className="space-y-4 p-4 sm:p-5">
        <div
          className={cn(
            'rounded-xl border p-4',
            status === 'good' && 'border-emerald-200 bg-emerald-50/60',
            status === 'warning' && 'border-amber-200 bg-amber-50/60',
            status === 'critical' && 'border-rose-200 bg-rose-50/60',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-[200px] flex-1">
              <StatusBadge status={status} size="lg">
                {data.decisionLabel}
              </StatusBadge>
              <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-slate-700">{data.narrative}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Fused Confidence
              </p>
              <p className="tabular mt-0.5 text-3xl sm:text-4xl font-extrabold text-slate-900 leading-none">
                {data.finalConfidence}
                <span className="text-sm font-normal text-slate-400">/100</span>
              </p>
              <p className="mt-0.5 font-mono text-[10px] font-semibold text-slate-600 uppercase">
                {data.band} band
              </p>
            </div>
          </div>
        </div>

        <div>
          <SectionLabel>5-Signal Confidence Fusion Weights</SectionLabel>
          <div className="mt-2.5 space-y-3">
            {data.factors.map((f) => (
              <div key={f.key}>
                <Meter
                  label={
                    <span className="flex items-center gap-2">
                      {f.label}
                      <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-slate-600">
                        weight {f.weight.toFixed(2)}
                      </span>
                    </span>
                  }
                  value={f.value}
                  status={scoreStatus(f.value)}
                  note={
                    <>
                      {f.note}{' '}
                      <span className="tabular font-mono text-slate-500">
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
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Mandatory Safety Rules Triggered ({data.safetyOverrides.length})
            </p>
            <ul className="mt-2 space-y-1">
              {data.safetyOverrides.map((o) => (
                <li key={o} className="text-xs text-rose-700">
                  · {o}
                </li>
              ))}
            </ul>
            <p className="mt-2.5 border-t border-rose-200/80 pt-2 text-[10.5px] text-rose-600">
              Safety rules outrank raw statistical confidence. Even with a high numerical score, cases with safety flags must be escalated to an ophthalmologist.
            </p>
          </div>
        ) : null}

        <div>
          <SectionLabel>Clinical Summary & Audit Trail</SectionLabel>
          <ul className="mt-2 space-y-1">
            {data.reasons.map((r) => (
              <li key={r} className="flex gap-2 text-xs text-slate-600">
                <span
                  className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400"
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
    <div className="flex flex-wrap items-center gap-2">
      <span
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-white shadow-2xs"
        style={{ background: `var(--dr-${grading.level})` }}
      >
        <BarChart3 className="h-3.5 w-3.5" aria-hidden />
        Level {grading.level} · {DR_SCALE[grading.level].short}
      </span>
      <StatusBadge status={decisionStatus(confidence.decision)} size="md">
        {confidence.decisionLabel}
      </StatusBadge>
      <span className="tabular rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs font-bold text-slate-700">
        {confidence.finalConfidence}/100 conf
      </span>
    </div>
  );
}
