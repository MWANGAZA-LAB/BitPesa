import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

export interface PrismaConfig {
  connectionLimit: number;
  connectionTimeout: number;
  queryTimeout: number;
  logLevel: Prisma.LogLevel[];
  enableMetrics: boolean;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly config: PrismaConfig;

  constructor(private readonly configService: ConfigService) {
    const config = {
      connectionLimit: configService.get<number>('DATABASE_CONNECTION_LIMIT', 20),
      connectionTimeout: configService.get<number>('DATABASE_CONNECTION_TIMEOUT', 10000),
      queryTimeout: configService.get<number>('DATABASE_QUERY_TIMEOUT', 30000),
      logLevel: configService.get<Prisma.LogLevel[]>('DATABASE_LOG_LEVEL', ['error', 'warn']),
      enableMetrics: configService.get<boolean>('DATABASE_ENABLE_METRICS', true),
    };

    super({
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL'),
        },
      },
      log: config.logLevel,
      errorFormat: 'pretty',
    });

    this.config = config;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
      
      // Configure connection pool
      await this.configureConnectionPool();
      
      // Enable query metrics if configured
      if (this.config.enableMetrics) {
        this.enableQueryMetrics();
      }
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Error disconnecting from database', error);
    }
  }

  private async configureConnectionPool(): Promise<void> {
    try {
      // Set connection pool parameters
      await this.$executeRaw`SET SESSION pool_size = ${this.config.connectionLimit}`;
      await this.$executeRaw`SET SESSION statement_timeout = ${this.config.queryTimeout}`;
      await this.$executeRaw`SET SESSION idle_in_transaction_session_timeout = ${this.config.connectionTimeout}`;
      
      this.logger.log(`Connection pool configured: limit=${this.config.connectionLimit}, timeout=${this.config.connectionTimeout}ms`);
    } catch (error) {
      this.logger.warn('Failed to configure connection pool', error);
    }
  }

  private enableQueryMetrics(): void {
    this.$on('query', (e) => {
      if (e.duration > 1000) { // Log slow queries (>1s)
        this.logger.warn(`Slow query detected: ${e.duration}ms`, {
          query: e.query,
          params: e.params,
          duration: e.duration,
        });
      }
    });
  }

  /**
   * Execute a transaction with retry logic
   */
  async executeTransaction<T>(
    fn: (prisma: Prisma.TransactionClient) => Promise<T>,
    maxRetries: number = 3,
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.$transaction(fn, {
          maxWait: this.config.connectionTimeout,
          timeout: this.config.queryTimeout,
        });
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (this.isRetryableError(error) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 100; // Exponential backoff
          this.logger.warn(`Transaction attempt ${attempt} failed, retrying in ${delay}ms`, error);
          await this.delay(delay);
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError!;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'P2002', // Unique constraint violation
      'P2025', // Record not found
      'P2034', // Transaction conflict
    ];
    
    return retryableErrors.some(code => error.code === code);
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{ status: string; latency: number; connections: number }> {
    const start = Date.now();
    
    try {
      await this.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      
      // Get connection count (PostgreSQL specific)
      const result = await this.$queryRaw<[{ count: bigint }]>`
        SELECT count(*) as count 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `;
      
      return {
        status: 'healthy',
        latency,
        connections: Number(result[0].count),
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        connections: 0,
      };
    }
  }
}
