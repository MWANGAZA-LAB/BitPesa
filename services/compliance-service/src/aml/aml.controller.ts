import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AMLService, TransactionRiskAssessment } from './aml.service';

@ApiTags('aml')
@Controller('aml')
export class AMLController {
  constructor(private readonly amlService: AMLService) {}

  @Post('assess')
  @ApiOperation({ summary: 'Assess transaction risk' })
  @ApiResponse({ status: 200, description: 'Risk assessment completed' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async assessTransactionRisk(@Body() transactionData: {
    id: string;
    amount: number;
    recipientPhone: string;
    transactionType: string;
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: any;
  }): Promise<TransactionRiskAssessment> {
    return this.amlService.assessTransactionRisk(transactionData);
  }

  @Get('report')
  @ApiOperation({ summary: 'Generate compliance report' })
  @ApiResponse({ status: 200, description: 'Compliance report generated' })
  async generateComplianceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.amlService.generateComplianceReport(start, end);
  }
}
