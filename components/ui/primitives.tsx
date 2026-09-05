import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, Info, OctagonAlert } from 'lucide-react';
import { cn, STATUS_STYLES, type StatusRole } from '@/lib/ui';

/* ------------------------------------------------------------------ */
/* Clinical Surfaces                                                  */
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
        'rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_0_rgba(15,23,42,0.04)]',
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
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? (
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-xs font-bold tracking-wide text-slate-900 uppercase">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{subtitle}</p>
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
        'text-[10.5px] font-bold tracking-[0.1em] text-slate-500 uppercase',
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
        size === 'sm' && 'px-2 py-0.5 text-[10.5px]',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-xs font-bold',
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
        'inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700',
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
/* Stat tile — single clinical metric with high legibility              */
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
        'rounded-lg border border-slate-200 bg-slate-50/70 p-3 sm:p-3.5',
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
        <p className="text-[10px] font-bold tracking-[0.08em] text-slate-500 uppercase">
          {label}
        </p>
      </div>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span className="text-xl sm:text-2xl leading-none font-bold text-slate-900 tabular">
          {value}
        </span>
        {unit ? <span className="text-xs font-semibold text-slate-500">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Meter — magnitude as length, clinical high-contrast                  */
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
  const fill = colour ?? (status ? STATUS_STYLES[status].var : '#059669');

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn('text-slate-700', compact ? 'text-xs' : 'text-xs font-medium')}>
          {label}
        </span>
        <span className="tabular font-mono text-xs font-semibold text-slate-900">
          {Math.round(value)}
          <span className="text-slate-400 font-normal">{suffix}</span>
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
        role="meter"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={typeof label === 'string' ? label : undefined}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%`, background: fill }}
        />
      </div>
      {note ? <p className="mt-1 text-[10.5px] text-slate-500">{note}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                               */
/* ------------------------------------------------------------------ */

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-slate-200', className)} />;
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-slate-400">{icon}</div> : null}
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function KeyValue({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 border-b border-slate-100 last:border-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-right text-xs font-medium text-slate-800 tabular">{value}</dd>
    </div>
  );
}
