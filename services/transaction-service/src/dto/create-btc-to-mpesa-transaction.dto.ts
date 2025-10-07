import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsPhoneNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum MpesaTransactionType {
  SEND_MONEY = 'SEND_MONEY',
  BUY_AIRTIME = 'BUY_AIRTIME',
  PAYBILL = 'PAYBILL',
  BUY_GOODS = 'BUY_GOODS',
  SCAN_QR = 'SCAN_QR',
}

export class CreateBtcToMpesaTransactionDto {
  @ApiProperty({
    description: 'Amount in BTC',
    example: 0.001,
    minimum: 0.00000001,
    maximum: 21,
  })
  @IsNumber()
  @Min(0.00000001)
  @Max(21)
  @Type(() => Number)
  amountBtc: number;

  @ApiProperty({
    description: 'Amount in Kenyan Shillings',
    example: 5000,
    minimum: 1,
    maximum: 1000000,
  })
  @IsNumber()
  @Min(1)
  @Max(1000000)
  @Type(() => Number)
  amountKes: number;

  @ApiProperty({
    description: 'Type of M-Pesa transaction',
    enum: MpesaTransactionType,
    example: MpesaTransactionType.SEND_MONEY,
  })
  @IsEnum(MpesaTransactionType)
  transactionType: MpesaTransactionType;

  @ApiProperty({
    description: 'Phone number for M-Pesa transaction',
    example: '+254712345678',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber('KE')
  phoneNumber?: string;

  @ApiProperty({
    description: 'Account number for paybill transactions',
    example: '123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({
    description: 'Till number for buy goods transactions',
    example: '123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  tillNumber?: string;

  @ApiProperty({
    description: 'Merchant code for QR code transactions',
    example: '123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  merchantCode?: string;

  @ApiProperty({
    description: 'Transaction description',
    example: 'Payment for goods and services',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Additional metadata for the transaction',
    example: { orderId: '12345', customerName: 'John Doe' },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
