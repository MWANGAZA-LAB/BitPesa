import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LightningService as LnService } from 'ln-service';
import { retryWithBackoff } from '@bitpesa/shared-utils';

@Injectable()
export class LndClient implements OnModuleInit {
  private readonly logger = new Logger(LndClient.name);
  private lnService: LnService;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeClient();
  }

  private async initializeClient() {
    try {
      const lndHost = this.configService.get('LND_GRPC_HOST', 'localhost:10009');
      const macaroonPath = this.configService.get('LND_MACAROON_PATH');
      const tlsCertPath = this.configService.get('LND_TLS_CERT_PATH');
      const network = this.configService.get('LND_NETWORK', 'testnet');

      this.lnService = LnService({
        lnd: {
          macaroon: macaroonPath,
          cert: tlsCertPath,
          socket: lndHost,
        },
      });

      // Test connection
      await this.getInfo();
      this.logger.log('LND client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize LND client:', error);
      throw error;
    }
  }

  getClient(): LnService {
    return this.lnService;
  }

  async getInfo() {
    return retryWithBackoff(async () => {
      return await this.lnService.getWalletInfo();
    });
  }

  async createInvoice(params: {
    description: string;
    tokens: number;
    expires_at: string;
  }) {
    return retryWithBackoff(async () => {
      return await this.lnService.createInvoice(params);
    });
  }

  async sendPayment(params: {
    destination: string;
    tokens: number;
    fee: number;
  }) {
    return retryWithBackoff(async () => {
      return await this.lnService.sendPayment(params);
    });
  }

  async getChannels() {
    return retryWithBackoff(async () => {
      return await this.lnService.getChannels();
    });
  }

  async getChannelBalance() {
    return retryWithBackoff(async () => {
      return await this.lnService.getChannelBalance();
    });
  }

  async getWalletBalance() {
    return retryWithBackoff(async () => {
      return await this.lnService.getWalletBalance();
    });
  }

  async getNodeInfo(publicKey: string) {
    return retryWithBackoff(async () => {
      return await this.lnService.getNodeInfo({ public_key: publicKey });
    });
  }

  async getPayment(paymentHash: string) {
    return retryWithBackoff(async () => {
      return await this.lnService.getPayment({ payment_hash: paymentHash });
    });
  }

  async getInvoice(paymentHash: string) {
    return retryWithBackoff(async () => {
      return await this.lnService.getInvoice({ payment_hash: paymentHash });
    });
  }

  async subscribeToInvoices() {
    return retryWithBackoff(async () => {
      return await this.lnService.subscribeToInvoices();
    });
  }

  async subscribeToPayments() {
    return retryWithBackoff(async () => {
      return await this.lnService.subscribeToPayments();
    });
  }
}
