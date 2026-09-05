'use client';

import Image from 'next/image';
import { Eye, MapPin, Share2, Stethoscope, CheckCircle2 } from 'lucide-react';

export function CarePathwayEcosystem() {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all duration-300 space-y-3">
      {/* Top Header Pill */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-800 border border-slate-200/80">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-100 text-emerald-800">
            <MapPin className="h-2.5 w-2.5" />
          </span>
          <span>From village clinics to specialist care</span>
        </div>
      </div>

      {/* Main Grid: 3D Illustration on Left, 4 Benefit Pills on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* 3D Care Pathway Model with Central Bridge Tag (md:col-span-8) */}
        <div className="md:col-span-8 relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
          <Image
            src="/images/care_pathway_3d.jpg"
            alt="RetinaSetu Rural Care Pathway - Connecting Primary Health Centres to District Eye Hospitals"
            fill
            className="object-contain"
            priority
          />

          {/* Central Setu (Bridge) Floating Telemetry Callout */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 rounded-full bg-slate-900/90 backdrop-blur-md px-3 py-1 text-white border border-emerald-500/40 shadow-lg flex items-center gap-2 pointer-events-none">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-left leading-tight">
              <span className="block text-[10px] font-extrabold text-emerald-300">
                RetinaSetu
              </span>
              <span className="block text-[8.5px] text-slate-300 font-medium">
                AI Analysis • Guided Referrals
              </span>
            </div>
          </div>
        </div>

        {/* 4 Clinical Benefit Chips (md:col-span-4) */}
        <div className="md:col-span-4 flex flex-col justify-center space-y-2">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
              <Eye className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11.5px]">Early Detection</span>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
              <Share2 className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11.5px]">Guided Referrals</span>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
              <Stethoscope className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11.5px]">Specialist Consultation</span>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11.5px]">Better Outcomes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
