import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LightningPayment, PaymentStatus } from '@bitpesa/shared-types';

export interface CreatePaymentData {
  userId: string;
  paymentHash: string;
  paymentRequest: string;
  amountSats: bigint;
  feeSats: bigint;
  status: PaymentStatus;
  settledAt?: Date;
  failureReason?: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePaymentData): Promise<LightningPayment> {
    try {
      this.logger.log(`Creating payment with payment hash: ${data.paymentHash}`);

      const payment = await this.prisma.lightningPayment.create({
        data: {
          userId: data.userId,
          paymentHash: data.paymentHash,
          paymentRequest: data.paymentRequest,
          amountSats: data.amountSats,
          feeSats: data.feeSats,
          status: data.status,
          settledAt: data.settledAt,
          failureReason: data.failureReason,
        },
      });

      this.logger.log(`Payment created successfully: ${payment.id}`);
      return payment;
    } catch (error) {
      this.logger.error(`Failed to create payment:`, error);
      throw error;
    }
  }

  async findByPaymentHash(paymentHash: string): Promise<LightningPayment | null> {
    try {
      this.logger.log(`Finding payment with payment hash: ${paymentHash}`);

      const payment = await this.prisma.lightningPayment.findUnique({
        where: { paymentHash },
      });

      return payment;
    } catch (error) {
      this.logger.error(`Failed to find payment by payment hash ${paymentHash}:`, error);
      throw error;
    }
  }

  async findById(id: string): Promise<LightningPayment | null> {
    try {
      this.logger.log(`Finding payment with ID: ${id}`);

      const payment = await this.prisma.lightningPayment.findUnique({
        where: { id },
      });

      return payment;
    } catch (error) {
      this.logger.error(`Failed to find payment by ID ${id}:`, error);
      throw error;
    }
  }

  async findByUserId(userId: string, limit: number = 20, offset: number = 0): Promise<LightningPayment[]> {
    try {
      this.logger.log(`Finding payments for user: ${userId}`);

      const payments = await this.prisma.lightningPayment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return payments;
    } catch (error) {
      this.logger.error(`Failed to find payments for user ${userId}:`, error);
      throw error;
    }
  }

  async updateStatus(paymentHash: string, status: PaymentStatus, settledAt?: Date, failureReason?: string): Promise<LightningPayment> {
    try {
      this.logger.log(`Updating payment status: ${paymentHash} -> ${status}`);

      const payment = await this.prisma.lightningPayment.update({
        where: { paymentHash },
        data: {
          status,
          settledAt,
          failureReason,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Payment status updated successfully: ${payment.id}`);
      return payment;
    } catch (error) {
      this.logger.error(`Failed to update payment status ${paymentHash}:`, error);
      throw error;
    }
  }

  async markAsSucceeded(paymentHash: string, settledAt?: Date): Promise<LightningPayment> {
    return this.updateStatus(paymentHash, PaymentStatus.SUCCEEDED, settledAt);
  }

  async markAsFailed(paymentHash: string, failureReason: string): Promise<LightningPayment> {
    return this.updateStatus(paymentHash, PaymentStatus.FAILED, undefined, failureReason);
  }

  async markAsInFlight(paymentHash: string): Promise<LightningPayment> {
    return this.updateStatus(paymentHash, PaymentStatus.IN_FLIGHT);
  }

  async getPendingPayments(): Promise<LightningPayment[]> {
    try {
      this.logger.log('Finding pending payments');

      const payments = await this.prisma.lightningPayment.findMany({
        where: {
          status: PaymentStatus.PENDING,
        },
      });

      return payments;
    } catch (error) {
      this.logger.error('Failed to find pending payments:', error);
      throw error;
    }
  }

  async getInFlightPayments(): Promise<LightningPayment[]> {
    try {
      this.logger.log('Finding in-flight payments');

      const payments = await this.prisma.lightningPayment.findMany({
        where: {
          status: PaymentStatus.IN_FLIGHT,
        },
      });

      return payments;
    } catch (error) {
      this.logger.error('Failed to find in-flight payments:', error);
      throw error;
    }
  }

  async getPaymentStats(userId?: string): Promise<{
    total: number;
    pending: number;
    inFlight: number;
    succeeded: number;
    failed: number;
    totalAmount: bigint;
    totalFees: bigint;
  }> {
    try {
      this.logger.log(`Getting payment stats for user: ${userId || 'all'}`);

      const where = userId ? { userId } : {};

      const [total, pending, inFlight, succeeded, failed, totalAmount, totalFees] = await Promise.all([
        this.prisma.lightningPayment.count({ where }),
        this.prisma.lightningPayment.count({ where: { ...where, status: PaymentStatus.PENDING } }),
        this.prisma.lightningPayment.count({ where: { ...where, status: PaymentStatus.IN_FLIGHT } }),
        this.prisma.lightningPayment.count({ where: { ...where, status: PaymentStatus.SUCCEEDED } }),
        this.prisma.lightningPayment.count({ where: { ...where, status: PaymentStatus.FAILED } }),
        this.prisma.lightningPayment.aggregate({
          where: { ...where, status: PaymentStatus.SUCCEEDED },
          _sum: { amountSats: true },
        }).then(result => result._sum.amountSats || BigInt(0)),
        this.prisma.lightningPayment.aggregate({
          where: { ...where, status: PaymentStatus.SUCCEEDED },
          _sum: { feeSats: true },
        }).then(result => result._sum.feeSats || BigInt(0)),
      ]);

      return { total, pending, inFlight, succeeded, failed, totalAmount, totalFees };
    } catch (error) {
      this.logger.error('Failed to get payment stats:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      this.logger.log(`Deleting payment: ${id}`);

      await this.prisma.lightningPayment.delete({
        where: { id },
      });

      this.logger.log(`Payment deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete payment ${id}:`, error);
      throw error;
    }
  }
}
