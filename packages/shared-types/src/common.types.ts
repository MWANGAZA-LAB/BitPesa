export enum Currency {
  BTC = 'BTC',
  SATS = 'SATS',
  KES = 'KES',
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  SEND = 'SEND',
  RECEIVE = 'RECEIVE',
  CONVERSION = 'CONVERSION',
  FEE = 'FEE',
  REFUND = 'REFUND',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum WalletType {
  LIGHTNING = 'LIGHTNING',
  MPESA = 'MPESA',
  ESCROW = 'ESCROW',
}

export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED',
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  IN_FLIGHT = 'IN_FLIGHT',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export enum MpesaTransactionType {
  STK_PUSH = 'STK_PUSH',
  B2C = 'B2C',
  B2B = 'B2B',
  C2B = 'C2B',
}

export enum MpesaStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ExchangeRate {
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
  source: string;
  spread: number;
  finalRate: number;
  validFrom: Date;
  validUntil: Date;
}

export interface Quote {
  id: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: number;
  toAmount: number;
  rate: number;
  expiresAt: Date;
  createdAt: Date;
}