import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runPipeline } from '@/lib/pipeline/orchestrator';
import type { PatientContext } from '@/lib/pipeline/types';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/bmp']);

const patientSchema = z.object({
  patientId: z.string().max(64).default(''),
  name: z.string().optional(),
  age: z.string().max(8).default(''),
  sex: z.enum(['male', 'female', 'other', 'unstated']).default('unstated'),
  diabetesDurationYears: z.string().max(8).default(''),
  eye: z.enum(['right', 'left', 'unstated']).default('unstated'),
  phc: z.string().max(120).default(''),
  operator: z.string().max(120).default(''),
  notes: z.string().max(600).default(''),
});

/**
 * GET: Fetch screening history records from PostgreSQL or memory fallback.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');

    if (process.env.DATABASE_URL) {
      try {
        const records = await db.screeningRecord.findMany({
          where: {
            AND: [
              patientId ? { patientId } : {},
              status ? { status: status as unknown as import('@prisma/client').ScreeningStatus } : {},
            ],
          },
          include: {
            patient: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
          success: true,
          data: records.map((r: { id: string; patient: { patientId: string; name: string; age: number; gender: string }; createdAt: Date; qualityVerdict: string; qualityScore: number; icdrGrade: number; gradeLabel: string; referralRequired: boolean; referralUrgency: string; confidenceScore: number; status: string; doctorNotes?: string | null; reviewedAt?: Date | null; lesionSummary: string; rawImageUrl?: string | null }) => ({
            id: r.id,
            patientId: r.patient.patientId,
            patientName: r.patient.name,
            patientAge: r.patient.age,
            gender: r.patient.gender,
            timestamp: r.createdAt.toISOString(),
            qualityVerdict: r.qualityVerdict,
            qualityScore: r.qualityScore,
            icdrGrade: r.icdrGrade,
            gradeLabel: r.gradeLabel,
            referralRequired: r.referralRequired,
            referralUrgency: r.referralUrgency,
            confidenceScore: r.confidenceScore,
            status: r.status,
            doctorNotes: r.doctorNotes || undefined,
            reviewedAt: r.reviewedAt?.toISOString() || undefined,
            lesionSummary: r.lesionSummary,
            imageDataUrl: r.rawImageUrl || undefined,
          })),
        });
      } catch (dbErr) {
        console.warn('Database query failed for screening GET:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'No DATABASE_URL provided. Fallback to client storage mode.',
      data: [],
    });
  } catch (err) {
    console.error('Fetch screening records error:', err);
    return NextResponse.json({ error: 'Failed to fetch screening records' }, { status: 500 });
  }
}

/**
 * PATCH: Update screening record status / Doctor notes
 */
export async function PATCH(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { recordId, status, doctorNotes } = body;

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      try {
        const updated = await db.screeningRecord.update({
          where: { id: recordId },
          data: {
            status: status || undefined,
            doctorNotes: doctorNotes || undefined,
            reviewedAt: new Date(),
          },
        });

        return NextResponse.json({ success: true, data: updated });
      } catch (dbErr) {
        console.warn('Failed to update screening record in DB:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Status updated locally',
      recordId,
      status,
      doctorNotes,
    });
  } catch (err) {
    console.error('Update screening record error:', err);
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

/**
 * Server-Sent Events endpoint for a screening run.
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
