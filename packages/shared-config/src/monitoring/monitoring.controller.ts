import { Controller, Get, Param, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get overall system health' })
  @ApiResponse({ status: 200, description: 'System health status' })
  getSystemHealth() {
    return this.monitoringService.getSystemHealth();
  }

  @Get('health/:service')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get service health status' })
  @ApiParam({ name: 'service', description: 'Service name' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  getServiceHealth(@Param('service') service: string) {
    return this.monitoringService.getServiceHealth(service);
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all service metrics' })
  @ApiResponse({ status: 200, description: 'Service metrics' })
  getAllMetrics() {
    return this.monitoringService.getAllMetrics();
  }

  @Get('metrics/:service')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get service metrics' })
  @ApiParam({ name: 'service', description: 'Service name' })
  @ApiResponse({ status: 200, description: 'Service metrics' })
  getServiceMetrics(@Param('service') service: string) {
    return this.monitoringService.getMetrics(service);
  }

  @Get('metrics/prometheus')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get metrics in Prometheus format' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics' })
  getPrometheusMetrics() {
    const metrics = this.monitoringService.exportMetrics('prometheus');
    return metrics;
  }

  @Get('alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current alerts' })
  @ApiResponse({ status: 200, description: 'Current alerts' })
  getCurrentAlerts() {
    return this.monitoringService.getCurrentAlerts();
  }

  @Get('alerts/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get alert history' })
  @ApiResponse({ status: 200, description: 'Alert history' })
  getAlertHistory() {
    return this.monitoringService.getAlertHistory();
  }

  @Get('reset/:service')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset service metrics' })
  @ApiParam({ name: 'service', description: 'Service name' })
  @ApiResponse({ status: 200, description: 'Metrics reset successfully' })
  resetServiceMetrics(@Param('service') service: string) {
    this.monitoringService.resetMetrics(service);
    return { message: `Metrics reset for service: ${service}` };
  }

  @Get('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset all metrics' })
  @ApiResponse({ status: 200, description: 'All metrics reset successfully' })
  resetAllMetrics() {
    this.monitoringService.resetAllMetrics();
    return { message: 'All metrics reset successfully' };
  }
}
