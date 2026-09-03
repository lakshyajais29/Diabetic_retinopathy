'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BarChart3, BookOpen, ExternalLink, ScanEye, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/ui';

const NAV = [
  {
    href: '/screening',
    label: 'Screening workspace',
    description: 'Read a fundus photograph',
    icon: Stethoscope,
  },
  {
    href: '/district',
    label: 'District model',
    description: 'Capacity, queue and impact',
    icon: BarChart3,
  },
  {
    href: '/methodology',
    label: 'Methodology',
    description: 'How each stage decides',
    icon: BookOpen,
  },
];

export function AppShell({
  children,
  engineLabel,
  engineReady,
}: {
  children: ReactNode;
  engineLabel: string;
  engineReady: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-canvas text-ink-200">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-ink-850 bg-ink-950 lg:flex">
        <div className="border-b border-ink-850 px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-700 text-white">
              <ScanEye className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[14px] font-semibold tracking-tight text-white">
                RetinaSetu
              </span>
              <span className="mt-0.5 text-[9.5px] font-medium tracking-[0.12em] text-ink-500 uppercase">
                DR Screening Platform
              </span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Primary">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex items-start gap-3 rounded-lg px-3 py-2.5 transition',
                  active
                    ? 'bg-brand-600/12 text-white ring-1 ring-brand-600/30 ring-inset'
                    : 'text-ink-400 hover:bg-ink-900 hover:text-ink-200',
                )}
              >
                <item.icon
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    active ? 'text-brand-300' : 'text-ink-500 group-hover:text-ink-300',
                  )}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium">{item.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-ink-500">
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-ink-850 p-3">
          <div className="rounded-lg border border-ink-850 bg-panel px-3 py-2.5">
            <p className="text-[9.5px] font-semibold tracking-[0.12em] text-ink-500 uppercase">
              Reasoning engine
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-[11.5px] font-medium text-ink-200">
              <span
                aria-hidden
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  engineReady ? 'bg-[#0ca30c]' : 'bg-[#fab219]',
                )}
              />
              {engineLabel}
            </p>
            {!engineReady ? (
              <p className="mt-1.5 text-[10.5px] leading-snug text-ink-500">
                No API key configured — reasoning stages fall back to on-device measurement.
              </p>
            ) : null}
          </div>

          <Link
            href="/"
            className="mt-2 flex items-center gap-1.5 px-3 py-2 text-[11.5px] text-ink-500 transition hover:text-ink-300"
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            Back to overview
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-ink-850 bg-canvas/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-700 text-white">
              <ScanEye className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-[13px] font-semibold text-white">RetinaSetu</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1" aria-label="Primary">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-lg transition',
                    active ? 'bg-brand-600/15 text-brand-300' : 'text-ink-500 hover:text-ink-200',
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden />
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
