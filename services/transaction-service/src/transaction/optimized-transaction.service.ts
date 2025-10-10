import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@bitpesa/shared-infrastructure';
import { RedisService } from '@bitpesa/shared-infrastructure';
import { CircuitBreakerService, RetryService } from '@bitpesa/shared-infrastructure';
import { ConversionService } from '../conversion/conversion.service';
import { NotificationService } from '../notification/notification.service';
import { CreateTransactionDto } from './dto';
import { Transaction, TransactionStatus, PaginatedResponse } from '@bitpesa/shared-types';
import { toPrismaDecimal } from '@bitpesa/shared-utils';
import { 
  AppConfigService, 
  ErrorHandlerService,
  TRANSACTION_CONSTANTS
} from '@bitpesa/shared-config';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class OptimizedTransactionService {
  private readonly logger = new Logger(OptimizedTransactionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly retryService: RetryService,
    private readonly conversionService: ConversionService,
    private readonly notificationService: NotificationService,
    private readonly appConfig: AppConfigService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  /**
   * Create transaction with async processing
   */
  async createTransaction(dto: CreateTransactionDto): Promise<Transaction> {
    this.logger.log(`Creating transaction: ${dto.transactionType} for ${dto.recipientPhone}`);

    try {
      // Validate transaction amount
      this.validateTransactionAmount(dto.kesAmount);

      // Generate unique payment hash
      const paymentHash = this.generatePaymentHash();
      
      // Create transaction record immediately (no external dependencies)
      const transaction = await this.createTransactionRecord({
        paymentHash,
        dto,
        btcAmount: 0, // Will be calculated asynchronously
        totalKesAmount: dto.kesAmount,
        feeAmount: this.calculateFee(dto.kesAmount),
        exchangeRate: 0, // Will be fetched asynchronously
      });

      // Process external dependencies asynchronously
      this.processExternalDependenciesAsync(transaction.id, dto);

      this.logger.log(`Transaction created: ${transaction.id} with payment hash: ${paymentHash}`);
      return this.mapTransactionToResponse(transaction);

    } catch (error) {
      this.errorHandler.handleError(error, 'OptimizedTransactionService.createTransaction');
      throw this.errorHandler.createExternalServiceError('Transaction', 'creation');
    }
  }

  /**
   * Get transaction by payment hash with caching
   */
  async getTransactionByPaymentHash(paymentHash: string): Promise<Transaction> {
    this.logger.log(`Fetching transaction with payment hash: ${paymentHash}`);

    try {
      // Try cache first
      const cachedTransaction = await this.redis.get<Transaction>(`transaction:${paymentHash}`);
      if (cachedTransaction) {
        this.logger.debug(`Cache hit for transaction: ${paymentHash}`);
        return cachedTransaction;
      }

      // Fetch from database with optimized query
      const transaction = await this.prisma.transaction.findUnique({
        where: { paymentHash },
        select: {
          id: true,
          paymentHash: true,
          transactionType: true,
          status: true,
          btcAmount: true,
          kesAmount: true,
          exchangeRate: true,
          feeAmount: true,
          totalKesAmount: true,
          recipientPhone: true,
          recipientName: true,
          merchantCode: true,
          accountNumber: true,
          referenceNumber: true,
          ipAddress: true,
          userAgent: true,
          deviceInfo: true,
          invoiceExpiresAt: true,
          paidAt: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          lightningInvoice: {
            select: {
              id: true,
              status: true,
              expiresAt: true,
              paidAt: true,
            },
          },
          mpesaTransaction: {
            select: {
              id: true,
              status: true,
              mpesaReceiptNumber: true,
            },
            take: 1, // Only get the latest M-Pesa transaction
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!transaction) {
        throw this.errorHandler.createNotFoundError('Transaction', paymentHash);
      }

      const mappedTransaction = this.mapTransactionToResponse(transaction);
      
      // Cache the result for 5 minutes
      await this.redis.set(`transaction:${paymentHash}`, mappedTransaction, {
        ttl: 300,
        namespace: 'transaction',
      });

      return mappedTransaction;
    } catch (error) {
      this.errorHandler.handleError(error, 'OptimizedTransactionService.getTransactionByPaymentHash');
      
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      
      throw this.errorHandler.createExternalServiceError('Transaction', 'retrieval');
    }
  }

  /**
   * Get transaction status with caching
   */
  async getTransactionStatus(paymentHash: string): Promise<{ status: string; progress: number }> {
    // Try cache first
    const cachedStatus = await this.redis.get<{ status: string; progress: number }>(`status:${paymentHash}`);
    if (cachedStatus) {
      return cachedStatus;
    }

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

    const result = statusMap[transaction.status] || { status: 'unknown', progress: 0 };
    
    // Cache status for 1 minute
    await this.redis.set(`status:${paymentHash}`, result, {
      ttl: 60,
      namespace: 'status',
    });

    return result;
  }

  /**
   * Get transactions with optimized pagination and filtering
   */
  async getTransactions(filters: {
    status?: string;
    type?: string;
    phone?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResponse<Transaction>> {
    const { status, type, phone, page, limit } = filters;
    const skip = (page - 1) * limit;

    // Build optimized where clause
    const where: any = {};
    if (status) where.status = status;
    if (type) where.transactionType = type;
    if (phone) where.recipientPhone = { contains: phone };

    // Use optimized query with proper indexing
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          paymentHash: true,
          transactionType: true,
          status: true,
          btcAmount: true,
          kesAmount: true,
          exchangeRate: true,
          feeAmount: true,
          totalKesAmount: true,
          recipientPhone: true,
          recipientName: true,
          merchantCode: true,
          accountNumber: true,
          referenceNumber: true,
          invoiceExpiresAt: true,
          paidAt: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          lightningInvoice: {
            select: {
              id: true,
              status: true,
              expiresAt: true,
            },
          },
          mpesaTransaction: {
            select: {
              id: true,
              status: true,
              mpesaReceiptNumber: true,
            },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
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

  /**
   * Update transaction status with cache invalidation
   */
  async updateTransactionStatus(
    paymentHash: string, 
    status: TransactionStatus, 
    additionalData?: any
  ): Promise<void> {
    this.logger.log(`Updating transaction ${paymentHash} status to ${status}`);

    const updateData: any = { status };
    
    if (status === TransactionStatus.LIGHTNING_PAID) {
      updateData.paidAt = new Date();
    } else if (status === TransactionStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    await this.prisma.transaction.update({
      where: { paymentHash },
      data: updateData,
    });

    // Invalidate cache
    await this.invalidateTransactionCache(paymentHash);
  }

  /**
   * Process external dependencies asynchronously
   */
  private async processExternalDependenciesAsync(transactionId: string, dto: CreateTransactionDto): Promise<void> {
    try {
      // Use circuit breaker for external service calls
      const [conversionRate, lightningInvoice] = await Promise.all([
        this.circuitBreaker.execute(
          'conversion-service',
          () => this.conversionService.getCurrentRate('BTC', 'KES'),
          () => this.getCachedExchangeRate(), // Fallback to cached rate
        ),
        this.circuitBreaker.execute(
          'lightning-service',
          () => this.createLightningInvoice(transactionId, dto),
          () => this.createFallbackInvoice(transactionId, dto), // Fallback invoice
        ),
      ]);

      // Calculate amounts
      const feeAmount = this.calculateFee(dto.kesAmount);
      const totalKesAmount = dto.kesAmount + feeAmount;
      const btcAmount = totalKesAmount / conversionRate.finalRate;

      // Update transaction with calculated values
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          btcAmount: toPrismaDecimal(btcAmount),
          exchangeRate: toPrismaDecimal(conversionRate.finalRate),
          feeAmount: toPrismaDecimal(feeAmount),
          totalKesAmount: toPrismaDecimal(totalKesAmount),
          status: TransactionStatus.LIGHTNING_PENDING,
        },
      });

      // Invalidate cache
      await this.invalidateTransactionCache(transactionId);

      this.logger.log(`External dependencies processed for transaction: ${transactionId}`);
    } catch (error) {
      this.logger.error(`Failed to process external dependencies for transaction ${transactionId}:`, error);
      
      // Update transaction status to failed
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.FAILED,
          // Store error details in metadata
        },
      });
    }
  }

  /**
   * Create transaction record
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
   * Create Lightning invoice with retry logic
   */
  private async createLightningInvoice(transactionId: string, dto: CreateTransactionDto): Promise<any> {
    const result = await this.retryService.executeWithRetry(
      () => this.generateLightningInvoice(transactionId, dto),
      {
        maxAttempts: TRANSACTION_CONSTANTS.MAX_RETRY_ATTEMPTS,
        retryCondition: (error: any) => this.errorHandler.isRetryableError(error),
      }
    );

    if (!result.success) {
      throw new Error('Failed to create Lightning invoice');
    }

    return result.data;
  }

  /**
   * Generate Lightning invoice
   */
  private async generateLightningInvoice(transactionId: string, dto: CreateTransactionDto): Promise<void> {
    // This would integrate with the Lightning service
    await this.prisma.lightningInvoice.create({
      data: {
        id: uuidv4(),
        paymentHash: `ln_${Date.now()}`,
        paymentRequest: `lnbc${dto.kesAmount}...`, // Placeholder
        amountSats: BigInt(Math.round(dto.kesAmount * 100_000_000)),
        amountKes: dto.kesAmount,
        description: `BitPesa Bridge - ${dto.transactionType}`,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + TRANSACTION_CONSTANTS.INVOICE_EXPIRATION_MS),
        transactionId: transactionId,
      },
    });
  }

  /**
   * Get cached exchange rate
   */
  private async getCachedExchangeRate(): Promise<any> {
    const cachedRate = await this.redis.get('exchange_rate:BTC:KES');
    if (cachedRate) {
      return cachedRate;
    }
    
    // Return a default rate if no cache
    return {
      fromCurrency: 'BTC',
      toCurrency: 'KES',
      rate: 5000000,
      finalRate: 5000000,
      timestamp: new Date(),
    };
  }

  /**
   * Create fallback invoice
   */
  private async createFallbackInvoice(transactionId: string, dto: CreateTransactionDto): Promise<void> {
    await this.prisma.lightningInvoice.create({
      data: {
        id: uuidv4(),
        paymentHash: `fallback_${Date.now()}`,
        paymentRequest: `lnbc_fallback_${dto.kesAmount}`,
        amountSats: BigInt(Math.round(dto.kesAmount * 100_000_000)),
        amountKes: dto.kesAmount,
        description: `BitPesa Bridge - ${dto.transactionType} (Fallback)`,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + TRANSACTION_CONSTANTS.INVOICE_EXPIRATION_MS),
        transactionId: transactionId,
      },
    });
  }

  /**
   * Invalidate transaction cache
   */
  private async invalidateTransactionCache(identifier: string): Promise<void> {
    try {
      await Promise.all([
        this.redis.del(`transaction:${identifier}`),
        this.redis.del(`status:${identifier}`),
      ]);
    } catch (error) {
      this.logger.warn(`Failed to invalidate cache for ${identifier}`, error);
    }
  }

  /**
   * Generate payment hash
   */
  private generatePaymentHash(): string {
    return crypto.createHash('sha256')
      .update(uuidv4() + Date.now().toString())
      .digest('hex');
  }

  /**
   * Calculate fee
   */
  private calculateFee(amount: number): number {
    const fee = Math.max(amount * TRANSACTION_CONSTANTS.FEE_PERCENTAGE, 5);
    return Math.round(fee * 100) / 100;
  }

  /**
   * Validate transaction amount
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
   * Map transaction to response format
   */
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
