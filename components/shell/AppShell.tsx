'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ExternalLink, ScanEye, Stethoscope, UserCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/ui';

const NAV = [
  {
    href: '/screening',
    label: 'Screening workspace',
    description: 'Read a fundus photograph',
    icon: Stethoscope,
  },
  {
    href: '/admin',
    label: 'Doctor Console',
    description: 'Referral queue & sign-off',
    icon: UserCheck,
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
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside className="sticky top-0 hidden h-screen w-[265px] shrink-0 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-2xl shadow-xl shadow-slate-200/40 lg:flex">
        {/* Brand Letterhead */}
        <div className="border-b border-slate-100 px-5 py-5">
          <Link href="/" prefetch={true} className="group flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 transition-transform duration-300 group-hover:scale-105">
              <ScanEye className="h-5 w-5" aria-hidden />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 font-display flex items-center gap-1.5">
                RetinaSetu
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              </span>
              <span className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase">
                Clinical DR Platform
              </span>
            </span>
          </Link>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 space-y-2 p-4" aria-label="Primary">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-start gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200',
                  active
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50/50 text-emerald-950 border border-emerald-200/80 font-bold shadow-md shadow-emerald-500/5'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1',
                )}
              >
                {active && (
                  <span className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-emerald-600 shadow-[0_0_10px_#10b981]" />
                )}
                <item.icon
                  className={cn(
                    'mt-0.5 h-4.5 w-4.5 shrink-0 transition-all duration-200',
                    active
                      ? 'text-emerald-600 scale-110'
                      : 'text-slate-400 group-hover:text-emerald-600 group-hover:scale-105',
                  )}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-xs font-bold">{item.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Status Footer */}
        <div className="border-t border-slate-100 p-4 space-y-3">
          <div className="medical-card-hero p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-extrabold tracking-wider text-emerald-700 uppercase">
                Reasoning Engine
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            </div>
            <p className="text-xs font-bold text-slate-900">{engineLabel}</p>
            {!engineReady ? (
              <p className="text-[10.5px] leading-relaxed text-slate-500">
                On-device local pixel math engine active.
              </p>
            ) : null}
          </div>

          <Link
            href="/"
            prefetch={true}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 transition hover:text-emerald-700 hover:translate-x-0.5"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Back to landing page
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden">
          <Link href="/" prefetch={true} className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 text-white shadow-md">
              <ScanEye className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm font-bold text-slate-900 font-display">RetinaSetu</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1.5" aria-label="Primary">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-xl transition-all',
                    active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'text-slate-500 hover:text-slate-900',
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden />
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="min-w-0 flex-1 animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
