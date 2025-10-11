import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LoggerService } from '../logger/logger.service';

export interface PrismaConfig {
  enableQueryLogging?: boolean;
  logLevel?: 'query' | 'error' | 'info' | 'warn';
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly logger: LoggerService,
    private readonly config: PrismaConfig = {}
  ) {
    const logConfig = [];
    
    if (config.enableQueryLogging !== false) {
      logConfig.push(
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      );
    }

    super({
      log: logConfig,
    });

    this.logger.setContext('PrismaService');
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected successfully');

    // Log database queries in development
    if (this.config.enableQueryLogging !== false && process.env.NODE_ENV === 'development') {
      this.$on('query', (e: any) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Params: ${e.params}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    this.$on('error', (e: any) => {
      this.logger.error('Database error:', e);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
