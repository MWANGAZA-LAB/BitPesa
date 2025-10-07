import { Currency, WalletType, WalletStatus } from './common.types';

export interface Wallet {
  id: string;
  userId: string;
  type: WalletType;
  currency: Currency;
  balance: number;
  reservedBalance: number;
  status: WalletStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWalletDto {
  userId: string;
  type: WalletType;
  currency: Currency;
}

export interface UpdateWalletDto {
  balance?: number;
  reservedBalance?: number;
  status?: WalletStatus;
}

export interface WalletBalance {
  walletId: string;
  available: number;
  reserved: number;
  total: number;
  currency: Currency;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  balance: number;
  description?: string;
  createdAt: Date;
}

export interface HotWalletConfig {
  maxBalance: number;
  minBalance: number;
  rebalanceThreshold: number;
  maxChannels: number;
}

export interface ColdStorageConfig {
  multiSigThreshold: number;
  signers: string[];
  backupLocations: string[];
}