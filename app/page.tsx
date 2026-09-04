'use client';

import Link from 'next/link';

import {
  ArrowRight,
  Activity,
  Eye,
  Layers,
  ScanEye,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Sparkles,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { NearbyHospitals } from '@/components/patient/NearbyHospitals';
import { RetinaSchematic } from '@/components/landing/RetinaSchematic';
import { AssistantBot } from '@/components/bot/AssistantBot';
import { DoctorAuthModal } from '@/components/auth/DoctorAuthModal';
import { STAGES, DR_SCALE, DR_LEVELS } from '@/lib/pipeline/constants';
import { useState } from 'react';
import { Lock } from 'lucide-react';

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      <SiteNav onOpenAuth={() => setShowAuthModal(true)} />
      <Hero />
      <ProblemSection />
      <PipelineSection />
      <PatientPortalSection />
      <TrustSection />
      <ClosingSection />
      <SiteFooter />
      <AssistantBot />
      <DoctorAuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 text-white shadow-lg shadow-emerald-500/25 transition-transform duration-300 group-hover:scale-105">
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
  );
}

function SiteNav({ onOpenAuth }: { onOpenAuth: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Wordmark />
        <div className="hidden items-center gap-8 md:flex">
          <Link href="/" className="text-xs font-extrabold text-emerald-700">
            Home
          </Link>
          <Link href="/about" className="text-xs font-bold text-slate-600 hover:text-emerald-600 transition">
            About DR Vision
          </Link>
          <Link href="/hospitals" className="text-xs font-bold text-slate-600 hover:text-emerald-600 transition">
            Find Eye Hospitals
          </Link>
          <Link href="/screening" className="text-xs font-bold text-slate-600 hover:text-emerald-600 transition">
            Test My Eye Image
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onOpenAuth} className="gradient-btn-secondary py-2 px-4 text-xs font-extrabold">
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            Doctor Login
          </button>
          <Link href="/screening" className="gradient-btn-primary py-2 px-4 text-xs font-extrabold">
            Test My Eye Image
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </nav>
    </header>
  );
}


