import { MpesaTransactionType, MpesaStatus } from './common.types';

export interface MpesaTransaction {
  id: string;
  transactionId: string;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  mpesaReceiptNumber?: string;
  transactionType: MpesaTransactionType;
  phoneNumber: string;
  amount: number;
  accountReference?: string;
  transactionDesc?: string;
  status: MpesaStatus;
  resultCode?: number;
  resultDesc?: string;
  callbackData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
}

export interface STKPushResponse {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

export interface B2CRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  occasion: string;
}

export interface B2CResponse {
  originatorConversationId: string;
  conversationId: string;
  responseCode: string;
  responseDescription: string;
}

export interface C2BRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  shortCode: string;
  commandId: string;
}

export interface C2BResponse {
  originatorConversationId: string;
  conversationId: string;
  responseCode: string;
  responseDescription: string;
}

export interface MpesaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: any;
        }>;
      };
    };
  };
}

export interface MpesaB2CCallback {
  Result: {
    ResultType: number;
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters: {
      ResultParameter: Array<{
        Key: string;
        Value: any;
      }>;
    };
    ReferenceData: {
      ReferenceItem: Array<{
        Key: string;
        Value: any;
      }>;
    };
  };
}

export interface MpesaC2BCallback {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: number;
  BusinessShortCode: string;
  BillRefNumber: string;
  InvoiceNumber: string;
  OrgAccountBalance: number;
  ThirdPartyTransID: string;
  MSISDN: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
}

export interface MpesaAccountBalance {
  accountType: string;
  balance: number;
  availableBalance: number;
  reservedBalance: number;
  unclearedBalance: number;
}

export interface MpesaTransactionStatus {
  transactionId: string;
  status: MpesaStatus;
  resultCode?: number;
  resultDesc?: string;
  mpesaReceiptNumber?: string;
  amount?: number;
  phoneNumber?: string;
  transactionTime?: Date;
}