import { randomUUID } from 'crypto';
import type {
  EngineKind,
  PatientContext,
  PipelineEvent,
  PipelineResult,
  StageId,
  StageTelemetry,
} from './types';
import { STAGES, stageSpec } from './constants';
import { getConfig } from '../config';
import { toDataUrl } from '../vision/raster';
import { normaliseForDisplay } from '../vision/enhance';
import { EventQueue } from './event-queue';
import { runQualityStage } from './stages/quality';
import { runStructureStage } from './stages/structures';
import { runLesionStage } from './stages/lesions';
import { runGradingStage } from './stages/grading';
import { runExplainabilityStage } from './stages/explainability';
import { runConfidenceStage } from './stages/confidence';
import { runReportStage } from './stages/report';

/**
 * The pipeline orchestrator.
 *
 * Returns an async iterable of events so the whole run can be streamed to the
 * client stage by stage. That is not a presentation trick: a PHC operator on a
 * slow district link needs to see that the image was accepted before grading
 * finishes, and a clinician reviewing a case needs the reasoning to arrive in
 * the order it was produced rather than as a finished verdict.
 *
 * The orchestrator owns three responsibilities and no clinical logic:
 *   1. sequencing stages and passing each one's output to the next,
 *   2. timing every stage and recording whether it ran degraded,
 *   3. halting the run when stage 1 rejects the photograph.
 */
export function runPipeline(
  imageBuffer: Buffer,
  patient: PatientContext,
): AsyncIterable<PipelineEvent> {
  const queue = new EventQueue<PipelineEvent>();

  void execute(imageBuffer, patient, queue)
    .catch((err: unknown) => {
      queue.push({
        type: 'error',
        message: err instanceof Error ? err.message : 'Pipeline failed unexpectedly.',
      });
    })
    .finally(() => queue.close());

  return queue;
}

