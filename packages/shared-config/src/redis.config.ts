import { z } from 'zod';

const redisConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().int().min(1).max(65535).default(6379),
  password: z.string().optional(),
  db: z.number().int().min(0).max(15).default(0),
  tlsEnabled: z.boolean().default(false),
  keyPrefix: z.string().default('bitpesa:'),
  defaultTtl: z.number().int().min(1).default(3600),
  sessionTtl: z.number().int().min(1).default(86400),
  rateLimitTtl: z.number().int().min(1).default(60),
  cacheTtl: z.number().int().min(1).default(300),
  maxRetriesPerRequest: z.number().int().min(1).default(3),
  retryDelayOnFailover: z.number().int().min(100).default(100),
  enableReadyCheck: z.boolean().default(true),
  maxRetriesPerRequest: z.number().int().min(1).default(3),
  lazyConnect: z.boolean().default(true),
});

export type RedisConfig = z.infer<typeof redisConfigSchema>;

export function createRedisConfig(): RedisConfig {
  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    tlsEnabled: process.env.REDIS_TLS_ENABLED === 'true',
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'bitpesa:',
    defaultTtl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600'),
    sessionTtl: parseInt(process.env.REDIS_SESSION_TTL || '86400'),
    rateLimitTtl: parseInt(process.env.REDIS_RATE_LIMIT_TTL || '60'),
    cacheTtl: parseInt(process.env.REDIS_CACHE_TTL || '300'),
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
    enableReadyCheck: process.env.REDIS_ENABLE_READY_CHECK !== 'false',
    lazyConnect: process.env.REDIS_LAZY_CONNECT !== 'false',
  };

  return redisConfigSchema.parse(config);
}

export const REDIS_CONFIG = createRedisConfig();
