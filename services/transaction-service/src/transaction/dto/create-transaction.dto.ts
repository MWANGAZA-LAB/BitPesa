import { IsString, IsNumber, IsEnum, IsOptional, IsPhoneNumber, Min, Max, Length } from 'class-validator';
import { TransactionType } from '@bitpesa/shared-types';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @IsPhoneNumber('KE')
  recipientPhone: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  recipientName?: string;

  @IsNumber()
  @Min(10) // Minimum 10 KES
  @Max(150000) // Maximum 150,000 KES
  kesAmount: number;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(5, 7)
  merchantCode?: string; // For paybill/till

  @IsOptional()
  @IsString()
  @Length(1, 20)
  accountNumber?: string; // For paybill

  @IsOptional()
  @IsString()
  @Length(1, 20)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  deviceInfo?: Record<string, any>;
}

export class SendMoneyDto extends CreateTransactionDto {
  transactionType: TransactionType = TransactionType.SEND_MONEY;
}

export class BuyAirtimeDto extends CreateTransactionDto {
  transactionType: TransactionType = TransactionType.BUY_AIRTIME;
}

export class PaybillDto extends CreateTransactionDto {
  transactionType: TransactionType = TransactionType.PAYBILL;

  @IsString()
  @Length(5, 7)
  merchantCode: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  accountNumber?: string;
}

export class BuyGoodsDto extends CreateTransactionDto {
  transactionType: TransactionType = TransactionType.BUY_GOODS;

  @IsString()
  @Length(5, 7)
  merchantCode: string; // Till number
}

export class ScanPayDto extends CreateTransactionDto {
  transactionType: TransactionType = TransactionType.SCAN_PAY;

  @IsString()
  qrCodeData: string; // Parsed QR code data
}
