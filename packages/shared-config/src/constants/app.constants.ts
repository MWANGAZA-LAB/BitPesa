/**
 * Application-wide constants
 * Centralized configuration for magic numbers and hardcoded values
 */

// Transaction Configuration
export const TRANSACTION_CONSTANTS = {
  // Invoice expiration time (5 minutes in milliseconds)
  INVOICE_EXPIRATION_MS: 5 * 60 * 1000,
  
  // Fee calculation percentage (2.5%)
  FEE_PERCENTAGE: 0.025,
  
  // Minimum transaction amounts
  MIN_BTC_AMOUNT: 0.00001,
  MIN_KES_AMOUNT: 10,
  
  // Maximum transaction amounts
  MAX_BTC_AMOUNT: 1.0,
  MAX_KES_AMOUNT: 1000000,
  
  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  
  // Status update intervals
  STATUS_CHECK_INTERVAL_MS: 5000,
  WEBHOOK_TIMEOUT_MS: 30000,
} as const;

// Service Ports
export const SERVICE_PORTS = {
  WEB_APP: 3000,
  TRANSACTION_SERVICE: 3001,
  MPESA_SERVICE: 3002,
  MINMO_SERVICE: 3003,
  NOTIFICATION_SERVICE: 3004,
  RECEIPT_SERVICE: 3005,
  API_GATEWAY: 8000,
} as const;

