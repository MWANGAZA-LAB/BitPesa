import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateTransactionDto } from './dto';
import { Transaction, TransactionStatus } from '@bitpesa/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MinmoTransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('MinmoTransactionService');
  }

  /**
   * Create a new transaction (MinMo-powered)
   */
  async create(dto: CreateTransactionDto): Promise<Transaction> {
    this.logger.log(`Creating MinMo transaction: ${dto.transactionType} for ${dto.recipientPhone}`);

    try {
      const transaction = await this.prisma.transaction.create({
        data: {
          id: uuidv4(),
          transactionType: dto.transactionType,
          status: TransactionStatus.PENDING,
          btcAmount: 0, // Will be calculated
          kesAmount: dto.kesAmount,
          recipientPhone: dto.recipientPhone,
          recipientName: dto.recipientName,
          merchantCode: dto.merchantCode,
          accountNumber: dto.accountNumber,
          referenceNumber: dto.description,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          deviceInfo: dto.deviceInfo,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Transaction created: ${transaction.id}`);
      return this.mapToTransaction(transaction);
    } catch (error) {
      this.logger.error(`Failed to create transaction: ${(error as Error).message}`);
      throw new BadRequestException(`Failed to create transaction: ${(error as Error).message}`);
    }
  }

  /**
   * Update transaction
   */
  async update(id: string, data: Partial<Transaction>): Promise<Transaction> {
    try {
      const updatedTransaction = await this.prisma.transaction.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Transaction updated: ${id}`);
      return this.mapToTransaction(updatedTransaction);
    } catch (error) {
      this.logger.error(`Failed to update transaction ${id}: ${(error as Error).message}`);
      throw new BadRequestException(`Failed to update transaction: ${(error as Error).message}`);
    }
  }

  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<Transaction | null> {
    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { id },
      });

      return transaction ? this.mapToTransaction(transaction) : null;
    } catch (error) {
      this.logger.error(`Failed to find transaction ${id}: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Find transaction by MinMo swap ID
   */
  async findByMinmoSwapId(swapId: string): Promise<Transaction | null> {
    try {
      const transaction = await this.prisma.transaction.findFirst({
        where: { minmoSwapId: swapId },
      });

      return transaction ? this.mapToTransaction(transaction) : null;
    } catch (error) {
      this.logger.error(`Failed to find transaction by swap ID ${swapId}: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Find transaction by payment hash
   */
  async findByPaymentHash(paymentHash: string): Promise<Transaction | null> {
    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { paymentHash },
      });

      return transaction ? this.mapToTransaction(transaction) : null;
    } catch (error) {
      this.logger.error(`Failed to find transaction by payment hash ${paymentHash}: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get transaction status
   */
  async getStatus(id: string): Promise<{
    status: TransactionStatus;
    btcReceived: boolean;
    mpesaStatus: string;
    receipt?: string;
  }> {
    const transaction = await this.findById(id);
    
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      status: transaction.status,
      btcReceived: transaction.btcReceived || false,
      mpesaStatus: transaction.status === 'COMPLETED' ? 'completed' : 'pending',
      receipt: transaction.referenceNumber,
    };
  }

  /**
   * Get transactions by phone number
   */
  async findByPhoneNumber(phoneNumber: string, limit: number = 10): Promise<Transaction[]> {
    try {
      const transactions = await this.prisma.transaction.findMany({
        where: { recipientPhone: phoneNumber },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return transactions.map((t: any) => this.mapToTransaction(t));
    } catch (error) {
      this.logger.error(`Failed to find transactions for phone ${phoneNumber}: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get transaction statistics
   */
  async getStatistics(): Promise<{
    totalTransactions: number;
    completedTransactions: number;
    pendingTransactions: number;
    failedTransactions: number;
    totalVolumeKes: number;
    totalVolumeBtc: number;
  }> {
    try {
      const [
        totalTransactions,
        completedTransactions,
        pendingTransactions,
        failedTransactions,
        volumeStats,
      ] = await Promise.all([
        this.prisma.transaction.count(),
        this.prisma.transaction.count({ where: { status: 'COMPLETED' } }),
        this.prisma.transaction.count({ where: { status: 'PENDING' } }),
        this.prisma.transaction.count({ where: { status: 'FAILED' } }),
        this.prisma.transaction.aggregate({
          _sum: {
            kesAmount: true,
            btcAmount: true,
          },
        }),
      ]);

      return {
        totalTransactions,
        completedTransactions,
        pendingTransactions,
        failedTransactions,
        totalVolumeKes: Number(volumeStats._sum.kesAmount || 0),
        totalVolumeBtc: Number(volumeStats._sum.btcAmount || 0),
      };
    } catch (error) {
      this.logger.error(`Failed to get statistics: ${(error as Error).message}`);
      throw new BadRequestException('Failed to get statistics');
    }
  }

  /**
   * Map Prisma transaction to Transaction type
   */
  private mapToTransaction(prismaTransaction: any): Transaction {
    return {
      id: prismaTransaction.id,
      paymentHash: prismaTransaction.paymentHash,
      transactionType: prismaTransaction.transactionType,
      status: prismaTransaction.status,
      btcAmount: Number(prismaTransaction.btcAmount),
      kesAmount: Number(prismaTransaction.kesAmount),
      exchangeRate: Number(prismaTransaction.exchangeRate),
      feeAmount: Number(prismaTransaction.feeAmount),
      totalKesAmount: Number(prismaTransaction.totalKesAmount),
      recipientPhone: prismaTransaction.recipientPhone,
      recipientName: prismaTransaction.recipientName,
      merchantCode: prismaTransaction.merchantCode,
      accountNumber: prismaTransaction.accountNumber,
      referenceNumber: prismaTransaction.referenceNumber,
      ipAddress: prismaTransaction.ipAddress,
      userAgent: prismaTransaction.userAgent,
      deviceInfo: prismaTransaction.deviceInfo,
      invoiceExpiresAt: prismaTransaction.invoiceExpiresAt,
      paidAt: prismaTransaction.paidAt,
      completedAt: prismaTransaction.completedAt,
      createdAt: prismaTransaction.createdAt,
      updatedAt: prismaTransaction.updatedAt,
      // MinMo specific fields
      minmoSwapId: prismaTransaction.minmoSwapId,
      btcAddress: prismaTransaction.btcAddress,
      btcReceived: prismaTransaction.btcReceived,
      minmoFee: Number(prismaTransaction.minmoFee || 0),
      mpesaFee: Number(prismaTransaction.mpesaFee || 0),
      totalFees: Number(prismaTransaction.totalFees || 0),
      failureReason: prismaTransaction.failureReason,
    };
  }
}
