import { z } from 'zod';

const logLevelSchema = z.enum(['error', 'warn', 'info', 'debug', 'verbose']);

const loggerConfigSchema = z.object({
  level: logLevelSchema.default('info'),
  format: z.enum(['json', 'simple', 'combined']).default('json'),
  enableConsole: z.boolean().default(true),
  enableFile: z.boolean().default(false),
  logFile: z.string().optional(),
  maxFileSize: z.string().default('20m'),
  maxFiles: z.number().int().min(1).default(5),
  enableTimestamp: z.boolean().default(true),
  enableColorize: z.boolean().default(false),
  enablePrettyPrint: z.boolean().default(false),
  enableSentry: z.boolean().default(false),
  sentryDsn: z.string().optional(),
  enableRequestLogging: z.boolean().default(true),
  enableErrorLogging: z.boolean().default(true),
  enablePerformanceLogging: z.boolean().default(false),
  redactSensitiveData: z.boolean().default(true),
  sensitiveFields: z.array(z.string()).default([
    'password',
    'token',
    'secret',
    'key',
    'privateKey',
    'macaroon',
    'cert',
    'pin',
    'otp',
    'ssn',
    'cardNumber',
  ]),
});

export type LoggerConfig = z.infer<typeof loggerConfigSchema>;

export function createLoggerConfig(): LoggerConfig {
  const config = {
    level: (process.env.LOG_LEVEL as any) || 'info',
    format: (process.env.LOG_FORMAT as any) || 'json',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    enableFile: process.env.LOG_ENABLE_FILE === 'true',
    logFile: process.env.LOG_FILE,
    maxFileSize: process.env.LOG_MAX_FILE_SIZE || '20m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
    enableTimestamp: process.env.LOG_ENABLE_TIMESTAMP !== 'false',
    enableColorize: process.env.LOG_ENABLE_COLORIZE === 'true',
    enablePrettyPrint: process.env.LOG_ENABLE_PRETTY_PRINT === 'true',
    enableSentry: process.env.LOG_ENABLE_SENTRY === 'true',
    sentryDsn: process.env.SENTRY_DSN,
    enableRequestLogging: process.env.LOG_ENABLE_REQUEST !== 'false',
    enableErrorLogging: process.env.LOG_ENABLE_ERROR !== 'false',
    enablePerformanceLogging: process.env.LOG_ENABLE_PERFORMANCE === 'true',
    redactSensitiveData: process.env.LOG_REDACT_SENSITIVE !== 'false',
    sensitiveFields: process.env.LOG_SENSITIVE_FIELDS
      ? process.env.LOG_SENSITIVE_FIELDS.split(',')
      : [
          'password',
          'token',
          'secret',
          'key',
          'privateKey',
          'macaroon',
          'cert',
          'pin',
          'otp',
          'ssn',
          'cardNumber',
        ],
  };

  return loggerConfigSchema.parse(config);
}

export const LOGGER_CONFIG = createLoggerConfig();
