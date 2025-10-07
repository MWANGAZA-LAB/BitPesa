import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../logger/logger.service';

interface TransactionStatus {
  paymentHash: string;
  status: string;
  transactionType: string;
  amount: number;
  recipientPhone: string;
  createdAt: string;
  updatedAt: string;
  lightningStatus?: string;
  mpesaStatus?: string;
  mpesaReceiptNumber?: string;
}

interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    database: string;
    redis: string;
  };
}

@Injectable()
export class StatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async getTransactionStatus(paymentHash: string): Promise<TransactionStatus> {
    try {
      // Try Redis first for quick access
      const cachedStatus = await this.redis.get(`status:${paymentHash}`);
      if (cachedStatus) {
        return JSON.parse(cachedStatus);
      }

      // Get from database
      const transaction = await this.prisma.transaction.findUnique({
        where: { paymentHash },
        include: {
          lightningInvoice: true,
          mpesaTransactions: true,
        },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      const status: TransactionStatus = {
        paymentHash: transaction.paymentHash,
        status: transaction.status,
        transactionType: transaction.transactionType,
        amount: Number(transaction.kesAmount),
        recipientPhone: transaction.recipientPhone,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
        lightningStatus: transaction.lightningInvoice?.status,
        mpesaStatus: transaction.mpesaTransactions[0]?.status,
        mpesaReceiptNumber: transaction.mpesaTransactions.find(
          (t) => t.mpesaReceiptNumber,
        )?.mpesaReceiptNumber,
      };

      // Cache the status for 5 minutes
      await this.redis.set(
        `status:${paymentHash}`,
        JSON.stringify(status),
        300,
      );

      return status;
    } catch (error) {
      this.logger.error('Failed to get transaction status', error);
      throw error;
    }
  }

  async getHealthStatus(): Promise<HealthStatus> {
    try {
      const health: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'unknown',
          redis: 'unknown',
        },
      };

      // Check database connection
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        health.services.database = 'healthy';
      } catch (error) {
        health.services.database = 'unhealthy';
        health.status = 'unhealthy';
      }

      // Check Redis connection
      try {
        await this.redis.get('health-check');
        health.services.redis = 'healthy';
      } catch (error) {
        health.services.redis = 'unhealthy';
        health.status = 'unhealthy';
      }

      return health;
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'unknown',
          redis: 'unknown',
        },
      };
    }
  }
}
