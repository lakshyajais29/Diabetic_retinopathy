'use client';

import { Check, Loader2, Minus } from 'lucide-react';
import { STAGES } from '@/lib/pipeline/constants';
import type { StageState } from '@/lib/client/useScreeningRun';
import type { StageId } from '@/lib/pipeline/types';
import { cn, formatDuration } from '@/lib/ui';

/**
 * The stage rail is the spine of the demo: it shows, at a glance, which of the
 * seven stages have run, which is running, and how long each took. A halted run
 * greys out everything downstream rather than leaving it ambiguously pending.
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
    <ol className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Pipeline stages">
      {STAGES.map((spec) => {
        const state = stages[spec.id];
        const skipped = halted && state.status === 'pending';
        const isActive = active === spec.id;

        return (
          <li key={spec.id} className="min-w-[142px] flex-1">
            <button
              type="button"
              onClick={() => state.status === 'complete' && onSelect(spec.id)}
              disabled={state.status !== 'complete'}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'w-full rounded-lg border px-3 py-2.5 text-left transition',
                state.status === 'complete' && !isActive &&
                  'border-ink-800 bg-panel hover:border-ink-600',
                isActive && 'border-brand-500/60 bg-brand-600/12',
                state.status === 'running' && 'border-brand-500/50 bg-brand-600/10',
                state.status === 'pending' && 'border-ink-850 bg-ink-950/40',
                skipped && 'opacity-40',
                state.status !== 'complete' && 'cursor-default',
              )}
            >
              <div className="flex items-center gap-2">
                <StageMark status={state.status} skipped={skipped} />
                <span className="font-mono text-[9.5px] font-semibold tracking-[0.12em] text-ink-500">
                  {String(spec.index).padStart(2, '0')}
                </span>
                {state.telemetry ? (
                  <span className="tabular ml-auto font-mono text-[9.5px] text-ink-500">
                    {formatDuration(state.telemetry.durationMs)}
                  </span>
                ) : null}
              </div>

              <p
                className={cn(
                  'mt-1.5 text-[11.5px] leading-snug font-medium',
                  state.status === 'pending' ? 'text-ink-500' : 'text-ink-100',
                )}
              >
                {spec.title}
              </p>

              {state.status === 'running' ? (
                <div className="mt-2">
                  <div className="h-0.5 w-full overflow-hidden rounded-full bg-ink-800">
                    <div
                      className="h-full rounded-full bg-brand-400 transition-[width] duration-300"
                      style={{ width: `${state.pct}%` }}
                    />
                  </div>
                  {state.message ? (
                    <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-brand-200">
                      {state.message}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {state.telemetry?.degraded ? (
                <p className="mt-1.5 text-[10px] font-medium text-[#fab219]">
                  Degraded — on-device only
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
      <span className="grid h-4 w-4 place-items-center rounded-full border border-ink-700 text-ink-600">
        <Minus className="h-2.5 w-2.5" aria-hidden />
      </span>
    );
  }
  if (status === 'complete') {
    return (
      <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-500 text-ink-950">
        <Check className="h-2.5 w-2.5" strokeWidth={3.5} aria-hidden />
      </span>
    );
  }
  if (status === 'running') {
    return (
      <span className="grid h-4 w-4 place-items-center rounded-full border border-brand-400/60 text-brand-300">
        <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden />
      </span>
    );
  }
  return <span className="h-4 w-4 rounded-full border border-ink-700" aria-hidden />;
}
