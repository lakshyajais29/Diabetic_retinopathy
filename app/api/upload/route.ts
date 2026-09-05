import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, imageDataUrl } = body;

    if (!fileName && !imageDataUrl) {
      return NextResponse.json(
        { success: false, error: 'File name or image data URL is required' },
        { status: 400 }
      );
    }

    // If AWS S3 credentials are configured:
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET_NAME) {
      // Return presigned S3 upload configuration
      const objectKey = `retinal-scans/${Date.now()}-${fileName || 'scan.jpg'}`;
      const s3Url = `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${objectKey}`;

      return NextResponse.json({
        success: true,
        provider: 's3',
        uploadUrl: s3Url, // Presigned PUT URL in real production setup
        publicUrl: s3Url,
      });
    }

    // In local / development mode without AWS credentials, return structured data URL payload
    return NextResponse.json({
      success: true,
      provider: 'local',
      publicUrl: imageDataUrl || `/sample-scans/${fileName || 'default.png'}`,
    });
  } catch (err) {
    console.error('Upload API error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to process image upload URL' },
      { status: 500 }
    );
  }
}
