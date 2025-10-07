import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SecurityCheckDto {
  @ApiProperty({ description: 'IP address to check' })
  @IsString()
  ipAddress: string;

  @ApiProperty({ description: 'User agent string' })
  @IsString()
  userAgent: string;

  @ApiProperty({ description: 'Request path' })
  @IsString()
  path: string;

  @ApiProperty({ description: 'Request method' })
  @IsString()
  method: string;

  @ApiProperty({ description: 'Request headers', required: false })
  @IsOptional()
  headers?: Record<string, string>;

  @ApiProperty({ description: 'Request body size in bytes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bodySize?: number;

  @ApiProperty({ description: 'Referer header', required: false })
  @IsOptional()
  @IsString()
  referer?: string;

  @ApiProperty({ description: 'X-Forwarded-For header', required: false })
  @IsOptional()
  @IsString()
  xForwardedFor?: string;

  @ApiProperty({ description: 'X-Real-IP header', required: false })
  @IsOptional()
  @IsString()
  xRealIp?: string;
}
