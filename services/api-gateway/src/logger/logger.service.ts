import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly context = 'API-Gateway';

  log(message: string, context?: string): void {
    console.log(`[${new Date().toISOString()}] [${context || this.context}] [LOG] ${message}`);
  }

  error(message: string, trace?: string, context?: string): void {
    console.error(`[${new Date().toISOString()}] [${context || this.context}] [ERROR] ${message}`);
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: string, context?: string): void {
    console.warn(`[${new Date().toISOString()}] [${context || this.context}] [WARN] ${message}`);
  }

  debug(message: string, context?: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${new Date().toISOString()}] [${context || this.context}] [DEBUG] ${message}`);
    }
  }

  verbose(message: string, context?: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] [${context || this.context}] [VERBOSE] ${message}`);
    }
  }
}
