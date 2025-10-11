import { Controller, Get, Param, HttpStatus, HttpCode } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  getSystemHealth() {
    return this.monitoringService.getSystemHealth();
  }

  @Get('health/:service')
  @HttpCode(HttpStatus.OK)
  getServiceHealth(@Param('service') service: string) {
    return this.monitoringService.getServiceHealth(service);
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  getAllMetrics() {
    return this.monitoringService.getAllMetrics();
  }

  @Get('metrics/:service')
  @HttpCode(HttpStatus.OK)
  getServiceMetrics(@Param('service') service: string) {
    return this.monitoringService.getMetrics(service);
  }

  @Get('metrics/prometheus')
  @HttpCode(HttpStatus.OK)
  getPrometheusMetrics() {
    const metrics = this.monitoringService.exportMetrics('prometheus');
    return metrics;
  }

  @Get('alerts')
  @HttpCode(HttpStatus.OK)
  getCurrentAlerts() {
    return this.monitoringService.getCurrentAlerts();
  }

  @Get('alerts/history')
  @HttpCode(HttpStatus.OK)
  getAlertHistory() {
    return this.monitoringService.getAlertHistory();
  }

  @Get('reset/:service')
  @HttpCode(HttpStatus.OK)
  resetServiceMetrics(@Param('service') service: string) {
    this.monitoringService.resetMetrics(service);
    return { message: `Metrics reset for service: ${service}` };
  }

  @Get('reset')
  @HttpCode(HttpStatus.OK)
  resetAllMetrics() {
    this.monitoringService.resetAllMetrics();
    return { message: 'All metrics reset successfully' };
  }
}
