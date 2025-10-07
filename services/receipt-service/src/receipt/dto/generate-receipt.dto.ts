import { IsString, IsOptional, IsEnum, IsNumber, IsDecimal } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ReceiptType {
  TRANSACTION = 'TRANSACTION',
  REFUND = 'REFUND',
  FEE = 'FEE',
}

export class GenerateReceiptDto {
  @ApiProperty({ description: 'Payment hash of the transaction' })
  @IsString()
  paymentHash: string;

  @ApiProperty({ description: 'Type of receipt', enum: ReceiptType })
  @IsEnum(ReceiptType)
  receiptType: ReceiptType;

  @ApiProperty({ description: 'Transaction type', required: false })
  @IsOptional()
  @IsString()
  transactionType?: string;

  @ApiProperty({ description: 'Amount in KES', required: false })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiProperty({ description: 'Fee amount in KES', required: false })
  @IsOptional()
  @IsNumber()
  feeAmount?: number;

  @ApiProperty({ description: 'Recipient phone number', required: false })
  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @ApiProperty({ description: 'M-Pesa receipt number', required: false })
  @IsOptional()
  @IsString()
  mpesaReceiptNumber?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Email address for receipt delivery', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: 'Phone number for SMS delivery', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
