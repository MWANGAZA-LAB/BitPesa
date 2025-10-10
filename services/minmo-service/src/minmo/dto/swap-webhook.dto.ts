import { IsString, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwapWebhookDto {
  @ApiProperty({
    description: 'Minmo swap ID',
    example: 'swap_123456789',
  })
  @IsString()
  swapId: string;

  @ApiProperty({
    description: 'Webhook event type',
    example: 'swap.confirmed',
    enum: ['swap.created', 'swap.confirmed', 'swap.completed', 'swap.failed', 'swap.expired'],
  })
  @IsString()
  event: 'swap.created' | 'swap.confirmed' | 'swap.completed' | 'swap.failed' | 'swap.expired';

  @ApiProperty({
    description: 'Swap status',
    example: 'confirmed',
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'Additional webhook data',
    example: { reason: 'Insufficient funds' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  data?: any;

  @ApiProperty({
    description: 'Webhook signature for verification',
    example: 'sha256=abc123...',
  })
  @IsString()
  signature: string;
}
