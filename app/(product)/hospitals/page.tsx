import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ScanEye } from 'lucide-react';
import { NearbyHospitals } from '@/components/patient/NearbyHospitals';
import { AssistantBot } from '@/components/bot/AssistantBot';

export const metadata: Metadata = {
  title: 'Hospital Finder | Ayushman Bharat Vision Health Centers',
  description: 'Search nearby District Government Eye Hospitals & Ayushman Bharat PM-JAY empaneled centers.',
};

export default function HospitalsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-700 text-white">
              <ScanEye className="h-4.5 w-4.5" aria-hidden />
            </span>
            <div>
              <span className="text-base font-bold text-slate-900 font-display">RetinaSetu</span>
              <span className="block text-[9px] font-bold text-emerald-800 uppercase tracking-wide -mt-0.5">
                Hospital Referral Network
              </span>
            </div>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <Link href="/" className="text-xs font-semibold text-slate-600 hover:text-emerald-800 transition">
              Clinical Portal
            </Link>
            <Link href="/about" className="text-xs font-semibold text-slate-600 hover:text-emerald-800 transition">
              Clinical Protocol
            </Link>
            <Link href="/hospitals" className="text-xs font-bold text-emerald-800">
              Hospital Directory
            </Link>
            <Link href="/screening" className="text-xs font-semibold text-slate-600 hover:text-emerald-800 transition">
              Screening Workspace
            </Link>
            <Link href="/admin" className="text-xs font-semibold text-slate-600 hover:text-emerald-800 transition">
              Doctor Workstation
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/screening" className="btn-primary py-1.5 px-3 text-xs font-bold">
              Start Screening
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6 animate-fade-up">
        <NearbyHospitals />
      </main>

      {/* Floating Assistant Bot */}
      <AssistantBot />
    </div>
  );
}
