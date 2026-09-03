'use client';

import { useCallback, useReducer, useRef } from 'react';
import type {
  ConfidenceAssessment,
  EngineKind,
  ExplainabilityResult,
  GradingResult,
  LesionAnalysis,
  PatientContext,
  PipelineEvent,
  PipelineResult,
  QualityAssessment,
  ScreeningReport,
  StageId,
  StageTelemetry,
  StructureAnalysis,
} from '@/lib/pipeline/types';
import { STAGES } from '@/lib/pipeline/constants';

export type RunPhase = 'idle' | 'running' | 'halted' | 'complete' | 'error';

export interface StageState {
  status: 'pending' | 'running' | 'complete';
  message: string | null;
  pct: number;
  telemetry: StageTelemetry | null;
}

export interface RunState {
  phase: RunPhase;
  engine: EngineKind | null;
  runId: string | null;
  stages: Record<StageId, StageState>;
  images: { original: string | null; working: string | null; enhanced: string | null };
  quality: QualityAssessment | null;
  structures: StructureAnalysis | null;
  lesions: LesionAnalysis | null;
  grading: GradingResult | null;
  explainability: ExplainabilityResult | null;
  confidence: ConfidenceAssessment | null;
  report: ScreeningReport | null;
  result: PipelineResult | null;
  halted: { reason: string; guidance: string[] } | null;
  error: string | null;
}

function blankStages(): Record<StageId, StageState> {
  return STAGES.reduce(
    (acc, s) => {
      acc[s.id] = { status: 'pending', message: null, pct: 0, telemetry: null };
      return acc;
    },
    {} as Record<StageId, StageState>,
  );
}

const INITIAL: RunState = {
  phase: 'idle',
  engine: null,
  runId: null,
  stages: blankStages(),
  images: { original: null, working: null, enhanced: null },
  quality: null,
  structures: null,
  lesions: null,
  grading: null,
  explainability: null,
  confidence: null,
  report: null,
  result: null,
  halted: null,
  error: null,
};

type Action =
  | { kind: 'reset' }
  | { kind: 'start'; preview: string }
  | { kind: 'event'; event: PipelineEvent }
  | { kind: 'error'; message: string };

function reducer(state: RunState, action: Action): RunState {
  switch (action.kind) {
    case 'reset':
      return { ...INITIAL, stages: blankStages() };

    case 'start':
      return {
        ...INITIAL,
        stages: blankStages(),
        phase: 'running',
        images: { original: action.preview, working: action.preview, enhanced: null },
      };

    case 'error':
      return { ...state, phase: 'error', error: action.message };

    case 'event':
      return applyEvent(state, action.event);

    default:
      return state;
  }
}

function applyEvent(state: RunState, event: PipelineEvent): RunState {
  switch (event.type) {
    case 'run_start':
      return { ...state, runId: event.runId, engine: event.engine, phase: 'running' };

    case 'image_update':
      return {
        ...state,
        images: { ...state.images, [event.key]: event.dataUrl, working: event.dataUrl },
      };

    case 'stage_start':
      return {
        ...state,
        stages: {
          ...state.stages,
          [event.stage]: {
            status: 'running',
            message: null,
            pct: 0,
            telemetry: null,
          },
        },
      };

    case 'stage_progress':
      return {
        ...state,
        stages: {
          ...state.stages,
          [event.stage]: {
            ...state.stages[event.stage],
            status: 'running',
            message: event.message,
            pct: event.pct,
          },
        },
      };

    case 'stage_complete': {
      const next: RunState = {
        ...state,
        stages: {
          ...state.stages,
          [event.stage]: {
            status: 'complete',
            message: null,
            pct: 100,
            telemetry: event.telemetry,
          },
        },
      };
      switch (event.stage) {
        case 'quality':
          next.quality = event.payload as QualityAssessment;
          break;
        case 'structures':
          next.structures = event.payload as StructureAnalysis;
          break;
        case 'lesions':
          next.lesions = event.payload as LesionAnalysis;
          break;
        case 'grading':
          next.grading = event.payload as GradingResult;
          break;
        case 'explainability':
          next.explainability = event.payload as ExplainabilityResult;
          break;
        case 'confidence':
          next.confidence = event.payload as ConfidenceAssessment;
          break;
        case 'report':
          next.report = event.payload as ScreeningReport;
          break;
      }
      return next;
    }

    case 'halted':
      return {
        ...state,
        phase: 'halted',
        halted: { reason: event.reason, guidance: event.guidance },
      };

    case 'run_complete':
      return {
        ...state,
        result: event.result,
        phase: state.phase === 'halted' ? 'halted' : 'complete',
      };

    case 'error':
      return { ...state, phase: 'error', error: event.message };

    default:
      return state;
  }
}

/**
 * Consumes the screening SSE stream.
 *
 * Reads the response body directly rather than using EventSource, because the
 * run is a POST carrying a multi-megabyte image. Events are applied as they
 * arrive so the UI advances stage by stage during the run.
 */
export function useScreeningRun() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ kind: 'reset' });
  }, []);

  const start = useCallback(async (file: File, patient: PatientContext) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ kind: 'start', preview: URL.createObjectURL(file) });

    const form = new FormData();
    form.append('image', file);
    form.append('patient', JSON.stringify(patient));

    let response: Response;
    try {
      response = await fetch('/api/screening', {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
    } catch {
      dispatch({ kind: 'error', message: 'Could not reach the screening service.' });
      return;
    }

    if (!response.ok || !response.body) {
      let message = 'The screening service rejected this image.';
      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        /* non-JSON error body — keep the default message */
      }
      dispatch({ kind: 'error', message });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line.
        let split = buffer.indexOf('\n\n');
        while (split !== -1) {
          const frame = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          const dataLine = frame
            .split('\n')
            .find((line) => line.startsWith('data: '));
          if (dataLine) {
            const payload = dataLine.slice(6).trim();
            if (payload && payload !== '{}') {
              try {
                dispatch({ kind: 'event', event: JSON.parse(payload) as PipelineEvent });
              } catch {
                /* a partial frame is impossible here — ignore defensively */
              }
            }
          }
          split = buffer.indexOf('\n\n');
        }
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        dispatch({ kind: 'error', message: 'The screening stream was interrupted.' });
      }
    }
  }, []);

  return { state, start, reset };
}
