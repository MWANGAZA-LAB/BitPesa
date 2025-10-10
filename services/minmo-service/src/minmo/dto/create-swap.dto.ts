import { IsString, IsNumber, IsOptional, IsPositive, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSwapDto {
  @ApiProperty({
    description: 'Amount in KES to receive',
    example: 5000,
    minimum: 10,
    maximum: 150000,
  })
  @IsNumber()
  @IsPositive()
  @Min(10)
  @Max(150000)
  kesAmount: number;

  @ApiProperty({
    description: 'Recipient phone number',
    example: '254700000000',
  })
  @IsString()
  recipientPhone: string;

  @ApiProperty({
    description: 'Recipient name (optional)',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiProperty({
    description: 'Internal transaction ID',
    example: 'tx_123456789',
  })
  @IsString()
  transactionId: string;
}
