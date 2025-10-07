import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    console.log(`[${context || this.context || 'RateLimitService'}] ${message}`);
  }

  error(message: any, trace?: string, context?: string) {
    console.error(`[${context || this.context || 'RateLimitService'}] ${message}`);
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: any, context?: string) {
    console.warn(`[${context || this.context || 'RateLimitService'}] ${message}`);
  }

  debug(message: any, context?: string) {
    console.debug(`[${context || this.context || 'RateLimitService'}] ${message}`);
  }

  verbose(message: any, context?: string) {
    console.log(`[${context || this.context || 'RateLimitService'}] ${message}`);
  }
}
