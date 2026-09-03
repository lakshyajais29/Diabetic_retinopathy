import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, Info, OctagonAlert } from 'lucide-react';
import { cn, STATUS_STYLES, type StatusRole } from '@/lib/ui';

/* ------------------------------------------------------------------ */
/* Surfaces                                                             */
/* ------------------------------------------------------------------ */

export function Panel({
  children,
  className,
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article' | 'aside';
}) {
  return (
    <Tag
      className={cn(
        'rounded-xl border border-ink-800 bg-panel/90 shadow-panel backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  subtitle,
  right,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-ink-800 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <div className="mt-0.5 text-brand-300">{icon}</div> : null}
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold tracking-wide text-ink-100 uppercase">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-[13px] leading-relaxed text-ink-400">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-[11px] font-semibold tracking-[0.14em] text-ink-400 uppercase',
        className,
      )}
    >
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Status badge — colour is never alone: icon + label always present.   */
/* ------------------------------------------------------------------ */

const STATUS_ICONS: Record<StatusRole, typeof CheckCircle2> = {
  good: CheckCircle2,
  warning: AlertTriangle,
  serious: CircleAlert,
  critical: OctagonAlert,
  neutral: Info,
};

export function StatusBadge({
  status,
  children,
  size = 'md',
  className,
}: {
  status: StatusRole;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const style = STATUS_STYLES[status];
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold',
        style.bg,
        style.border,
        style.text,
        size === 'sm' && 'px-2 py-0.5 text-[11px]',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3.5 py-1.5 text-sm',
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn(size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-3.5 w-3.5' : 'h-4 w-4')}
      />
      {children}
    </span>
  );
}

export function Chip({
  children,
  className,
  colour,
}: {
  children: ReactNode;
  className?: string;
  colour?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-ink-700 bg-ink-850/70 px-2 py-1 text-[11px] font-medium text-ink-200',
        className,
      )}
    >
      {colour ? (
        <span
          aria-hidden
          className="h-2 w-2 rounded-[2px]"
          style={{ background: colour }}
        />
      ) : null}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Stat tile — a single number needs no chart.                          */
/* ------------------------------------------------------------------ */

export function StatTile({
  label,
  value,
  unit,
  hint,
  status,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  status?: StatusRole;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-ink-800 bg-ink-900/60 px-4 py-3.5',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {status ? (
          <span
            aria-hidden
            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_STYLES[status].dot)}
          />
        ) : null}
        <p className="text-[11px] font-medium tracking-[0.08em] text-ink-400 uppercase">
          {label}
        </p>
      </div>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl leading-none font-semibold text-ink-50">{value}</span>
        {unit ? <span className="text-xs font-medium text-ink-400">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1.5 text-[11px] leading-snug text-ink-500">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Meter — magnitude as length in one hue, with the value written out.  */
/* ------------------------------------------------------------------ */

export function Meter({
  label,
  value,
  max = 100,
  suffix = '/100',
  status,
  note,
  colour,
  compact,
}: {
  label: ReactNode;
  value: number;
  max?: number;
  suffix?: string;
  status?: StatusRole;
  note?: ReactNode;
  colour?: string;
  compact?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = colour ?? (status ? STATUS_STYLES[status].var : 'var(--viz-series-1)');

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn('text-ink-200', compact ? 'text-xs' : 'text-[13px] font-medium')}>
          {label}
        </span>
        <span className="tabular text-[13px] font-semibold text-ink-100">
          {Math.round(value)}
          <span className="text-ink-500">{suffix}</span>
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-800"
        role="meter"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={typeof label === 'string' ? label : undefined}
      >
        {/* 4px rounded data-end, anchored to the baseline. */}
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, background: fill }}
        />
      </div>
      {note ? <p className="mt-1.5 text-[11px] leading-snug text-ink-500">{note}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                 */
/* ------------------------------------------------------------------ */

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-ink-800', className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon ? <div className="mb-4 text-ink-600">{icon}</div> : null}
      <h3 className="text-sm font-semibold text-ink-200">{title}</h3>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function KeyValue({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-[12px] text-ink-400">{label}</dt>
      <dd className="text-right text-[12px] font-medium text-ink-200">{value}</dd>
    </div>
  );
}
