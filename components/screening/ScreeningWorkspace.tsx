'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleAlert,
  Eye,
  FileText,
  Flame,
  Crosshair,
  RotateCcw,
  Camera,
  Workflow,
} from 'lucide-react';
import type { LesionClass, PatientContext, StageId } from '@/lib/pipeline/types';
import { LESION_CLASSES } from '@/lib/pipeline/constants';
import { useScreeningRun } from '@/lib/client/useScreeningRun';
import { IntakePanel } from '@/components/screening/IntakePanel';
import { StageRail } from '@/components/screening/StageRail';
import { ImageViewer, LesionLegend, type ViewerLayers } from '@/components/screening/ImageViewer';
import {
  QualityCard,
  StructureCard,
  LesionCard,
} from '@/components/screening/cards/AcquisitionCards';
import {
  ConfidenceCard,
  ExplainCard,
  GradeSummaryStrip,
  GradingCard,
} from '@/components/screening/cards/DecisionCards';
import { ReportView } from '@/components/screening/ReportView';
import { Panel, StatusBadge } from '@/components/ui/primitives';
import { saveScreeningRecord } from '@/lib/client/screeningStore';
import { speakQualityResult, speakClinicalVerdict } from '@/lib/client/voiceAssistant';
import { cn } from '@/lib/ui';
import { Volume2, VolumeX } from 'lucide-react';

