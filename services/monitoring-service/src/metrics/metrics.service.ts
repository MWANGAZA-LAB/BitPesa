import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrometheusService } from './prometheus.service';

export interface SystemMetrics {
  timestamp: Date;
  services: {
    [serviceName: string]: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      responseTime: number;
      uptime: number;
      errorRate: number;
    };
  };
  transactions: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    totalVolume: number;
    averageAmount: number;
  };
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    databaseConnections: number;
    cacheHitRate: number;
  };
  security: {
    failedLogins: number;
    blockedRequests: number;
    suspiciousActivities: number;
    rateLimitHits: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notificationChannels: string[];
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly alertRules: AlertRule[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly prometheus: PrometheusService,
  ) {
    this.initializeAlertRules();
  }

  async collectSystemMetrics(): Promise<SystemMetrics> {
    this.logger.log('Collecting system metrics');

    const timestamp = new Date();
    
    // Collect service health metrics
    const services = await this.collectServiceMetrics();
    
    // Collect transaction metrics
    const transactions = await this.collectTransactionMetrics();
    
    // Collect performance metrics
    const performance = await this.collectPerformanceMetrics();
    
    // Collect security metrics
    const security = await this.collectSecurityMetrics();

    const metrics: SystemMetrics = {
      timestamp,
      services,
      transactions,
      performance,
      security,
    };

    // Store metrics in database
    await this.storeMetrics(metrics);

    // Check for alerts
    await this.checkAlerts(metrics);

    return metrics;
  }

  private async collectServiceMetrics(): Promise<SystemMetrics['services']> {
    const services = ['api-gateway', 'lightning-service', 'mpesa-service', 'transaction-service'];
    const serviceMetrics: SystemMetrics['services'] = {};

    for (const serviceName of services) {
      try {
        // In a real implementation, you would call each service's health endpoint
        const healthData = await this.checkServiceHealth(serviceName);
        
        serviceMetrics[serviceName] = {
          status: healthData.status,
          responseTime: healthData.responseTime,
          uptime: healthData.uptime,
          errorRate: healthData.errorRate,
        };
      } catch (error) {
        this.logger.error(`Failed to collect metrics for ${serviceName}`, error);
        serviceMetrics[serviceName] = {
          status: 'unhealthy',
          responseTime: 0,
          uptime: 0,
          errorRate: 1,
        };
      }
    }

    return serviceMetrics;
  }

  private async collectTransactionMetrics(): Promise<SystemMetrics['transactions']> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get transaction counts by status
    const [total, pending, completed, failed] = await Promise.all([
      this.prisma.transaction.count(),
      this.prisma.transaction.count({ where: { status: 'PENDING' } }),
      this.prisma.transaction.count({ where: { status: 'COMPLETED' } }),
      this.prisma.transaction.count({ where: { status: 'FAILED' } }),
    ]);

    // Get transaction volume for last 24 hours
    const volumeResult = await this.prisma.transaction.aggregate({
      where: {
        createdAt: { gte: oneDayAgo },
        status: 'COMPLETED',
      },
      _sum: { kesAmount: true },
    });

    const totalVolume = Number(volumeResult._sum.kesAmount || 0);
    const averageAmount = total > 0 ? totalVolume / completed : 0;

    return {
      total,
      pending,
      completed,
      failed,
      totalVolume,
      averageAmount,
    };
  }

  private async collectPerformanceMetrics(): Promise<SystemMetrics['performance']> {
    // In a real implementation, you would collect actual system metrics
    // For now, we'll simulate some metrics
    const cpuUsage = Math.random() * 100;
    const memoryUsage = Math.random() * 100;
    const diskUsage = Math.random() * 100;
    
    // Get database connection count (simplified)
    const databaseConnections = Math.floor(Math.random() * 20) + 5;
    
    // Get cache hit rate (simplified)
    const cacheHitRate = Math.random() * 100;

    return {
      cpuUsage,
      memoryUsage,
      diskUsage,
      databaseConnections,
      cacheHitRate,
    };
  }

  private async collectSecurityMetrics(): Promise<SystemMetrics['security']> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get security metrics from audit logs
    const [failedLogins, blockedRequests, suspiciousActivities, rateLimitHits] = await Promise.all([
      this.prisma.auditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          createdAt: { gte: oneHourAgo },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          action: 'REQUEST_BLOCKED',
          createdAt: { gte: oneHourAgo },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          action: 'SUSPICIOUS_ACTIVITY',
          createdAt: { gte: oneHourAgo },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          action: 'RATE_LIMIT_EXCEEDED',
          createdAt: { gte: oneHourAgo },
        },
      }),
    ]);

    return {
      failedLogins,
      blockedRequests,
      suspiciousActivities,
      rateLimitHits,
    };
  }

  private async checkServiceHealth(serviceName: string): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime: number;
    uptime: number;
    errorRate: number;
  }> {
    // In a real implementation, you would make HTTP requests to health endpoints
    // For now, we'll simulate the health check
    const responseTime = Math.random() * 1000;
    const uptime = Math.random() * 100;
    const errorRate = Math.random() * 0.1;

    let status: 'healthy' | 'unhealthy' | 'degraded';
    if (errorRate > 0.05 || responseTime > 5000) {
      status = 'unhealthy';
    } else if (errorRate > 0.01 || responseTime > 2000) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return { status, responseTime, uptime, errorRate };
  }

  private async storeMetrics(metrics: SystemMetrics): Promise<void> {
    try {
      await this.prisma.systemMetrics.create({
        data: {
          timestamp: metrics.timestamp,
          services: metrics.services,
          transactions: metrics.transactions,
          performance: metrics.performance,
          security: metrics.security,
        },
      });
    } catch (error) {
      this.logger.error('Failed to store metrics', error);
    }
  }

  private async checkAlerts(metrics: SystemMetrics): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      const shouldAlert = this.evaluateAlertRule(rule, metrics);
      if (shouldAlert) {
        await this.triggerAlert(rule, metrics);
      }
    }
  }

  private evaluateAlertRule(rule: AlertRule, metrics: SystemMetrics): boolean {
    // Simplified alert evaluation
    // In a real implementation, you would use a proper expression evaluator
    switch (rule.condition) {
      case 'high_error_rate':
        return Object.values(metrics.services).some(service => service.errorRate > rule.threshold);
      case 'high_response_time':
        return Object.values(metrics.services).some(service => service.responseTime > rule.threshold);
      case 'low_uptime':
        return Object.values(metrics.services).some(service => service.uptime < rule.threshold);
      case 'high_cpu_usage':
        return metrics.performance.cpuUsage > rule.threshold;
      case 'high_memory_usage':
        return metrics.performance.memoryUsage > rule.threshold;
      case 'high_disk_usage':
        return metrics.performance.diskUsage > rule.threshold;
      case 'high_failed_logins':
        return metrics.security.failedLogins > rule.threshold;
      case 'high_blocked_requests':
        return metrics.security.blockedRequests > rule.threshold;
      default:
        return false;
    }
  }

  private async triggerAlert(rule: AlertRule, metrics: SystemMetrics): Promise<void> {
    this.logger.warn(`Alert triggered: ${rule.name}`, {
      ruleId: rule.id,
      severity: rule.severity,
      condition: rule.condition,
      threshold: rule.threshold,
    });

    // Store alert in database
    await this.prisma.alert.create({
      data: {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: `Alert: ${rule.name} - ${rule.condition} exceeded threshold ${rule.threshold}`,
        metrics: metrics,
        resolved: false,
      },
    });

    // Send notifications
    for (const channel of rule.notificationChannels) {
      await this.sendNotification(channel, rule, metrics);
    }
  }

  private async sendNotification(channel: string, rule: AlertRule, metrics: SystemMetrics): Promise<void> {
    // In a real implementation, you would integrate with notification services
    // like Slack, email, SMS, etc.
    this.logger.log(`Sending notification via ${channel} for alert: ${rule.name}`);
  }

  private initializeAlertRules(): void {
    this.alertRules.push(
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: 'high_error_rate',
        threshold: 0.05,
        severity: 'high',
        enabled: true,
        notificationChannels: ['slack', 'email'],
      },
      {
        id: 'high-response-time',
        name: 'High Response Time',
        condition: 'high_response_time',
        threshold: 5000,
        severity: 'medium',
        enabled: true,
        notificationChannels: ['slack'],
      },
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage',
        condition: 'high_cpu_usage',
        threshold: 80,
        severity: 'medium',
        enabled: true,
        notificationChannels: ['slack'],
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        condition: 'high_memory_usage',
        threshold: 85,
        severity: 'high',
        enabled: true,
        notificationChannels: ['slack', 'email'],
      },
      {
        id: 'high-failed-logins',
        name: 'High Failed Logins',
        condition: 'high_failed_logins',
        threshold: 10,
        severity: 'high',
        enabled: true,
        notificationChannels: ['slack', 'email', 'sms'],
      },
    );
  }

  async getMetricsHistory(startDate: Date, endDate: Date): Promise<SystemMetrics[]> {
    return this.prisma.systemMetrics.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getActiveAlerts(): Promise<any[]> {
    return this.prisma.alert.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveAlert(alertId: string): Promise<void> {
    await this.prisma.alert.update({
      where: { id: alertId },
      data: { resolved: true, resolvedAt: new Date() },
    });
  }
}
