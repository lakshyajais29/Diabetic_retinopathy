'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  Building2,
  ExternalLink,
  Home,
  ScanEye,
  Stethoscope,
  UserCheck,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/ui';

const NAV = [
  {
    href: '/screening',
    label: 'Screening',
    desktopLabel: 'Screening Workspace',
    description: 'Patient fundus evaluation',
    icon: Stethoscope,
  },
  {
    href: '/admin',
    label: 'Doctor Queue',
    desktopLabel: 'Doctor Console',
    description: 'Referral triage & sign-off',
    icon: UserCheck,
  },
  {
    href: '/hospitals',
    label: 'Hospitals',
    desktopLabel: 'Hospital Finder',
    description: 'Ayushman PM-JAY centers',
    icon: Building2,
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
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 lg:flex-row">
      {/* ================================================================== */}
      {/* Desktop Sidebar (lg:flex)                                          */}
      {/* ================================================================== */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm lg:flex">
        {/* Brand Header */}
        <div className="border-b border-slate-100 px-5 py-4">
          <Link href="/" className="group flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <ScanEye className="h-5 w-5" aria-hidden />
            </span>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-slate-900 font-display">
                RetinaSetu
              </span>
              <span className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                Clinical DR Platform
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="flex-1 space-y-1.5 p-3.5" aria-label="Primary Desktop">
          <p className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Clinical Modules
          </p>
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all',
                  active
                    ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/80 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <item.icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    active ? 'text-emerald-700' : 'text-slate-400',
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold">{item.desktopLabel}</span>
                  <span className="block text-[10.5px] font-normal text-slate-500 truncate">
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Engine Status Footer removed */}
      </aside>

      {/* ================================================================== */}
      {/* Mobile Top Header (lg:hidden)                                      */}
      {/* ================================================================== */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-600 text-white">
            <ScanEye className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <span className="text-sm font-bold text-slate-900 font-display">RetinaSetu</span>
            <span className="block text-[9px] font-semibold text-emerald-700 uppercase -mt-1">
              Clinical DR
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10.5px] font-semibold text-slate-700">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                engineReady ? 'bg-emerald-500' : 'bg-amber-500',
              )}
            />
            {engineLabel}
          </span>
        </div>
      </header>

      {/* Main Workspace Content */}
      <main className="min-w-0 flex-1 pb-20 lg:pb-6">{children}</main>

      {/* ================================================================== */}
      {/* Mobile Bottom Navigation Bar (lg:hidden)                           */}
      {/* ================================================================== */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur-md lg:hidden"
        aria-label="Mobile Navigation"
      >
        <Link
          href="/"
          className={cn(
            'flex flex-col items-center justify-center py-1 px-3 text-center transition-colors min-w-[64px]',
            pathname === '/' ? 'text-emerald-700 font-bold' : 'text-slate-500',
          )}
        >
          <Home className="h-5 w-5 mb-0.5" />
          <span className="text-[10px]">Portal</span>
        </Link>

        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-3 text-center transition-colors min-w-[64px]',
                active ? 'text-emerald-700 font-bold' : 'text-slate-500',
              )}
            >
              <item.icon className="h-5 w-5 mb-0.5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
