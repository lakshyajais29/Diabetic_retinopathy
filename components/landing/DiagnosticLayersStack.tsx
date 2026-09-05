'use client';

import { useState } from 'react';
import Image from 'next/image';

interface LayerMeta {
  id: string;
  name: string;
  desc: string;
  dotColor: string;
}

const LAYERS: LayerMeta[] = [
  {
    id: 'lesion',
    name: 'Lesion Map',
    desc: 'Microaneurysms, hemorrhages, and exudate clusters isolated by segmentation.',
    dotColor: 'bg-rose-500',
  },
  {
    id: 'vessel',
    name: 'Vessel Map',
    desc: 'Retinal vascular caliber, branching angles, and arteriolar tortuosity analysis.',
    dotColor: 'bg-sky-500',
  },
  {
    id: 'redfree',
    name: 'Red-Free',
    desc: 'Monochromatic green-channel (540nm) extraction to remove obscuring choroidal red.',
    dotColor: 'bg-slate-400',
  },
  {
    id: 'anatomy',
    name: 'Anatomy',
    desc: 'Optic disc cup-to-disc boundary and foveal centralis geographic landmarks.',
    dotColor: 'bg-purple-500',
  },
  {
    id: 'original',
    name: 'Original',
    desc: 'True-color 45° posterior pole fundus acquisition from clinic camera.',
    dotColor: 'bg-emerald-600',
  },
];

export function DiagnosticLayersStack() {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  return (
    <div className="relative flex flex-col items-center select-none">
      <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-square">
        {/* Layer Callout Tags on the Left with exact colored dots */}
        <div className="absolute -left-1 sm:-left-3 top-2 z-30 flex flex-col justify-between h-[86%] pointer-events-auto space-y-1 sm:space-y-1.5">
          {LAYERS.map((layer) => {
            const isSelected = activeLayer === layer.id;
            return (
              <button
                key={layer.id}
                onMouseEnter={() => setActiveLayer(layer.id)}
                onMouseLeave={() => setActiveLayer(null)}
                onClick={() => setActiveLayer(isSelected ? null : layer.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold shadow-2xs transition-all duration-200 ${
                  isSelected
                    ? 'border-emerald-500 bg-white text-emerald-950 scale-105 shadow-sm'
                    : 'border-slate-200 bg-white/95 backdrop-blur-xs text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${layer.dotColor} shrink-0`} />
                <span>{layer.name}</span>
              </button>
            );
          })}
        </div>

        {/* 3D Isometric Stack Visual Container */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden transition-transform duration-500 hover:scale-[1.02]">
          <Image
            src="/images/diagnostic_layers_3d.jpg"
            alt="3D Layered AI Retinal Diagnostics Stack"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Active Layer Description Tooltip */}
        {activeLayer && (
          <div className="absolute bottom-2 left-2 right-2 rounded-xl bg-slate-900/95 backdrop-blur-md p-2.5 text-white text-xs shadow-xl z-40 border border-slate-700 animate-fade-in">
            <span className="font-bold text-emerald-400 block text-[11px]">
              {LAYERS.find((l) => l.id === activeLayer)?.name}:
            </span>
            <p className="text-[10px] text-slate-200 leading-snug mt-0.5">
              {LAYERS.find((l) => l.id === activeLayer)?.desc}
            </p>
          </div>
        )}
      </div>

      {/* Editorial Curving Annotation: "AI sees more, so you can do more." */}
      <div className="flex items-center gap-2 mt-2 pl-4 text-slate-500">
        <svg
          className="w-7 h-7 text-slate-400 stroke-current -scale-y-100 rotate-12"
          viewBox="0 0 40 40"
          fill="none"
        >
          <path
            d="M5 30 C 15 15, 25 15, 32 8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="2 2"
          />
          <path d="M26 7 L33 7 L33 14" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="font-serif italic text-xs sm:text-sm text-slate-500 leading-tight">
          AI sees more, <br />
          so you can do more.
        </span>
      </div>
    </div>
  );
}
