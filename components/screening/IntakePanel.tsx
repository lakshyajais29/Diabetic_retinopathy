'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Camera,
  FileImage,
  Info,
  Upload,
  X,
  Smartphone,
} from 'lucide-react';
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
    label: 'Normal Retina (Grade 0)',
    condition: 'Safe',
    badge: 'badge-safe',
    hint: 'No lesions. Verifies healthy eye screening path.',
  },
  {
    file: 'phantom-moderate.jpg',
    label: 'Moderate NPDR (Grade 2)',
    condition: 'Referral Required',
    badge: 'badge-warning',
    hint: 'Microaneurysms, hemorrhages and hard exudates.',
  },
  {
    file: 'phantom-proliferative.jpg',
    label: 'Proliferative DR (Grade 4)',
    condition: 'Urgent Referral',
    badge: 'badge-critical',
    hint: 'Severe lesions with neovascularisation pattern.',
  },
  {
    file: 'phantom-unusable.jpg',
    label: 'Ungradeable Capture',
    condition: 'Recapture Trigger',
    badge: 'badge-serious',
    hint: 'Under-lit / defocused capture that tests Quality Gate.',
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const accept = useCallback((next: File | null) => {
    setLocalError(null);
    if (!next) return;
    if (!next.type.startsWith('image/')) {
      setLocalError('File must be a valid image (JPEG, PNG, or WebP fundus capture).');
      return;
    }
    if (next.size > 20 * 1024 * 1024) {
      setLocalError('File exceeds 20 MB limit. Please compress or select a lower resolution image.');
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
          notes: p.notes || `Synthetic test phantom: ${label} loaded for clinical evaluation.`,
        }));
      } catch {
        setLocalError(
          'Sample phantoms are not available in this environment. Please upload a fundus photograph.',
        );
      }
    },
    [accept],
  );

  const set = <K extends keyof PatientContext>(key: K, value: PatientContext[K]) =>
    setPatient((p) => ({ ...p, [key]: value }));

  const submit = () => {
    if (!file) {
      setLocalError('Please attach or capture a fundus photograph before starting screening.');
      return;
    }
    onStart(file, patient);
  };

  return (
    <div className="grid w-full min-h-[calc(100vh-3rem)] gap-6 px-4 py-6 sm:px-6 lg:px-8 xl:gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] animate-fade-up">
      {/* ================================================================== */}
      {/* Retinal Capture Upload & Camera                                     */}
      {/* ================================================================== */}
      <div className="clinical-card flex flex-col p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Camera className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Fundus Image Intake</h2>
              <p className="text-xs text-slate-500">
                Posterior-pole 45° capture of macula and optic disc
              </p>
            </div>
          </div>
        </div>

        {/* Dropzone / Preview */}
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
            'relative flex-1 flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all duration-150',
            dragging
              ? 'border-emerald-500 bg-emerald-50/50'
              : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white',
          )}
        >
          {preview ? (
            <div className="relative h-full w-full p-2 bg-[#090d16] rounded-xl flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Fundus photograph awaiting screening"
                className="max-h-full max-w-full rounded-lg object-contain"
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
                className="absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-lg bg-slate-900/80 text-slate-300 hover:bg-rose-600 hover:text-white transition"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 p-6 sm:p-8 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Upload className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Select or drag fundus photograph here
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Supports JPEG, PNG, TIFF up to 20 MB (APTOS, IDRiD, Messidor compliant)
                </p>
              </div>

              {/* Action Buttons for Mobile & Desktop */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary py-2 px-3.5 text-xs font-semibold"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Browse Files
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="btn-secondary py-2 px-3.5 text-xs font-semibold sm:hidden"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Take Photo
                </button>
              </div>
            </div>
          )}

          {/* Hidden Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => accept(e.target.files?.[0] ?? null)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => accept(e.target.files?.[0] ?? null)}
          />
        </div>

        {file ? (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-mono text-slate-700 truncate">
              <FileImage className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              {file.name}
            </span>
            <span className="font-mono text-slate-500 shrink-0">
              {(file.size / 1024).toFixed(0)} KB
            </span>
          </div>
        ) : null}

        {/* Demo Phantoms */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-[10.5px] font-bold tracking-wider text-slate-500 uppercase">
            Test Phantoms (1-Tap Simulation)
          </p>
          <div className="mt-2.5 grid gap-2 grid-cols-1 sm:grid-cols-2">
            {SAMPLES.map((s) => (
              <button
                key={s.file}
                type="button"
                onClick={() => loadSample(s.file, s.label)}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{s.label}</span>
                  <span className={cn('clinical-badge text-[9.5px]', s.badge)}>
                    {s.condition}
                  </span>
                </div>
                <p className="mt-1 text-[10.5px] text-slate-500 leading-snug">{s.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {(localError || error) && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
            <span>{localError ?? error}</span>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* Patient Encounter Details Form                                     */}
      {/* ================================================================== */}
      <div className="clinical-card flex flex-col p-5 sm:p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900">Patient Encounter Record</h2>
          <p className="text-xs text-slate-500">Clinical identifiers and metadata</p>
        </div>

        <div className="space-y-3.5 flex-1 flex flex-col">
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Patient ID / Encounter #">
              <input
                className={inputClass}
                value={patient.patientId}
                onChange={(e) => set('patientId', e.target.value)}
                placeholder="PAT-8842"
              />
            </Field>
            <Field label="Age (Years)">
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
                <option value="unstated">Auto-Detect / Unstated</option>
                <option value="right">Right (OD)</option>
                <option value="left">Left (OS)</option>
              </select>
            </Field>
          </div>

          <Field label="Diabetes Duration (Years)">
            <input
              className={inputClass}
              value={patient.diabetesDurationYears}
              onChange={(e) => set('diabetesDurationYears', e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 8"
            />
          </Field>

          <Field label="Primary Health Centre (PHC)">
            <input
              className={inputClass}
              value={patient.phc}
              onChange={(e) => set('phc', e.target.value)}
              placeholder="e.g. PHC Kadegaon, Sangli"
            />
          </Field>

          <Field label="Clinical Observations / Vitals" className="flex-1 flex flex-col">
            <textarea
              className={cn(inputClass, 'flex-1 min-h-[70px] resize-y')}
              value={patient.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="HbA1c levels, vision complaints, previous laser history..."
            />
          </Field>

          <button
            type="button"
            onClick={submit}
            disabled={disabled}
            className="btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider"
          >
            Begin 7-Stage Clinical Analysis
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition';

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[11px] font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}
