import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ScanEye,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import { AssistantBot } from '@/components/bot/AssistantBot';

export const metadata: Metadata = {
  title: 'Clinical Protocol & Methodology | RetinaSetu',
  description: '7-Stage Explainable AI Diabetic Retinopathy screening architecture for rural India Primary Health Centres.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16 lg:pb-0">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-700 text-white">
              <ScanEye className="h-4.5 w-4.5" aria-hidden />
            </span>
            <div>
              <span className="text-base font-bold text-slate-900 font-display">RetinaSetu</span>
              <span className="block text-[9px] font-bold text-emerald-800 uppercase tracking-wide -mt-0.5">
                Clinical DR Protocol
              </span>
            </div>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <Link href="/" className="text-xs font-semibold text-slate-600 hover:text-emerald-800 transition">
              Clinical Portal
            </Link>
            <Link href="/about" className="text-xs font-bold text-emerald-800">
              Clinical Protocol
            </Link>
            <Link href="/hospitals" className="text-xs font-semibold text-slate-600 hover:text-emerald-800 transition">
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

      {/* Hero Header */}
      <section className="border-b border-slate-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-3 animate-fade-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
            Smart India Hackathon (SIH 2026) Medical Protocol
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight">
            Bridging Rural Healthcare with Specialist Retinal Screening
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-600 max-w-2xl mx-auto leading-relaxed">
            RetinaSetu was built to solve India’s massive Diabetic Retinopathy screening bottleneck by placing a 7-stage explainable AI decision support system at Primary Health Centres (PHCs).
          </p>
        </div>
      </section>

      {/* Content Pillars */}
      <section className="py-12 mx-auto max-w-5xl px-4 sm:px-6 space-y-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="clinical-card p-6 space-y-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Stethoscope className="h-4.5 w-4.5" />
            </span>
            <h3 className="text-base font-bold text-slate-900 font-display">
              Primary Health Centre (PHC) Point of Care
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Standard 45° fundus cameras can capture posterior-pole eye images in village clinics. RetinaSetu evaluates capture sharpness, isolates microaneurysms, hemorrhages, and exudates, and calculates ICDR 0-4 severity within seconds.
            </p>
          </div>

          <div className="clinical-card p-6 space-y-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <UserCheck className="h-4.5 w-4.5" />
            </span>
            <h3 className="text-base font-bold text-slate-900 font-display">
              Tele-Ophthalmology Triage & Referral
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              High-risk cases (Severe NPDR and Proliferative DR) are immediately routed to the District Ophthalmologist Workstation, enabling remote specialists to inspect Red-Free green channel heatmaps and authorize prompt treatment under Ayushman Bharat PM-JAY.
            </p>
          </div>
        </div>
      </section>

      {/* Floating Assistant Bot */}
      <AssistantBot />
    </div>
  );
}
