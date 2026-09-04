'use client';

import { useCallback, useRef, useState } from 'react';
import { Camera, FileImage, Info, Upload, X, Sparkles } from 'lucide-react';
import type { PatientContext } from '@/lib/pipeline/types';
import { cn } from '@/lib/ui';

const EMPTY: PatientContext = {
  patientId: '',
  age: '',
  sex: 'unstated',
  diabetesDurationYears: '',
  eye: 'unstated',
  phc: '',
  operator: '',
  notes: '',
};

const SAMPLES = [
  {
    file: 'phantom-clean.jpg',
    label: 'Healthy Retina (No DR)',
    hint: 'No lesions — exercises normal ICDR Grade 0 path',
  },
  {
    file: 'phantom-moderate.jpg',
    label: 'Moderate NPDR Burden',
    hint: 'Microaneurysms, haemorrhages and exudates',
  },
  {
    file: 'phantom-proliferative.jpg',
    label: 'Advanced Proliferative DR',
    hint: 'Dense lesions plus neovascularisation pattern',
  },
  {
    file: 'phantom-unusable.jpg',
    label: 'Ungradeable Capture',
    hint: 'Defocused/under-lit — tests Quality Gate halt',
  },
];

export function IntakePanel({
  onStart,
  disabled,
  error,
}: {
  onStart: (file: File, patient: PatientContext) => void;
  disabled?: boolean;
  error?: string | null;
}) {
  const [patient, setPatient] = useState<PatientContext>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const accept = useCallback((next: File | null) => {
    setLocalError(null);
    if (!next) return;
    if (!next.type.startsWith('image/')) {
      setLocalError('That file is not an image. Upload a JPEG, PNG or WebP fundus photograph.');
      return;
    }
    if (next.size > 20 * 1024 * 1024) {
      setLocalError('That image is larger than 20 MB. Export it at a lower resolution first.');
      return;
    }
    setFile(next);
    setPreview((old) => {
      if (old?.startsWith('blob:')) URL.revokeObjectURL(old);
      return URL.createObjectURL(next);
    });
  }, []);

  const loadSample = useCallback(
    async (name: string, label: string) => {
      setLocalError(null);
      try {
        const res = await fetch(`/samples/${name}`);
        if (!res.ok) throw new Error('missing');
        const blob = await res.blob();
        accept(new File([blob], name, { type: blob.type || 'image/jpeg' }));
        setPatient((p) => ({
          ...p,
          notes: p.notes || `Sample loaded: ${label}. Tested for SIH clinical evaluation.`,
        }));
      } catch {
        setLocalError(
          'Sample images are not available in this build. Upload a fundus photograph instead.',
        );
      }
    },
    [accept],
  );

  const set = <K extends keyof PatientContext>(key: K, value: PatientContext[K]) =>
    setPatient((p) => ({ ...p, [key]: value }));

  const submit = () => {
    if (!file) {
      setLocalError('Attach a fundus photograph before starting the screening.');
      return;
    }
    onStart(file, patient);
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[1.15fr_0.85fr] animate-fade-up">
      {/* ---- Capture ---- */}
      <div className="medical-card-hero p-6 sm:p-7">
        <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4 mb-5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-500 text-white shadow-md shadow-emerald-500/20">
            <Camera className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 font-display flex items-center gap-1.5">
              Fundus Image Intake
              <Sparkles className="h-4 w-4 text-emerald-500" />
            </h2>
            <p className="text-xs font-medium text-slate-600">
              Upload posterior-pole eye capture from Primary Health Centre camera.
            </p>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            accept(e.dataTransfer.files?.[0] ?? null);
          }}
          className={cn(
            'relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 shadow-inner',
            dragging
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-slate-300 bg-slate-50/80 hover:border-emerald-500/50 hover:bg-white',
          )}
        >
          {preview ? (
            <div className="relative p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Fundus photograph awaiting screening"
                className="mx-auto block max-h-[340px] w-auto rounded-xl shadow-md"
              />
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview((old) => {
                    if (old?.startsWith('blob:')) URL.revokeObjectURL(old);
                    return null;
                  });
                }}
                className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-xl bg-white/90 text-slate-600 shadow-md transition hover:bg-rose-500 hover:text-white"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 px-6 py-12 text-center group"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-lg shadow-emerald-500/10 transition-transform duration-300 group-hover:scale-110">
                <Upload className="h-7 w-7" aria-hidden />
              </span>
              <span className="text-sm font-extrabold text-slate-900">
                Drop fundus photograph here, or browse
              </span>
              <span className="max-w-sm text-xs font-medium text-slate-500 leading-relaxed">
                JPEG, PNG or WebP up to 20 MB. Compatible with standard retinal camera datasets (APTOS, IDRiD, Messidor).
              </span>
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => accept(e.target.files?.[0] ?? null)}
          />
        </div>

        {file ? (
          <p className="mt-3 flex items-center gap-2 font-mono text-xs font-semibold text-emerald-700">
            <FileImage className="h-4 w-4 text-emerald-600" aria-hidden />
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </p>
        ) : null}

        <div className="mt-7 border-t border-slate-200/80 pt-5">
          <span className="text-xs font-extrabold tracking-wider text-slate-500 uppercase">
            Or select SIH Demo Preset
          </span>
          <p className="mt-1 text-xs text-slate-500">
            Pre-calibrated retinal phantoms to demonstrate specific pipeline execution paths.
          </p>
          <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
            {SAMPLES.map((s) => (
              <button
                key={s.file}
                type="button"
                onClick={() => loadSample(s.file, s.label)}
                className="glass-panel p-3.5 text-left transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-50/50 hover:-translate-y-0.5 shadow-sm"
              >
                <span className="block text-xs font-extrabold text-slate-900">{s.label}</span>
                <span className="mt-0.5 block text-[11px] font-medium text-slate-500 leading-snug">
                  {s.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        {(localError || error) ? (
          <p
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-semibold leading-relaxed text-rose-800 shadow-sm"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
            {localError ?? error}
          </p>
        ) : null}
      </div>

      {/* ---- Encounter Details ---- */}
      <div className="medical-card-hero p-6 sm:p-7 self-start">
        <div className="border-b border-slate-200/80 pb-4 mb-5">
          <h2 className="text-lg font-extrabold text-slate-900 font-display">Patient Encounter</h2>
          <p className="text-xs font-medium text-slate-500">
            Clinical context recorded for ophthalmologist review.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Patient ID">
              <input
                className={inputClass}
                value={patient.patientId}
                onChange={(e) => set('patientId', e.target.value)}
                placeholder="PHC-2291"
              />
            </Field>
            <Field label="Age">
              <input
                className={inputClass}
                value={patient.age}
                onChange={(e) => set('age', e.target.value)}
                inputMode="numeric"
                placeholder="54"
              />
            </Field>
            <Field label="Sex">
              <select
                className={inputClass}
                value={patient.sex}
                onChange={(e) => set('sex', e.target.value as PatientContext['sex'])}
              >
                <option value="unstated">Not stated</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Eye Imaged">
              <select
                className={inputClass}
                value={patient.eye}
                onChange={(e) => set('eye', e.target.value as PatientContext['eye'])}
              >
                <option value="unstated">Not stated</option>
                <option value="right">Right (OD)</option>
                <option value="left">Left (OS)</option>
              </select>
            </Field>
          </div>

          <Field label="Primary Health Centre (PHC)">
            <input
              className={inputClass}
              value={patient.phc}
              onChange={(e) => set('phc', e.target.value)}
              placeholder="PHC Kadegaon, Sangli"
            />
          </Field>

          <Field label="Clinical Notes & History">
            <textarea
              className={cn(inputClass, 'min-h-[76px] resize-y')}
              value={patient.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Reported blurring, poor glycaemic control, laser history..."
            />
          </Field>

          <button
            type="button"
            onClick={submit}
            disabled={disabled}
            className="gradient-btn-primary w-full py-3.5 text-xs font-extrabold"
          >
            Run Seven-Stage Clinical Screening
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none shadow-inner';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
