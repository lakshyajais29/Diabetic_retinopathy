'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  Eye,
  Heart,
  Lock,
  Mic,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { RetinaHeroWorkstation } from '@/components/landing/RetinaHeroWorkstation';
import { DiagnosticLayersStack } from '@/components/landing/DiagnosticLayersStack';
import { CarePathwayEcosystem } from '@/components/landing/CarePathwayEcosystem';
import { NearbyHospitals } from '@/components/patient/NearbyHospitals';
import { AssistantBot } from '@/components/bot/AssistantBot';
import { DoctorAuthModal } from '@/components/auth/DoctorAuthModal';
import { STAGES, DR_SCALE } from '@/lib/pipeline/constants';

export default function ClinicalPortalPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-16 lg:pb-0">
      
      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          
          {/* RetinaSetu Brand Mark */}
          <Link href="/" className="flex items-center gap-3 group">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-emerald-700 text-white shadow-xs group-hover:bg-emerald-800 transition-colors">
              {/* Concentric Eye Icon Mark */}
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3.5" fill="currentColor" fillOpacity="0.25" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-slate-900 font-display">
                  RetinaSetu
                </span>
              </div>
              <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-800 -mt-0.5">
                Tele-Ophthalmology Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-7 lg:flex">
            <Link
              href="/"
              className="relative text-xs font-bold text-emerald-800 transition-colors py-1 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-700 after:rounded-full"
            >
              Home
            </Link>
            <Link
              href="/screening"
              className="text-xs font-semibold text-slate-600 hover:text-emerald-800 transition-colors py-1"
            >
              Screening Workspace
            </Link>
            <Link
              href="/admin"
              className="text-xs font-semibold text-slate-600 hover:text-emerald-800 transition-colors py-1"
            >
              Doctor Workstation
            </Link>
            <Link
              href="/hospitals"
              className="text-xs font-semibold text-slate-600 hover:text-emerald-800 transition-colors py-1"
            >
              Hospital Finder
            </Link>
            <Link
              href="/about"
              className="text-xs font-semibold text-slate-600 hover:text-emerald-800 transition-colors py-1"
            >
              Clinical Protocol
            </Link>
            <Link
              href="/about"
              className="text-xs font-semibold text-slate-600 hover:text-emerald-800 transition-colors py-1"
            >
              About
            </Link>
          </nav>

          {/* Action CTAs: Search, Doctor Sign-In, Launch Screening */}
          <div className="flex items-center gap-2.5">
            {/* Quick Search Button */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              aria-label="Search clinical portal"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Doctor Sign-In */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-900 transition shadow-2xs"
            >
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              <span>Doctor Sign-In</span>
            </button>

            {/* Launch Screening CTA */}
            <Link
              href="/screening"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 active:scale-95 transition"
            >
              <span>Launch Screening</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Search Bar Dropdown */}
        {searchOpen && (
          <div className="mx-auto max-w-2xl mt-2 p-2 border-t border-slate-100 flex items-center gap-2 animate-fade-down">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search ICDR stages, lesion taxonomy, clinical referral guidelines, or hospitals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
              autoFocus
            />
            <button
              onClick={() => setSearchOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </header>

      {/* 2. SOPHISTICATED HERO SECTION & STATISTICS STRIP */}
      <section className="relative overflow-hidden pt-6 sm:pt-10 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 bg-linear-to-b from-white via-slate-50/60 to-[#f8fafc]">
        
        {/* Subtle decorative background glow */}
        <div className="absolute top-1/4 right-1/4 -z-10 h-96 w-96 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />

        {/* Soft landscape horizon illustration on bottom-left */}
        <div className="absolute bottom-0 left-0 w-full sm:w-1/2 h-36 opacity-30 pointer-events-none -z-10 overflow-hidden">
          <svg viewBox="0 0 600 120" fill="none" className="w-full h-full object-cover" preserveAspectRatio="none">
            <path d="M0 85 Q 140 55 280 90 T 600 70 L 600 120 L 0 120 Z" fill="#d1fae5" />
            <path d="M0 100 Q 180 75 360 105 T 600 90 L 600 120 L 0 120 Z" fill="#a7f3d0" />
          </svg>
        </div>

        <div className="mx-auto max-w-[1400px]">
          {/* Main 2-Column Hero Composition */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-start">
            
            {/* LEFT COLUMN: Editorial Headline, Description, Role Cards, Feature Pills, Annotation (5 cols) */}
            <div className="lg:col-span-5 space-y-6 pt-1">
              
              {/* Eyebrow Clinical Status Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-bold text-emerald-900 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                Rural Tele-Ophthalmology Decision Support
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl xl:text-[54px] font-black tracking-tight text-slate-900 font-display leading-[1.05]">
                Clearer vision <br />
                for <span className="text-emerald-700">brighter</span> <br />
                communities.
              </h1>

              {/* Description */}
              <p className="text-sm sm:text-[15px] font-normal text-slate-600 leading-relaxed max-w-lg">
                RetinaSetu brings AI-assisted diabetic retinopathy screening to the last mile — enabling early detection, guided referrals, and better eye health for every community.
              </p>

              {/* Two Role/Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                
                {/* For Health Workers Card */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <Stethoscope className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900 font-display">
                        For Health Workers
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        Capture, screen and get instant AI insights.
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/screening"
                    className="mt-4 inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 text-xs font-bold transition-colors shadow-2xs"
                  >
                    <span>Open Screening Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* For Ophthalmologists Card */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <Users className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900 font-display">
                        For Ophthalmologists
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        Review cases, examine findings, sign off and refer.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 px-3 py-2 text-xs font-bold transition-colors shadow-2xs text-left"
                  >
                    <span>Access Doctor Console</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Capability Feature Pills in 2 Rows */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-2xs">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                    AI-Assisted
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-2xs">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                    Non-Retinal Safety Gate
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-2xs">
                    <Mic className="h-3.5 w-3.5 text-emerald-700" />
                    Voice-Guided Workflow
                  </span>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-2xs">
                    <WifiOff className="h-3.5 w-3.5 text-emerald-700" />
                    Works Offline
                  </span>
                </div>
              </div>

              {/* Handwritten Editorial Annotation */}
              <div className="flex items-center gap-2 pt-1 pl-3 text-slate-500">
                <svg className="w-8 h-8 text-slate-400 stroke-current -scale-y-100 rotate-12" viewBox="0 0 40 40" fill="none">
                  <path d="M5 30 C 15 15, 25 15, 32 8" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
                  <path d="M26 7 L33 7 L33 14" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="font-serif italic text-sm text-slate-500 leading-tight">
                  Bridging distances. <br />
                  Improving lives.
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: Dominant Clinical Analysis Card & Village->Hospital Card (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Top Row: 3D Layers Stack on Left + Main Clinical Analysis Card on Right */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                
                {/* 3D Isometric Exploded Diagnostic Stack (5 cols) */}
                <div className="md:col-span-5 order-2 md:order-1">
                  <DiagnosticLayersStack />
                </div>

                {/* Main Clinical Analysis Card (7 cols) */}
                <div className="md:col-span-7 order-1 md:order-2">
                  <RetinaHeroWorkstation />
                </div>
              </div>

              {/* Bottom Row: Village -> Specialist Care Card */}
              <CarePathwayEcosystem />
            </div>
          </div>

          {/* 3. STATISTICS STRIP — Placed directly below the 2-column hero with natural breathing room */}
          <div className="mt-10 sm:mt-12">
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-sm shadow-slate-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                
                {/* Metric 1 */}
                <div className="flex items-center gap-3.5 pt-2 sm:pt-0 sm:px-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <Users className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="block text-xl sm:text-2xl font-black text-slate-900 font-display">
                      77M+
                    </span>
                    <span className="block text-xs font-medium text-slate-500 leading-tight">
                      Indians living with diabetes
                    </span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <Eye className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="block text-xl sm:text-2xl font-black text-slate-900 font-display">
                      1 in 3
                    </span>
                    <span className="block text-xs font-medium text-slate-500 leading-tight">
                      may develop diabetic retinopathy
                    </span>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <Clock className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="block text-xl sm:text-2xl font-black text-slate-900 font-display">
                      4+ hours
                    </span>
                    <span className="block text-xs font-medium text-slate-500 leading-tight">
                      average specialist access from rural areas
                    </span>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <Heart className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="block text-xl sm:text-2xl font-black text-slate-900 font-display">
                      Stronger communities
                    </span>
                    <span className="block text-xs font-medium text-slate-500 leading-tight">
                      through accessible eye care
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CLINICAL DIAGNOSTIC WORKFLOW (7-STAGE PIPELINE) */}
      <section className="py-16 sm:py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">
            Explainable AI Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
            7-Stage Clinical Diagnostic Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Every stage operates as an isolated diagnostic instrument with typed inputs, anatomical telemetry, and deterministic safety overrides.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s, idx) => (
            <div
              key={s.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all duration-300 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-800 font-mono text-xs font-bold border border-emerald-200">
                  0{idx + 1}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Stage {idx + 1}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  {s.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {s.subtitle}
                </p>
              </div>
              <p className="border-t border-slate-100 pt-2 text-[11px] text-slate-600 italic">
                “{s.question}”
              </p>
            </div>
          ))}

          {/* Real-time Streaming Card */}
          <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-5 flex flex-col justify-center space-y-2">
            <p className="text-xs font-bold text-emerald-950">
              Streams in real time over SSE directly to the screener&apos;s terminal.
            </p>
            <Link
              href="/screening"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950"
            >
              Test Fundus Capture Now
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. ICDR INTERNATIONAL STANDARD SEVERITY REFERENCE */}
      <section className="py-12 border-y border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-2xl space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              International Medical Benchmark
            </span>
            <h2 className="text-2xl font-black text-slate-900 font-display">
              ICDR Severity Scale (International Standard)
            </h2>
            <p className="text-xs text-slate-600">
              The International Clinical Diabetic Retinopathy (ICDR) scale defines strict clinical criteria that dictate whether a patient is managed at the Primary Health Centre or escalated for hospital intervention.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.values(DR_SCALE).map((scale) => {
              const borderStyles = [
                'border-emerald-200 bg-emerald-50/30',
                'border-emerald-200 bg-emerald-50/30',
                'border-amber-200 bg-amber-50/30',
                'border-orange-200 bg-orange-50/30',
                'border-rose-200 bg-rose-50/30',
              ][scale.level];

              const badgeStyles = [
                'bg-emerald-100 text-emerald-800 border-emerald-300',
                'bg-emerald-100 text-emerald-800 border-emerald-300',
                'bg-amber-100 text-amber-900 border-amber-300',
                'bg-orange-100 text-orange-950 border-orange-300',
                'bg-rose-100 text-rose-900 border-rose-300',
              ][scale.level];

              return (
                <div
                  key={scale.level}
                  className={`rounded-2xl border p-4 space-y-3 flex flex-col justify-between ${borderStyles}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        ICDR {scale.level}
                      </span>
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${badgeStyles}`}>
                        {scale.short}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {scale.meaning}
                    </p>
                  </div>
                  <div className="border-t border-slate-200/60 pt-2 text-[11px] font-semibold text-slate-700">
                    Action: {scale.level <= 1 ? 'Annual PHC Checkup' : 'Hospital Referral'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. PATIENT REFERRAL DIRECTORY */}
      <section className="py-16 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <NearbyHospitals />
      </section>

      {/* 7. FOOTER MICRO-BASELINE */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">RetinaSetu</span>
            <span className="text-slate-300">|</span>
            <span>SIH 2026 Clinical Tele-Ophthalmology Decision Support</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600">
            <span>PEOPLE-CENTRED AI FOR EYE HEALTH</span>
            <span className="text-slate-300">•</span>
            <span>A CLEARER TOMORROW</span>
          </div>
        </div>
      </footer>

      {/* FLOATING CLINICAL AI ASSISTANT BOT */}
      <AssistantBot />

      {/* DOCTOR AUTHENTICATION MODAL */}
      <DoctorAuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
