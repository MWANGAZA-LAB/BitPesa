import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionService } from '../conversion/conversion.service';
import { NotificationService } from '../notification/notification.service';
import { CreateTransactionDto } from './dto';
import { Transaction, TransactionStatus, PaginatedResponse } from '@bitpesa/shared-types';
import { toPrismaDecimal } from '@bitpesa/shared-utils';
import { 
  AppConfigService, 
  ErrorHandlerService, 
  RetryService,
  TRANSACTION_CONSTANTS
} from '@bitpesa/shared-config';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversionService: ConversionService,
    private readonly notificationService: NotificationService,
    private readonly appConfig: AppConfigService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly retryService: RetryService,
  ) {}

  async createTransaction(dto: CreateTransactionDto): Promise<Transaction> {
    this.logger.log(`Creating transaction: ${dto.transactionType} for ${dto.recipientPhone}`);

    try {
      // Validate transaction amount
      this.validateTransactionAmount(dto.kesAmount);

      // Generate unique payment hash
      const paymentHash = this.generatePaymentHash();
      
      // Get current exchange rate with retry logic
      const exchangeRate = await this.getExchangeRateWithRetry();
      
      // Calculate amounts
      const feeAmount = this.calculateFee(dto.kesAmount);
      const totalKesAmount = dto.kesAmount + feeAmount;
      const btcAmount = totalKesAmount / exchangeRate.finalRate;

      // Validate calculated amounts
      this.validateCalculatedAmounts(btcAmount, totalKesAmount);

      // Create transaction
      const transaction = await this.createTransactionRecord({
        paymentHash,
        dto,
        btcAmount,
        totalKesAmount,
        feeAmount,
        exchangeRate: exchangeRate.finalRate,
      });

      // Generate Lightning invoice with retry logic
      await this.generateLightningInvoiceWithRetry(transaction);

      this.logger.log(`Transaction created: ${transaction.id} with payment hash: ${paymentHash}`);
      return this.mapTransactionToResponse(transaction);

    } catch (error) {
      this.errorHandler.handleError(error, 'TransactionService.createTransaction');
      throw this.errorHandler.createExternalServiceError('Transaction', 'creation');
    }
  }

  async getTransactionByPaymentHash(paymentHash: string): Promise<Transaction> {
    this.logger.log(`Fetching transaction with payment hash: ${paymentHash}`);

    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { paymentHash },
        include: {
          lightningInvoice: true,
          mpesaTransaction: true,
        },
      });

      if (!transaction) {
        throw this.errorHandler.createNotFoundError('Transaction', paymentHash);
      }

      return this.mapTransactionToResponse(transaction);
    } catch (error) {
      this.errorHandler.handleError(error, 'TransactionService.getTransactionByPaymentHash');
      
      if (error instanceof Error && error.message.includes('not found')) {
        throw error; // Re-throw not found errors as-is
      }
      
      throw this.errorHandler.createExternalServiceError('Transaction', 'retrieval');
    }
  }

  async getTransactionStatus(paymentHash: string): Promise<{ status: string; progress: number }> {
    const transaction = await this.getTransactionByPaymentHash(paymentHash);
    
    const statusMap = {
      [TransactionStatus.PENDING]: { status: 'pending', progress: 0 },
      [TransactionStatus.LIGHTNING_PENDING]: { status: 'waiting_for_payment', progress: 25 },
      [TransactionStatus.LIGHTNING_PAID]: { status: 'payment_received', progress: 50 },
      [TransactionStatus.CONVERTING]: { status: 'converting', progress: 60 },
      [TransactionStatus.MPESA_PENDING]: { status: 'processing_mpesa', progress: 75 },
      [TransactionStatus.COMPLETED]: { status: 'completed', progress: 100 },
      [TransactionStatus.FAILED]: { status: 'failed', progress: 0 },
      [TransactionStatus.CANCELLED]: { status: 'cancelled', progress: 0 },
      [TransactionStatus.REFUNDED]: { status: 'refunded', progress: 0 },
    };

    return statusMap[transaction.status] || { status: 'unknown', progress: 0 };
  }

  async getTransactions(filters: {
    status?: string;
    type?: string;
    phone?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResponse<Transaction>> {
    const { status, type, phone, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.transactionType = type;
    if (phone) where.recipientPhone = { contains: phone };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lightningInvoice: true,
          mpesaTransaction: true,
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions.map(tx => this.mapTransactionToResponse(tx)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async generateReceipt(paymentHash: string): Promise<any> {
    const transaction = await this.getTransactionByPaymentHash(paymentHash);
    
    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException('Transaction not completed yet');
    }

    return {
      transactionId: transaction.id,
      paymentHash: transaction.paymentHash,
      type: transaction.transactionType,
      amount: transaction.kesAmount,
      fee: transaction.feeAmount,
      total: transaction.totalKesAmount,
      recipientPhone: transaction.recipientPhone,
      recipientName: transaction.recipientName,
      merchantCode: transaction.merchantCode,
      accountNumber: transaction.accountNumber,
      referenceNumber: transaction.referenceNumber,
      completedAt: transaction.completedAt,
      mpesaReceiptNumber: transaction.mpesaTransaction?.[0]?.mpesaReceiptNumber,
    };
  }

  async updateTransactionStatus(
    paymentHash: string, 
    status: TransactionStatus, 
    _additionalData?: any
  ): Promise<void> {
    this.logger.log(`Updating transaction ${paymentHash} status to ${status}`);

    const updateData: any = { status };
    
    if (status === TransactionStatus.LIGHTNING_PAID) {
      updateData.paidAt = new Date();
    } else if (status === TransactionStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    await this.prisma.transaction.update({
      where: { paymentHash },
      data: updateData,
    });
  }

  private generatePaymentHash(): string {
    return crypto.createHash('sha256')
      .update(uuidv4() + Date.now().toString())
      .digest('hex');
  }

  private calculateFee(amount: number): number {
    // Use configured fee percentage with minimum fee
    const fee = Math.max(amount * TRANSACTION_CONSTANTS.FEE_PERCENTAGE, 5);
    return Math.round(fee * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Validate transaction amount against configured limits
   */
  private validateTransactionAmount(amount: number): void {
    if (amount < TRANSACTION_CONSTANTS.MIN_KES_AMOUNT) {
      throw this.errorHandler.createValidationError(
        `Transaction amount must be at least ${TRANSACTION_CONSTANTS.MIN_KES_AMOUNT} KES`
      );
    }
    
    if (amount > TRANSACTION_CONSTANTS.MAX_KES_AMOUNT) {
      throw this.errorHandler.createValidationError(
        `Transaction amount cannot exceed ${TRANSACTION_CONSTANTS.MAX_KES_AMOUNT} KES`
      );
    }
  }

  /**
   * Validate calculated amounts
   */
  private validateCalculatedAmounts(btcAmount: number, _totalKesAmount: number): void {
    if (btcAmount < TRANSACTION_CONSTANTS.MIN_BTC_AMOUNT) {
      throw this.errorHandler.createValidationError(
        `Calculated BTC amount ${btcAmount} is below minimum ${TRANSACTION_CONSTANTS.MIN_BTC_AMOUNT}`
      );
    }
    
    if (btcAmount > TRANSACTION_CONSTANTS.MAX_BTC_AMOUNT) {
      throw this.errorHandler.createValidationError(
        `Calculated BTC amount ${btcAmount} exceeds maximum ${TRANSACTION_CONSTANTS.MAX_BTC_AMOUNT}`
      );
    }
  }

  /**
   * Get exchange rate with retry logic
   */
  private async getExchangeRateWithRetry() {
    const result = await this.retryService.executeWithRetry(
      () => this.conversionService.getCurrentRate('BTC', 'KES'),
      {
        maxAttempts: TRANSACTION_CONSTANTS.MAX_RETRY_ATTEMPTS,
        retryCondition: (error: any) => this.errorHandler.isRetryableError(error),
      }
    );

    if (!result.success || !result.data) {
      throw this.errorHandler.createExternalServiceError('Exchange Rate', 'fetching');
    }

    return result.data;
  }

  /**
   * Create transaction record in database
   */
  private async createTransactionRecord(params: {
    paymentHash: string;
    dto: CreateTransactionDto;
    btcAmount: number;
    totalKesAmount: number;
    feeAmount: number;
    exchangeRate: number;
  }) {
    const { paymentHash, dto, btcAmount, totalKesAmount, feeAmount, exchangeRate } = params;
    
    return await this.prisma.transaction.create({
      data: {
        id: uuidv4(),
        paymentHash,
        transactionType: dto.transactionType,
        status: TransactionStatus.PENDING,
        btcAmount: toPrismaDecimal(btcAmount),
        kesAmount: toPrismaDecimal(dto.kesAmount),
        exchangeRate: toPrismaDecimal(exchangeRate),
        feeAmount: toPrismaDecimal(feeAmount),
        totalKesAmount: toPrismaDecimal(totalKesAmount),
        recipientPhone: dto.recipientPhone,
        recipientName: dto.recipientName,
        merchantCode: dto.merchantCode,
        accountNumber: dto.accountNumber,
        referenceNumber: dto.referenceNumber,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        deviceInfo: dto.deviceInfo,
        invoiceExpiresAt: new Date(Date.now() + TRANSACTION_CONSTANTS.INVOICE_EXPIRATION_MS),
      },
    });
  }

  /**
   * Create transaction record
   */
  async create(dto: CreateTransactionDto): Promise<Transaction> {
    return this.createTransaction(dto);
  }

  /**
   * Update transaction
   */
  async update(id: string, data: any): Promise<Transaction> {
    this.logger.log(`Updating transaction: ${id}`);
    
    try {
      const updatedTransaction = await this.prisma.transaction.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      return this.mapTransactionToResponse(updatedTransaction);
    } catch (error) {
      this.errorHandler.handleError(error, 'TransactionService.update');
      throw this.errorHandler.createExternalServiceError('Transaction', 'update');
    }
  }

  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<Transaction | null> {
    this.logger.log(`Finding transaction by ID: ${id}`);
    
    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { id },
        include: {
          lightningInvoice: true,
          mpesaTransaction: true,
        },
      });

      return transaction ? this.mapTransactionToResponse(transaction) : null;
    } catch (error) {
      this.errorHandler.handleError(error, 'TransactionService.findById');
      return null;
    }
  }

  /**
   * Find transaction by MinMo swap ID
   */
  async findByMinmoSwapId(swapId: string): Promise<Transaction | null> {
    this.logger.log(`Finding transaction by MinMo swap ID: ${swapId}`);
    
    try {
      const transaction = await this.prisma.transaction.findFirst({
        where: { minmoSwapId: swapId },
        include: {
          lightningInvoice: true,
          mpesaTransaction: true,
        },
      });

      return transaction ? this.mapTransactionToResponse(transaction) : null;
    } catch (error) {
      this.errorHandler.handleError(error, 'TransactionService.findByMinmoSwapId');
      return null;
    }
  }

  /**
   * Generate Lightning invoice with retry logic
   */
  private async generateLightningInvoiceWithRetry(transaction: any): Promise<void> {
    const result = await this.retryService.executeWithRetry(
      () => this.generateLightningInvoice(transaction),
      {
        maxAttempts: TRANSACTION_CONSTANTS.MAX_RETRY_ATTEMPTS,
        retryCondition: (error: any) => this.errorHandler.isRetryableError(error),
      }
    );

    if (!result.success) {
      throw this.errorHandler.createExternalServiceError('Lightning Invoice', 'generation');
    }
  }

  private async generateLightningInvoice(transaction: any): Promise<void> {
    // This would integrate with the Lightning service
    // For now, we'll create a placeholder invoice
    await this.prisma.lightningInvoice.create({
      data: {
        id: uuidv4(),
        paymentHash: transaction.paymentHash,
        paymentRequest: `lnbc${transaction.btcAmount}...`, // Placeholder
        amountSats: BigInt(Math.round(transaction.btcAmount * 100_000_000)),
        amountKes: transaction.kesAmount,
        description: `BitPesa Bridge - ${transaction.transactionType}`,
        status: 'PENDING',
        expiresAt: transaction.invoiceExpiresAt,
        transactionId: transaction.id,
      },
    });
  }

  private mapTransactionToResponse(transaction: any): Transaction {
    return {
      id: transaction.id,
      paymentHash: transaction.paymentHash,
      transactionType: transaction.transactionType,
      status: transaction.status,
      btcAmount: transaction.btcAmount.toString(),
      kesAmount: transaction.kesAmount.toString(),
      exchangeRate: transaction.exchangeRate.toString(),
      feeAmount: transaction.feeAmount.toString(),
      totalKesAmount: transaction.totalKesAmount.toString(),
      recipientPhone: transaction.recipientPhone,
      recipientName: transaction.recipientName,
      merchantCode: transaction.merchantCode,
      accountNumber: transaction.accountNumber,
      referenceNumber: transaction.referenceNumber,
      ipAddress: transaction.ipAddress,
      userAgent: transaction.userAgent,
      deviceInfo: transaction.deviceInfo,
      invoiceExpiresAt: transaction.invoiceExpiresAt,
      paidAt: transaction.paidAt,
      completedAt: transaction.completedAt,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
