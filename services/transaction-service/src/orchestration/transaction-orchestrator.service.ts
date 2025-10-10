import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TransactionService } from '../transaction/transaction.service';
import { LightningService } from '../external/lightning.service';
import { MpesaService } from '../external/mpesa.service';
import { ConversionService } from '../conversion/conversion.service';
import { CreateBtcToMpesaTransactionDto } from '../dto/create-btc-to-mpesa-transaction.dto';
import { Transaction } from '@bitpesa/shared-types';

@Injectable()
export class TransactionOrchestratorService {
  private readonly logger = new Logger(TransactionOrchestratorService.name);

  constructor(
    private readonly transactionService: TransactionService,
    private readonly lightningService: LightningService,
    private readonly mpesaService: MpesaService,
    private readonly conversionService: ConversionService,
  ) {}

  async createBtcToMpesaTransaction(
    dto: CreateBtcToMpesaTransactionDto,
  ): Promise<Transaction> {
    try {
      this.logger.log(`Creating BTC to M-Pesa transaction: ${dto.transactionType}`);

      // Step 1: Create transaction record
      const transaction = await this.transactionService.create({
        type: 'BTC_TO_MPESA',
        status: 'PENDING',
        amountBtc: dto.amountBtc,
        amountKes: dto.amountKes,
        transactionType: dto.transactionType,
        phoneNumber: dto.phoneNumber,
        accountNumber: dto.accountNumber,
        tillNumber: dto.tillNumber,
        merchantCode: dto.merchantCode,
        description: dto.description,
        metadata: dto.metadata,
      });

      // Step 2: Get conversion rate and calculate Lightning amount
      const conversionRate = await this.conversionService.getCurrentRate('BTC', 'KES');
      const lightningAmountSats = Math.round((dto.amountBtc * 100000000) / conversionRate.rate);

      // Step 3: Create Lightning invoice
      const lightningInvoice = await this.lightningService.createInvoice({
        transactionId: transaction.id,
        amountSats: lightningAmountSats,
        description: `BitPesa ${dto.transactionType} - ${transaction.id}`,
        expiry: 3600, // 1 hour
      });

      // Step 4: Update transaction with Lightning details
      await this.transactionService.update(transaction.id, {
        lightningInvoiceId: lightningInvoice.id,
        paymentHash: lightningInvoice.paymentHash,
        paymentRequest: lightningInvoice.paymentRequest,
        status: 'LIGHTNING_PENDING',
      });

      this.logger.log(`Transaction created successfully: ${transaction.id}`);
      return transaction;
    } catch (error) {
      this.logger.error(`Failed to create BTC to M-Pesa transaction:`, error);
      throw new BadRequestException('Failed to create transaction');
    }
  }

  async processLightningPayment(paymentHash: string): Promise<void> {
    try {
      this.logger.log(`Processing Lightning payment: ${paymentHash}`);

      // Step 1: Get transaction by payment hash
      const transaction = await this.transactionService.findByPaymentHash(paymentHash);
      if (!transaction) {
        throw new BadRequestException('Transaction not found');
      }

      // Step 2: Verify Lightning payment
      const lightningInvoice = await this.lightningService.getInvoice(paymentHash);
      if (lightningInvoice.status !== 'PAID') {
        throw new BadRequestException('Lightning payment not confirmed');
      }

      // Step 3: Update transaction status
      await this.transactionService.update(transaction.id, {
        status: 'LIGHTNING_CONFIRMED',
        lightningSettledAt: new Date(),
      });

      // Step 4: Initiate M-Pesa transaction based on type
      await this.initiateMpesaTransaction(transaction);

      this.logger.log(`Lightning payment processed successfully: ${paymentHash}`);
    } catch (error) {
      this.logger.error(`Failed to process Lightning payment ${paymentHash}:`, error);
      throw new BadRequestException('Failed to process Lightning payment');
    }
  }

