import { Injectable, Logger } from '@nestjs/common';

export interface NotificationData {
  phoneNumber: string;
  message: string;
  type: 'sms' | 'email';
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async sendSms(phoneNumber: string, message: string): Promise<void> {
    this.logger.log(`Sending SMS to ${phoneNumber}: ${message}`);
    // Mock implementation - replace with actual SMS service
  }

  async sendEmail(email: string, subject: string, message: string): Promise<void> {
    this.logger.log(`Sending email to ${email}: ${subject}`);
    // Mock implementation - replace with actual email service
  }

  async sendNotification(data: NotificationData): Promise<void> {
    if (data.type === 'sms') {
      await this.sendSms(data.phoneNumber, data.message);
    } else if (data.type === 'email') {
      await this.sendEmail(data.phoneNumber, 'Transaction Update', data.message);
    }
  }
}
