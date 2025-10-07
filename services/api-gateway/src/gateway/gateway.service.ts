import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

interface ServiceConfig {
  name: string;
  url: string;
  healthEndpoint: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime?: number;
}

interface GatewayMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  servicesStatus: Record<string, string>;
  uptime: number;
}

@Injectable()
export class GatewayService {
  private readonly services: ServiceConfig[] = [
    {
      name: 'lightning-service',
      url: process.env.LIGHTNING_SERVICE_URL || 'http://localhost:3001',
      healthEndpoint: '/health',
      status: 'unknown',
      lastCheck: new Date(),
    },
    {
      name: 'mpesa-service',
      url: process.env.MPESA_SERVICE_URL || 'http://localhost:3002',
      healthEndpoint: '/health',
      status: 'unknown',
      lastCheck: new Date(),
    },
    {
      name: 'transaction-service',
      url: process.env.TRANSACTION_SERVICE_URL || 'http://localhost:3003',
      healthEndpoint: '/health',
      status: 'unknown',
      lastCheck: new Date(),
    },
    {
      name: 'conversion-service',
      url: process.env.CONVERSION_SERVICE_URL || 'http://localhost:3004',
      healthEndpoint: '/health',
      status: 'unknown',
      lastCheck: new Date(),
    },
    {
      name: 'receipt-service',
      url: process.env.RECEIPT_SERVICE_URL || 'http://localhost:3005',
      healthEndpoint: '/health',
      status: 'unknown',
      lastCheck: new Date(),
    },
    {
      name: 'rate-limit-service',
      url: process.env.RATE_LIMIT_SERVICE_URL || 'http://localhost:3006',
      healthEndpoint: '/health',
      status: 'unknown',
      lastCheck: new Date(),
    },
  ];

  private readonly startTime = Date.now();
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private totalResponseTime = 0;

  constructor(private readonly logger: LoggerService) {
    // Start health check monitoring
    this.startHealthCheckMonitoring();
  }

  async getHealthStatus(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    services: Record<string, string>;
  }> {
    const healthyServices = this.services.filter(s => s.status === 'healthy').length;
    const totalServices = this.services.length;
    
    const overallStatus = healthyServices === totalServices ? 'healthy' : 'degraded';
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      services: this.services.reduce((acc, service) => {
        acc[service.name] = service.status;
        return acc;
      }, {} as Record<string, string>),
    };
  }

  async getAvailableServices(): Promise<ServiceConfig[]> {
    return this.services.map(service => ({
      ...service,
      responseTime: service.responseTime,
    }));
  }

  async getMetrics(): Promise<GatewayMetrics> {
    const averageResponseTime = this.totalRequests > 0 
      ? this.totalResponseTime / this.totalRequests 
      : 0;

    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      averageResponseTime,
      servicesStatus: this.services.reduce((acc, service) => {
        acc[service.name] = service.status;
        return acc;
      }, {} as Record<string, string>),
      uptime: Date.now() - this.startTime,
    };
  }

  recordRequest(success: boolean, responseTime: number): void {
    this.totalRequests++;
    if (success) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
    }
    this.totalResponseTime += responseTime;
  }

  private startHealthCheckMonitoring(): void {
    // Check service health every 30 seconds
    setInterval(async () => {
      await this.checkAllServicesHealth();
    }, 30000);

    // Initial health check
    this.checkAllServicesHealth();
  }

  private async checkAllServicesHealth(): Promise<void> {
    const healthCheckPromises = this.services.map(service => 
      this.checkServiceHealth(service)
    );

    await Promise.allSettled(healthCheckPromises);
  }

  private async checkServiceHealth(service: ServiceConfig): Promise<void> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${service.url}${service.healthEndpoint}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        service.status = 'healthy';
        service.responseTime = responseTime;
        service.lastCheck = new Date();
      } else {
        service.status = 'unhealthy';
        service.lastCheck = new Date();
      }
    } catch (error) {
      service.status = 'unhealthy';
      service.lastCheck = new Date();
      
      this.logger.warn(`Health check failed for ${service.name}: ${error.message}`);
    }
  }

  getServiceConfig(serviceName: string): ServiceConfig | undefined {
    return this.services.find(service => service.name === serviceName);
  }

  isServiceHealthy(serviceName: string): boolean {
    const service = this.getServiceConfig(serviceName);
    return service?.status === 'healthy' ?? false;
  }
}
