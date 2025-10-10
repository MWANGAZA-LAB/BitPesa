import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedThroughput: number;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreakerState>();
  private readonly config: CircuitBreakerConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      failureThreshold: configService.get<number>('CIRCUIT_BREAKER_FAILURE_THRESHOLD', 5),
      recoveryTimeout: configService.get<number>('CIRCUIT_BREAKER_RECOVERY_TIMEOUT', 30000),
      monitoringPeriod: configService.get<number>('CIRCUIT_BREAKER_MONITORING_PERIOD', 60000),
      expectedThroughput: configService.get<number>('CIRCUIT_BREAKER_EXPECTED_THROUGHPUT', 100),
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    const breaker = this.getBreaker(serviceName);
    
    // Check if circuit is open
    if (breaker.state === 'OPEN') {
      if (Date.now() < breaker.nextAttemptTime) {
        this.logger.warn(`Circuit breaker OPEN for ${serviceName}, using fallback`);
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Circuit breaker OPEN for ${serviceName}`);
      } else {
        // Move to half-open state
        breaker.state = 'HALF_OPEN';
        this.logger.log(`Circuit breaker HALF_OPEN for ${serviceName}`);
      }
    }

    try {
      const result = await operation();
      
      // Success - reset failure count
      if (breaker.state === 'HALF_OPEN') {
        breaker.state = 'CLOSED';
        breaker.failureCount = 0;
        this.logger.log(`Circuit breaker CLOSED for ${serviceName}`);
      }
      
      return result;
    } catch (error) {
      this.handleFailure(breaker, serviceName, error);
      
      // Use fallback if available
      if (fallback) {
        this.logger.warn(`Using fallback for ${serviceName}`, error);
        return await fallback();
      }
      
      throw error;
    }
  }

  /**
   * Get circuit breaker state for a service
   */
  getBreakerState(serviceName: string): CircuitBreakerState {
    return this.getBreaker(serviceName);
  }

  /**
   * Reset circuit breaker for a service
   */
  resetBreaker(serviceName: string): void {
    const breaker = this.getBreaker(serviceName);
    breaker.state = 'CLOSED';
    breaker.failureCount = 0;
    breaker.lastFailureTime = 0;
    breaker.nextAttemptTime = 0;
    this.logger.log(`Circuit breaker reset for ${serviceName}`);
  }

  /**
   * Get all circuit breaker states
   */
  getAllBreakerStates(): Map<string, CircuitBreakerState> {
    return new Map(this.breakers);
  }

  private getBreaker(serviceName: string): CircuitBreakerState {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
      });
    }
    return this.breakers.get(serviceName)!;
  }

  private handleFailure(breaker: CircuitBreakerState, serviceName: string, error: any): void {
    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    this.logger.warn(`Circuit breaker failure for ${serviceName}`, {
      failureCount: breaker.failureCount,
      error: error.message,
    });

    // Check if threshold is reached
    if (breaker.failureCount >= this.config.failureThreshold) {
      breaker.state = 'OPEN';
      breaker.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      this.logger.error(`Circuit breaker OPEN for ${serviceName}`, {
        failureCount: breaker.failureCount,
        threshold: this.config.failureThreshold,
        nextAttemptTime: new Date(breaker.nextAttemptTime),
      });
    }
  }
}

/**
 * Retry service with exponential backoff
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  /**
   * Execute function with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelay?: number;
      maxDelay?: number;
      retryCondition?: (error: any) => boolean;
    } = {},
  ): Promise<{ success: boolean; data?: T; error?: any; attempts: number }> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      retryCondition = () => true,
    } = options;

    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        return { success: true, data: result, attempts: attempt };
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!retryCondition(error) || attempt === maxAttempts) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        
        this.logger.warn(`Retry attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms`, {
          error: error.message,
          attempt,
          maxAttempts,
        });
        
        await this.delay(delay);
      }
    }
    
    this.logger.error(`All retry attempts failed`, {
      attempts: maxAttempts,
      lastError: lastError?.message,
    });
    
    return { success: false, error: lastError, attempts: maxAttempts };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Rate limiter service
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly limits = new Map<string, { count: number; resetTime: number }>();

  /**
   * Check if request is within rate limit
   */
  async checkRateLimit(
    identifier: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const key = `${identifier}:${Math.floor(now / windowMs)}`;
    
    const current = this.limits.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (now > current.resetTime) {
      // Reset window
      current.count = 0;
      current.resetTime = now + windowMs;
    }
    
    current.count++;
    this.limits.set(key, current);
    
    const allowed = current.count <= limit;
    const remaining = Math.max(0, limit - current.count);
    
    if (!allowed) {
      this.logger.warn(`Rate limit exceeded for ${identifier}`, {
        count: current.count,
        limit,
        remaining,
        resetTime: new Date(current.resetTime),
      });
    }
    
    return {
      allowed,
      remaining,
      resetTime: current.resetTime,
    };
  }

  /**
   * Clean up expired rate limit entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, limit] of this.limits.entries()) {
      if (now > limit.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}
