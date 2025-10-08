import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get system health metrics' })
  @ApiResponse({ status: 200, description: 'Health metrics retrieved' })
  async getHealthMetrics() {
    return this.metricsService.getHealthMetrics();
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved' })
  async getPerformanceMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.metricsService.getPerformanceMetrics(start, end);
  }

  @Post('custom')
  @ApiOperation({ summary: 'Record custom metric' })
  @ApiResponse({ status: 201, description: 'Custom metric recorded' })
  async recordCustomMetric(@Body() metricData: {
    name: string;
    value: number;
    tags?: Record<string, string>;
  }) {
    return this.metricsService.recordCustomMetric(
      metricData.name,
      metricData.value,
      metricData.tags,
    );
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get active alerts' })
  @ApiResponse({ status: 200, description: 'Active alerts retrieved' })
  async getActiveAlerts() {
    return this.metricsService.getActiveAlerts();
  }
}
