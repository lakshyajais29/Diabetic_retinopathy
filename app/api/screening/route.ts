import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runPipeline } from '@/lib/pipeline/orchestrator';
import type { PatientContext } from '@/lib/pipeline/types';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const MAX_BYTES = 20 * 1024 * 1024;

const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/bmp']);

const patientSchema = z.object({
  patientId: z.string().max(64).default(''),
  age: z.string().max(8).default(''),
  sex: z.enum(['male', 'female', 'other', 'unstated']).default('unstated'),
  diabetesDurationYears: z.string().max(8).default(''),
  eye: z.enum(['right', 'left', 'unstated']).default('unstated'),
  phc: z.string().max(120).default(''),
  operator: z.string().max(120).default(''),
  notes: z.string().max(600).default(''),
});

/**
 * Server-Sent Events endpoint for a screening run.
 *
 * One HTTP request carries the whole seven-stage pipeline. Each stage's start,
 * progress and structured output is flushed as it happens, so the client renders
 * the reasoning as it unfolds instead of waiting on a single verdict.
 */
export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected a multipart form upload.' }, { status: 400 });
  }

  const file = form.get('image');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No fundus image was supplied.' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image exceeds the ${MAX_BYTES / (1024 * 1024)}MB limit.` },
      { status: 413 },
    );
  }
  if (file.type && !ACCEPTED.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported image type "${file.type}". Use JPEG, PNG, WebP or TIFF.` },
      { status: 415 },
    );
  }

  let patient: PatientContext;
  try {
    const raw = form.get('patient');
    patient = patientSchema.parse(typeof raw === 'string' && raw ? JSON.parse(raw) : {});
  } catch {
    return NextResponse.json({ error: 'Patient context was malformed.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        for await (const event of runPipeline(buffer, patient)) {
          send(event);
        }
      } catch (err) {
        send({
          type: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'The screening pipeline failed while processing this image.',
        });
      } finally {
        controller.enqueue(encoder.encode('event: end\ndata: {}\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
