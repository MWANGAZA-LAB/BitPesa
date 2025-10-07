import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../logger/logger.service';
import { NotificationService } from '../notification/notification.service';
import { GenerateReceiptDto, ReceiptType } from './dto/generate-receipt.dto';
import { ReceiptStatusDto, ReceiptStatus } from './dto/receipt-status.dto';
import * as PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import * as Handlebars from 'handlebars';
import { v4 as uuidv4 } from 'uuid';

interface ReceiptData {
  receiptId: string;
  paymentHash: string;
  transactionType: string;
  amount: number;
  feeAmount: number;
  totalAmount: number;
  recipientPhone: string;
  mpesaReceiptNumber?: string;
  exchangeRate: number;
  btcAmount: number;
  timestamp: string;
  notes?: string;
  qrCode?: string;
}

@Injectable()
export class ReceiptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
    private readonly notification: NotificationService,
  ) {}

  async generateReceipt(dto: GenerateReceiptDto): Promise<ReceiptData> {
    try {
      // Get transaction data
      const transaction = await this.prisma.transaction.findUnique({
        where: { paymentHash: dto.paymentHash },
        include: {
          lightningInvoice: true,
          mpesaTransactions: true,
        },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      const receiptId = uuidv4();
      const timestamp = new Date().toISOString();

      // Calculate amounts
      const amount = dto.amount || Number(transaction.kesAmount);
      const feeAmount = dto.feeAmount || Number(transaction.feeAmount);
      const totalAmount = amount + feeAmount;

      // Get exchange rate
      const exchangeRate = Number(transaction.exchangeRate);
      const btcAmount = Number(transaction.btcAmount);

      // Generate QR code for receipt verification
      const qrCodeData = JSON.stringify({
        receiptId,
        paymentHash: dto.paymentHash,
        timestamp,
        amount: totalAmount,
      });

      const qrCode = await QRCode.toDataURL(qrCodeData, {
        width: 200,
        margin: 2,
      });

      // Get M-Pesa receipt number
      const mpesaReceiptNumber = transaction.mpesaTransactions.find(
        (t) => t.mpesaReceiptNumber,
      )?.mpesaReceiptNumber;

      const receiptData: ReceiptData = {
        receiptId,
        paymentHash: dto.paymentHash,
        transactionType: dto.transactionType || transaction.transactionType,
        amount,
        feeAmount,
        totalAmount,
        recipientPhone: dto.recipientPhone || transaction.recipientPhone,
        mpesaReceiptNumber,
        exchangeRate,
        btcAmount,
        timestamp,
        notes: dto.notes,
        qrCode,
      };

      // Store receipt in Redis for quick access
      await this.redis.set(
        `receipt:${dto.paymentHash}`,
        JSON.stringify(receiptData),
        3600, // 1 hour TTL
      );

      // Store receipt metadata in database
      await this.prisma.receipt.create({
        data: {
          id: receiptId,
          paymentHash: dto.paymentHash,
          receiptType: dto.receiptType,
          status: ReceiptStatus.GENERATED,
          generatedAt: new Date(),
          data: receiptData,
        },
      });

      // Send receipt if contact info provided
      if (dto.email || dto.phoneNumber) {
        await this.sendReceipt(dto.paymentHash, {
          email: dto.email,
          phoneNumber: dto.phoneNumber,
        });
      }

      this.logger.log(`Receipt generated for payment hash: ${dto.paymentHash}`);

      return receiptData;
    } catch (error) {
      this.logger.error('Failed to generate receipt', error);
      throw error;
    }
  }

  async getReceiptByPaymentHash(paymentHash: string): Promise<ReceiptData> {
    try {
      // Try Redis first
      const cachedReceipt = await this.redis.get(`receipt:${paymentHash}`);
      if (cachedReceipt) {
        return JSON.parse(cachedReceipt);
      }

      // Fallback to database
      const receipt = await this.prisma.receipt.findFirst({
        where: { paymentHash },
        orderBy: { generatedAt: 'desc' },
      });

      if (!receipt) {
        throw new NotFoundException('Receipt not found');
      }

      return receipt.data as ReceiptData;
    } catch (error) {
      this.logger.error('Failed to get receipt', error);
      throw error;
    }
  }

  async generateReceiptPdf(paymentHash: string): Promise<Buffer> {
    try {
      const receiptData = await this.getReceiptByPaymentHash(paymentHash);
      
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });

        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('BitPesa Bridge', 50, 50);
        doc.fontSize(16).text('Payment Receipt', 50, 80);
        doc.moveDown();

        // Receipt details
        doc.fontSize(12);
        doc.text(`Receipt ID: ${receiptData.receiptId}`, 50, 120);
        doc.text(`Payment Hash: ${receiptData.paymentHash}`, 50, 140);
        doc.text(`Transaction Type: ${receiptData.transactionType}`, 50, 160);
        doc.text(`Amount: ${receiptData.amount.toLocaleString()} KES`, 50, 180);
        doc.text(`Fee: ${receiptData.feeAmount.toLocaleString()} KES`, 50, 200);
        doc.text(`Total: ${receiptData.totalAmount.toLocaleString()} KES`, 50, 220);
        doc.text(`Bitcoin Amount: ${receiptData.btcAmount} BTC`, 50, 240);
        doc.text(`Exchange Rate: 1 BTC = ${receiptData.exchangeRate.toLocaleString()} KES`, 50, 260);
        doc.text(`Recipient: ${receiptData.recipientPhone}`, 50, 280);
        
        if (receiptData.mpesaReceiptNumber) {
          doc.text(`M-Pesa Receipt: ${receiptData.mpesaReceiptNumber}`, 50, 300);
        }
        
        doc.text(`Date: ${new Date(receiptData.timestamp).toLocaleString()}`, 50, 320);

        // QR Code
        if (receiptData.qrCode) {
          doc.image(receiptData.qrCode, 400, 120, { width: 150, height: 150 });
        }

        // Footer
        doc.fontSize(10).text('Thank you for using BitPesa Bridge', 50, 500);
        doc.text('This receipt is proof of your Bitcoin Lightning payment', 50, 520);

        doc.end();
      });
    } catch (error) {
      this.logger.error('Failed to generate PDF receipt', error);
      throw error;
    }
  }

  async generateReceiptHtml(paymentHash: string): Promise<string> {
    try {
      const receiptData = await this.getReceiptByPaymentHash(paymentHash);
      
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>BitPesa Bridge Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .receipt-details { margin-bottom: 30px; }
            .qr-code { text-align: center; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .amount { font-size: 18px; font-weight: bold; color: #2d5a27; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BitPesa Bridge</h1>
            <h2>Payment Receipt</h2>
          </div>
          
          <div class="receipt-details">
            <p><span class="label">Receipt ID:</span> {{receiptId}}</p>
            <p><span class="label">Payment Hash:</span> {{paymentHash}}</p>
            <p><span class="label">Transaction Type:</span> {{transactionType}}</p>
            <p><span class="label">Amount:</span> <span class="amount">{{amount}} KES</span></p>
            <p><span class="label">Fee:</span> {{feeAmount}} KES</p>
            <p><span class="label">Total:</span> <span class="amount">{{totalAmount}} KES</span></p>
            <p><span class="label">Bitcoin Amount:</span> {{btcAmount}} BTC</p>
            <p><span class="label">Exchange Rate:</span> 1 BTC = {{exchangeRate}} KES</p>
            <p><span class="label">Recipient:</span> {{recipientPhone}}</p>
            {{#if mpesaReceiptNumber}}
            <p><span class="label">M-Pesa Receipt:</span> {{mpesaReceiptNumber}}</p>
            {{/if}}
            <p><span class="label">Date:</span> {{timestamp}}</p>
          </div>
          
          <div class="qr-code">
            <img src="{{qrCode}}" alt="Receipt QR Code" />
          </div>
          
          <div class="footer">
            <p>Thank you for using BitPesa Bridge</p>
            <p>This receipt is proof of your Bitcoin Lightning payment</p>
          </div>
        </body>
        </html>
      `;

      const compiledTemplate = Handlebars.compile(template);
      return compiledTemplate(receiptData);
    } catch (error) {
      this.logger.error('Failed to generate HTML receipt', error);
      throw error;
    }
  }

  async getReceiptStatus(paymentHash: string): Promise<ReceiptStatusDto> {
    try {
      const receipt = await this.prisma.receipt.findFirst({
        where: { paymentHash },
        orderBy: { generatedAt: 'desc' },
      });

      if (!receipt) {
        throw new NotFoundException('Receipt not found');
      }

      return {
        paymentHash: receipt.paymentHash,
        status: receipt.status as ReceiptStatus,
        receiptId: receipt.id,
        generatedAt: receipt.generatedAt.toISOString(),
        sentAt: receipt.sentAt?.toISOString(),
        deliveredAt: receipt.deliveredAt?.toISOString(),
        errorMessage: receipt.errorMessage,
        deliveryMethod: receipt.deliveryMethod,
      };
    } catch (error) {
      this.logger.error('Failed to get receipt status', error);
      throw error;
    }
  }

  async resendReceipt(
    paymentHash: string,
    contactInfo: { email?: string; phoneNumber?: string },
  ): Promise<void> {
    try {
      await this.sendReceipt(paymentHash, contactInfo);
      
      // Update receipt status
      await this.prisma.receipt.updateMany({
        where: { paymentHash },
        data: {
          status: ReceiptStatus.SENT,
          sentAt: new Date(),
          deliveryMethod: contactInfo.email ? 'email' : 'sms',
        },
      });

      this.logger.log(`Receipt resent for payment hash: ${paymentHash}`);
    } catch (error) {
      this.logger.error('Failed to resend receipt', error);
      throw error;
    }
  }

  private async sendReceipt(
    paymentHash: string,
    contactInfo: { email?: string; phoneNumber?: string },
  ): Promise<void> {
    try {
      const receiptData = await this.getReceiptByPaymentHash(paymentHash);
      
      if (contactInfo.email) {
        await this.notification.sendEmail({
          to: contactInfo.email,
          subject: 'BitPesa Bridge - Payment Receipt',
          template: 'receipt',
          data: receiptData,
        });
      }

      if (contactInfo.phoneNumber) {
        const message = `BitPesa Bridge Receipt\nReceipt ID: ${receiptData.receiptId}\nAmount: ${receiptData.totalAmount} KES\nPayment Hash: ${receiptData.paymentHash}`;
        
        await this.notification.sendSms({
          to: contactInfo.phoneNumber,
          message,
        });
      }
    } catch (error) {
      this.logger.error('Failed to send receipt', error);
      throw error;
    }
  }
}
