'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Eye, Calendar, Maximize2 } from 'lucide-react';

export function RetinaHeroWorkstation() {
  const [sliderPos, setSliderPos] = useState(65);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(10, Math.min(90, (x / rect.width) * 100));
    setSliderPos(percentage);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-blue-50 text-blue-600 border border-blue-100">
            <Eye className="h-3.5 w-3.5" />
          </span>
          <span className="font-bold text-slate-900 text-xs sm:text-[13px] tracking-tight">
            Right Eye (OD)
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-800 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Analysis Complete
          </span>
        </div>
        <span className="font-mono text-[11px] font-semibold text-slate-400">
          PAT-8842
        </span>
      </div>

      {/* Main Grid: Left Retinal Image with Slider, Right Clinical Findings */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
        {/* Left: Retinal Image with comparison slider (sm:col-span-6) */}
        <div className="sm:col-span-6 space-y-1.5">
          <div
            ref={containerRef}
            className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-950 select-none cursor-ew-resize border border-slate-800 shadow-inner"
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onMouseMove={handleMouseMove}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            onTouchMove={handleTouchMove}
            onClick={(e) => handleMove(e.clientX)}
          >
            {/* Layer A: Original Capture */}
            <div className="absolute inset-0">
              <Image
                src="/images/fundus_clinical_real.jpg"
                alt="Original Clinical Fundus Photograph"
                fill
                className="object-cover"
                priority
              />
              <span className="absolute top-2 left-2 rounded-md bg-slate-900/85 backdrop-blur-md px-1.5 py-0.5 text-[9.5px] font-bold text-slate-200 border border-white/10 shadow-xs z-10">
                Original
              </span>
              <span className="absolute top-2 right-2 grid h-5 w-5 place-items-center rounded bg-slate-900/70 text-slate-300 border border-white/10 z-10">
                <Maximize2 className="h-3 w-3" />
              </span>
            </div>

            {/* Layer B: AI Enhanced with highlighted microaneurysms and exudates */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `polygon(${sliderPos}% 0%, 100% 0%, 100% 100%, ${sliderPos}% 100%)` }}
            >
              <div className="relative w-full h-full">
                <Image
                  src="/images/fundus_clinical_real.jpg"
                  alt="AI Enhanced Retinopathy View"
                  fill
                  className="object-cover filter contrast-[1.12] brightness-[1.03] saturate-[1.15]"
                />

                {/* Lesion Overlay Annotations */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
                  <defs>
                    <filter id="glow-dot" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  {/* Optic Disc Ring */}
                  <circle cx="288" cy="205" r="28" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 2" className="opacity-80" />
                  {/* Microaneurysms */}
                  <circle cx="205" cy="188" r="3.5" fill="#ef4444" filter="url(#glow-dot)" />
                  <circle cx="230" cy="165" r="3" fill="#ef4444" />
                  <circle cx="168" cy="228" r="3.2" fill="#ef4444" />
                  <circle cx="150" cy="190" r="2.8" fill="#ef4444" />
                  <circle cx="240" cy="235" r="3" fill="#ef4444" />
                  {/* Hemorrhages */}
                  <circle cx="185" cy="175" r="4.5" fill="#b91c1c" fillOpacity="0.9" stroke="#fca5a5" strokeWidth="0.75" />
                  <circle cx="225" cy="205" r="4" fill="#b91c1c" fillOpacity="0.9" stroke="#fca5a5" strokeWidth="0.75" />
                  {/* Exudates */}
                  <circle cx="155" cy="158" r="2.5" fill="#f59e0b" />
                  <circle cx="160" cy="153" r="2" fill="#fbbf24" />
                  <circle cx="166" cy="157" r="2.5" fill="#f59e0b" />
                  <circle cx="172" cy="162" r="2" fill="#fbbf24" />
                </svg>

                <span className="absolute top-2 right-2 rounded-md bg-emerald-950/85 backdrop-blur-md px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-300 border border-emerald-500/30 shadow-xs z-10">
                  AI Enhanced
                </span>
              </div>
            </div>

            {/* Slider Handle */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_6px_rgba(0,0,0,0.6)] z-20 pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-white shadow-md border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-[9px] cursor-ew-resize hover:scale-110 active:scale-95 transition-transform">
                ⟨ ⟩
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 text-center font-medium leading-tight">
            Drag slider to compare original capture vs AI lesion segmentation
          </p>
        </div>

        {/* Right: Clinical Assessment & Findings (sm:col-span-6) */}
        <div className="sm:col-span-6 space-y-2.5 pl-0 sm:pl-1">
          {/* ICDR Grade Section */}
          <div className="space-y-0.5">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block">
              ICDR GRADE
            </span>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-black text-slate-900 font-display whitespace-nowrap">
                Grade 2
              </span>
              <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-amber-700 whitespace-nowrap">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Moderate NPDR
              </span>
            </div>
          </div>

          {/* Confidence Progress Meter */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px] font-medium text-slate-600">
              <span>Confidence</span>
              <span className="font-mono font-bold text-slate-900">87%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-600" style={{ width: '87%' }} />
            </div>
          </div>

          {/* Key Findings List */}
          <div className="pt-1.5 border-t border-slate-100 space-y-1">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block">
              KEY FINDINGS
            </span>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                  Microaneurysms
                </span>
                <span className="font-mono font-bold text-slate-900">14</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                  Dot & blot hemorrhages
                </span>
                <span className="font-mono font-bold text-slate-900">6</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  Hard exudates
                </span>
                <span className="font-mono font-bold text-slate-900">4</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="h-2 w-2 rotate-45 bg-emerald-500 shrink-0" />
                  No proliferative signs
                </span>
                <span className="text-[11px] text-emerald-700 font-bold">Clear</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Recommendation Banner (Spans Full Width at bottom of card) */}
      <div className="mt-3.5 rounded-xl border border-amber-200/90 bg-amber-50/90 p-3 flex items-start gap-2.5 text-amber-950">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-800 mt-0.5 border border-amber-200">
          <Calendar className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-xs font-bold leading-tight text-amber-950">
            Refer for specialist review within 14 days
          </p>
          <p className="text-[11px] text-amber-900/80 mt-0.5 leading-normal">
            Foveal proximity of exudate cluster warrants ophthalmologist confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}
