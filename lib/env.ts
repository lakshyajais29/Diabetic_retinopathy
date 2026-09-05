import { z } from 'zod';

const envSchema = z.object({
  // Server-only Secrets
  MISTRAL_API_KEY: z.string().optional(),
  MISTRAL_MODEL: z.string().default('mistral-medium-latest'),
  MISTRAL_VISION_MODEL: z.string().default('mistral-medium-latest'),
  MISTRAL_TIMEOUT_MS: z.coerce.number().default(60000),
  MISTRAL_MAX_RETRIES: z.coerce.number().default(2),
  
  DATABASE_URL: z.string().optional(),
  NEXTAUTH_SECRET: z.string().default('retina-setu-super-secret-key-production-change-me'),
  NEXTAUTH_URL: z.string().optional(),
  
  S3_BUCKET_NAME: z.string().optional(),
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  RETINASETU_ENGINE: z.enum(['mistral', 'deterministic']).optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const env = envSchema.parse(process.env);
