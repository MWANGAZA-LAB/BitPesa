import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StkPushService } from './stk-push/stk-push.service';
import { B2CService } from './b2c/b2c.service';
import { C2BService } from './c2b/c2b.service';
import { CallbackService } from './callback/callback.service';
import { StkPushDto, B2CDto, C2BDto } from './dto';
import { MpesaTransaction, STKPushResponse, B2CResponse, C2BResponse } from '@bitpesa/shared-types';

@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly stkPushService: StkPushService,
    private readonly b2cService: B2CService,
    private readonly c2bService: C2BService,
    private readonly callbackService: CallbackService,
  ) {}

  async initiateStkPush(stkPushDto: StkPushDto): Promise<STKPushResponse> {
    try {
      this.logger.log(`Initiating STK Push for phone: ${stkPushDto.phoneNumber}, amount: ${stkPushDto.amount}`);

      const response = await this.stkPushService.initiateStkPush(stkPushDto);
      
      this.logger.log(`STK Push initiated successfully: ${response.merchantRequestId}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to initiate STK Push:`, error);
      throw new BadRequestException('Failed to initiate STK Push payment');
    }
  }

  async sendB2C(b2cDto: B2CDto): Promise<B2CResponse> {
    try {
      this.logger.log(`Sending B2C payment to phone: ${b2cDto.phoneNumber}, amount: ${b2cDto.amount}`);

      const response = await this.b2cService.sendB2C(b2cDto);
      
      this.logger.log(`B2C payment sent successfully: ${response.originatorConversationId}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to send B2C payment:`, error);
      throw new BadRequestException('Failed to send B2C payment');
    }
  }

  async registerC2B(c2bDto: C2BDto): Promise<C2BResponse> {
    try {
      this.logger.log(`Registering C2B URL: ${c2bDto.shortCode}`);

      const response = await this.c2bService.registerC2B(c2bDto);
      
      this.logger.log(`C2B URL registered successfully: ${response.originatorConversationId}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to register C2B URL:`, error);
      throw new BadRequestException('Failed to register C2B URL');
    }
  }

  async getTransaction(id: string): Promise<MpesaTransaction> {
    try {
      this.logger.log(`Getting M-Pesa transaction: ${id}`);

      const transaction = await this.stkPushService.getTransaction(id);
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      return transaction;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get transaction ${id}:`, error);
      throw new BadRequestException('Failed to get M-Pesa transaction');
    }
  }

  async handleStkPushCallback(callbackData: any): Promise<{ ResultCode: number; ResultDesc: string }> {
    try {
      this.logger.log('Handling STK Push callback');

      const result = await this.callbackService.handleStkPushCallback(callbackData);
      
      this.logger.log(`STK Push callback processed: ${result.ResultCode}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to handle STK Push callback:', error);
      return { ResultCode: 1, ResultDesc: 'Callback processing failed' };
    }
  }

  async handleB2CCallback(callbackData: any): Promise<{ ResultCode: number; ResultDesc: string }> {
    try {
      this.logger.log('Handling B2C callback');

      const result = await this.callbackService.handleB2CCallback(callbackData);
      
      this.logger.log(`B2C callback processed: ${result.ResultCode}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to handle B2C callback:', error);
      return { ResultCode: 1, ResultDesc: 'Callback processing failed' };
    }
  }

  async handleC2BCallback(callbackData: any): Promise<{ ResultCode: number; ResultDesc: string }> {
    try {
      this.logger.log('Handling C2B callback');

      const result = await this.callbackService.handleC2BCallback(callbackData);
      
      this.logger.log(`C2B callback processed: ${result.ResultCode}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to handle C2B callback:', error);
      return { ResultCode: 1, ResultDesc: 'Callback processing failed' };
    }
  }

  async getAccountBalance(): Promise<{
    accountType: string;
    balance: number;
    availableBalance: number;
    reservedBalance: number;
    unclearedBalance: number;
  }> {
    try {
      this.logger.log('Getting M-Pesa account balance');

      const balance = await this.stkPushService.getAccountBalance();
      
      this.logger.log('Account balance retrieved successfully');
      return balance;
    } catch (error) {
      this.logger.error('Failed to get account balance:', error);
      throw new BadRequestException('Failed to get M-Pesa account balance');
    }
  }

  async getServiceStatus(): Promise<{
    status: string;
    environment: string;
    timestamp: string;
  }> {
    try {
      this.logger.log('Getting M-Pesa service status');

      const environment = this.configService.get('MPESA_ENVIRONMENT', 'sandbox');
      const status = await this.stkPushService.getServiceStatus();
      
      return {
        status,
        environment,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get service status:', error);
      return {
        status: 'error',
        environment: this.configService.get('MPESA_ENVIRONMENT', 'sandbox'),
        timestamp: new Date().toISOString(),
      };
    }
  }

  // New transaction types for BitPesa Bridge
  async buyAirtime(phoneNumber: string, amount: number, accountReference: string): Promise<B2CResponse> {
    try {
      this.logger.log(`Buying airtime for ${phoneNumber}, amount: ${amount}`);

      const airtimeDto: B2CDto = {
        phoneNumber,
        amount,
        commandId: 'BusinessPayment',
        remarks: `Airtime purchase - ${accountReference}`,
        occasion: 'Airtime Purchase',
      };

      const response = await this.b2cService.sendB2C(airtimeDto);
      
      this.logger.log(`Airtime purchase initiated: ${response.originatorConversationId}`);
      return response;
    } catch (error) {
      this.logger.error('Failed to buy airtime:', error);
      throw new BadRequestException('Failed to buy airtime');
    }
  }

  async paybill(phoneNumber: string, businessNumber: string, amount: number, accountNumber: string, reference: string): Promise<STKPushResponse> {
    try {
      this.logger.log(`Processing paybill payment to ${businessNumber}, amount: ${amount}`);

      const paybillDto: StkPushDto = {
        phoneNumber,
        amount,
        accountReference: accountNumber,
        transactionDesc: `Paybill payment - ${reference}`,
        businessShortCode: businessNumber,
      };

      const response = await this.stkPushService.initiateStkPush(paybillDto);
      
      this.logger.log(`Paybill payment initiated: ${response.merchantRequestId}`);
      return response;
    } catch (error) {
      this.logger.error('Failed to process paybill payment:', error);
      throw new BadRequestException('Failed to process paybill payment');
    }
  }

  async buyGoods(phoneNumber: string, tillNumber: string, amount: number, accountReference: string): Promise<STKPushResponse> {
    try {
      this.logger.log(`Processing till payment to ${tillNumber}, amount: ${amount}`);

      const tillDto: StkPushDto = {
        phoneNumber,
        amount,
        accountReference,
        transactionDesc: `Buy goods - ${accountReference}`,
        businessShortCode: tillNumber,
      };

      const response = await this.stkPushService.initiateStkPush(tillDto);
      
      this.logger.log(`Till payment initiated: ${response.merchantRequestId}`);
      return response;
    } catch (error) {
      this.logger.error('Failed to process till payment:', error);
      throw new BadRequestException('Failed to process till payment');
    }
  }

  async handleAirtimeCallback(callbackData: any): Promise<{ ResultCode: number; ResultDesc: string }> {
    try {
      this.logger.log('Handling airtime callback');

      const result = await this.callbackService.handleB2CCallback(callbackData);
      
      this.logger.log(`Airtime callback processed: ${result.ResultCode}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to handle airtime callback:', error);
      return { ResultCode: 1, ResultDesc: 'Airtime callback processing failed' };
    }
  }

  async handlePaybillCallback(callbackData: any): Promise<{ ResultCode: number; ResultDesc: string }> {
    try {
      this.logger.log('Handling paybill callback');

      const result = await this.callbackService.handleStkPushCallback(callbackData);
      
      this.logger.log(`Paybill callback processed: ${result.ResultCode}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to handle paybill callback:', error);
      return { ResultCode: 1, ResultDesc: 'Paybill callback processing failed' };
    }
  }

  async handleTillCallback(callbackData: any): Promise<{ ResultCode: number; ResultDesc: string }> {
    try {
      this.logger.log('Handling till callback');

      const result = await this.callbackService.handleStkPushCallback(callbackData);
      
      this.logger.log(`Till callback processed: ${result.ResultCode}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to handle till callback:', error);
      return { ResultCode: 1, ResultDesc: 'Till callback processing failed' };
    }
  }
}