/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-50 py-20 lg:py-28">
      {/* Background Glow Orbs */}
      <div className="pointer-events-none absolute -top-40 -right-32 h-[550px] w-[550px] rounded-full bg-emerald-300/25 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-32 h-[450px] w-[450px] rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 animate-fade-up">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-300 bg-white/90 px-4 py-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="text-xs font-extrabold tracking-wider text-emerald-800 uppercase">
              SIH 2026 AI Clinical Decision Support
            </span>
          </div>

          <h1 className="font-display text-4xl font-extrabold leading-[1.1] text-slate-900 sm:text-5xl lg:text-6xl tracking-tight">
            A fundus photograph at the village clinic.
            <br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              A graded, evidenced answer
            </span>{' '}
            in seconds.
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-slate-600 font-medium sm:text-base">
            Diabetic Retinopathy blinds thousands who could have been treated — not because the disease is hard to see, but because specialists are hours away. RetinaSetu puts a 7-stage AI clinical pipeline right at Primary Health Centres.
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Link href="/screening" className="gradient-btn-primary py-3.5 px-6 text-sm">
              <Stethoscope className="h-4.5 w-4.5" />
              Launch Screening Workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/admin" className="gradient-btn-secondary py-3.5 px-6 text-sm">
              <UserCheck className="h-4.5 w-4.5 text-emerald-600" />
              Doctor Console Queue
            </Link>
          </div>

          <div className="flex items-center gap-6 pt-4 text-xs font-semibold text-slate-500 border-t border-slate-200/60">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Offline-First Engine</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Non-Retinal Shield</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>ASHA Voice Guidance</span>
            </div>
          </div>
        </div>

        {/* Interactive Interactive Preview Card */}
        <div className="animate-fade-up relative">
          <div className="medical-card-hero p-4 border-emerald-500/30 bg-white/95 shadow-2xl">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
              <span className="font-mono text-[11px] font-bold text-slate-500 uppercase">
                Reading Workspace · Right Eye (OD)
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                STAGE 3/7 ACTIVE
              </span>
            </div>
            <div className="overflow-hidden rounded-xl bg-slate-950 my-3 shadow-inner">
              <RetinaSchematic className="h-auto w-full" />
            </div>
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <MiniStat label="Quality Gate" value="82" suffix="/100" />
              <MiniStat label="Lesions Found" value="10" suffix="candidates" />
              <MiniStat label="ICDR Severity" value="Grade 2" suffix="Moderate" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <div className="glass-panel p-3 bg-slate-50">
      <p className="text-[9.5px] font-bold tracking-wider text-slate-400 uppercase">{label}</p>
      <p className="tabular mt-1 text-base font-extrabold text-slate-900 leading-none">
        {value}
      </p>
      <p className="mt-1 text-[10px] font-medium text-slate-500">{suffix}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ProblemSection() {
  const facts = [
    {
      figure: '1 in 3',
      caption: 'Diabetic individuals develop retinopathy',
      detail:
        'India has over 77 million diabetic individuals. The vast majority in rural districts have zero access to timely retinal screening.',
    },
    {
      figure: 'Asymptomatic',
      caption: 'Silent vision loss until irreversible',
      detail:
        'Diabetic Retinopathy causes no pain or early warning symptoms. By the time vision blurs, retinal damage is largely irreversible.',
    },
    {
      figure: 'Preventable',
      caption: 'Sight can be saved if detected early',
      detail:
        'Timely laser photocoagulation or anti-VEGF therapy prevents severe blindness. The bottleneck is early detection at rural PHCs.',
    },
  ];

  return (
    <section id="problem" className="border-b border-slate-200/80 bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <SectionEyebrow>The Healthcare Challenge</SectionEyebrow>
          <h2 className="font-display mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            The disease is visible. The specialist is four hours away.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 font-medium sm:text-base">
            Diagnosing diabetic retinopathy requires one thing: someone trained to read a fundus photograph. Primary Health Centres can take photos today with low-cost cameras. RetinaSetu provides the instant clinical intelligence needed to bridge the gap.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {facts.map((f) => (
            <div key={f.figure} className="medical-card-hero p-6 space-y-3">
              <p className="font-display text-3xl font-extrabold text-emerald-700">{f.figure}</p>
              <p className="text-sm font-bold text-slate-900">{f.caption}</p>
              <p className="text-xs leading-relaxed text-slate-600 font-medium">{f.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const STAGE_ICONS = [Eye, Layers, ScanEye, Activity, Building2, UserCheck, Stethoscope];

function PipelineSection() {
  return (
    <section id="pipeline" className="border-b border-slate-200/80 bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <SectionEyebrow>Explainable AI Architecture</SectionEyebrow>
          <h2 className="font-display mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Seven stages, each one visible, clinical and transparent.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 font-medium">
            RetinaSetu operates like a clinical specialist — checking image quality, locating landmarks, isolating microaneurysms, grading severity on the international ICDR scale, and routing high-risk cases to doctors.
          </p>
        </div>

        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((stage, i) => {
            const Icon = STAGE_ICONS[i] ?? Eye;
            return (
              <li key={stage.id} className="medical-card-hero p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Icon className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <span className="font-mono text-[10px] font-bold text-slate-400">
                      STAGE {stage.index}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">{stage.title}</h3>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    {stage.subtitle}
                  </p>
                </div>
                <p className="border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-600 italic">
                  “{stage.question}”
                </p>
              </li>
            );
          })}
          <li className="medical-card-hero p-5 flex flex-col justify-center border-dashed border-emerald-400 bg-emerald-50/40">
            <p className="text-xs leading-relaxed font-bold text-emerald-900">
              Every stage streams live output to the screen as it completes, providing total clinical transparency.
            </p>
            <Link
              href="/screening"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900"
            >
              Run live screening
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </li>
        </ol>

        {/* ICDR Scale Table */}
        <div className="mt-12 medical-card-hero overflow-hidden">
          <div className="border-b border-slate-200/80 px-6 py-4 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900 font-display">
              ICDR Severity Grading Standard (International Standard)
            </h3>
          </div>
          <div className="grid divide-y divide-slate-100 sm:grid-cols-5 sm:divide-y-0 sm:divide-x">
            {DR_LEVELS.map((level) => {
              const spec = DR_SCALE[level];
              return (
                <div key={level} className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="grid h-7 w-7 place-items-center rounded-lg font-mono text-xs font-bold text-slate-950 shadow-sm"
                      style={{ background: `var(--dr-${level})` }}
                    >
                      {level}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{spec.short}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{spec.meaning}</p>
                  <p className={`text-[11px] font-bold ${spec.referable ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {spec.referable ? 'Referral Recommended' : 'Routine Screening'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function PatientPortalSection() {
  return (
    <section id="hospitals" className="border-b border-slate-200/80 bg-white py-20">
      <div className="mx-auto max-w-6xl px-6 space-y-8">
        <div>
          <SectionEyebrow>Public Patient Portal & Hospital Finder</SectionEyebrow>
          <h2 className="font-display mt-3 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
            Empowering patients with nearby government eye hospitals.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 font-medium">
            Locate empaneled Ayushman Bharat PM-JAY vision health centers, district hospitals, and retina specialists for referral follow-up and free laser treatment.
          </p>
        </div>

        <NearbyHospitals />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function TrustSection() {
  const pillars = [
    {
      icon: ShieldCheck,
      title: 'Safety Quality Gate & Non-Retinal Shield',
      body: 'Stage 1 automatically detects non-eye images (selfies, objects) and rejects them before running the pipeline.',
    },
    {
      icon: UserCheck,
      title: 'Doctor Oversight & Clinical Sign-off',
      body: 'High-risk cases (Severe NPDR/PDR) are routed straight to the Ophthalmologist Console for human validation and sign-off.',
    },
    {
      icon: Layers,
      title: 'Dual Rule Engine & AI Verification',
      body: 'Combines explicit medical rule calculations with vision model heatmaps for double verification.',
    },
    {
      icon: Activity,
      title: 'Visual Evidence Heatmaps & Optical Filters',
      body: 'Red-Free green channel filter and located lesion markers allow doctors to inspect exact retinal findings.',
    },
  ];

  return (
    <section id="safety" className="border-b border-slate-200/80 bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <SectionEyebrow>Clinical Safety & Trust</SectionEyebrow>
          <h2 className="font-display mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Built to assist doctors, protect patients, and eliminate false assurance.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 font-medium">
            A screening tool that is confidently wrong is dangerous. Every stage of RetinaSetu is designed to state its limitations and escalate uncertainties.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {pillars.map((p) => (
            <div key={p.title} className="medical-card-hero p-6 space-y-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                <p.icon className="h-5 w-5" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">{p.title}</h3>
              <p className="text-xs leading-relaxed text-slate-600 font-medium">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function ClosingSection() {
  return (
    <section className="bg-gradient-to-b from-slate-50 to-emerald-50/40 py-24">
      <div className="mx-auto max-w-4xl px-6 text-center space-y-6 animate-fade-up">
        <h2 className="font-display text-4xl font-extrabold text-slate-900 sm:text-5xl tracking-tight">
          Upload a fundus photograph and watch it reason.
        </h2>
        <p className="mx-auto max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
          Experience the 7-stage clinical decision support system live — from quality gate to doctor sign-off.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Link href="/screening" className="gradient-btn-primary py-3.5 px-7 text-sm font-extrabold">
            Start Clinical Screening
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/admin" className="gradient-btn-secondary py-3.5 px-7 text-sm font-extrabold">
            Open Doctor Console
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Wordmark />
        <p className="max-w-xl text-[11px] font-medium leading-relaxed text-slate-500">
          RetinaSetu is a clinical decision-support platform prototype built for Smart India Hackathon (SIH 2026). It is designed to assist healthcare professionals in screening diabetic retinopathy.
        </p>
      </div>
    </footer>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-extrabold tracking-widest text-emerald-700 uppercase">
      {children}
    </p>
  );
}
