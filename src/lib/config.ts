import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  RECEIPT_SIGNING_SECRET: z.string().min(32),
  WEBHOOK_HMAC_SECRET: z.string().min(32),
  LOG_LEVEL: z.string().default('info'),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX: z.string().default('120'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3000')
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Missing or invalid environment configuration', parsed.error.format());
  process.exit(1);
}

export const config = {
  env: parsed.data.NODE_ENV,
  databaseUrl: parsed.data.DATABASE_URL,
  redisUrl: parsed.data.REDIS_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  receiptSigningSecret: parsed.data.RECEIPT_SIGNING_SECRET,
  webhookHmacSecret: parsed.data.WEBHOOK_HMAC_SECRET,
  logLevel: parsed.data.LOG_LEVEL,
  rateLimitWindowMs: Number(parsed.data.RATE_LIMIT_WINDOW_MS),
  rateLimitMax: Number(parsed.data.RATE_LIMIT_MAX),
  publicApiUrl: parsed.data.NEXT_PUBLIC_API_URL
};
