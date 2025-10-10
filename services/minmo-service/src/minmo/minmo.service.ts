import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MinmoClient } from './minmo-client';
import { CreateSwapDto } from './dto/create-swap.dto';
import { SwapWebhookDto } from './dto/swap-webhook.dto';

export interface SwapResult {
  swapId: string;
  btcAddress: string;
  btcAmount: number;
  kesAmount: number;
  exchangeRate: number;
  minmoFee: number;
  expiresAt: Date;
  status: string;
}

export interface ExchangeRateResult {
  rate: number;
  timestamp: Date;
  spread: number;
}

export interface SwapStatusResult {
  status: string;
  btcReceived: boolean;
  btcAmount: number;
  kesAmount: number;
  completedAt?: Date;
}

@Injectable()
export class MinmoService {
  private readonly logger = new Logger(MinmoService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly minmoClient: MinmoClient,
  ) {}

  /**
   * Create a Bitcoin to KES swap
   * User will send BTC, receive KES via M-Pesa
   */
  async createSwap(dto: CreateSwapDto): Promise<SwapResult> {
    try {
      this.logger.log(`Creating Minmo swap for ${dto.kesAmount} KES`);

      const swapData = {
        fromCurrency: 'BTC',
        toCurrency: 'KES',
        toAmount: dto.kesAmount, // User wants this much KES
        payoutMethod: 'CUSTOM', // We handle M-Pesa ourselves
        metadata: {
          internalTransactionId: dto.transactionId,
          recipientPhone: dto.recipientPhone,
          recipientName: dto.recipientName,
        },
        webhookUrl: `${this.configService.get('API_BASE_URL')}/api/v1/webhooks/minmo`,
      };

      const response = await this.minmoClient.createSwap(swapData);

      const result: SwapResult = {
        swapId: response.id,
        btcAddress: response.depositAddress,
        btcAmount: response.fromAmount,
        kesAmount: response.toAmount,
        exchangeRate: response.rate,
        minmoFee: response.fee,
        expiresAt: new Date(response.expiresAt),
        status: response.status,
      };

      this.logger.log(`Minmo swap created: ${result.swapId}`);
      return result;
    } catch (error) {
      this.logger.error(`Minmo swap creation failed: ${error.message}`);
      throw new BadRequestException(`Failed to create swap: ${error.message}`);
    }
  }

  /**
   * Get current BTC/KES exchange rate from Minmo
   */
  async getExchangeRate(): Promise<ExchangeRateResult> {
    try {
      const response = await this.minmoClient.getExchangeRate('BTC-KES');

      return {
        rate: response.rate,
        timestamp: new Date(response.timestamp),
        spread: response.spread || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch rate: ${error.message}`);
      throw new BadRequestException(`Failed to fetch exchange rate: ${error.message}`);
    }
  }

  /**
   * Get swap status from Minmo
   */
  async getSwapStatus(swapId: string): Promise<SwapStatusResult> {
    try {
      const response = await this.minmoClient.getSwapStatus(swapId);

      return {
        status: response.status,
        btcReceived: response.btcReceived,
        btcAmount: response.fromAmount,
        kesAmount: response.toAmount,
        completedAt: response.completedAt ? new Date(response.completedAt) : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get swap status: ${error.message}`);
      throw new BadRequestException(`Failed to get swap status: ${error.message}`);
    }
  }

  /**
   * Handle webhook from Minmo
   */
  async handleWebhook(dto: SwapWebhookDto): Promise<any> {
    this.logger.log(`Received Minmo webhook: ${dto.event}`);

    // Verify webhook signature
    this.verifyWebhookSignature(dto);

    return {
      swapId: dto.swapId,
      event: dto.event,
      status: dto.status,
      btcReceived: dto.event === 'swap.confirmed',
      data: dto.data,
    };
  }

  /**
   * Verify webhook signature for security
   */
  private verifyWebhookSignature(payload: SwapWebhookDto): void {
    const webhookSecret = this.configService.get('MINMO_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      this.logger.warn('MINMO_WEBHOOK_SECRET not configured - skipping signature verification');
      return;
    }

    // Implement signature verification based on Minmo's documentation
    // This is critical for security
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (payload.signature !== expectedSignature) {
      this.logger.error('Invalid webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log('Webhook signature verified successfully');
  }
}
