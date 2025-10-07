import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RateLimitType {
  API = 'API',
  TRANSACTION = 'TRANSACTION',
  AUTHENTICATION = 'AUTHENTICATION',
  UPLOAD = 'UPLOAD',
}

export class CheckRateLimitDto {
  @ApiProperty({ description: 'IP address to check' })
  @IsString()
  ipAddress: string;

  @ApiProperty({ description: 'Type of rate limit', enum: RateLimitType })
  @IsEnum(RateLimitType)
  type: RateLimitType;

  @ApiProperty({ description: 'User agent string', required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'Request path', required: false })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({ description: 'Custom limit override', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  customLimit?: number;

  @ApiProperty({ description: 'Custom window in seconds', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3600)
  customWindow?: number;
}
