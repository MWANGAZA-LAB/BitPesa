import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LightningInvoice, InvoiceStatus } from '@bitpesa/shared-types';

export interface CreateInvoiceData {
  userId: string;
  paymentHash: string;
  paymentRequest: string;
  amountSats: bigint;
  description?: string;
  expiresAt: Date;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateInvoiceData): Promise<LightningInvoice> {
    try {
      this.logger.log(`Creating invoice with payment hash: ${data.paymentHash}`);

      const invoice = await this.prisma.lightningInvoice.create({
        data: {
          userId: data.userId,
          paymentHash: data.paymentHash,
          paymentRequest: data.paymentRequest,
          amountSats: data.amountSats,
          description: data.description,
          expiresAt: data.expiresAt,
          status: InvoiceStatus.PENDING,
        },
      });

      this.logger.log(`Invoice created successfully: ${invoice.id}`);
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to create invoice:`, error);
      throw error;
    }
  }

  async findByPaymentHash(paymentHash: string): Promise<LightningInvoice | null> {
    try {
      this.logger.log(`Finding invoice with payment hash: ${paymentHash}`);

      const invoice = await this.prisma.lightningInvoice.findUnique({
        where: { paymentHash },
      });

      return invoice;
    } catch (error) {
      this.logger.error(`Failed to find invoice by payment hash ${paymentHash}:`, error);
      throw error;
    }
  }

  async findById(id: string): Promise<LightningInvoice | null> {
    try {
      this.logger.log(`Finding invoice with ID: ${id}`);

      const invoice = await this.prisma.lightningInvoice.findUnique({
        where: { id },
      });

      return invoice;
    } catch (error) {
      this.logger.error(`Failed to find invoice by ID ${id}:`, error);
      throw error;
    }
  }

  async findByUserId(userId: string, limit: number = 20, offset: number = 0): Promise<LightningInvoice[]> {
    try {
      this.logger.log(`Finding invoices for user: ${userId}`);

      const invoices = await this.prisma.lightningInvoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return invoices;
    } catch (error) {
      this.logger.error(`Failed to find invoices for user ${userId}:`, error);
      throw error;
    }
  }

  async updateStatus(paymentHash: string, status: InvoiceStatus, settledAt?: Date): Promise<LightningInvoice> {
    try {
      this.logger.log(`Updating invoice status: ${paymentHash} -> ${status}`);

      const invoice = await this.prisma.lightningInvoice.update({
        where: { paymentHash },
        data: {
          status,
          settledAt,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Invoice status updated successfully: ${invoice.id}`);
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to update invoice status ${paymentHash}:`, error);
      throw error;
    }
  }

  async markAsPaid(paymentHash: string): Promise<LightningInvoice> {
    return this.updateStatus(paymentHash, InvoiceStatus.PAID, new Date());
  }

  async markAsExpired(paymentHash: string): Promise<LightningInvoice> {
    return this.updateStatus(paymentHash, InvoiceStatus.EXPIRED);
  }

  async markAsCancelled(paymentHash: string): Promise<LightningInvoice> {
    return this.updateStatus(paymentHash, InvoiceStatus.CANCELLED);
  }

  async getExpiredInvoices(): Promise<LightningInvoice[]> {
    try {
      this.logger.log('Finding expired invoices');

      const invoices = await this.prisma.lightningInvoice.findMany({
        where: {
          status: InvoiceStatus.PENDING,
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      return invoices;
    } catch (error) {
      this.logger.error('Failed to find expired invoices:', error);
      throw error;
    }
  }

  async getPendingInvoices(): Promise<LightningInvoice[]> {
    try {
      this.logger.log('Finding pending invoices');

      const invoices = await this.prisma.lightningInvoice.findMany({
        where: {
          status: InvoiceStatus.PENDING,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      return invoices;
    } catch (error) {
      this.logger.error('Failed to find pending invoices:', error);
      throw error;
    }
  }

  async getInvoiceStats(userId?: string): Promise<{
    total: number;
    pending: number;
    paid: number;
    expired: number;
    cancelled: number;
  }> {
    try {
      this.logger.log(`Getting invoice stats for user: ${userId || 'all'}`);

      const where = userId ? { userId } : {};

      const [total, pending, paid, expired, cancelled] = await Promise.all([
        this.prisma.lightningInvoice.count({ where }),
        this.prisma.lightningInvoice.count({ where: { ...where, status: InvoiceStatus.PENDING } }),
        this.prisma.lightningInvoice.count({ where: { ...where, status: InvoiceStatus.PAID } }),
        this.prisma.lightningInvoice.count({ where: { ...where, status: InvoiceStatus.EXPIRED } }),
        this.prisma.lightningInvoice.count({ where: { ...where, status: InvoiceStatus.CANCELLED } }),
      ]);

      return { total, pending, paid, expired, cancelled };
    } catch (error) {
      this.logger.error('Failed to get invoice stats:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      this.logger.log(`Deleting invoice: ${id}`);

      await this.prisma.lightningInvoice.delete({
        where: { id },
      });

      this.logger.log(`Invoice deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete invoice ${id}:`, error);
      throw error;
    }
  }
}
