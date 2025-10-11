/**
 * Monitoring and Observability Service
 * Provides comprehensive monitoring, metrics, and health checks
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  TRANSACTION_CONSTANTS, 
  SERVICE_PORTS, 
  ERROR_CODES,
  HTTP_STATUS 
} from '../constants/app.constants';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  responseTime: number;
  details?: Record<string, any>;
  error?: string;
}

export interface MetricsData {
  timestamp: string;
  service: string;
  metrics: {
    requests: {
      total: number;
      successful: number;
      failed: number;
      rate: number; // requests per minute
    };
    responseTime: {
      average: number;
      p95: number;
      p99: number;
    };
    errors: {
      total: number;
      byType: Record<string, number>;
    };
    circuitBreakers: {
      open: number;
      closed: number;
      halfOpen: number;
    };
    retries: {
      total: number;
      successful: number;
      failed: number;
    };
  };
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: MetricsData) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldownMs: number;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly metrics: Map<string, MetricsData> = new Map();
  private readonly healthChecks: Map<string, HealthCheckResult> = new Map();
  private readonly alertRules: AlertRule[] = [];
  private readonly alertHistory: Array<{ rule: AlertRule; timestamp: string; metrics: MetricsData }> = [];

  constructor(private readonly _configService: ConfigService) {
    this.initializeAlertRules();
    this.startMetricsCollection();
  }

  /**
   * Record a request metric
   */
  recordRequest(service: string, success: boolean, responseTime: number, errorType?: string): void {
    const timestamp = new Date().toISOString();
    const serviceMetrics = this.getOrCreateMetrics(service, timestamp);

    serviceMetrics.metrics.requests.total++;
    if (success) {
      serviceMetrics.metrics.requests.successful++;
    } else {
      serviceMetrics.metrics.requests.failed++;
    }

    // Update response time metrics
    this.updateResponseTimeMetrics(serviceMetrics.metrics.responseTime, responseTime);

    // Update error metrics
    if (errorType) {
      serviceMetrics.metrics.errors.total++;
      serviceMetrics.metrics.errors.byType[errorType] = 
        (serviceMetrics.metrics.errors.byType[errorType] || 0) + 1;
    }

    this.metrics.set(service, serviceMetrics);
  }

  /**
   * Record circuit breaker state change
   */
  recordCircuitBreakerState(service: string, state: 'open' | 'closed' | 'half-open'): void {
    const timestamp = new Date().toISOString();
    const serviceMetrics = this.getOrCreateMetrics(service, timestamp);

    switch (state) {
      case 'open':
        serviceMetrics.metrics.circuitBreakers.open++;
        break;
      case 'closed':
        serviceMetrics.metrics.circuitBreakers.closed++;
        break;
      case 'half-open':
        serviceMetrics.metrics.circuitBreakers.halfOpen++;
        break;
    }

    this.metrics.set(service, serviceMetrics);
  }

  /**
   * Record retry attempt
   */
  recordRetry(service: string, success: boolean): void {
    const timestamp = new Date().toISOString();
    const serviceMetrics = this.getOrCreateMetrics(service, timestamp);

    serviceMetrics.metrics.retries.total++;
    if (success) {
      serviceMetrics.metrics.retries.successful++;
    } else {
      serviceMetrics.metrics.retries.failed++;
    }

    this.metrics.set(service, serviceMetrics);
  }

  /**
   * Perform health check for a service
   */
  async performHealthCheck(service: string, healthCheckFn: () => Promise<any>): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const result = await healthCheckFn();
      const responseTime = Date.now() - startTime;
      
      const healthResult: HealthCheckResult = {
        service,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime,
        details: result,
      };

      this.healthChecks.set(service, healthResult);
      return healthResult;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const healthResult: HealthCheckResult = {
        service,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime,
        error: error.message,
      };

      this.healthChecks.set(service, healthResult);
      return healthResult;
    }
  }

  /**
   * Get current metrics for a service
   */
  getMetrics(service: string): MetricsData | undefined {
    return this.metrics.get(service);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): MetricsData[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get health check results
   */
  getHealthChecks(): HealthCheckResult[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * Get service health status
   */
  getServiceHealth(service: string): HealthCheckResult | undefined {
    return this.healthChecks.get(service);
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: HealthCheckResult[];
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  } {
    const services = this.getHealthChecks();
    const summary = {
      total: services.length,
      healthy: services.filter(s => s.status === 'healthy').length,
      degraded: services.filter(s => s.status === 'degraded').length,
      unhealthy: services.filter(s => s.status === 'unhealthy').length,
    };

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (summary.unhealthy > 0) {
      status = 'unhealthy';
    } else if (summary.degraded > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return { status, services, summary };
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    this.logger.log(`Added alert rule: ${rule.name}`);
  }

  /**
   * Get alert history
   */
  getAlertHistory(): Array<{ rule: AlertRule; timestamp: string; metrics: MetricsData }> {
    return [...this.alertHistory];
  }

  /**
   * Get current alerts
   */
  getCurrentAlerts(): Array<{ rule: AlertRule; timestamp: string; metrics: MetricsData }> {
    const now = Date.now();
    return this.alertHistory.filter(alert => {
      const alertTime = new Date(alert.timestamp).getTime();
      return (now - alertTime) < alert.rule.cooldownMs;
    });
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format: 'prometheus' | 'json'): string {
    if (format === 'prometheus') {
      return this.exportPrometheusMetrics();
    } else {
      return JSON.stringify(this.getAllMetrics(), null, 2);
    }
  }

  /**
   * Reset metrics for a service
   */
  resetMetrics(service: string): void {
    this.metrics.delete(service);
    this.logger.log(`Reset metrics for service: ${service}`);
  }

  /**
   * Reset all metrics
   */
  resetAllMetrics(): void {
    this.metrics.clear();
    this.logger.log('Reset all metrics');
  }

  /**
   * Get or create metrics for a service
   */
  private getOrCreateMetrics(service: string, timestamp: string): MetricsData {
    const existing = this.metrics.get(service);
    if (existing) {
      return existing;
    }

    return {
      timestamp,
      service,
      metrics: {
        requests: {
          total: 0,
          successful: 0,
          failed: 0,
          rate: 0,
        },
        responseTime: {
          average: 0,
          p95: 0,
          p99: 0,
        },
        errors: {
          total: 0,
          byType: {},
        },
        circuitBreakers: {
          open: 0,
          closed: 0,
          halfOpen: 0,
        },
        retries: {
          total: 0,
          successful: 0,
          failed: 0,
        },
      },
    };
  }

  /**
   * Update response time metrics
   */
  private updateResponseTimeMetrics(responseTimeMetrics: any, newResponseTime: number): void {
    // Simple moving average calculation
    const currentAverage = responseTimeMetrics.average;
    const totalRequests = responseTimeMetrics.totalRequests || 0;
    
    responseTimeMetrics.average = (currentAverage * totalRequests + newResponseTime) / (totalRequests + 1);
    responseTimeMetrics.totalRequests = totalRequests + 1;

    // Update percentiles (simplified implementation)
    if (newResponseTime > responseTimeMetrics.p95) {
      responseTimeMetrics.p95 = newResponseTime;
    }
    if (newResponseTime > responseTimeMetrics.p99) {
      responseTimeMetrics.p99 = newResponseTime;
    }
  }

  /**
   * Initialize default alert rules
   */
  private initializeAlertRules(): void {
    // High error rate alert
    this.addAlertRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      condition: (metrics) => {
        const errorRate = metrics.metrics.requests.failed / metrics.metrics.requests.total;
        return errorRate > 0.1; // 10% error rate
      },
      severity: 'high',
      message: 'Service has high error rate',
      cooldownMs: 300000, // 5 minutes
    });

    // High response time alert
    this.addAlertRule({
      id: 'high-response-time',
      name: 'High Response Time',
      condition: (metrics) => metrics.metrics.responseTime.average > 5000, // 5 seconds
      severity: 'medium',
      message: 'Service has high response time',
      cooldownMs: 600000, // 10 minutes
    });

    // Circuit breaker open alert
    this.addAlertRule({
      id: 'circuit-breaker-open',
      name: 'Circuit Breaker Open',
      condition: (metrics) => metrics.metrics.circuitBreakers.open > 0,
      severity: 'critical',
      message: 'Circuit breaker is open',
      cooldownMs: 180000, // 3 minutes
    });

    // High retry rate alert
    this.addAlertRule({
      id: 'high-retry-rate',
      name: 'High Retry Rate',
      condition: (metrics) => {
        const retryRate = metrics.metrics.retries.total / metrics.metrics.requests.total;
        return retryRate > 0.2; // 20% retry rate
      },
      severity: 'medium',
      message: 'Service has high retry rate',
      cooldownMs: 600000, // 10 minutes
    });
  }

  /**
   * Start metrics collection and alert checking
   */
  private startMetricsCollection(): void {
    // Calculate request rates every minute
    setInterval(() => {
      this.calculateRequestRates();
      this.checkAlerts();
    }, 60000); // 1 minute

    this.logger.log('Started metrics collection and alert monitoring');
  }

  /**
   * Calculate request rates for all services
   */
  private calculateRequestRates(): void {
    for (const [service, metrics] of this.metrics) {
      // Simple rate calculation (requests per minute)
      const now = Date.now();
      const metricsTime = new Date(metrics.timestamp).getTime();
      const timeDiffMinutes = (now - metricsTime) / 60000;
      
      if (timeDiffMinutes > 0) {
        metrics.metrics.requests.rate = metrics.metrics.requests.total / timeDiffMinutes;
      }
    }
  }

  /**
   * Check alert rules and trigger alerts
   */
  private checkAlerts(): void {
    for (const metrics of this.getAllMetrics()) {
      for (const rule of this.alertRules) {
        try {
          if (rule.condition(metrics)) {
            this.triggerAlert(rule, metrics);
          }
        } catch (error) {
          this.logger.error(`Error checking alert rule ${rule.id}:`, error);
        }
      }
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(rule: AlertRule, metrics: MetricsData): void {
    const now = new Date().toISOString();
    const recentAlert = this.alertHistory.find(alert => 
      alert.rule.id === rule.id && 
      (Date.now() - new Date(alert.timestamp).getTime()) < rule.cooldownMs
    );

    if (!recentAlert) {
      this.alertHistory.push({ rule, timestamp: now, metrics });
      this.logger.warn(`ALERT [${rule.severity.toUpperCase()}] ${rule.name}: ${rule.message}`, {
        service: metrics.service,
        rule: rule.id,
        metrics: metrics.metrics,
      });
    }
  }

  /**
   * Export metrics in Prometheus format
   */
  private exportPrometheusMetrics(): string {
    let output = '';
    
    for (const metrics of this.getAllMetrics()) {
      const service = metrics.service;
      
      // Request metrics
      output += `# HELP bitpesa_requests_total Total number of requests\n`;
      output += `# TYPE bitpesa_requests_total counter\n`;
      output += `bitpesa_requests_total{service="${service}"} ${metrics.metrics.requests.total}\n`;
      
      output += `# HELP bitpesa_requests_successful_total Total number of successful requests\n`;
      output += `# TYPE bitpesa_requests_successful_total counter\n`;
      output += `bitpesa_requests_successful_total{service="${service}"} ${metrics.metrics.requests.successful}\n`;
      
      output += `# HELP bitpesa_requests_failed_total Total number of failed requests\n`;
      output += `# TYPE bitpesa_requests_failed_total counter\n`;
      output += `bitpesa_requests_failed_total{service="${service}"} ${metrics.metrics.requests.failed}\n`;
      
      // Response time metrics
      output += `# HELP bitpesa_response_time_average Average response time in milliseconds\n`;
      output += `# TYPE bitpesa_response_time_average gauge\n`;
      output += `bitpesa_response_time_average{service="${service}"} ${metrics.metrics.responseTime.average}\n`;
      
      // Error metrics
      output += `# HELP bitpesa_errors_total Total number of errors\n`;
      output += `# TYPE bitpesa_errors_total counter\n`;
      output += `bitpesa_errors_total{service="${service}"} ${metrics.metrics.errors.total}\n`;
      
      // Circuit breaker metrics
      output += `# HELP bitpesa_circuit_breaker_open_total Total number of circuit breaker opens\n`;
      output += `# TYPE bitpesa_circuit_breaker_open_total counter\n`;
      output += `bitpesa_circuit_breaker_open_total{service="${service}"} ${metrics.metrics.circuitBreakers.open}\n`;
      
      // Retry metrics
      output += `# HELP bitpesa_retries_total Total number of retries\n`;
      output += `# TYPE bitpesa_retries_total counter\n`;
      output += `bitpesa_retries_total{service="${service}"} ${metrics.metrics.retries.total}\n`;
      
      output += '\n';
    }
    
    return output;
  }
}
