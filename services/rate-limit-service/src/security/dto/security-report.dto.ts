import { IsString, IsNumber, IsBoolean, IsDateString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SecurityReportDto {
  @ApiProperty({ description: 'IP address' })
  @IsString()
  ipAddress: string;

  @ApiProperty({ description: 'Risk score (0-100)' })
  @IsNumber()
  riskScore: number;

  @ApiProperty({ description: 'Whether IP is blocked' })
  @IsBoolean()
  isBlocked: boolean;

  @ApiProperty({ description: 'Block reason if blocked', required: false })
  @IsString()
  blockReason?: string;

  @ApiProperty({ description: 'Block expiry time', required: false })
  @IsDateString()
  blockExpiry?: string;

  @ApiProperty({ description: 'Country code', required: false })
  @IsString()
  country?: string;

  @ApiProperty({ description: 'City', required: false })
  @IsString()
  city?: string;

  @ApiProperty({ description: 'ISP', required: false })
  @IsString()
  isp?: string;

  @ApiProperty({ description: 'Total requests in last 24h' })
  @IsNumber()
  totalRequests24h: number;

  @ApiProperty({ description: 'Failed requests in last 24h' })
  @IsNumber()
  failedRequests24h: number;

  @ApiProperty({ description: 'Suspicious activities', required: false })
  @IsArray()
  suspiciousActivities?: string[];

  @ApiProperty({ description: 'First seen timestamp' })
  @IsDateString()
  firstSeen: string;

  @ApiProperty({ description: 'Last seen timestamp' })
  @IsDateString()
  lastSeen: string;

  @ApiProperty({ description: 'User agents used', required: false })
  @IsArray()
  userAgents?: string[];

  @ApiProperty({ description: 'Request paths accessed', required: false })
  @IsArray()
  paths?: string[];
}
