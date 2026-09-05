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
  Sparkles,
  Volume2,
  VolumeX,
  ArrowRight,
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
import { StatusBadge } from '@/components/ui/primitives';
import { saveScreeningRecord } from '@/lib/client/screeningStore';
import { speakQualityResult, speakClinicalVerdict } from '@/lib/client/voiceAssistant';
import { cn } from '@/lib/ui';

export function ScreeningWorkspace() {
  const { state, start, reset } = useScreeningRun();
  const [view, setView] = useState<'pipeline' | 'report'>('pipeline');
  const [mobileTab, setMobileTab] = useState<'image' | 'stages'>('stages');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [layers, setLayers] = useState<ViewerLayers>({
    anatomy: true,
    lesions: true,
    heatmap: false,
    redFree: false,
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
      setMobileTab('stages');
      setRecaptureHint(null);
      void start(file, ctx);
    },
    [start],
  );

  const handleReset = useCallback(
    (hint?: string) => {
      reset();
      setView('pipeline');
      setMobileTab('stages');
      setLayers({ anatomy: true, lesions: true, heatmap: false, redFree: false });
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

  useEffect(() => {
    if (state.explainability) setLayers((l) => ({ ...l, heatmap: true }));
  }, [state.explainability]);

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
          <div className="mx-auto max-w-5xl px-4 pt-4">
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
              <Camera className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
              <p className="leading-relaxed">{recaptureHint}</p>
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
    <div className="min-h-screen bg-slate-50">
      {/* ================================================================== */}
      {/* Sticky Workspace Top Telemetry Bar                                 */}
      {/* ================================================================== */}
      <div className="print-hide sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-xs backdrop-blur-md">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Encounter Meta */}
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-800 uppercase">
                {patient?.patientId ? `Patient ${patient.patientId}` : 'Encounter in Progress'}
              </span>
              {patient?.phc ? (
                <span className="hidden sm:inline text-xs text-slate-500">· {patient.phc}</span>
              ) : null}
              {state.grading && state.confidence ? (
                <GradeSummaryStrip grading={state.grading} confidence={state.confidence} />
              ) : null}
            </div>

            {/* View & Action Controls */}
            <div className="flex items-center gap-2">
              <div
                className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5"
                role="tablist"
                aria-label="Workspace view"
              >
                <ViewTab
                  active={view === 'pipeline'}
                  onClick={() => setView('pipeline')}
                  icon={<Workflow className="h-3.5 w-3.5" aria-hidden />}
                >
                  Analysis
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
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
                  voiceEnabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-500',
                )}
                title="Toggle Screener Voice Assistant"
              >
                {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleReset()}
                className="btn-secondary py-1.5 px-2.5 text-xs font-semibold"
                title="Start new screening encounter"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">New Screening</span>
              </button>
            </div>
          </div>

          {/* 7-Stage Progress Rail */}
          <div className="mt-2.5">
            <StageRail
              stages={state.stages}
              halted={state.phase === 'halted'}
              active={activeStage ?? null}
              onSelect={scrollToStage}
            />
          </div>

          {/* Mobile Tab Switcher (Image vs Diagnostic Findings) */}
          {view === 'pipeline' && (
            <div className="mt-2.5 flex rounded-lg border border-slate-200 bg-slate-100 p-1 xl:hidden">
              <button
                type="button"
                onClick={() => setMobileTab('image')}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-xs font-bold text-center transition',
                  mobileTab === 'image'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600',
                )}
              >
                Retinal Canvas
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('stages')}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-xs font-bold text-center transition',
                  mobileTab === 'stages'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600',
                )}
              >
                Clinical Findings ({completedCount}/7)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* Workspace Body: Report View vs Dual Column Workspace               */}
      {/* ================================================================== */}
      {view === 'report' && state.report ? (
        <ReportView
          report={state.report}
          result={state.result}
          structures={state.structures}
          lesions={state.lesions}
        />
      ) : (
        <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[minmax(380px,0.85fr)_1.15fr]">
          {/* ---- Left Column: PACS Retinal Image Viewer ---- */}
          <div
            className={cn(
              'xl:sticky xl:top-[160px] xl:self-start',
              mobileTab === 'stages' && 'hidden xl:block',
            )}
          >
            <div className="clinical-card overflow-hidden">
              <div className="p-3 bg-slate-900 rounded-t-xl">
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
                  <div className="grid aspect-square place-items-center rounded-lg border border-slate-800 bg-[#070b14]">
                    <p className="text-xs text-slate-500">Loading capture…</p>
                  </div>
                )}
              </div>

              {/* Viewer Layer Controls */}
              <div className="space-y-3.5 p-4 bg-white">
                <div>
                  <p className="mb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    Optical & Diagnostic Layers
                  </p>
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
                      icon={<Eye className="h-3.5 w-3.5 text-emerald-600" aria-hidden />}
                    >
                      Red-Free (Green Channel)
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
                </div>

                {layers.heatmap && state.explainability ? (
                  <label className="block rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                    <span className="mb-1.5 flex items-center justify-between text-xs text-slate-600 font-medium">
                      Attention Opacity
                      <span className="tabular font-mono text-slate-900 font-bold">
                        {Math.round(heatmapOpacity * 100)}%
                      </span>
                    </span>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={Math.round(heatmapOpacity * 100)}
                      onChange={(e) => setHeatmapOpacity(Number(e.target.value) / 100)}
                      className="w-full accent-emerald-600"
                    />
                  </label>
                ) : null}

                {state.lesions ? (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="mb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      Filter Findings by Class
                    </p>
                    <LesionLegend
                      counts={state.lesions.counts}
                      visible={visibleClasses}
                      onToggle={toggleClass}
                    />
                  </div>
                ) : null}

                <p className="border-t border-slate-100 pt-2.5 text-[10.5px] leading-relaxed text-slate-500">
                  Solid markers indicate classical detector corroboration; dashed circles denote vision model detections.
                </p>
              </div>
            </div>
          </div>

          {/* ---- Right Column: Live Clinical Stages Stream ---- */}
          <div
            className={cn(
              'min-w-0 space-y-4',
              mobileTab === 'image' && 'hidden xl:block',
            )}
          >
            {state.error ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4"
              >
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
                <div>
                  <p className="text-xs font-bold text-rose-900">The screening run failed</p>
                  <p className="mt-0.5 text-xs text-rose-700">{state.error}</p>
                </div>
              </div>
            ) : null}

            {state.quality ? (
              <div id="stage-quality">
                <QualityCard data={state.quality} />
              </div>
            ) : (
              <PendingCard label="Assessing image quality & sharpness" />
            )}

            {state.phase === 'halted' && state.halted ? (
              <HaltedCard
                reason={state.halted.reason}
                guidance={state.halted.guidance}
                onRecapture={() =>
                  handleReset(
                    'Recapture requested. Re-take the photograph following the guidance from the rejected capture, then upload it here.',
                  )
                }
              />
            ) : null}

            {state.structures ? (
              <div id="stage-structures">
                <StructureCard data={state.structures} />
              </div>
            ) : state.phase === 'running' && state.quality ? (
              <PendingCard label="Locating anatomical landmarks (disc, fovea)" />
            ) : null}

            {state.lesions ? (
              <div id="stage-lesions">
                <LesionCard data={state.lesions} />
              </div>
            ) : state.phase === 'running' && state.structures ? (
              <PendingCard label="Detecting microaneurysms and lesions" />
            ) : null}

            {state.grading ? (
              <div id="stage-grading">
                <GradingCard data={state.grading} />
              </div>
            ) : state.phase === 'running' && state.lesions ? (
              <PendingCard label="Computing ICDR severity grading" />
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
                className="clinical-card border-emerald-300 bg-emerald-50/50 p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      <Sparkles className="h-3.5 w-3.5" />
                      Stage 7 · Doctor-Ready Clinical Report Assembled
                    </span>
                    <p className="mt-0.5 text-xs text-slate-700">
                      Report {state.report.reportId} generated with complete diagnostic audit trail.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView('report')}
                    className="btn-primary py-2.5 px-4 text-xs font-bold"
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    View & Print Report
                    <ArrowRight className="h-3.5 w-3.5" />
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
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition',
        active
          ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
          : 'text-slate-600 hover:text-slate-900',
        disabled && 'cursor-not-allowed opacity-40 hover:text-slate-500',
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
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition',
        active
          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold shadow-xs'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
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
    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
      <p className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
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
    <div className="rounded-xl border border-rose-300 bg-rose-50/60 p-5 space-y-4">
      <StatusBadge status="critical" size="lg">
        Pipeline Halted · Image Recapture Required
      </StatusBadge>

      <p className="text-xs sm:text-[13px] font-semibold text-rose-950">{reason}</p>

      <p className="text-xs text-rose-800 leading-relaxed">
        Grading an ungradable photograph would risk producing false reassurance. For patient safety, downstream stages were halted and recapture has been requested.
      </p>

      {guidance.length > 0 ? (
        <div className="rounded-lg bg-white border border-rose-200 p-3.5">
          <p className="text-[10.5px] font-bold tracking-wider text-rose-800 uppercase">
            Recapture Guidance for Screener:
          </p>
          <ol className="mt-2 space-y-1.5">
            {guidance.map((g, i) => (
              <li key={g} className="flex gap-2 text-xs text-slate-700">
                <span className="tabular font-mono text-xs font-bold text-rose-700">
                  {i + 1}.
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
        className="btn-primary bg-rose-700 hover:bg-rose-800 border-rose-800 py-2.5 px-4 text-xs font-bold"
      >
        <Camera className="h-3.5 w-3.5" aria-hidden />
        Retake Fundus Photograph Now
      </button>
    </div>
  );
}