async function execute(
  imageBuffer: Buffer,
  patient: PatientContext,
  queue: EventQueue<PipelineEvent>,
): Promise<void> {
  const runId = randomUUID();
  const engine: EngineKind = getConfig().engine;
  const telemetry: StageTelemetry[] = [];

  const result: PipelineResult = {
    runId,
    startedAt: new Date().toISOString(),
    halted: false,
    haltedReason: null,
    images: { original: '', working: '', enhanced: null },
    quality: null,
    structures: null,
    lesions: null,
    grading: null,
    explainability: null,
    confidence: null,
    report: null,
    telemetry,
  };

  queue.push({ type: 'run_start', runId, engine });

  const originalDisplay = await normaliseForDisplay(imageBuffer);
  result.images.original = await toDataUrl(originalDisplay);
  result.images.working = result.images.original;
  queue.push({ type: 'image_update', key: 'working', dataUrl: result.images.working });

  const stage = makeStageRunner(queue, engine, telemetry);

  /* ---------------- Stage 1 — Image Quality ---------------- */

  const q = await stage('quality', 'cv', (progress) =>
    runQualityStage(imageBuffer, engine, progress),
  );

  const quality = q.assessment;
  result.quality = quality;

  if (quality.enhancement?.applied) {
    result.images.enhanced = quality.enhancement.imageAfter;
    result.images.working = quality.enhancement.imageAfter;
    queue.push({ type: 'image_update', key: 'enhanced', dataUrl: result.images.working });
  }

  queue.push({
    type: 'stage_complete',
    stage: 'quality',
    telemetry: telemetry[telemetry.length - 1],
    payload: quality,
  });

  if (!quality.gradable || quality.verdict === 'ungradeable') {
    result.halted = true;
    result.haltedReason =
      'The photograph did not meet the minimum quality required for a safe retinopathy grade.';
    queue.push({
      type: 'halted',
      stage: 'quality',
      reason: result.haltedReason,
      guidance: quality.recaptureGuidance,
    });
    queue.push({ type: 'run_complete', result });
    return;
  }

  const { raster, field, workingBuffer } = q;

  /* ---------------- Stage 2 — Retinal Structures ---------------- */

  const s = await stage('structures', 'hybrid', (progress) =>
    runStructureStage(raster, field, workingBuffer, engine, progress),
  );
  result.structures = s.analysis;
  queue.push({
    type: 'stage_complete',
    stage: 'structures',
    telemetry: telemetry[telemetry.length - 1],
    payload: s.analysis,
  });

  /* ---------------- Stage 3 — Lesion Detection ---------------- */

  const l = await stage('lesions', 'hybrid', (progress) =>
    runLesionStage(
      raster,
      field,
      workingBuffer,
      s.disc,
      s.vessels,
      s.analysis,
      quality.overallScore,
      engine,
      progress,
    ),
  );
  result.lesions = l.analysis;
  queue.push({
    type: 'stage_complete',
    stage: 'lesions',
    telemetry: telemetry[telemetry.length - 1],
    payload: l.analysis,
  });

  /* ---------------- Stage 4 — Severity Grading ---------------- */

  const g = await stage('grading', 'hybrid', (progress) =>
    runGradingStage(workingBuffer, l.analysis, quality.overallScore, engine, progress),
  );
  result.grading = g.result;
  queue.push({
    type: 'stage_complete',
    stage: 'grading',
    telemetry: telemetry[telemetry.length - 1],
    payload: g.result,
  });

  /* ---------------- Stage 5 — Explainability ---------------- */

  const e = await stage('explainability', 'rules', async (progress) => {
    progress('Reconstructing the attention field that drove the grade', 30);
    const explain = runExplainabilityStage(
      raster,
      field,
      l.analysis,
      s.analysis,
      g.attentionRegions,
      g.keyEvidence,
      s.vessels.vesselMask,
    );
    progress('Scoring attention against independently located evidence', 82);
    return { explain };
  });
  result.explainability = e.explain;
  queue.push({
    type: 'stage_complete',
    stage: 'explainability',
    telemetry: telemetry[telemetry.length - 1],
    payload: e.explain,
  });

  /* ---------------- Stage 6 — Confidence & HITL ---------------- */

  const c = await stage('confidence', 'rules', async (progress) => {
    progress('Fusing quality, decisiveness, alignment and corroboration', 40);
    const assessment = runConfidenceStage(quality, s.analysis, l.analysis, g.result, e.explain);
    progress('Applying human-in-the-loop safety rules', 85);
    return { assessment };
  });
  result.confidence = c.assessment;
  queue.push({
    type: 'stage_complete',
    stage: 'confidence',
    telemetry: telemetry[telemetry.length - 1],
    payload: c.assessment,
  });

  /* ---------------- Stage 7 — Report ---------------- */

  const r = await stage('report', 'rules', async (progress) => {
    progress('Assembling the clinical summary and audit trail', 55);
    const report = runReportStage(
      patient,
      quality,
      s.analysis,
      l.analysis,
      g.result,
      e.explain,
      c.assessment,
      [...telemetry],
      runId,
    );
    return { report };
  });
  result.report = r.report;
  queue.push({
    type: 'stage_complete',
    stage: 'report',
    telemetry: telemetry[telemetry.length - 1],
    payload: r.report,
  });

  queue.push({ type: 'run_complete', result });
}

/* ------------------------------------------------------------------ */
/* Stage wrapper: timing, telemetry, live progress                      */
/* ------------------------------------------------------------------ */

type ProgressFn = (message: string, pct: number) => void;

function makeStageRunner(
  queue: EventQueue<PipelineEvent>,
  engine: EngineKind,
  telemetry: StageTelemetry[],
) {
  return async function stage<T extends object>(
    id: StageId,
    provenance: StageTelemetry['provenance'],
    fn: (progress: ProgressFn) => Promise<T>,
  ): Promise<T> {
    const spec = stageSpec(id);
    queue.push({ type: 'stage_start', stage: id, index: spec.index, title: spec.title });

    // Progress is pushed straight through to the client as it happens.
    const progress: ProgressFn = (message, pct) => {
      queue.push({ type: 'stage_progress', stage: id, message, pct });
    };

    const started = Date.now();
    const value = await fn(progress);

    // Stages that can lose their model backing report it; the rest simply omit
    // these fields, and the audit trail records them as having run clean.
    const flags = value as { degraded?: boolean; degradedReason?: string };

    telemetry.push({
      id,
      index: spec.index,
      title: spec.title,
      provenance,
      engine: provenance === 'rules' ? null : engine,
      durationMs: Date.now() - started,
      degraded: Boolean(flags.degraded),
      degradedReason: flags.degradedReason,
    });

    return value;
  };
}

export const PIPELINE_STAGES = STAGES;