  private async initiateMpesaTransaction(transaction: Transaction): Promise<void> {
    try {
      this.logger.log(`Initiating M-Pesa transaction: ${transaction.id}`);

      let mpesaResponse;

      switch (transaction.transactionType) {
        case 'SEND_MONEY':
          mpesaResponse = await this.mpesaService.sendB2C({
            phoneNumber: transaction.phoneNumber!,
            amount: transaction.amountKes,
            description: transaction.description || `BitPesa Send Money - ${transaction.id}`,
            transactionId: transaction.id,
          });
          break;

        case 'BUY_AIRTIME':
          mpesaResponse = await this.mpesaService.buyAirtime({
            phoneNumber: transaction.phoneNumber!,
            amount: transaction.amountKes,
            description: transaction.description || `BitPesa Airtime - ${transaction.id}`,
            transactionId: transaction.id,
          });
          break;

        case 'PAYBILL':
          mpesaResponse = await this.mpesaService.payBill({
            phoneNumber: transaction.phoneNumber!,
            amount: transaction.amountKes,
            accountNumber: transaction.accountNumber!,
            description: transaction.description || `BitPesa Paybill - ${transaction.id}`,
            transactionId: transaction.id,
          });
          break;

        case 'BUY_GOODS':
          mpesaResponse = await this.mpesaService.buyGoods({
            phoneNumber: transaction.phoneNumber!,
            amount: transaction.amountKes,
            tillNumber: transaction.tillNumber!,
            description: transaction.description || `BitPesa Buy Goods - ${transaction.id}`,
            transactionId: transaction.id,
          });
          break;

        default:
          throw new BadRequestException('Invalid transaction type');
      }

      // Update transaction with M-Pesa details
      await this.transactionService.update(transaction.id, {
        mpesaTransactionId: mpesaResponse.originatorConversationId || mpesaResponse.merchantRequestId,
        status: 'MPESA_PENDING',
        mpesaInitiatedAt: new Date(),
      });

      this.logger.log(`M-Pesa transaction initiated successfully: ${transaction.id}`);
    } catch (error) {
      this.logger.error(`Failed to initiate M-Pesa transaction ${transaction.id}:`, error);
      
      // Update transaction status to failed
      await this.transactionService.update(transaction.id, {
        status: 'MPESA_FAILED',
        failureReason: (error as Error).message,
        mpesaFailedAt: new Date(),
      });

      throw error;
    }
  }

  async handleMpesaCallback(
    transactionId: string,
    status: 'SUCCESS' | 'FAILED',
    details: any,
  ): Promise<void> {
    try {
      this.logger.log(`Handling M-Pesa callback for transaction: ${transactionId}`);

      const transaction = await this.transactionService.findById(transactionId);
      if (!transaction) {
        throw new BadRequestException('Transaction not found');
      }

      if (status === 'SUCCESS') {
        await this.transactionService.update(transactionId, {
          status: 'COMPLETED',
          mpesaCompletedAt: new Date(),
          mpesaResponse: details,
        });
      } else {
        await this.transactionService.update(transactionId, {
          status: 'MPESA_FAILED',
          failureReason: details.errorMessage || 'M-Pesa transaction failed',
          mpesaFailedAt: new Date(),
          mpesaResponse: details,
        });
      }

      this.logger.log(`M-Pesa callback processed successfully: ${transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to handle M-Pesa callback ${transactionId}:`, error);
      throw new BadRequestException('Failed to process M-Pesa callback');
    }
  }

  async getTransactionStatus(transactionId: string): Promise<Transaction> {
    try {
      this.logger.log(`Getting transaction status: ${transactionId}`);

      const transaction = await this.transactionService.findById(transactionId);
      if (!transaction) {
        throw new BadRequestException('Transaction not found');
      }

      return transaction;
    } catch (error) {
      this.logger.error(`Failed to get transaction status ${transactionId}:`, error);
      throw new BadRequestException('Failed to get transaction status');
    }
  }
}
