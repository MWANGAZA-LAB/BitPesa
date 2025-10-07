import { z } from 'zod';

// Phone number validation for Kenya
export const kenyaPhoneSchema = z
  .string()
  .regex(/^(\+254|254|0)?[17]\d{8}$/, 'Invalid Kenyan phone number format');

// Email validation
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required');

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

// Amount validation
export const amountSchema = z
  .number()
  .positive('Amount must be positive')
  .finite('Amount must be a valid number');

// Bitcoin amount validation (in satoshis)
export const satoshiSchema = z
  .number()
  .int('Satoshi amount must be an integer')
  .min(1, 'Amount must be at least 1 satoshi')
  .max(2100000000000000, 'Amount exceeds maximum Bitcoin supply');

// KES amount validation
export const kesAmountSchema = z
  .number()
  .int('KES amount must be an integer')
  .min(1, 'Amount must be at least 1 KES')
  .max(10000000, 'Amount exceeds maximum limit');

// UUID validation
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

// Transaction type validation
export const transactionTypeSchema = z.enum([
  'DEPOSIT',
  'WITHDRAWAL',
  'SEND',
  'RECEIVE',
  'CONVERSION',
  'FEE',
  'REFUND',
]);

// Currency validation
export const currencySchema = z.enum(['BTC', 'SATS', 'KES']);

// Wallet type validation
export const walletTypeSchema = z.enum(['LIGHTNING', 'MPESA', 'ESCROW']);

// M-Pesa transaction type validation
export const mpesaTransactionTypeSchema = z.enum([
  'STK_PUSH',
  'B2C',
  'B2B',
  'C2B',
]);

// Pagination validation
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Date range validation
export const dateRangeSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
}).refine(
  (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
  {
    message: 'Start date must be before end date',
    path: ['startDate'],
  }
);

// Lightning invoice validation
export const lightningInvoiceSchema = z.object({
  userId: uuidSchema,
  amountSats: satoshiSchema,
  description: z.string().max(500).optional(),
  expiry: z.number().int().min(60).max(86400).default(3600), // 1 hour default
});

// M-Pesa STK Push validation
export const stkPushSchema = z.object({
  phoneNumber: kenyaPhoneSchema,
  amount: kesAmountSchema,
  accountReference: z.string().min(1).max(50),
  transactionDesc: z.string().min(1).max(100),
});

// B2C validation
export const b2cSchema = z.object({
  phoneNumber: kenyaPhoneSchema,
  amount: kesAmountSchema,
  accountReference: z.string().min(1).max(50),
  transactionDesc: z.string().min(1).max(100),
  occasion: z.string().max(100).optional(),
});

// BTC to M-Pesa transaction validation
export const btcToMpesaSchema = z.object({
  userId: uuidSchema,
  phoneNumber: kenyaPhoneSchema,
  amountKes: kesAmountSchema,
  description: z.string().max(500).optional(),
});

// Exchange rate validation
export const exchangeRateSchema = z.object({
  fromCurrency: currencySchema,
  toCurrency: currencySchema,
  rate: z.number().positive('Exchange rate must be positive'),
  source: z.string().min(1),
  spread: z.number().min(0).max(1).default(0.025),
});

// Wallet creation validation
export const createWalletSchema = z.object({
  userId: uuidSchema,
  type: walletTypeSchema,
  currency: currencySchema,
});

// User profile validation
export const userProfileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phoneNumber: kenyaPhoneSchema,
  email: emailSchema,
  dateOfBirth: z.date().optional(),
  nationality: z.string().max(50).optional(),
  idNumber: z.string().max(50).optional(),
});

// KYC verification validation
export const kycVerificationSchema = z.object({
  userId: uuidSchema,
  level: z.enum(['BASIC', 'INTERMEDIATE', 'FULL']),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
});

// Transaction filter validation
export const transactionFilterSchema = z.object({
  userId: uuidSchema.optional(),
  walletId: uuidSchema.optional(),
  type: transactionTypeSchema.optional(),
  status: z.enum([
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'REFUNDED',
  ]).optional(),
  fromCurrency: currencySchema.optional(),
  toCurrency: currencySchema.optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});