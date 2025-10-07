import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionService } from '../conversion/conversion.service';
import { NotificationService } from '../notification/notification.service';
import { LoggerService } from '../logger/logger.service';
import { CreateTransactionDto } from './dto';
import { Transaction, TransactionType, TransactionStatus, PaginatedResponse } from '@bitpesa/shared-types';
import { generateUniqueId, toPrismaDecimal } from '@bitpesa/shared-utils';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class TransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversionService: ConversionService,
    private readonly notificationService: NotificationService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('TransactionService');
  }

  async createTransaction(dto: CreateTransactionDto): Promise<Transaction> {
    this.logger.log(`Creating transaction: ${dto.transactionType} for ${dto.recipientPhone}`);

    try {
      // Generate unique payment hash
      const paymentHash = this.generatePaymentHash();
      
      // Get current exchange rate
      const exchangeRate = await this.conversionService.getCurrentRate('BTC', 'KES');
      if (!exchangeRate) {
        throw new InternalServerErrorException('Unable to get current exchange rate');
      }

      // Calculate amounts
      const feeAmount = this.calculateFee(dto.kesAmount);
      const totalKesAmount = dto.kesAmount + feeAmount;
      const btcAmount = totalKesAmount / exchangeRate.finalRate;

      // Create transaction
      const transaction = await this.prisma.transaction.create({
        data: {
          id: uuidv4(),
          paymentHash,
          transactionType: dto.transactionType,
          status: TransactionStatus.PENDING,
          btcAmount: toPrismaDecimal(btcAmount),
          kesAmount: toPrismaDecimal(dto.kesAmount),
          exchangeRate: toPrismaDecimal(exchangeRate.finalRate),
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
          invoiceExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        },
      });

      // Generate Lightning invoice
      await this.generateLightningInvoice(transaction);

      this.logger.log(`Transaction created: ${transaction.id} with payment hash: ${paymentHash}`);
      return this.mapTransactionToResponse(transaction);

    } catch (error) {
      this.logger.error('Failed to create transaction', error.stack);
      throw new InternalServerErrorException('Failed to create transaction');
    }
  }

  async getTransactionByPaymentHash(paymentHash: string): Promise<Transaction> {
    this.logger.log(`Fetching transaction with payment hash: ${paymentHash}`);

    const transaction = await this.prisma.transaction.findUnique({
      where: { paymentHash },
      include: {
        lightningInvoice: true,
        mpesaTransaction: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with payment hash ${paymentHash} not found`);
    }

    return this.mapTransactionToResponse(transaction);
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
    additionalData?: any
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
    // 1% fee with minimum 5 KES
    const fee = Math.max(amount * 0.01, 5);
    return Math.round(fee * 100) / 100; // Round to 2 decimal places
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