// Database Configuration
export const DATABASE_CONSTANTS = {
  // Connection pool settings
  MAX_CONNECTIONS: 20,
  MIN_CONNECTIONS: 5,
  CONNECTION_TIMEOUT_MS: 30000,
  
  // Query timeouts
  QUERY_TIMEOUT_MS: 10000,
  TRANSACTION_TIMEOUT_MS: 60000,
  
  // Retry settings
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// API Configuration
export const API_CONSTANTS = {
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Request timeouts
  REQUEST_TIMEOUT_MS: 30000,
  WEBHOOK_TIMEOUT_MS: 10000,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Validation
  MAX_PHONE_NUMBER_LENGTH: 15,
  MIN_PHONE_NUMBER_LENGTH: 10,
  MAX_REFERENCE_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 200,
} as const;

// Security Configuration
export const SECURITY_CONSTANTS = {
  // JWT Configuration
  JWT_EXPIRATION_TIME: '24h',
  JWT_REFRESH_EXPIRATION_TIME: '7d',
  
  // Password requirements
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  
  // Session configuration
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  
  // Encryption
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  KEY_DERIVATION_ROUNDS: 100000,
} as const;

// M-Pesa Configuration
export const MPESA_CONSTANTS = {
  // Transaction types
  TRANSACTION_TYPES: {
    CUSTOMER_PAY_BILL_ONLINE: 'CustomerPayBillOnline',
    CUSTOMER_BUY_GOODS_ONLINE: 'CustomerBuyGoodsOnline',
  } as const,
  
  // Callback timeout
  CALLBACK_TIMEOUT_MS: 30000,
  
  // STK Push timeout
  STK_PUSH_TIMEOUT_MS: 60000,
  
  // B2C timeout
  B2C_TIMEOUT_MS: 30000,
  
  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
} as const;

// MinMo Configuration
export const MINMO_CONSTANTS = {
  // API endpoints
  ENDPOINTS: {
    CREATE_SWAP: '/swaps',
    GET_SWAP_STATUS: '/swaps',
    GET_EXCHANGE_RATE: '/rates/btc-kes',
    WEBHOOK: '/webhooks',
  } as const,
  
  // Timeout configurations
  API_TIMEOUT_MS: 30000,
  WEBHOOK_TIMEOUT_MS: 10000,
  
  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  
  // Status check intervals
  STATUS_CHECK_INTERVAL_MS: 5000,
  MAX_STATUS_CHECK_ATTEMPTS: 60, // 5 minutes total
} as const;

// Notification Configuration
export const NOTIFICATION_CONSTANTS = {
  // SMS Configuration
  SMS_TIMEOUT_MS: 10000,
  MAX_SMS_LENGTH: 160,
  
  // Email Configuration
  EMAIL_TIMEOUT_MS: 15000,
  MAX_EMAIL_SUBJECT_LENGTH: 100,
  MAX_EMAIL_BODY_LENGTH: 10000,
  
  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
  
  // Rate limiting
  MAX_NOTIFICATIONS_PER_MINUTE: 60,
  MAX_NOTIFICATIONS_PER_HOUR: 1000,
} as const;

// Docker Configuration
export const DOCKER_CONSTANTS = {
  // Health check intervals
  HEALTH_CHECK_INTERVAL_MS: 30000,
  HEALTH_CHECK_TIMEOUT_MS: 5000,
  HEALTH_CHECK_RETRIES: 3,
  
  // Container restart policy
  RESTART_POLICY: 'unless-stopped',
  
  // Resource limits
  MEMORY_LIMIT: '512m',
  CPU_LIMIT: '0.5',
} as const;

// Kubernetes Configuration
export const KUBERNETES_CONSTANTS = {
  // Namespace
  NAMESPACE: 'bitpesa-minmo',
  
  // Resource requests
  CPU_REQUEST: '100m',
  MEMORY_REQUEST: '256Mi',
  
  // Resource limits
  CPU_LIMIT: '500m',
  MEMORY_LIMIT: '512Mi',
  
  // Scaling configuration
  MIN_REPLICAS: 2,
  MAX_REPLICAS: 10,
  TARGET_CPU_UTILIZATION: 70,
  
  // Health check configuration
  LIVENESS_PROBE_INITIAL_DELAY: 30,
  READINESS_PROBE_INITIAL_DELAY: 5,
  PROBE_PERIOD_SECONDS: 10,
  PROBE_TIMEOUT_SECONDS: 5,
  PROBE_FAILURE_THRESHOLD: 3,
  PROBE_SUCCESS_THRESHOLD: 1,
} as const;

// Environment Configuration
export const ENVIRONMENT_CONSTANTS = {
  // Required environment variables
  REQUIRED_VARS: [
    'POSTGRES_PASSWORD',
    'MINMO_API_KEY',
    'MINMO_WEBHOOK_SECRET',
    'DARAJA_CONSUMER_KEY',
    'DARAJA_CONSUMER_SECRET',
    'DARAJA_BUSINESS_SHORT_CODE',
    'DARAJA_PASSKEY',
    'AFRICAS_TALKING_API_KEY',
    'AFRICAS_TALKING_USERNAME',
    'API_BASE_URL',
    'WEB_BASE_URL',
  ] as const,
  
  // Default values
  DEFAULTS: {
    NODE_ENV: 'development',
    PORT: 3000,
    LOG_LEVEL: 'info',
    DATABASE_URL: 'postgresql://postgres:password@localhost:5432/bitpesa',
  } as const,
} as const;

// Logging Configuration
export const LOGGING_CONSTANTS = {
  // Log levels
  LOG_LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
    VERBOSE: 'verbose',
  } as const,
  
  // Log formats
  LOG_FORMATS: {
    JSON: 'json',
    SIMPLE: 'simple',
    COMBINED: 'combined',
  } as const,
  
  // Log rotation
  MAX_LOG_SIZE: '10m',
  MAX_LOG_FILES: 5,
  LOG_RETENTION_DAYS: 30,
} as const;

// Error Codes
export const ERROR_CODES = {
  // Transaction errors
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  TRANSACTION_EXPIRED: 'TRANSACTION_EXPIRED',
  TRANSACTION_ALREADY_PROCESSED: 'TRANSACTION_ALREADY_PROCESSED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  
  // M-Pesa errors
  MPESA_REQUEST_FAILED: 'MPESA_REQUEST_FAILED',
  MPESA_CALLBACK_TIMEOUT: 'MPESA_CALLBACK_TIMEOUT',
  MPESA_INVALID_RESPONSE: 'MPESA_INVALID_RESPONSE',
  
  // MinMo errors
  MINMO_API_ERROR: 'MINMO_API_ERROR',
  MINMO_WEBHOOK_INVALID: 'MINMO_WEBHOOK_INVALID',
  MINMO_SWAP_FAILED: 'MINMO_SWAP_FAILED',
  
  // System errors
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
  EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;
