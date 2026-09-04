import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ScanEye, Sparkles } from 'lucide-react';
import { NearbyHospitals } from '@/components/patient/NearbyHospitals';
import { AssistantBot } from '@/components/bot/AssistantBot';

export const metadata: Metadata = {
  title: 'Hospital Finder | Ayushman Bharat Vision Health Centers',
  description: 'Search nearby District Government Eye Hospitals & Ayushman Bharat PM-JAY empaneled centers.',
};

export default function HospitalsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 text-white shadow-lg shadow-emerald-500/25">
              <ScanEye className="h-5 w-5" aria-hidden />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 font-display flex items-center gap-1">
                RetinaSetu
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              </span>
              <span className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                Clinical DR Platform
              </span>
            </span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/" className="text-xs font-bold text-slate-600 hover:text-emerald-600 transition">
              Home
            </Link>
            <Link href="/about" className="text-xs font-bold text-slate-600 hover:text-emerald-600 transition">
              About SIH Vision
            </Link>
            <Link href="/hospitals" className="text-xs font-extrabold text-emerald-700">
              Hospital Finder
            </Link>
            <Link href="/screening" className="text-xs font-bold text-slate-600 hover:text-emerald-600 transition">
              Screening Workspace
            </Link>
            <Link href="/admin" className="text-xs font-bold text-slate-600 hover:text-emerald-600 transition">
              Doctor Console
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/screening" className="gradient-btn-primary py-2 px-4 text-xs">
              Start Screening
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-6 py-12 space-y-8 animate-fade-up">
        <NearbyHospitals />
      </main>

      {/* Floating Assistant Bot */}
      <AssistantBot />
    </div>
  );
}
