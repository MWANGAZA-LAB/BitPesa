import { InvoiceStatus, PaymentStatus } from './common.types';

export interface LightningInvoice {
  id: string;
  userId?: string;
  paymentHash: string;
  paymentRequest: string;
  amountSats: number;
  amountKes?: number;
  description?: string;
  status: InvoiceStatus;
  expiresAt: Date;
  settledAt?: Date;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LightningPayment {
  id: string;
  userId: string;
  paymentHash: string;
  paymentRequest: string;
  amountSats: number;
  feeSats: number;
  status: PaymentStatus;
  failureReason?: string;
  settledAt?: Date;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvoiceDto {
  userId: string;
  amountSats: number;
  description?: string;
  expiry?: number; // seconds
}

export interface CreatePaymentDto {
  userId: string;
  paymentRequest: string;
  amountSats?: number;
  feeLimitSats?: number;
}

export interface LightningNodeInfo {
  identityPubkey: string;
  alias: string;
  numPeers: number;
  numChannels: number;
  numActiveChannels: number;
  blockHeight: number;
  blockHash: string;
  syncedToChain: boolean;
  testnet: boolean;
  chains: string[];
  uris: string[];
  bestHeaderTimestamp: number;
  version: string;
  commitHash: string;
}

export interface LightningChannel {
  channelId: string;
  chanPoint: string;
  capacity: number;
  localBalance: number;
  remoteBalance: number;
  commitFee: number;
  commitWeight: number;
  feePerKw: number;
  unsettledBalance: number;
  totalSatoshisSent: number;
  totalSatoshisReceived: number;
  numUpdates: number;
  active: boolean;
  private: boolean;
  initiator: boolean;
  chanStatusFlags: string;
  localChanReserveSat: number;
  remoteChanReserveSat: number;
  staticRemoteKey: boolean;
  commitmentType: string;
  lifetime: number;
  uptime: number;
  closeAddress: string;
  pushAmountSat: number;
  thawHeight: number;
  localConstraints: any;
  remoteConstraints: any;
  aliasScids: string[];
  zeroConfConfirmedScid: string;
  peerAlias: string;
  peerScidAlias: string;
  mempoolSpace: string;
  mempoolUpdate: string;
}

export interface LightningRoute {
  totalTimeLock: number;
  totalFees: number;
  totalAmt: number;
  hops: LightningHop[];
  totalFeesMsat: number;
  totalAmtMsat: number;
}

export interface LightningHop {
  chanId: string;
  chanCapacity: number;
  amtToForward: number;
  fee: number;
  expiry: number;
  amtToForwardMsat: number;
  feeMsat: number;
  pubKey: string;
  tlvPayload: boolean;
  mppRecord: any;
  ampRecord: any;
  customRecords: Record<string, string>;
  metadata: string;
}