import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { retryWithBackoff } from '@bitpesa/shared-utils';

@Injectable()
export class DarajaClient implements OnModuleInit {
  private readonly logger = new Logger(DarajaClient.name);
  private httpClient: AxiosInstance;
  private accessToken: string;
  private tokenExpiry: Date;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeClient();
  }

  private async initializeClient() {
    try {
      const baseURL = this.configService.get('MPESA_ENVIRONMENT') === 'production' 
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

      this.httpClient = axios.create({
        baseURL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      // Get access token
      await this.getAccessToken();
      this.logger.log('Daraja client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Daraja client:', error);
      throw error;
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      // Check if token is still valid
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken;
      }

      const consumerKey = this.configService.get('MPESA_CONSUMER_KEY');
      const consumerSecret = this.configService.get('MPESA_CONSUMER_SECRET');

      if (!consumerKey || !consumerSecret) {
        throw new Error('M-Pesa consumer key and secret are required');
      }

      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

      const response = await this.httpClient.post('/oauth/v1/generate?grant_type=client_credentials', {}, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000); // 1 minute buffer

      this.logger.log('Access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get access token:', error);
      throw error;
    }
  }

  private async makeRequest(method: 'GET' | 'POST', endpoint: string, data?: any): Promise<any> {
    try {
      const token = await this.getAccessToken();
      
      const response = await this.httpClient.request({
        method,
        url: endpoint,
        data,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to make request to ${endpoint}:`, error);
      throw error;
    }
  }

  async initiateStkPush(params: {
    phoneNumber: string;
    amount: number;
    accountReference: string;
    transactionDesc: string;
  }): Promise<any> {
    try {
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
      const shortCode = this.configService.get('MPESA_SHORTCODE');
      const passkey = this.configService.get('MPESA_PASSKEY');
      const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

      const payload = {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: params.amount,
        PartyA: params.phoneNumber,
        PartyB: shortCode,
        PhoneNumber: params.phoneNumber,
        CallBackURL: this.configService.get('MPESA_CALLBACK_URL'),
        AccountReference: params.accountReference,
        TransactionDesc: params.transactionDesc,
      };

      return await this.makeRequest('POST', '/mpesa/stkpush/v1/processrequest', payload);
    } catch (error) {
      this.logger.error('Failed to initiate STK Push:', error);
      throw error;
    }
  }

  async sendB2C(params: {
    phoneNumber: string;
    amount: number;
    accountReference: string;
    transactionDesc: string;
    occasion?: string;
  }): Promise<any> {
    try {
      const payload = {
        OriginatorConversationID: this.generateConversationId(),
        InitiatorName: this.configService.get('MPESA_INITIATOR_NAME'),
        SecurityCredential: this.configService.get('MPESA_INITIATOR_PASSWORD'),
        CommandID: 'BusinessPayment',
        Amount: params.amount,
        PartyA: this.configService.get('MPESA_SHORTCODE'),
        PartyB: params.phoneNumber,
        Remarks: params.transactionDesc,
        QueueTimeOutURL: this.configService.get('MPESA_TIMEOUT_URL'),
        ResultURL: this.configService.get('MPESA_RESULT_URL'),
        Occasion: params.occasion || 'Payment',
      };

      return await this.makeRequest('POST', '/mpesa/b2c/v1/paymentrequest', payload);
    } catch (error) {
      this.logger.error('Failed to send B2C payment:', error);
      throw error;
    }
  }

  async registerC2B(params: {
    shortCode: string;
    responseType: string;
    confirmationURL: string;
    validationURL: string;
  }): Promise<any> {
    try {
      const payload = {
        ShortCode: params.shortCode,
        ResponseType: params.responseType || 'Completed',
        ConfirmationURL: params.confirmationURL,
        ValidationURL: params.validationURL,
      };

      return await this.makeRequest('POST', '/mpesa/c2b/v1/registerurl', payload);
    } catch (error) {
      this.logger.error('Failed to register C2B URL:', error);
      throw error;
    }
  }

  async getAccountBalance(): Promise<any> {
    try {
      const payload = {
        Initiator: this.configService.get('MPESA_INITIATOR_NAME'),
        SecurityCredential: this.configService.get('MPESA_INITIATOR_PASSWORD'),
        CommandID: 'AccountBalance',
        PartyA: this.configService.get('MPESA_SHORTCODE'),
        IdentifierType: '4',
        Remarks: 'Account balance query',
        QueueTimeOutURL: this.configService.get('MPESA_TIMEOUT_URL'),
        ResultURL: this.configService.get('MPESA_RESULT_URL'),
      };

      return await this.makeRequest('POST', '/mpesa/accountbalance/v1/query', payload);
    } catch (error) {
      this.logger.error('Failed to get account balance:', error);
      throw error;
    }
  }

  async queryTransactionStatus(transactionId: string): Promise<any> {
    try {
      const payload = {
        Initiator: this.configService.get('MPESA_INITIATOR_NAME'),
        SecurityCredential: this.configService.get('MPESA_INITIATOR_PASSWORD'),
        CommandID: 'TransactionStatusQuery',
        TransactionID: transactionId,
        PartyA: this.configService.get('MPESA_SHORTCODE'),
        IdentifierType: '4',
        ResultURL: this.configService.get('MPESA_RESULT_URL'),
        QueueTimeOutURL: this.configService.get('MPESA_TIMEOUT_URL'),
        Remarks: 'Transaction status query',
        Occasion: 'Query',
      };

      return await this.makeRequest('POST', '/mpesa/transactionstatus/v1/query', payload);
    } catch (error) {
      this.logger.error('Failed to query transaction status:', error);
      throw error;
    }
  }

  private generateConversationId(): string {
    return `BP_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generatePassword(shortCode: string, passkey: string, timestamp: string): string {
    return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
  }

  private generateTimestamp(): string {
    return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  }
}
