import type { EngineKind } from './pipeline/types';

/**
 * Runtime configuration.
 *
 * The platform is designed to run in two modes:
 *
 *  - `mistral`       — the reasoning stages are backed by the Mistral API.
 *  - `deterministic` — the reasoning stages fall back to an on-device engine
 *                      driven entirely by the classical vision measurements.
 *
 * The deterministic engine is not a stub for the demo's benefit: it is the
 * degradation path a real PHC deployment needs when the district's uplink is
 * down, and it is what keeps the product honest about which numbers came from
 * where.
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
  const apiKey = process.env.MISTRAL_API_KEY?.trim() || null;
  const forced = process.env.RETINASETU_ENGINE?.trim();

  const engine: EngineKind =
    forced === 'deterministic' ? 'deterministic' : apiKey ? 'mistral' : 'deterministic';

  return {
    engine,
    apiKey,
    model: process.env.MISTRAL_MODEL?.trim() || 'mistral-medium-latest',
    visionModel: process.env.MISTRAL_VISION_MODEL?.trim() || 'mistral-medium-latest',
    requestTimeoutMs: Number(process.env.MISTRAL_TIMEOUT_MS || 60_000),
    maxRetries: Number(process.env.MISTRAL_MAX_RETRIES || 2),
  };
}

export function engineLabel(engine: EngineKind): string {
  return engine === 'mistral' ? 'Mistral vision-language engine' : 'On-device deterministic engine';
}
