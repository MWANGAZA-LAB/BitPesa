import { IsString, IsEnum, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ReceiptStatus {
  PENDING = 'PENDING',
  GENERATED = 'GENERATED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export class ReceiptStatusDto {
  @ApiProperty({ description: 'Payment hash' })
  @IsString()
  paymentHash: string;

  @ApiProperty({ description: 'Receipt status', enum: ReceiptStatus })
  @IsEnum(ReceiptStatus)
  status: ReceiptStatus;

  @ApiProperty({ description: 'Receipt ID' })
  @IsString()
  receiptId: string;

  @ApiProperty({ description: 'Generated at timestamp' })
  @IsDateString()
  generatedAt: string;

  @ApiProperty({ description: 'Sent at timestamp', required: false })
  @IsOptional()
  @IsDateString()
  sentAt?: string;

  @ApiProperty({ description: 'Delivered at timestamp', required: false })
  @IsOptional()
  @IsDateString()
  deliveredAt?: string;

  @ApiProperty({ description: 'Error message if failed', required: false })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiProperty({ description: 'Delivery method', required: false })
  @IsOptional()
  @IsString()
  deliveryMethod?: string;
}
