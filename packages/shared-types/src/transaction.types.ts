import { 
  TransactionType, 
  TransactionStatus, 
  Currency 
} from './common.types';
import { LightningInvoice, LightningPayment } from './lightning.types';
import { MpesaTransaction } from './mpesa.types';

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  type: TransactionType;
  status: TransactionStatus;
  fromCurrency: Currency;
  toCurrency?: Currency;
  fromAmount: number;
  toAmount?: number;
  exchangeRate?: number;
  feeAmount: number;
  netAmount: number;
  recipientPhone?: string;
  description?: string;
  metadata?: Record<string, any>;
  failureReason?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lightningInvoice?: LightningInvoice;
  lightningPayment?: LightningPayment;
  mpesaTransaction?: MpesaTransaction[];
}

export interface CreateTransactionDto {
  userId: string;
  walletId: string;
  type: TransactionType;
  fromCurrency: Currency;
  toCurrency?: Currency;
  fromAmount: number;
  toAmount?: number;
  recipientPhone?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface BtcToMpesaTransactionDto {
  userId: string;
  phoneNumber: string;
  amountKes: number;
  description?: string;
}

export interface TransactionState {
  transactionId: string;
  currentState: TransactionStatus;
  previousState?: TransactionStatus;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface TransactionEvent {
  transactionId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
  source: string;
}

export interface TransactionFilter {
  userId?: string;
  walletId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  fromCurrency?: Currency;
  toCurrency?: Currency;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalVolume: number;
  totalFees: number;
  successRate: number;
  averageAmount: number;
  currency: Currency;
  period: {
    start: Date;
    end: Date;
  };
}

export interface TransactionMetrics {
  dailyVolume: Array<{
    date: string;
    volume: number;
    count: number;
  }>;
  hourlyDistribution: Array<{
    hour: number;
    count: number;
  }>;
  statusDistribution: Array<{
    status: TransactionStatus;
    count: number;
    percentage: number;
  }>;
  typeDistribution: Array<{
    type: TransactionType;
    count: number;
    percentage: number;
  }>;
}