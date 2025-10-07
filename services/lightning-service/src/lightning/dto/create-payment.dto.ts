import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Transaction ID for this payment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  transactionId: string;

  @ApiProperty({
    description: 'Lightning payment request (BOLT11)',
    example: 'lnbc100n1p0...',
  })
  @IsString()
  paymentRequest: string;

  @ApiProperty({
    description: 'Amount in satoshis (optional, will be extracted from payment request)',
    example: 100000,
    minimum: 1,
    maximum: 2100000000000000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(2100000000000000)
  @Type(() => Number)
  amountSats?: number;

  @ApiProperty({
    description: 'Maximum fee in satoshis',
    example: 1000,
    minimum: 1,
    maximum: 1000000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  @Type(() => Number)
  feeLimitSats?: number;
}
