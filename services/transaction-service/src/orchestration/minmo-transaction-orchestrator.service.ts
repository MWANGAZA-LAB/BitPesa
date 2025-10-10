import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TransactionService } from '../transaction/transaction.service';
import { MinmoService } from '../external/minmo.service';
import { MpesaService } from '../external/mpesa.service';
import { CreateBtcToMpesaTransactionDto } from '../dto/create-btc-to-mpesa-transaction.dto';
import { Transaction, TransactionStatus } from '@bitpesa/shared-types';

@Injectable()
export class MinmoTransactionOrchestratorService {
  private readonly logger = new Logger(MinmoTransactionOrchestratorService.name);

  constructor(
    private readonly transactionService: TransactionService,
    private readonly minmoService: MinmoService,
    private readonly mpesaService: MpesaService,
  ) {}

  /**
   * Create a Bitcoin to M-Pesa transaction using MinMo
   * This replaces the Lightning-based flow with MinMo integration
   */
  async createBtcToMpesaTransaction(
    dto: CreateBtcToMpesaTransactionDto,
  ): Promise<Transaction> {
    try {
      this.logger.log(`Creating MinMo-powered BTC to M-Pesa transaction: ${dto.transactionType}`);

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

      // Step 2: Create MinMo swap
      this.logger.log(`Step 1: Creating MinMo swap for transaction ${transaction.id}`);
      
      const swapResult = await this.minmoService.createSwap({
        kesAmount: dto.amountKes,
        recipientPhone: dto.phoneNumber,
        recipientName: dto.metadata?.recipientName,
        transactionId: transaction.id,
      });

      // Step 3: Update transaction with MinMo details
      await this.transactionService.update(transaction.id, {
        status: 'AWAITING_BTC_PAYMENT',
        minmoSwapId: swapResult.swapId,
        btcAddress: swapResult.btcAddress,
        btcAmount: swapResult.btcAmount,
        exchangeRate: swapResult.exchangeRate,
        minmoFee: swapResult.minmoFee,
        invoiceExpiresAt: swapResult.expiresAt,
      });

      this.logger.log(`Step 2: Waiting for BTC payment to ${swapResult.btcAddress}`);

      // Return updated transaction with MinMo details
      return {
        ...transaction,
        status: 'AWAITING_BTC_PAYMENT',
        minmoSwapId: swapResult.swapId,
        btcAddress: swapResult.btcAddress,
        btcAmount: swapResult.btcAmount,
        exchangeRate: swapResult.exchangeRate,
        minmoFee: swapResult.minmoFee,
        invoiceExpiresAt: swapResult.expiresAt,
      };

    } catch (error) {
      this.logger.error(`Transaction ${dto.transactionId || 'unknown'} failed: ${(error as Error).message}`);
      
      // Update transaction status to failed if we have an ID
      if (dto.transactionId) {
        await this.transactionService.update(dto.transactionId, {
          status: 'FAILED',
          failureReason: (error as Error).message,
        });
      }
      
      throw new BadRequestException(`Failed to create transaction: ${(error as Error).message}`);
    }
  }

