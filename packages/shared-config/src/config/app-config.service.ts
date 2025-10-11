/**
 * Configuration service for managing environment variables and application settings
 * Provides type-safe access to configuration values with validation
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { 
  SERVICE_PORTS, 
  ENVIRONMENT_CONSTANTS, 
  DATABASE_CONSTANTS,
  API_CONSTANTS,
  SECURITY_CONSTANTS,
  MPESA_CONSTANTS,
  MINMO_CONSTANTS,
  NOTIFICATION_CONSTANTS,
  LOGGING_CONSTANTS
} from '../constants/app.constants';

export interface AppDatabaseConfig {
  url: string;
  maxConnections: number;
  minConnections: number;
  connectionTimeoutMs: number;
  queryTimeoutMs: number;
  transactionTimeoutMs: number;
}

export interface ApiConfig {
  baseUrl: string;
  webBaseUrl: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  requestTimeoutMs: number;
  webhookTimeoutMs: number;
  defaultPageSize: number;
  maxPageSize: number;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpirationTime: string;
  jwtRefreshExpirationTime: string;
  encryptionKey: string;
  sessionTimeoutMs: number;
  maxLoginAttempts: number;
  lockoutDurationMs: number;
}

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  businessShortCode: string;
  passkey: string;
  callbackUrl: string;
  timeoutMs: number;
  stkPushTimeoutMs: number;
  b2cTimeoutMs: number;
  maxRetryAttempts: number;
  retryDelayMs: number;
}

export interface MinmoConfig {
  apiUrl: string;
  apiKey: string;
  webhookSecret: string;
  timeoutMs: number;
  webhookTimeoutMs: number;
  maxRetryAttempts: number;
  retryDelayMs: number;
}

export interface NotificationConfig {
  africasTalkingApiKey: string;
  africasTalkingUsername: string;
  smsTimeoutMs: number;
  emailTimeoutMs: number;
  maxRetryAttempts: number;
  retryDelayMs: number;
  maxNotificationsPerMinute: number;
  maxNotificationsPerHour: number;
}

export interface LoggingConfig {
  level: string;
  format: string;
  maxLogSize: string;
  maxLogFiles: number;
  logRetentionDays: number;
}

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  constructor(private readonly configService: NestConfigService) {
    this.validateRequiredEnvironmentVariables();
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig(): AppDatabaseConfig {
    return {
      url: this.configService.get<string>('DATABASE_URL', ENVIRONMENT_CONSTANTS.DEFAULTS.DATABASE_URL),
      maxConnections: DATABASE_CONSTANTS.MAX_CONNECTIONS,
      minConnections: DATABASE_CONSTANTS.MIN_CONNECTIONS,
      connectionTimeoutMs: DATABASE_CONSTANTS.CONNECTION_TIMEOUT_MS,
      queryTimeoutMs: DATABASE_CONSTANTS.QUERY_TIMEOUT_MS,
      transactionTimeoutMs: DATABASE_CONSTANTS.TRANSACTION_TIMEOUT_MS,
    };
  }

  /**
   * Get API configuration
   */
  getApiConfig(): ApiConfig {
    return {
      baseUrl: this.getRequiredEnvVar('API_BASE_URL'),
      webBaseUrl: this.getRequiredEnvVar('WEB_BASE_URL'),
      rateLimitWindowMs: API_CONSTANTS.RATE_LIMIT_WINDOW_MS,
      rateLimitMaxRequests: API_CONSTANTS.RATE_LIMIT_MAX_REQUESTS,
      requestTimeoutMs: API_CONSTANTS.REQUEST_TIMEOUT_MS,
      webhookTimeoutMs: API_CONSTANTS.WEBHOOK_TIMEOUT_MS,
      defaultPageSize: API_CONSTANTS.DEFAULT_PAGE_SIZE,
      maxPageSize: API_CONSTANTS.MAX_PAGE_SIZE,
    };
  }

  /**
   * Get security configuration
   */
  getSecurityConfig(): SecurityConfig {
    return {
      jwtSecret: this.getRequiredEnvVar('JWT_SECRET'),
      jwtExpirationTime: SECURITY_CONSTANTS.JWT_EXPIRATION_TIME,
      jwtRefreshExpirationTime: SECURITY_CONSTANTS.JWT_REFRESH_EXPIRATION_TIME,
      encryptionKey: this.getRequiredEnvVar('ENCRYPTION_KEY'),
      sessionTimeoutMs: SECURITY_CONSTANTS.SESSION_TIMEOUT_MS,
      maxLoginAttempts: SECURITY_CONSTANTS.MAX_LOGIN_ATTEMPTS,
      lockoutDurationMs: SECURITY_CONSTANTS.LOCKOUT_DURATION_MS,
    };
  }

  /**
   * Get M-Pesa configuration
   */
  getMpesaConfig(): MpesaConfig {
    return {
      consumerKey: this.getRequiredEnvVar('DARAJA_CONSUMER_KEY'),
      consumerSecret: this.getRequiredEnvVar('DARAJA_CONSUMER_SECRET'),
      businessShortCode: this.getRequiredEnvVar('DARAJA_BUSINESS_SHORT_CODE'),
      passkey: this.getRequiredEnvVar('DARAJA_PASSKEY'),
      callbackUrl: this.getRequiredEnvVar('DARAJA_CALLBACK_URL'),
      timeoutMs: MPESA_CONSTANTS.CALLBACK_TIMEOUT_MS,
      stkPushTimeoutMs: MPESA_CONSTANTS.STK_PUSH_TIMEOUT_MS,
      b2cTimeoutMs: MPESA_CONSTANTS.B2C_TIMEOUT_MS,
      maxRetryAttempts: MPESA_CONSTANTS.MAX_RETRY_ATTEMPTS,
      retryDelayMs: MPESA_CONSTANTS.RETRY_DELAY_MS,
    };
  }

  /**
   * Get MinMo configuration
   */
  getMinmoConfig(): MinmoConfig {
    return {
      apiUrl: this.getRequiredEnvVar('MINMO_API_URL'),
      apiKey: this.getRequiredEnvVar('MINMO_API_KEY'),
      webhookSecret: this.getRequiredEnvVar('MINMO_WEBHOOK_SECRET'),
      timeoutMs: MINMO_CONSTANTS.API_TIMEOUT_MS,
      webhookTimeoutMs: MINMO_CONSTANTS.WEBHOOK_TIMEOUT_MS,
      maxRetryAttempts: MINMO_CONSTANTS.MAX_RETRY_ATTEMPTS,
      retryDelayMs: MINMO_CONSTANTS.RETRY_DELAY_MS,
    };
  }

  /**
   * Get notification configuration
   */
  getNotificationConfig(): NotificationConfig {
    return {
      africasTalkingApiKey: this.getRequiredEnvVar('AFRICAS_TALKING_API_KEY'),
      africasTalkingUsername: this.getRequiredEnvVar('AFRICAS_TALKING_USERNAME'),
      smsTimeoutMs: NOTIFICATION_CONSTANTS.SMS_TIMEOUT_MS,
      emailTimeoutMs: NOTIFICATION_CONSTANTS.EMAIL_TIMEOUT_MS,
      maxRetryAttempts: NOTIFICATION_CONSTANTS.MAX_RETRY_ATTEMPTS,
      retryDelayMs: NOTIFICATION_CONSTANTS.RETRY_DELAY_MS,
      maxNotificationsPerMinute: NOTIFICATION_CONSTANTS.MAX_NOTIFICATIONS_PER_MINUTE,
      maxNotificationsPerHour: NOTIFICATION_CONSTANTS.MAX_NOTIFICATIONS_PER_HOUR,
    };
  }

  /**
   * Get logging configuration
   */
  getLoggingConfig(): LoggingConfig {
    return {
      level: this.configService.get<string>('LOG_LEVEL', LOGGING_CONSTANTS.LOG_LEVELS.INFO),
      format: this.configService.get<string>('LOG_FORMAT', LOGGING_CONSTANTS.LOG_FORMATS.JSON),
      maxLogSize: LOGGING_CONSTANTS.MAX_LOG_SIZE,
      maxLogFiles: LOGGING_CONSTANTS.MAX_LOG_FILES,
      logRetentionDays: LOGGING_CONSTANTS.LOG_RETENTION_DAYS,
    };
  }

  /**
   * Get service port by service name
   */
  getServicePort(serviceName: keyof typeof SERVICE_PORTS): number {
    return SERVICE_PORTS[serviceName];
  }

  /**
   * Get environment name
   */
  getEnvironment(): string {
    return this.configService.get<string>('NODE_ENV', ENVIRONMENT_CONSTANTS.DEFAULTS.NODE_ENV);
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.getEnvironment() === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return this.getEnvironment() === 'development';
  }

  /**
   * Check if running in test environment
   */
  isTest(): boolean {
    return this.getEnvironment() === 'test';
  }

  /**
   * Get required environment variable with validation
   */
  private getRequiredEnvVar(key: string): string {
    const value = this.configService.get<string>(key);
    
    if (!value || value === `your_${key.toLowerCase()}_here`) {
      throw new Error(`Required environment variable ${key} is not set or has default value`);
    }
    
    return value as string;
  }

  /**
   * Validate all required environment variables
   */
  private validateRequiredEnvironmentVariables(): void {
    const missingVars: string[] = [];
    
    for (const varName of ENVIRONMENT_CONSTANTS.REQUIRED_VARS) {
      const value = this.configService.get<string>(varName);
      
      if (!value || value === `your_${varName.toLowerCase()}_here`) {
        missingVars.push(varName);
      }
    }
    
    if (missingVars.length > 0) {
      const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    this.logger.log('All required environment variables are properly configured');
  }

  /**
   * Get all configuration as a single object
   */
  getAllConfig() {
    return {
      database: this.getDatabaseConfig(),
      api: this.getApiConfig(),
      security: this.getSecurityConfig(),
      mpesa: this.getMpesaConfig(),
      minmo: this.getMinmoConfig(),
      notification: this.getNotificationConfig(),
      logging: this.getLoggingConfig(),
      environment: this.getEnvironment(),
      ports: SERVICE_PORTS,
    };
  }
}
