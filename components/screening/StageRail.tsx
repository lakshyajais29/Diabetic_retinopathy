'use client';

import { Check, Loader2, Minus } from 'lucide-react';
import { STAGES } from '@/lib/pipeline/constants';
import type { StageState } from '@/lib/client/useScreeningRun';
import type { StageId } from '@/lib/pipeline/types';
import { cn, formatDuration } from '@/lib/ui';

/**
 * Clinical Stage Progression Rail.
 * Shows diagnostic telemetry, execution times, and stage status.
 * Responsive: Horizontal touch-scroll on mobile, structured grid on desktop.
 */
export function StageRail({
  stages,
  halted,
  active,
  onSelect,
}: {
  stages: Record<StageId, StageState>;
  halted: boolean;
  active: StageId | null;
  onSelect: (id: StageId) => void;
}) {
  return (
    <ol
      className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200"
      aria-label="Clinical Pipeline Stages"
    >
      {STAGES.map((spec) => {
        const state = stages[spec.id];
        const skipped = halted && state.status === 'pending';
        const isActive = active === spec.id;

        return (
          <li key={spec.id} className="min-w-[130px] sm:min-w-[140px] flex-1">
            <button
              type="button"
              onClick={() => state.status === 'complete' && onSelect(spec.id)}
              disabled={state.status !== 'complete'}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'w-full rounded-lg border p-2 sm:p-2.5 text-left transition-all',
                state.status === 'complete' && !isActive &&
                  'border-slate-200 bg-white hover:border-slate-300 shadow-xs cursor-pointer',
                isActive && 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-400',
                state.status === 'running' && 'border-emerald-400 bg-emerald-50/30 shadow-xs',
                state.status === 'pending' && 'border-slate-100 bg-slate-50 opacity-70',
                skipped && 'opacity-40',
                state.status !== 'complete' && 'cursor-default',
              )}
            >
              <div className="flex items-center gap-1.5">
                <StageMark status={state.status} skipped={skipped} />
                <span className="font-mono text-[9px] font-bold text-slate-400">
                  {String(spec.index).padStart(2, '0')}
                </span>
                {state.telemetry ? (
                  <span className="tabular ml-auto font-mono text-[9px] font-semibold text-slate-500">
                    {formatDuration(state.telemetry.durationMs)}
                  </span>
                ) : null}
              </div>

              <p
                className={cn(
                  'mt-1 text-[11px] font-semibold leading-tight line-clamp-1',
                  state.status === 'pending' ? 'text-slate-500' : 'text-slate-800',
                )}
              >
                {spec.title}
              </p>

              {state.status === 'running' ? (
                <div className="mt-1.5">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                      style={{ width: `${state.pct}%` }}
                    />
                  </div>
                  {state.message ? (
                    <p className="mt-1 line-clamp-1 text-[9.5px] font-medium text-emerald-700">
                      {state.message}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {state.telemetry?.degraded ? (
                <p className="mt-1 text-[9.5px] font-bold text-amber-700">
                  On-device only
                </p>
              ) : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StageMark({
  status,
  skipped,
}: {
  status: StageState['status'];
  skipped: boolean;
}) {
  if (skipped) {
    return (
      <span className="grid h-4 w-4 place-items-center rounded-full border border-slate-300 text-slate-400">
        <Minus className="h-2.5 w-2.5" aria-hidden />
      </span>
    );
  }
  if (status === 'complete') {
    return (
      <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-600 text-white">
        <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  if (status === 'running') {
    return (
      <span className="grid h-4 w-4 place-items-center rounded-full border border-emerald-500 text-emerald-600">
        <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden />
      </span>
    );
  }
  return <span className="h-4 w-4 rounded-full border border-slate-300 bg-slate-100" aria-hidden />;
}
