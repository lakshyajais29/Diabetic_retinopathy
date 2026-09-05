import type { EngineKind } from './pipeline/types';
import { env } from './env';

/**
 * Runtime configuration.
 *
 * The platform is designed to run in two modes:
 *  - `mistral`       — the reasoning stages are backed by the Mistral API.
 *  - `deterministic` — the reasoning stages fall back to an on-device engine.
 */

export interface AppConfig {
  engine: EngineKind;
  apiKey: string | null;
  model: string;
  visionModel: string;
  requestTimeoutMs: number;
  maxRetries: number;
}

export function getConfig(): AppConfig {
  const apiKey = env.MISTRAL_API_KEY?.trim() || null;
  const forced = env.RETINASETU_ENGINE;

  const engine: EngineKind =
    forced === 'deterministic' ? 'deterministic' : apiKey ? 'mistral' : 'deterministic';

  return {
    engine,
    apiKey,
    model: env.MISTRAL_MODEL,
    visionModel: env.MISTRAL_VISION_MODEL,
    requestTimeoutMs: env.MISTRAL_TIMEOUT_MS,
    maxRetries: env.MISTRAL_MAX_RETRIES,
  };
}

export function engineLabel(engine: EngineKind): string {
  return engine === 'mistral' ? 'Mistral vision-language engine' : 'On-device deterministic engine';
}
