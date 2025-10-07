import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class StkPushDto {
  @ApiProperty({
    description: 'Phone number in format 254XXXXXXXXX',
    example: '254712345678',
  })
  @IsString()
  @Length(12, 12)
  phoneNumber: string;

  @ApiProperty({
    description: 'Amount in KES',
    example: 1000,
    minimum: 1,
    maximum: 500000,
  })
  @IsNumber()
  @Min(1)
  @Max(500000)
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Account reference',
    example: 'BP123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  accountReference?: string;

  @ApiProperty({
    description: 'Transaction description',
    example: 'Payment for goods and services',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  transactionDesc?: string;
}
