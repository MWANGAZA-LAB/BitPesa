import { z } from 'zod';

const databaseConfigSchema = z.object({
  url: z.string().url('Invalid database URL'),
  poolMin: z.number().int().min(1).default(2),
  poolMax: z.number().int().min(1).max(100).default(10),
  queryTimeout: z.number().int().min(1000).default(30000),
  migrationTimeout: z.number().int().min(1000).default(60000),
  ssl: z.boolean().default(false),
  sslCert: z.string().optional(),
  sslKey: z.string().optional(),
  sslCa: z.string().optional(),
});

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

export function createDatabaseConfig(): DatabaseConfig {
  const config = {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/bitpesa',
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2'),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10'),
    queryTimeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '30000'),
    migrationTimeout: parseInt(process.env.DATABASE_MIGRATION_TIMEOUT || '60000'),
    ssl: process.env.DATABASE_SSL === 'true',
    sslCert: process.env.DATABASE_SSL_CERT,
    sslKey: process.env.DATABASE_SSL_KEY,
    sslCa: process.env.DATABASE_SSL_CA,
  };

  return databaseConfigSchema.parse(config);
}

export const DATABASE_CONFIG = createDatabaseConfig();
