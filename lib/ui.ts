import type { DRLevel, TriageDecision } from './pipeline/types';

/** Minimal class combiner — no dependency needed for the way classes are used here. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export type StatusRole = 'good' | 'warning' | 'serious' | 'critical' | 'neutral';

/**
 * Status roles are the only place colour carries state, and every consumer of
 * this map is required to render the accompanying icon and text label.
 */
export const STATUS_STYLES: Record<
  StatusRole,
  { text: string; bg: string; border: string; dot: string; var: string }
> = {
  good: {
    text: 'text-[#3fce3f]',
    bg: 'bg-[#0ca30c]/12',
    border: 'border-[#0ca30c]/40',
    dot: 'bg-[#0ca30c]',
    var: 'var(--status-good)',
  },
  warning: {
    text: 'text-[#fab219]',
    bg: 'bg-[#fab219]/12',
    border: 'border-[#fab219]/40',
    dot: 'bg-[#fab219]',
    var: 'var(--status-warning)',
  },
  serious: {
    text: 'text-[#ec835a]',
    bg: 'bg-[#ec835a]/12',
    border: 'border-[#ec835a]/40',
    dot: 'bg-[#ec835a]',
    var: 'var(--status-serious)',
  },
  critical: {
    text: 'text-[#ff6b6b]',
    bg: 'bg-[#d03b3b]/14',
    border: 'border-[#d03b3b]/45',
    dot: 'bg-[#d03b3b]',
    var: 'var(--status-critical)',
  },
  neutral: {
    text: 'text-ink-300',
    bg: 'bg-ink-800/60',
    border: 'border-ink-700',
    dot: 'bg-ink-500',
    var: 'var(--color-ink-500)',
  },
};

/** ICDR level → status role. Levels 0–1 are not referable. */
export function levelStatus(level: DRLevel): StatusRole {
  if (level >= 4) return 'critical';
  if (level === 3) return 'serious';
  if (level === 2) return 'warning';
  return 'good';
}

export function scoreStatus(score: number): StatusRole {
  if (score >= 70) return 'good';
  if (score >= 45) return 'warning';
  return 'critical';
}

export function decisionStatus(decision: TriageDecision): StatusRole {
  if (decision === 'urgent_referral') return 'critical';
  if (decision === 'doctor_review_required') return 'warning';
  return 'good';
}

export function qualityStatus(verdict: string): StatusRole {
  if (verdict === 'good') return 'good';
  if (verdict === 'borderline') return 'warning';
  return 'critical';
}

/* ------------------------------------------------------------------ */
/* Formatting                                                           */
/* ------------------------------------------------------------------ */

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(1)} Cr`;
  if (Math.abs(value) >= 1_00_000) return `${(value / 1_00_000).toFixed(1)} L`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return formatNumber(value);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function quadrantLabel(q: string): string {
  const map: Record<string, string> = {
    superotemporal: 'Supero-temporal',
    superonasal: 'Supero-nasal',
    inferotemporal: 'Infero-temporal',
    inferonasal: 'Infero-nasal',
  };
  return map[q] ?? titleCase(q);
}
