export const APP_CONFIG = {
  NAME: 'BitPesa Bridge',
  VERSION: '1.0.0',
  DESCRIPTION: 'Lightning-M-Pesa Bridge Platform',
} as const;

export const CURRENCY_CONFIG = {
  BTC: {
    symbol: 'BTC',
    decimals: 8,
    minAmount: 1, // 1 satoshi
    maxAmount: 2100000000000000, // Max Bitcoin supply in sats
  },
  SATS: {
    symbol: 'SATS',
    decimals: 0,
    minAmount: 1,
    maxAmount: 2100000000000000,
  },
  KES: {
    symbol: 'KES',
    decimals: 2,
    minAmount: 1,
    maxAmount: 10000000, // 10M KES limit
  },
} as const;

export const TRANSACTION_LIMITS = {
  DAILY_LIMIT_KES: 1000000, // 1M KES
  MAX_TRANSACTION_KES: 500000, // 500K KES
  MIN_TRANSACTION_KES: 10, // 10 KES
  WITHDRAWAL_LIMIT_KES: 500000, // 500K KES
} as const;

export const FEES = {
  BASE_FEE_PERCENTAGE: 0.025, // 2.5%
  LIGHTNING_FEE_SATS: 5, // 5 sats
  MPESA_FEE_PERCENTAGE: 0.01, // 1%
  MIN_FEE_KES: 1,
  MAX_FEE_KES: 1000,
} as const;

export const TIMEOUTS = {
  LIGHTNING_INVOICE_EXPIRY: 3600, // 1 hour
  MPESA_STK_PUSH_TIMEOUT: 30, // 30 seconds
  EXCHANGE_RATE_LOCK: 60, // 60 seconds
  TRANSACTION_TIMEOUT: 86400, // 24 hours
  API_REQUEST_TIMEOUT: 30000, // 30 seconds
} as const;

export const KENYA_PHONE_REGEX = /^(\+254|254|0)?[17]\d{8}$/;

export const MPESA_SHORTCODES = {
  SANDBOX: '174379',
  PRODUCTION: 'YOUR_PRODUCTION_SHORTCODE',
} as const;

export const LIGHTNING_NETWORK = {
  TESTNET: 'testnet',
  MAINNET: 'mainnet',
  DEFAULT_EXPIRY: 3600,
  MAX_INVOICE_AMOUNT: 4294967295, // Max 32-bit integer
} as const;

export const DATABASE_CONFIG = {
  CONNECTION_POOL_MIN: 2,
  CONNECTION_POOL_MAX: 10,
  QUERY_TIMEOUT: 30000,
  MIGRATION_TIMEOUT: 60000,
} as const;

export const REDIS_CONFIG = {
  DEFAULT_TTL: 3600, // 1 hour
  SESSION_TTL: 86400, // 24 hours
  RATE_LIMIT_TTL: 60, // 1 minute
  CACHE_TTL: 300, // 5 minutes
} as const;

export const API_ENDPOINTS = {
  LIGHTNING: {
    INVOICE: '/api/v1/lightning/invoice',
    PAYMENT: '/api/v1/lightning/pay',
    NODE_INFO: '/api/v1/lightning/node-info',
    CHANNELS: '/api/v1/lightning/channels',
  },
  MPESA: {
    SEND: '/api/v1/mpesa/send',
    STK_PUSH: '/api/v1/mpesa/stk-push',
    CALLBACK: '/api/v1/mpesa/callback',
  },
  CONVERSION: {
    RATES: '/api/v1/conversion/rates',
    QUOTE: '/api/v1/conversion/quote',
    EXECUTE: '/api/v1/conversion/execute',
  },
  TRANSACTION: {
    LIST: '/api/v1/transactions',
    CREATE: '/api/v1/transactions/btc-to-mpesa',
    CANCEL: '/api/v1/transactions/cancel',
  },
  WALLET: {
    LIST: '/api/v1/wallets',
    BALANCE: '/api/v1/wallets/:id/balance',
    TRANSACTIONS: '/api/v1/wallets/:id/transactions',
  },
} as const;

export const ERROR_CODES = {
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_PHONE: 'INVALID_PHONE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  LIGHTNING_ERROR: 'LIGHTNING_ERROR',
  MPESA_ERROR: 'MPESA_ERROR',
  RATE_EXPIRED: 'RATE_EXPIRED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const SUCCESS_MESSAGES = {
  TRANSACTION_CREATED: 'Transaction created successfully',
  TRANSACTION_COMPLETED: 'Transaction completed successfully',
  INVOICE_GENERATED: 'Lightning invoice generated',
  PAYMENT_SENT: 'Payment sent successfully',
  MPESA_SENT: 'M-Pesa payment sent successfully',
  RATE_LOCKED: 'Exchange rate locked',
  WALLET_CREATED: 'Wallet created successfully',
  BALANCE_UPDATED: 'Balance updated successfully',
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid Kenyan phone number',
  INVALID_AMOUNT: 'Please enter a valid amount',
  AMOUNT_TOO_LOW: 'Amount is too low',
  AMOUNT_TOO_HIGH: 'Amount exceeds maximum limit',
  INVALID_CURRENCY: 'Invalid currency',
  INVALID_WALLET_TYPE: 'Invalid wallet type',
  INVALID_TRANSACTION_TYPE: 'Invalid transaction type',
  INVALID_STATUS: 'Invalid status',
} as const;
