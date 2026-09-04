import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Eye,
  Layers,
  ScanEye,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Sparkles,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { AssistantBot } from '@/components/bot/AssistantBot';

export const metadata: Metadata = {
  title: 'About RetinaSetu | AI DR Clinical Screening Platform',
  description: 'Learn about RetinaSetu 7-Stage Explainable AI Diabetic Retinopathy screening architecture for rural India.',
};

export default function AboutPage() {
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
            <Link href="/about" className="text-xs font-extrabold text-emerald-700">
              About SIH Vision
            </Link>
            <Link href="/hospitals" className="text-xs font-bold text-slate-600 hover:text-emerald-600 transition">
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

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center space-y-4 animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-4 py-1.5 text-xs font-extrabold text-emerald-800 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            SIH 2026 Innovation Vision
          </span>
          <h1 className="text-4xl font-extrabold text-slate-900 font-display sm:text-5xl tracking-tight">
            Bridging Rural Healthcare & Specialist Retinal Screening
          </h1>
          <p className="text-sm sm:text-base font-medium text-slate-600 max-w-2xl mx-auto leading-relaxed">
            RetinaSetu was built to solve India’s massive Diabetic Retinopathy screening bottleneck by putting a 7-stage explainable AI decision support system at Primary Health Centres.
          </p>
        </div>
      </section>

      {/* Content Pillars */}
      <section className="py-16 mx-auto max-w-5xl px-6 space-y-12">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="medical-card-hero p-7 space-y-4">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Stethoscope className="h-5 w-5" />
            </span>
            <h3 className="text-xl font-bold text-slate-900 font-display">
              Primary Health Centre AI Screening
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Low-cost fundus cameras can capture retinal photographs in any village PHC. RetinaSetu evaluates image quality, detects microaneurysms, hemorrhages, and exudates, and provides immediate ICDR 0-4 severity grading.
            </p>
          </div>

          <div className="medical-card-hero p-7 space-y-4">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <UserCheck className="h-5 w-5" />
            </span>
            <h3 className="text-xl font-bold text-slate-900 font-display">
              Tele-Ophthalmology Referral Workflow
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              High-risk cases (Severe NPDR & Proliferative DR) are automatically escalated to the District Ophthalmologist Console, allowing specialists to review heatmaps remotely and sign off patient records.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Floating Bot */}
      <AssistantBot />
    </div>
  );
}
