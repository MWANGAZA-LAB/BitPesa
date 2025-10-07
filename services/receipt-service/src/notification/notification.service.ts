import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as AWS from 'aws-sdk';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: any;
}

interface SmsOptions {
  to: string;
  message: string;
}

@Injectable()
export class NotificationService {
  private emailTransporter: nodemailer.Transporter;
  private sns: AWS.SNS;

  constructor() {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Initialize AWS SNS for SMS
    this.sns = new AWS.SNS({
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const html = await this.generateEmailTemplate(options.template, options.data);
      
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@bitpesa-bridge.com',
        to: options.to,
        subject: options.subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendSms(options: SmsOptions): Promise<void> {
    try {
      await this.sns.publish({
        Message: options.message,
        PhoneNumber: options.to,
      }).promise();
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw error;
    }
  }

  private async generateEmailTemplate(template: string, data: any): Promise<string> {
    // In a real implementation, you would load templates from files
    // For now, we'll return a simple HTML template
    if (template === 'receipt') {
      return `
        <html>
          <body>
            <h1>BitPesa Bridge - Payment Receipt</h1>
            <p>Thank you for your payment!</p>
            <p><strong>Receipt ID:</strong> ${data.receiptId}</p>
            <p><strong>Amount:</strong> ${data.totalAmount} KES</p>
            <p><strong>Payment Hash:</strong> ${data.paymentHash}</p>
            <p><strong>Date:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
            <p>This receipt is proof of your Bitcoin Lightning payment.</p>
          </body>
        </html>
      `;
    }
    
    return '<p>Email template not found</p>';
  }
}
