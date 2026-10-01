import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('3000'),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  MAPBOX_ACCESS_TOKEN: z.string().optional(),
  NOMINATIM_BASE_URL: z.string().default('https://nominatim.openstreetmap.org'),
  NOMINATIM_USER_AGENT: z.string().default('AddressFlow/0.1.0 (https://addressflow.dev)'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform((v) => parseInt(v, 10)).default('120'),
  RATE_LIMIT_WINDOW_SECONDS: z.string().transform((v) => parseInt(v, 10)).default('60'),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