export function ScreeningWorkspace() {
  const { state, start, reset } = useScreeningRun();
  const [view, setView] = useState<'pipeline' | 'report'>('pipeline');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [layers, setLayers] = useState<ViewerLayers>({
    anatomy: true,
    lesions: true,
    heatmap: false,
  });
  const [visibleClasses, setVisibleClasses] = useState<Set<LesionClass>>(
    () => new Set(LESION_CLASSES),
  );
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.75);
  const [showEnhanced, setShowEnhanced] = useState(true);
  const [recaptureHint, setRecaptureHint] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientContext | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const handleStart = useCallback(
    (file: File, ctx: PatientContext) => {
      setPatient(ctx);
      setView('pipeline');
      setRecaptureHint(null);
      void start(file, ctx);
    },
    [start],
  );

  const handleReset = useCallback(
    (hint?: string) => {
      reset();
      setView('pipeline');
      setLayers({ anatomy: true, lesions: true, heatmap: false });
      setVisibleClasses(new Set(LESION_CLASSES));
      setRecaptureHint(hint ?? null);
    },
    [reset],
  );

  /* Audio Voice Assistant alerts for ASHA workers */
  useEffect(() => {
    if (!voiceEnabled) return;
    if (state.quality) {
      speakQualityResult(state.quality.verdict, state.quality.overallScore);
    }
  }, [state.quality, voiceEnabled]);

  useEffect(() => {
    if (!voiceEnabled) return;
    if (state.report && state.grading) {
      speakClinicalVerdict(state.grading.label, state.report.grade.referable);
    }
  }, [state.report, state.grading, voiceEnabled]);

  /* Sync completed screening run into Doctor Console storage */
  useEffect(() => {
    if (state.report && state.quality) {
      saveScreeningRecord({
        id: state.report.reportId || `rec-${Date.now()}`,
        patientId: patient?.patientId || `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
        patientName: 'Walk-in Patient',
        patientAge: patient?.age ? parseInt(patient.age, 10) || 52 : 52,
        gender: patient?.sex === 'female' ? 'F' : 'M',
        timestamp: new Date().toISOString(),
        qualityVerdict: state.quality.verdict,
        qualityScore: state.quality.overallScore,
        icdrGrade: state.grading?.level ?? 0,
        gradeLabel: state.grading?.label ?? 'Ungradeable',
        referralRequired: state.report.grade.referable,
        referralUrgency:
          state.report.grade.urgency === 'urgent'
            ? 'Immediate'
            : state.report.grade.urgency === 'prompt'
            ? 'Within 14 Days'
            : 'Routine (6-12 Months)',
        confidenceScore: state.confidence?.finalConfidence ?? 80,
        status: 'Pending Doctor Review',
        lesionSummary: state.report.recommendation.headline || 'Screening pipeline run completed.',
      });
    }
  }, [state.report, state.quality, state.grading, state.confidence, patient]);

  /* Turn the heatmap on automatically the moment the explainability stage
     lands — that is the stage where the operator is meant to look at it. */
  useEffect(() => {
    if (state.explainability) setLayers((l) => ({ ...l, heatmap: true }));
  }, [state.explainability]);



  /* Follow the run as new stage cards arrive. */
  const completedCount = useMemo(
    () => Object.values(state.stages).filter((s) => s.status === 'complete').length,
    [state.stages],
  );
  useEffect(() => {
    if (state.phase !== 'running' || completedCount === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [completedCount, state.phase]);


  const toggleClass = useCallback((c: LesionClass) => {
    setVisibleClasses((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }, []);

  const scrollToStage = useCallback((id: StageId) => {
    document.getElementById(`stage-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (state.phase === 'idle' || (state.phase === 'error' && !state.runId)) {
    return (
      <>
        {recaptureHint ? (
          <div className="mx-auto max-w-6xl px-5 pt-6">
            <div className="flex items-start gap-3 rounded-xl border border-[#fab219]/40 bg-[#fab219]/8 px-4 py-3">
              <Camera className="mt-0.5 h-4 w-4 shrink-0 text-[#fab219]" aria-hidden />
              <p className="text-[12.5px] leading-relaxed text-ink-200">{recaptureHint}</p>
            </div>
          </div>
        ) : null}
        <IntakePanel onStart={handleStart} error={state.error} />
      </>
    );
  }

  const displayImage =
    (showEnhanced ? state.images.enhanced : null) ??
    state.images.working ??
    state.images.original;

  const activeStage = ([...Object.entries(state.stages)] as Array<[StageId, { status: string }]>)
    .filter(([, s]) => s.status === 'running')
    .map(([id]) => id)[0];

  return (
    <div className="min-h-screen">
      {/* ---- Run header ---- */}
      <div className="print-hide sticky top-0 z-30 border-b border-ink-850 bg-canvas/95 backdrop-blur">
        <div className="mx-auto max-w-[1500px] px-5 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <span className="font-mono text-[11px] tracking-wide text-ink-500 uppercase">
                {patient?.patientId ? `Patient ${patient.patientId}` : 'Unidentified encounter'}
              </span>
              {patient?.phc ? (
                <span className="truncate text-[11.5px] text-ink-500">· {patient.phc}</span>
              ) : null}
              {state.grading && state.confidence ? (
                <GradeSummaryStrip grading={state.grading} confidence={state.confidence} />
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <div
                className="flex rounded-lg border border-ink-800 bg-ink-950 p-0.5"
                role="tablist"
                aria-label="Workspace view"
              >
                <ViewTab
                  active={view === 'pipeline'}
                  onClick={() => setView('pipeline')}
                  icon={<Workflow className="h-3.5 w-3.5" aria-hidden />}
                >
                  Pipeline
                </ViewTab>
                <ViewTab
                  active={view === 'report'}
                  onClick={() => setView('report')}
                  disabled={!state.report}
                  icon={<FileText className="h-3.5 w-3.5" aria-hidden />}
                >
                  Report
                </ViewTab>
              </div>
              <button
                type="button"
                onClick={() => setVoiceEnabled((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition',
                  voiceEnabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-400',
                )}
                title="Toggle Screener Voice Assistant"
              >
                {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                Voice {voiceEnabled ? 'On' : 'Off'}
              </button>

              <button
                type="button"
                onClick={() => handleReset()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                New screening
              </button>

            </div>
          </div>

          <div className="mt-3">
            <StageRail
              stages={state.stages}
              halted={state.phase === 'halted'}
              active={activeStage ?? null}
              onSelect={scrollToStage}
            />
          </div>
        </div>
      </div>

      {view === 'report' && state.report ? (
        <ReportView
          report={state.report}
          result={state.result}
          structures={state.structures}
          lesions={state.lesions}
        />
      ) : (
        <div className="mx-auto grid max-w-[1500px] gap-5 px-5 py-6 xl:grid-cols-[minmax(380px,0.85fr)_1.15fr]">
          {/* ---- Reading canvas ---- */}
          <div className="xl:sticky xl:top-[168px] xl:self-start">
            <Panel className="overflow-hidden">
              <div className="p-3">
                {displayImage ? (
                  <ImageViewer
                    src={displayImage}
                    alt="Fundus photograph under analysis"
                    structures={layers.anatomy ? state.structures : null}
                    lesions={state.lesions}
                    explainability={state.explainability}
                    layers={layers}
                    visibleClasses={visibleClasses}
                    heatmapOpacity={heatmapOpacity}
                    scanning={state.phase === 'running'}
                  />
                ) : (
                  <div className="grid aspect-square place-items-center rounded-xl border border-ink-800 bg-ink-950">
                    <p className="text-[12px] text-ink-500">Loading capture…</p>
                  </div>
                )}
              </div>

              <div className="space-y-3.5 border-t border-ink-850 px-4 py-4">
                <div className="flex flex-wrap gap-1.5">
                  <LayerToggle
                    active={layers.anatomy}
                    disabled={!state.structures}
                    onClick={() => setLayers((l) => ({ ...l, anatomy: !l.anatomy }))}
                    icon={<Crosshair className="h-3.5 w-3.5" aria-hidden />}
                  >
                    Anatomy
                  </LayerToggle>
                  <LayerToggle
                    active={layers.lesions}
                    disabled={!state.lesions}
                    onClick={() => setLayers((l) => ({ ...l, lesions: !l.lesions }))}
                    icon={<Eye className="h-3.5 w-3.5" aria-hidden />}
                  >
                    Lesions
                  </LayerToggle>
                  <LayerToggle
                    active={layers.heatmap}
                    disabled={!state.explainability}
                    onClick={() => setLayers((l) => ({ ...l, heatmap: !l.heatmap }))}
                    icon={<Flame className="h-3.5 w-3.5" aria-hidden />}
                  >
                    Attention
                  </LayerToggle>
                  <LayerToggle
                    active={!!layers.redFree}
                    onClick={() => setLayers((l) => ({ ...l, redFree: !l.redFree }))}
                    icon={<Eye className="h-3.5 w-3.5 text-emerald-400" aria-hidden />}
                  >
                    Red-Free Filter
                  </LayerToggle>
                  {state.images.enhanced ? (
                    <LayerToggle
                      active={showEnhanced}
                      onClick={() => setShowEnhanced((v) => !v)}
                      icon={<Camera className="h-3.5 w-3.5" aria-hidden />}
                    >
                      Enhanced
                    </LayerToggle>
                  ) : null}

                </div>

                {layers.heatmap && state.explainability ? (
                  <label className="block">
                    <span className="mb-1.5 flex items-center justify-between text-[11px] text-ink-400">
                      Attention opacity
                      <span className="tabular font-mono text-ink-500">
                        {Math.round(heatmapOpacity * 100)}%
                      </span>
                    </span>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={Math.round(heatmapOpacity * 100)}
                      onChange={(e) => setHeatmapOpacity(Number(e.target.value) / 100)}
                      className="w-full accent-[#1aa197]"
                    />
                  </label>
                ) : null}

                {state.lesions ? (
                  <div>
                    <p className="mb-2 text-[10.5px] font-semibold tracking-[0.1em] text-ink-500 uppercase">
                      Finding layers
                    </p>
                    <LesionLegend
                      counts={state.lesions.counts}
                      visible={visibleClasses}
                      onToggle={toggleClass}
                    />
                  </div>
                ) : null}

                <p className="border-t border-ink-850 pt-3 text-[10.5px] leading-relaxed text-ink-500">
                  Dashed markers are model-only findings; solid markers were corroborated by
                  independent classical detection. Each lesion class has its own shape as
                  well as its own colour.
                </p>
              </div>
            </Panel>
          </div>

          {/* ---- Stage output stream ---- */}
          <div className="min-w-0 space-y-5">
            {state.error ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-[#d03b3b]/45 bg-[#d03b3b]/10 px-4 py-3.5"
              >
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8f8f]" aria-hidden />
                <div>
                  <p className="text-[13px] font-semibold text-[#ffb3b3]">
                    The screening run failed
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-300">{state.error}</p>
                </div>
              </div>
            ) : null}

            {state.quality ? (
              <div id="stage-quality">
                <QualityCard data={state.quality} />
              </div>
            ) : (
              <PendingCard label="Assessing image quality" />
            )}

            {state.phase === 'halted' && state.halted ? (
              <HaltedCard
                reason={state.halted.reason}
                guidance={state.halted.guidance}
                onRecapture={() =>
                  handleReset(
                    'Recapture requested. Re-take the photograph following the guidance from the rejected capture, then upload it here. In the field this is the same operator, same patient, one minute later.',
                  )
                }
              />
            ) : null}

            {state.structures ? (
              <div id="stage-structures">
                <StructureCard data={state.structures} />
              </div>
            ) : state.phase === 'running' && state.quality ? (
              <PendingCard label="Locating retinal anatomy" />
            ) : null}

            {state.lesions ? (
              <div id="stage-lesions">
                <LesionCard data={state.lesions} />
              </div>
            ) : state.phase === 'running' && state.structures ? (
              <PendingCard label="Detecting lesions" />
            ) : null}

            {state.grading ? (
              <div id="stage-grading">
                <GradingCard data={state.grading} />
              </div>
            ) : state.phase === 'running' && state.lesions ? (
              <PendingCard label="Grading severity" />
            ) : null}

            {state.explainability ? (
              <div id="stage-explainability">
                <ExplainCard data={state.explainability} />
              </div>
            ) : null}

            {state.confidence ? (
              <div id="stage-confidence">
                <ConfidenceCard data={state.confidence} />
              </div>
            ) : null}

            {state.report ? (
              <div
                id="stage-report"
                className="animate-fade-up rounded-xl border border-brand-600/35 bg-brand-950/30 px-5 py-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-ink-50">
                      Stage 7 · Doctor-ready report assembled
                    </p>
                    <p className="mt-1 text-[12px] text-ink-400">
                      Report {state.report.reportId} — grade, evidence, recommendation and the
                      full processing audit trail.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView('report')}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-500"
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    Open report
                  </button>
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ViewTab({
  active,
  onClick,
  disabled,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition',
        active ? 'bg-ink-800 text-white' : 'text-ink-400 hover:text-ink-200',
        disabled && 'cursor-not-allowed opacity-40 hover:text-ink-400',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function LayerToggle({
  active,
  disabled,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium transition',
        active
          ? 'border-brand-500/50 bg-brand-600/15 text-brand-200'
          : 'border-ink-800 bg-ink-950 text-ink-400 hover:border-ink-600',
        disabled && 'cursor-not-allowed opacity-35',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function PendingCard({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-800 bg-ink-950/30 px-5 py-8">
      <p className="flex items-center gap-2.5 text-[12.5px] text-ink-500">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" aria-hidden />
        {label}…
      </p>
    </div>
  );
}

function HaltedCard({
  reason,
  guidance,
  onRecapture,
}: {
  reason: string;
  guidance: string[];
  onRecapture: () => void;
}) {
  return (
    <Panel className="animate-fade-up border-[#d03b3b]/45">
      <div className="p-5">
        <StatusBadge status="critical" size="lg">
          Pipeline halted — image rejected
        </StatusBadge>

        <p className="mt-4 text-[13px] leading-relaxed text-ink-200">{reason}</p>

        <p className="mt-4 text-[12px] leading-relaxed text-ink-400">
          The remaining six stages did not run. Grading an ungradeable photograph would
          produce a confident-looking result with nothing behind it, which is the most
          dangerous failure mode a screening tool has. Recapture is the correct action.
        </p>

        {guidance.length > 0 ? (
          <div className="mt-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-500 uppercase">
              Recapture guidance for the operator
            </p>
            <ol className="mt-2.5 space-y-2">
              {guidance.map((g, i) => (
                <li key={g} className="flex gap-3 text-[12px] leading-relaxed text-ink-300">
                  <span className="tabular mt-px font-mono text-[11px] font-semibold text-[#fab219]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {g}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onRecapture}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#fab219] px-4 py-2.5 text-[12.5px] font-semibold text-ink-950 transition hover:bg-[#ffc340]"
        >
          <Camera className="h-3.5 w-3.5" aria-hidden />
          Simulate recapture
        </button>
      </div>
    </Panel>
  );
}
