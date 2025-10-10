import { Injectable, Logger } from '@nestjs/common';
import { PrismaService, RedisService, CircuitBreakerService } from '@bitpesa/shared-infrastructure';

export interface PerformanceMetrics {
  timestamp: Date;
  serviceName: string;
  endpoint?: string;
  method?: string;
  responseTime: number;
  statusCode?: number;
  errorCount: number;
  successCount: number;
  memoryUsage: number;
  cpuUsage: number;
  databaseConnections: number;
  cacheHitRate: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  database: DatabaseHealth;
  cache: CacheHealth;
  uptime: number;
  timestamp: Date;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  uptime: number;
  errorRate: number;
  lastChecked: Date;
}

export interface DatabaseHealth {
  status: 'healthy' | 'unhealthy';
  latency: number;
  connections: number;
  queryTime: number;
}

export interface CacheHealth {
  status: 'healthy' | 'unhealthy';
  latency: number;
  memory: number;
  hitRate: number;
}

@Injectable()
export class PerformanceMonitoringService {
  private readonly logger = new Logger(PerformanceMonitoringService.name);
  private readonly metricsBuffer: PerformanceMetrics[] = [];
  private readonly bufferSize = 100;
  private readonly flushInterval = 30000; // 30 seconds
  private flushTimer!: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.startMetricsFlush();
  }

  /**
   * Record performance metric
   */
  async recordMetric(metric: Omit<PerformanceMetrics, 'timestamp'>): Promise<void> {
    const fullMetric: PerformanceMetrics = {
      ...metric,
      timestamp: new Date(),
    };

    this.metricsBuffer.push(fullMetric);

    // Flush buffer if it's full
    if (this.metricsBuffer.length >= this.bufferSize) {
      await this.flushMetrics();
    }
  }

  /**
   * Record API request metric
   */
  async recordApiRequest(
    serviceName: string,
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
  ): Promise<void> {
    const isError = statusCode >= 400;
    
    await this.recordMetric({
      serviceName,
      endpoint,
      method,
      responseTime,
      statusCode,
      errorCount: isError ? 1 : 0,
      successCount: isError ? 0 : 1,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: await this.getCpuUsage(),
      databaseConnections: await this.getDatabaseConnections(),
      cacheHitRate: await this.getCacheHitRate(),
    });
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const [services, database, cache] = await Promise.all([
      this.getServicesHealth(),
      this.getDatabaseHealth(),
      this.getCacheHealth(),
    ]);

    const overallStatus = this.calculateOverallStatus(services, database, cache);

    return {
      status: overallStatus,
      services,
      database,
      cache,
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }

  /**
   * Get performance metrics for a time range
   */
  async getPerformanceMetrics(
    startDate: Date,
    endDate: Date,
    serviceName?: string,
  ): Promise<PerformanceMetrics[]> {
    const where: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (serviceName) {
      where.serviceName = serviceName;
    }

    return this.prisma.performanceMetrics.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 1000, // Limit results
    });
  }

  /**
   * Get service performance summary
   */
  async getServicePerformanceSummary(serviceName: string, hours: number = 24): Promise<{
    averageResponseTime: number;
    errorRate: number;
    totalRequests: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  }> {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const metrics = await this.prisma.performanceMetrics.findMany({
      where: {
        serviceName,
        timestamp: {
          gte: startDate,
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (metrics.length === 0) {
      return {
        averageResponseTime: 0,
        errorRate: 0,
        totalRequests: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
      };
    }

    const responseTimes = metrics.map((m: PerformanceMetrics) => m.responseTime).sort((a: number, b: number) => a - b);
    const totalErrors = metrics.reduce((sum: number, m: PerformanceMetrics) => sum + m.errorCount, 0);
    const totalSuccess = metrics.reduce((sum: number, m: PerformanceMetrics) => sum + m.successCount, 0);
    const totalRequests = totalErrors + totalSuccess;

    return {
      averageResponseTime: responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      totalRequests,
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)],
    };
  }

  /**
   * Get database performance metrics
   */
  async getDatabasePerformanceMetrics(): Promise<{
    averageQueryTime: number;
    slowQueries: any[];
    connectionCount: number;
    cacheHitRate: number;
  }> {
    const health = await this.prisma.healthCheck();
    
    // Get slow queries from the last hour
    const slowQueries = await this.prisma.$queryRaw`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements 
      WHERE mean_time > 1000
      ORDER BY mean_time DESC 
      LIMIT 10
    `;

    return {
      averageQueryTime: health.latency,
      slowQueries,
      connectionCount: health.connections,
      cacheHitRate: 0, // Would need to implement cache hit rate tracking
    };
  }

  /**
   * Get cache performance metrics
   */
  async getCachePerformanceMetrics(): Promise<{
    hitRate: number;
    memoryUsage: number;
    keyCount: number;
    operationsPerSecond: number;
  }> {
    const stats = await this.redis.getStats();
    
    return {
      hitRate: stats.stats?.keyspace_hits / (stats.stats?.keyspace_hits + stats.stats?.keyspace_misses) || 0,
      memoryUsage: stats.memory || 0,
      keyCount: 0, // Would need to implement key counting
      operationsPerSecond: 0, // Would need to implement OPS tracking
    };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): Map<string, any> {
    return this.circuitBreaker.getAllBreakerStates();
  }

  /**
   * Start metrics flush timer
   */
  private startMetricsFlush(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushMetrics();
    }, this.flushInterval);
  }

  /**
   * Flush metrics buffer to database
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    try {
      const metricsToFlush = [...this.metricsBuffer];
      this.metricsBuffer.length = 0;

      // Batch insert metrics
      await this.prisma.performanceMetrics.createMany({
        data: metricsToFlush.map(metric => ({
          serviceName: metric.serviceName,
          endpoint: metric.endpoint,
          method: metric.method,
          responseTime: metric.responseTime,
          statusCode: metric.statusCode,
          errorCount: metric.errorCount,
          successCount: metric.successCount,
          timestamp: metric.timestamp,
        })),
      });

      this.logger.debug(`Flushed ${metricsToFlush.length} metrics to database`);
    } catch (error) {
      this.logger.error('Failed to flush metrics to database', error);
      // Re-add metrics to buffer if flush failed
      this.metricsBuffer.unshift(...this.metricsBuffer);
    }
  }

  /**
   * Get services health status
   */
  private async getServicesHealth(): Promise<ServiceHealth[]> {
    const services = ['transaction-service', 'mpesa-service', 'lightning-service', 'conversion-service'];
    const healthChecks: ServiceHealth[] = [];

    for (const serviceName of services) {
      try {
        const start = Date.now();
        // This would make an actual health check call to each service
        const responseTime = Date.now() - start;
        
        healthChecks.push({
          name: serviceName,
          status: 'healthy', // Would be determined by actual health check
          responseTime,
          uptime: process.uptime(),
          errorRate: 0, // Would be calculated from metrics
          lastChecked: new Date(),
        });
      } catch (error) {
        healthChecks.push({
          name: serviceName,
          status: 'unhealthy',
          responseTime: 0,
          uptime: 0,
          errorRate: 100,
          lastChecked: new Date(),
        });
      }
    }

    return healthChecks;
  }

  /**
   * Get database health status
   */
  private async getDatabaseHealth(): Promise<DatabaseHealth> {
    try {
      const health = await this.prisma.healthCheck();
      return {
        status: health.status === 'healthy' ? 'healthy' : 'unhealthy',
        latency: health.latency,
        connections: health.connections,
        queryTime: health.latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: 0,
        connections: 0,
        queryTime: 0,
      };
    }
  }

  /**
   * Get cache health status
   */
  private async getCacheHealth(): Promise<CacheHealth> {
    try {
      const health = await this.redis.healthCheck();
      return {
        status: health.status === 'healthy' ? 'healthy' : 'unhealthy',
        latency: health.latency,
        memory: health.memory,
        hitRate: 0, // Would need to implement hit rate calculation
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: 0,
        memory: 0,
        hitRate: 0,
      };
    }
  }

  /**
   * Calculate overall system status
   */
  private calculateOverallStatus(
    services: ServiceHealth[],
    database: DatabaseHealth,
    cache: CacheHealth,
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyServices = services.filter(s => s.status === 'unhealthy').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;

    if (database.status === 'unhealthy' || cache.status === 'unhealthy') {
      return 'unhealthy';
    }

    if (unhealthyServices > 0) {
      return 'unhealthy';
    }

    if (degradedServices > 0 || database.latency > 1000 || cache.latency > 100) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get CPU usage (simplified)
   */
  private async getCpuUsage(): Promise<number> {
    // This is a simplified implementation
    // In production, you'd want to use a proper CPU monitoring library
    return 0;
  }

  /**
   * Get database connections count
   */
  private async getDatabaseConnections(): Promise<number> {
    try {
      const health = await this.prisma.healthCheck();
      return health.connections;
    } catch {
      return 0;
    }
  }

  /**
   * Get cache hit rate
   */
  private async getCacheHitRate(): Promise<number> {
    // This would need to be implemented based on your caching strategy
    return 0;
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Flush remaining metrics
    this.flushMetrics();
  }
}
