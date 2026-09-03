'use client';

import { useCallback, useRef, useState } from 'react';
import { Camera, FileImage, Info, Upload, X } from 'lucide-react';
import type { PatientContext } from '@/lib/pipeline/types';
import { Panel, PanelHeader, SectionLabel } from '@/components/ui/primitives';
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
    label: 'Clean retina',
    hint: 'No lesions — tests the Level 0 path',
  },
  {
    file: 'phantom-moderate.jpg',
    label: 'Lesion burden',
    hint: 'Microaneurysms, haemorrhages and exudates',
  },
  {
    file: 'phantom-proliferative.jpg',
    label: 'Advanced disease',
    hint: 'Dense lesions plus new-vessel pattern',
  },
  {
    file: 'phantom-unusable.jpg',
    label: 'Unusable capture',
    hint: 'Defocused and under-lit — tests the quality gate',
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
          notes: p.notes || `Synthetic phantom loaded: ${label}. No real patient data.`,
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
    <div className="mx-auto grid max-w-6xl gap-5 px-5 py-8 lg:grid-cols-[1.15fr_0.85fr]">
      {/* ---- Capture ---- */}
      <Panel>
        <PanelHeader
          icon={<Camera className="h-4 w-4" aria-hidden />}
          title="Fundus capture"
          subtitle="Attach the photograph taken at the Primary Health Centre. One eye per screening run."
        />

        <div className="p-5">
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
              'relative overflow-hidden rounded-xl border-2 border-dashed transition',
              dragging
                ? 'border-brand-500 bg-brand-600/10'
                : 'border-ink-700 bg-ink-950/40 hover:border-ink-600',
            )}
          >
            {preview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Fundus photograph awaiting screening"
                  className="mx-auto block max-h-[340px] w-auto"
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
                  className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-lg border border-ink-700 bg-ink-950/85 text-ink-300 transition hover:text-white"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 px-6 py-14 text-center"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-ink-700 bg-ink-900 text-brand-300">
                  <Upload className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-[13.5px] font-semibold text-ink-100">
                  Drop a fundus photograph, or browse
                </span>
                <span className="max-w-sm text-[12px] leading-relaxed text-ink-500">
                  JPEG, PNG, WebP or TIFF up to 20 MB. Posterior-pole images from any
                  standard fundus camera, including APTOS/IDRiD/Messidor-style datasets.
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
            <p className="mt-3 flex items-center gap-2 font-mono text-[11px] text-ink-400">
              <FileImage className="h-3.5 w-3.5" aria-hidden />
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          ) : null}

          <div className="mt-6">
            <SectionLabel>Or load a synthetic phantom</SectionLabel>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
              Rendered test images, not photographs of real people. Useful for exercising a
              specific path through the pipeline.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {SAMPLES.map((s) => (
                <button
                  key={s.file}
                  type="button"
                  onClick={() => loadSample(s.file, s.label)}
                  className="rounded-lg border border-ink-800 bg-ink-900/50 px-3 py-2.5 text-left transition hover:border-ink-600 hover:bg-ink-850"
                >
                  <span className="block text-[12px] font-semibold text-ink-200">{s.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-ink-500">
                    {s.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {(localError || error) ? (
            <p
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-lg border border-[#d03b3b]/40 bg-[#d03b3b]/10 px-3 py-2.5 text-[12px] leading-relaxed text-[#ff9b9b]"
            >
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {localError ?? error}
            </p>
          ) : null}
        </div>
      </Panel>

      {/* ---- Encounter ---- */}
      <Panel className="self-start">
        <PanelHeader
          title="Patient encounter"
          subtitle="Recorded on the report for the reviewing ophthalmologist. All fields optional."
        />
        <div className="space-y-4 p-5">
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
            <Field label="Eye imaged">
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

          <Field label="Years since diabetes diagnosis">
            <input
              className={inputClass}
              value={patient.diabetesDurationYears}
              onChange={(e) => set('diabetesDurationYears', e.target.value)}
              inputMode="numeric"
              placeholder="9"
            />
          </Field>

          <Field label="Primary Health Centre">
            <input
              className={inputClass}
              value={patient.phc}
              onChange={(e) => set('phc', e.target.value)}
              placeholder="PHC Kadegaon, Sangli"
            />
          </Field>

          <Field label="Operator">
            <input
              className={inputClass}
              value={patient.operator}
              onChange={(e) => set('operator', e.target.value)}
              placeholder="CHO / ophthalmic assistant name"
            />
          </Field>

          <Field label="Clinical notes">
            <textarea
              className={cn(inputClass, 'min-h-[72px] resize-y')}
              value={patient.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Reported blurring, poor glycaemic control, previous laser…"
            />
          </Field>

          <button
            type="button"
            onClick={submit}
            disabled={disabled}
            className="mt-2 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Run seven-stage screening
          </button>

          <p className="text-[11px] leading-relaxed text-ink-500">
            The image is processed for the duration of this run and is not stored. Output is
            decision support for a trained screener, not a diagnosis.
          </p>
        </div>
      </Panel>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-ink-700 bg-ink-950/70 px-3 py-2 text-[13px] text-ink-100 placeholder:text-ink-600 transition focus:border-brand-500 focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium tracking-wide text-ink-400">
        {label}
      </span>
      {children}
    </label>
  );
}
