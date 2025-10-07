import { IsString, IsNumber, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RateLimitInfoDto {
  @ApiProperty({ description: 'IP address' })
  @IsString()
  ipAddress: string;

  @ApiProperty({ description: 'Current request count' })
  @IsNumber()
  current: number;

  @ApiProperty({ description: 'Rate limit' })
  @IsNumber()
  limit: number;

  @ApiProperty({ description: 'Remaining requests' })
  @IsNumber()
  remaining: number;

  @ApiProperty({ description: 'Window reset time' })
  @IsDateString()
  resetTime: string;

  @ApiProperty({ description: 'Whether limit is exceeded' })
  @IsBoolean()
  exceeded: boolean;

  @ApiProperty({ description: 'Retry after seconds', required: false })
  @IsNumber()
  retryAfter?: number;

  @ApiProperty({ description: 'Rate limit type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'First request time' })
  @IsDateString()
  firstRequest: string;

  @ApiProperty({ description: 'Last request time' })
  @IsDateString()
  lastRequest: string;
}
