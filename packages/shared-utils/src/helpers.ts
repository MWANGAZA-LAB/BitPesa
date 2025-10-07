import { Currency } from '@bitpesa/shared-types';
import { CURRENCY_CONFIG, KENYA_PHONE_REGEX } from './constants';

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Validate Kenyan phone number
 */
export function isValidKenyaPhone(phone: string): boolean {
  return KENYA_PHONE_REGEX.test(phone);
}

/**
 * Normalize Kenyan phone number to +254 format
 */
export function normalizeKenyaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.startsWith('254')) {
    return `+${digits}`;
  } else if (digits.startsWith('0')) {
    return `+254${digits.substring(1)}`;
  } else if (digits.length === 9) {
    return `+254${digits}`;
  }
  
  throw new Error('Invalid phone number format');
}

/**
 * Convert between currency units
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rate: number
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  // Convert to base unit (sats for BTC, smallest unit for others)
  let baseAmount: number;
  
  switch (fromCurrency) {
    case Currency.BTC:
      baseAmount = amount * 100000000; // BTC to sats
      break;
    case Currency.SATS:
      baseAmount = amount;
      break;
    case Currency.KES:
      baseAmount = amount * 100; // KES to cents
      break;
    default:
      throw new Error(`Unsupported currency: ${fromCurrency}`);
  }
  
  // Convert to target currency
  let convertedAmount: number;
  
  switch (toCurrency) {
    case Currency.BTC:
      convertedAmount = (baseAmount * rate) / 100000000; // sats to BTC
      break;
    case Currency.SATS:
      convertedAmount = baseAmount * rate;
      break;
    case Currency.KES:
      convertedAmount = (baseAmount * rate) / 100; // cents to KES
      break;
    default:
      throw new Error(`Unsupported currency: ${toCurrency}`);
  }
  
  return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate fee amount
 */
export function calculateFee(amount: number, feePercentage: number, minFee: number = 0, maxFee: number = Infinity): number {
  const fee = amount * feePercentage;
  return Math.max(minFee, Math.min(fee, maxFee));
}

/**
 * Calculate net amount after fees
 */
export function calculateNetAmount(amount: number, fee: number): number {
  return Math.max(0, amount - fee);
}

/**
 * Validate amount against currency limits
 */
export function validateAmount(amount: number, currency: Currency): { valid: boolean; error?: string } {
  const config = CURRENCY_CONFIG[currency];
  
  if (amount < config.minAmount) {
    return {
      valid: false,
      error: `Amount must be at least ${config.minAmount} ${currency}`,
    };
  }
  
  if (amount > config.maxAmount) {
    return {
      valid: false,
      error: `Amount exceeds maximum limit of ${config.maxAmount} ${currency}`,
    };
  }
  
  return { valid: true };
}

/**
 * Generate payment hash
 */
export function generatePaymentHash(): string {
  const chars = 'abcdef0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate account reference
 */
export function generateAccountReference(prefix: string = 'BP'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}${random}`.toUpperCase();
}

/**
 * Check if date is expired
 */
export function isExpired(date: Date): boolean {
  return new Date() > date;
}

/**
 * Get time until expiry
 */
export function getTimeUntilExpiry(date: Date): number {
  return Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * Sanitize string for logging (remove sensitive data)
 */
export function sanitizeForLogging(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sensitiveKeys = [
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
  ];
  
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }
  
  return sanitized;
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check if value is empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to kebab-case
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to camelCase
 */
export function camelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}
