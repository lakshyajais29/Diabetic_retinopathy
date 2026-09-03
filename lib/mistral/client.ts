import { Mistral } from '@mistralai/mistralai';
import type { ZodType } from 'zod';
import { getConfig } from '../config';

/**
 * Thin, defensive wrapper around the Mistral API.
 *
 * Two rules are enforced here and nowhere else:
 *   1. Nothing leaves this module unvalidated. Every call is parsed against a
 *      Zod schema; if the model returns prose, a partial object, or values out
 *      of range, that is an error, not something the UI renders.
 *   2. Failure is a first-class outcome. A thrown ModelUnavailableError tells
 *      the orchestrator to degrade that single stage to the deterministic
 *      engine rather than failing the whole screening.
 */

export class ModelUnavailableError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ModelUnavailableError';
    this.cause = cause;
  }
}

export class ModelContractError extends Error {
  readonly raw: string;
  constructor(message: string, raw: string) {
    super(message);
    this.name = 'ModelContractError';
    this.raw = raw;
  }
}

let client: Mistral | null = null;

function getClient(apiKey: string): Mistral {
  if (!client) client = new Mistral({ apiKey });
  return client;
}

export interface ModelRequest {
  system: string;
  user: string;
  /** Optional data URL — present for the stages that actually look at the image. */
  image?: string;
  temperature?: number;
  maxTokens?: number;
  /** Used only for error messages and the audit trail. */
  label: string;
}

/**
 * Extract a JSON object from a model response that may be wrapped in prose or
 * fenced code, then validate it against the stage's schema.
 */
export function parseModelJson<T>(raw: string, schema: ZodType<T>, label: string): T {
  let text = raw.trim();

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new ModelContractError(`${label}: no JSON object in model response`, raw);
  }
  text = text.slice(start, end + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // One repair pass for the two failure modes that actually occur in practice:
    // trailing commas and unquoted NaN/Infinity.
    const repaired = text
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/\b(NaN|Infinity|-Infinity)\b/g, 'null');
    try {
      parsed = JSON.parse(repaired);
    } catch {
      throw new ModelContractError(`${label}: model returned malformed JSON`, raw);
    }
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 4)
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ');
    throw new ModelContractError(`${label}: output failed schema validation — ${issues}`, raw);
  }
  return result.data;
}

export async function callModel<T>(req: ModelRequest, schema: ZodType<T>): Promise<T> {
  const config = getConfig();
  if (config.engine !== 'mistral' || !config.apiKey) {
    throw new ModelUnavailableError('Mistral engine is not configured');
  }

  const mistral = getClient(config.apiKey);
  const model = req.image ? config.visionModel : config.model;

  const content: Array<Record<string, unknown>> = [{ type: 'text', text: req.user }];
  if (req.image) content.push({ type: 'image_url', imageUrl: req.image });

  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await withTimeout(
        mistral.chat.complete({
          model,
          temperature: req.temperature ?? 0.15,
          maxTokens: req.maxTokens ?? 2400,
          responseFormat: { type: 'json_object' },
          messages: [
            { role: 'system', content: req.system },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { role: 'user', content: content as any },
          ],
        }),
        config.requestTimeoutMs,
        req.label,
      );

      const choice = response.choices?.[0]?.message?.content;
      const raw =
        typeof choice === 'string'
          ? choice
          : Array.isArray(choice)
            ? choice
                .map((c) => ('text' in c && typeof c.text === 'string' ? c.text : ''))
                .join('')
            : '';

      if (!raw) throw new ModelContractError(`${req.label}: empty model response`, '');

      return parseModelJson(raw, schema, req.label);
    } catch (err) {
      lastError = err;
      // A contract violation is worth one retry — models often self-correct when
      // asked again at a low temperature. Transport failures also retry.
      if (attempt === config.maxRetries) break;
      await sleep(350 * (attempt + 1));
    }
  }

  if (lastError instanceof ModelContractError) {
    throw new ModelUnavailableError(
      `${req.label}: model output did not satisfy the stage contract after ${config.maxRetries + 1} attempts`,
      lastError,
    );
  }
  throw new ModelUnavailableError(
    `${req.label}: Mistral API call failed — ${errorMessage(lastError)}`,
    lastError,
  );
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new ModelUnavailableError(`${label}: timed out after ${ms}ms`)),
      ms,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