  /**
   * Handle MinMo webhook - BTC received
   * This is called when MinMo confirms BTC payment
   */
  async handleMinmoConfirmation(swapId: string): Promise<void> {
    try {
      this.logger.log(`Step 3: BTC received for MinMo swap ${swapId}`);

      // Find transaction by MinMo swap ID
      const transaction = await this.transactionService.findByMinmoSwapId(swapId);
      
      if (!transaction) {
        this.logger.error(`Transaction not found for MinMo swap ${swapId}`);
        return;
      }

      // Update transaction status
      await this.transactionService.update(transaction.id, {
        status: 'BTC_RECEIVED',
        btcReceived: true,
        paidAt: new Date(),
      });

      // Step 4: Execute M-Pesa payment
      this.logger.log(`Step 4: Sending ${transaction.amountKes} KES via M-Pesa`);

      let mpesaResult;
      
      switch (transaction.transactionType) {
        case 'SEND_MONEY':
          mpesaResult = await this.mpesaService.sendMoney({
            phone: transaction.phoneNumber,
            amount: transaction.amountKes,
            reference: transaction.id,
          });
          break;
          
        case 'BUY_AIRTIME':
          mpesaResult = await this.mpesaService.buyAirtime({
            phone: transaction.phoneNumber,
            amount: transaction.amountKes,
          });
          break;
          
        case 'PAYBILL':
          mpesaResult = await this.mpesaService.paybill({
            businessNumber: transaction.merchantCode,
            accountNumber: transaction.accountNumber,
            amount: transaction.amountKes,
            phone: transaction.phoneNumber,
          });
          break;
          
        case 'BUY_GOODS':
          mpesaResult = await this.mpesaService.buyGoods({
            tillNumber: transaction.merchantCode,
            amount: transaction.amountKes,
            phone: transaction.phoneNumber,
          });
          break;
          
        default:
          throw new Error(`Unsupported transaction type: ${transaction.transactionType}`);
      }

      // Step 5: Update status to M-Pesa pending
      await this.transactionService.update(transaction.id, {
        status: 'MPESA_PENDING',
        mpesaFee: mpesaResult.fee,
      });

      this.logger.log(`Step 5: M-Pesa initiated for transaction ${transaction.id}`);

    } catch (error) {
      this.logger.error(`M-Pesa payment failed for swap ${swapId}: ${(error as Error).message}`);
      
      // Update transaction status to failed
      const transaction = await this.transactionService.findByMinmoSwapId(swapId);
      if (transaction) {
        await this.transactionService.update(transaction.id, {
          status: 'FAILED',
          failureReason: `M-Pesa failed: ${(error as Error).message}`,
        });
      }
      
      // TODO: Initiate refund via MinMo
    }
  }

  /**
   * Handle M-Pesa callback - Payment complete
   */
  async handleMpesaCallback(data: {
    transactionId: string;
    mpesaReceipt: string;
    resultCode: number;
    resultDesc: string;
  }): Promise<void> {
    try {
      const transaction = await this.transactionService.findById(data.transactionId);
      
      if (!transaction) {
        this.logger.error(`Transaction not found: ${data.transactionId}`);
        return;
      }

      if (data.resultCode === 0) {
        // Success! Update transaction as completed
        this.logger.log(`Step 6: M-Pesa completed for transaction ${transaction.id}`);
        
        await this.transactionService.update(transaction.id, {
          status: 'COMPLETED',
          completedAt: new Date(),
          referenceNumber: data.mpesaReceipt,
        });

        // Send success notification
        await this.sendTransactionCompleteNotification(transaction);
        
      } else {
        // M-Pesa failed
        this.logger.error(`M-Pesa failed for transaction ${transaction.id}: ${data.resultDesc}`);
        
        await this.transactionService.update(transaction.id, {
          status: 'FAILED',
          failureReason: `M-Pesa failed: ${data.resultDesc}`,
        });

        // TODO: Initiate refund via MinMo
      }
    } catch (error) {
      this.logger.error(`M-Pesa callback handling failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<{
    status: TransactionStatus;
    btcReceived: boolean;
    mpesaStatus: string;
    receipt?: string;
  }> {
    const transaction = await this.transactionService.findById(transactionId);
    
    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    return {
      status: transaction.status,
      btcReceived: transaction.btcReceived || false,
      mpesaStatus: transaction.status === 'COMPLETED' ? 'completed' : 'pending',
      receipt: transaction.referenceNumber,
    };
  }

  /**
   * Send transaction completion notification
   */
  private async sendTransactionCompleteNotification(transaction: Transaction): Promise<void> {
    try {
      // TODO: Implement notification service call
      this.logger.log(`Sending completion notification for transaction ${transaction.id}`);
      
      // Example implementation:
      // await this.notificationService.sendTransactionComplete({
      //   transactionId: transaction.id,
      //   phoneNumber: transaction.phoneNumber,
      //   amount: transaction.amountKes,
      //   receipt: transaction.referenceNumber,
      // });
    } catch (error) {
      this.logger.error(`Failed to send notification: ${(error as Error).message}`);
    }
  }
}
