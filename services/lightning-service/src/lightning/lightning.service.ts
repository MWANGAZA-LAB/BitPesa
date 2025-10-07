import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LightningService as LnService } from 'ln-service';
import { InvoiceService } from './invoice/invoice.service';
import { PaymentService } from './payment/payment.service';
import { ChannelService } from './channel/channel.service';
import { NodeService } from './node/node.service';
import { CreateInvoiceDto, CreatePaymentDto } from './dto';
import { LightningInvoice, LightningPayment, LightningNodeInfo, LightningChannel } from '@bitpesa/shared-types';
import { generatePaymentHash, retryWithBackoff } from '@bitpesa/shared-utils';

@Injectable()
export class LightningService {
  private readonly logger = new Logger(LightningService.name);
  private lnService: LnService;

  constructor(
    private readonly configService: ConfigService,
    private readonly invoiceService: InvoiceService,
    private readonly paymentService: PaymentService,
    private readonly channelService: ChannelService,
    private readonly nodeService: NodeService,
  ) {
    this.initializeLnService();
  }

  private initializeLnService() {
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

      this.logger.log('Lightning service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Lightning service:', error);
      throw error;
    }
  }

  async createInvoice(createInvoiceDto: CreateInvoiceDto): Promise<LightningInvoice> {
    const { amountSats, description, expiry = 3600, transactionId } = createInvoiceDto;

    try {
      this.logger.log(`Creating invoice for transaction ${transactionId}, amount: ${amountSats} sats`);

      // Generate payment hash
      const paymentHash = generatePaymentHash();

      // Create invoice using ln-service
      const invoice = await retryWithBackoff(async () => {
        return await this.lnService.createInvoice({
          description: description || `BitPesa payment for transaction ${transactionId}`,
          tokens: amountSats,
          expires_at: new Date(Date.now() + expiry * 1000).toISOString(),
        });
      });

      // Store invoice in database
      const lightningInvoice = await this.invoiceService.create({
        transactionId,
        paymentHash,
        paymentRequest: invoice.request,
        amountSats: BigInt(amountSats),
        description,
        expiresAt: new Date(Date.now() + expiry * 1000),
      });

      this.logger.log(`Invoice created successfully: ${paymentHash}`);
      return lightningInvoice;
    } catch (error) {
      this.logger.error(`Failed to create invoice for transaction ${transactionId}:`, error);
      throw new BadRequestException('Failed to create Lightning invoice');
    }
  }

  async getInvoice(paymentHash: string): Promise<LightningInvoice> {
    try {
      this.logger.log(`Getting invoice with payment hash: ${paymentHash}`);
      
      const invoice = await this.invoiceService.findByPaymentHash(paymentHash);
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      return invoice;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get invoice ${paymentHash}:`, error);
      throw new BadRequestException('Failed to get Lightning invoice');
    }
  }

  async sendPayment(createPaymentDto: CreatePaymentDto): Promise<LightningPayment> {
    const { paymentRequest, amountSats, feeLimitSats, transactionId } = createPaymentDto;

    try {
      this.logger.log(`Sending payment for transaction ${transactionId}, amount: ${amountSats} sats`);

      // Generate payment hash
      const paymentHash = generatePaymentHash();

      // Send payment using ln-service
      const payment = await retryWithBackoff(async () => {
        return await this.lnService.sendPayment({
          destination: paymentRequest,
          tokens: amountSats,
          fee: feeLimitSats || 1000, // Default fee limit
        });
      });

      // Store payment in database
      const lightningPayment = await this.paymentService.create({
        transactionId,
        paymentHash,
        paymentRequest,
        amountSats: BigInt(amountSats),
        feeSats: BigInt(payment.fee || 0),
        status: 'SUCCEEDED',
        settledAt: new Date(),
      });

      this.logger.log(`Payment sent successfully: ${paymentHash}`);
      return lightningPayment;
    } catch (error) {
      this.logger.error(`Failed to send payment for transaction ${transactionId}:`, error);
      
      // Store failed payment in database
      const paymentHash = generatePaymentHash();
      await this.paymentService.create({
        transactionId,
        paymentHash,
        paymentRequest,
        amountSats: BigInt(amountSats),
        feeSats: BigInt(0),
        status: 'FAILED',
        failureReason: error.message,
      });

      throw new BadRequestException('Failed to send Lightning payment');
    }
  }

  async getPayment(paymentHash: string): Promise<LightningPayment> {
    try {
      this.logger.log(`Getting payment with payment hash: ${paymentHash}`);
      
      const payment = await this.paymentService.findByPaymentHash(paymentHash);
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      return payment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get payment ${paymentHash}:`, error);
      throw new BadRequestException('Failed to get Lightning payment');
    }
  }

  async getNodeInfo(): Promise<LightningNodeInfo> {
    try {
      this.logger.log('Getting Lightning node information');
      
      const nodeInfo = await this.nodeService.getNodeInfo();
      return nodeInfo;
    } catch (error) {
      this.logger.error('Failed to get node info:', error);
      throw new BadRequestException('Failed to get Lightning node information');
    }
  }

  async getChannels(active?: boolean): Promise<LightningChannel[]> {
    try {
      this.logger.log(`Getting Lightning channels, active filter: ${active}`);
      
      const channels = await this.channelService.getChannels(active);
      return channels;
    } catch (error) {
      this.logger.error('Failed to get channels:', error);
      throw new BadRequestException('Failed to get Lightning channels');
    }
  }

  async getBalance(): Promise<{ total: number; confirmed: number; unconfirmed: number }> {
    try {
      this.logger.log('Getting Lightning node balance');
      
      const balance = await this.nodeService.getBalance();
      return balance;
    } catch (error) {
      this.logger.error('Failed to get balance:', error);
      throw new BadRequestException('Failed to get Lightning node balance');
    }
  }

  async getStats(): Promise<{
    totalChannels: number;
    activeChannels: number;
    totalCapacity: number;
    localBalance: number;
    remoteBalance: number;
    totalSent: number;
    totalReceived: number;
  }> {
    try {
      this.logger.log('Getting Lightning node statistics');
      
      const stats = await this.nodeService.getStats();
      return stats;
    } catch (error) {
      this.logger.error('Failed to get stats:', error);
      throw new BadRequestException('Failed to get Lightning node statistics');
    }
  }
}
