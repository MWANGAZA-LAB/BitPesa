import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Transaction ID for this invoice',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  transactionId: string;

  @ApiProperty({
    description: 'Amount in satoshis',
    example: 100000,
    minimum: 1,
    maximum: 2100000000000000,
  })
  @IsNumber()
  @Min(1)
  @Max(2100000000000000)
  @Type(() => Number)
  amountSats: number;

  @ApiProperty({
    description: 'Invoice description',
    example: 'Payment for goods and services',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Invoice expiry time in seconds',
    example: 3600,
    minimum: 60,
    maximum: 86400,
    required: false,
    default: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(86400)
  @Type(() => Number)
  expiry?: number;
}
