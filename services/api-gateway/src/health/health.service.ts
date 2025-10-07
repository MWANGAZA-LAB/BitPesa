import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

interface ReadinessStatus {
  ready: boolean;
  timestamp: string;
  checks: Record<string, boolean>;
}

interface LivenessStatus {
  alive: boolean;
  timestamp: string;
  uptime: number;
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();
  private readonly version = process.env.npm_package_version || '1.0.0';
  private readonly environment = process.env.NODE_ENV || 'development';

  constructor(private readonly logger: LoggerService) {}

  async getHealthStatus(): Promise<HealthStatus> {
    try {
      // Basic health checks
      const memoryUsage = process.memoryUsage();
      const uptime = Date.now() - this.startTime;
      
      // Check if memory usage is reasonable (less than 1GB)
      const isMemoryHealthy = memoryUsage.heapUsed < 1024 * 1024 * 1024;
      
      // Check if uptime is reasonable (at least 1 second)
      const isUptimeHealthy = uptime > 1000;
      
      const isHealthy = isMemoryHealthy && isUptimeHealthy;
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime,
        version: this.version,
        environment: this.environment,
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: this.version,
        environment: this.environment,
      };
    }
  }

  async getReadinessStatus(): Promise<ReadinessStatus> {
    const checks: Record<string, boolean> = {};
    
    try {
      // Check if the service can handle requests
      checks.memory = process.memoryUsage().heapUsed < 1024 * 1024 * 1024;
      checks.uptime = (Date.now() - this.startTime) > 1000;
      checks.environment = !!process.env.NODE_ENV;
      
      const ready = Object.values(checks).every(check => check);
      
      return {
        ready,
        timestamp: new Date().toISOString(),
        checks,
      };
    } catch (error) {
      this.logger.error('Readiness check failed', error);
      
      return {
        ready: false,
        timestamp: new Date().toISOString(),
        checks: { error: false },
      };
    }
  }

  async getLivenessStatus(): Promise<LivenessStatus> {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }
}
