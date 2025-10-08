import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;
  private winston: winston.Logger;

  constructor() {
    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: 'monitoring-service' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ],
    });

    // Add file transport in production
    if (process.env.NODE_ENV === 'production') {
      this.winston.add(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
        })
      );
      this.winston.add(
        new winston.transports.File({
          filename: 'logs/combined.log',
        })
      );
    }
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    this.winston.info(message, { context: context || this.context });
  }

  error(message: any, trace?: string, context?: string) {
    this.winston.error(message, { trace, context: context || this.context });
  }

  warn(message: any, context?: string) {
    this.winston.warn(message, { context: context || this.context });
  }

  debug(message: any, context?: string) {
    this.winston.debug(message, { context: context || this.context });
  }

  verbose(message: any, context?: string) {
    this.winston.verbose(message, { context: context || this.context });
  }
}
