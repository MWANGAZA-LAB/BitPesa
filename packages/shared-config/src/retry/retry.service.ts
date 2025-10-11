/**
 * Retry service for handling retryable operations
 * Implements exponential backoff with jitter for resilient operations
 */

import { Injectable, Logger } from '@nestjs/common';
import { ErrorHandlerService, AppError } from '../error/error-handler.service';
import { TRANSACTION_CONSTANTS } from '../constants/app.constants';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitterMs?: number;
  retryCondition?: (error: Error) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDelayMs: number;
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  constructor(private readonly errorHandler: ErrorHandlerService) {}

  /**
   * Execute an operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const {
      maxAttempts = TRANSACTION_CONSTANTS.MAX_RETRY_ATTEMPTS,
      baseDelayMs = TRANSACTION_CONSTANTS.RETRY_DELAY_MS,
      maxDelayMs = 30000,
      backoffMultiplier = 2,
      jitterMs = 1000,
      retryCondition = (error: Error) => this.errorHandler.isRetryableError(error),
    } = options;

    let lastError: Error;
    let totalDelayMs = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(`Attempt ${attempt}/${maxAttempts} starting`);
        
        const result = await operation();
        
        this.logger.debug(`Operation succeeded on attempt ${attempt}`);
        
        return {
          success: true,
          data: result,
          attempts: attempt,
          totalDelayMs,
        };
      } catch (error) {
        lastError = error as Error;
        
        this.logger.warn(`Attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
        
        // Check if we should retry
        if (attempt === maxAttempts || !retryCondition(lastError)) {
          this.logger.error(`Operation failed after ${attempt} attempts: ${lastError.message}`);
          
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalDelayMs,
          };
        }
        
        // Calculate delay for next attempt
        const delayMs = this.calculateDelay(attempt, baseDelayMs, maxDelayMs, backoffMultiplier, jitterMs);
        totalDelayMs += delayMs;
        
        this.logger.debug(`Waiting ${delayMs}ms before retry attempt ${attempt + 1}`);
        
        // Wait before next attempt
        await this.sleep(delayMs);
      }
    }
    
    return {
      success: false,
      error: lastError!,
      attempts: maxAttempts,
      totalDelayMs,
    };
  }

  /**
   * Execute multiple operations in parallel with retry logic
   */
  async executeMultipleWithRetry<T>(
    operations: Array<() => Promise<T>>,
    options: RetryOptions = {}
  ): Promise<Array<RetryResult<T>>> {
    this.logger.debug(`Executing ${operations.length} operations with retry logic`);
    
    const promises = operations.map(operation => 
      this.executeWithRetry(operation, options)
    );
    
    return Promise.all(promises);
  }

  /**
   * Execute operation with circuit breaker pattern
   */
  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitBreakerKey: string,
    options: RetryOptions & {
      failureThreshold?: number;
      recoveryTimeoutMs?: number;
      monitoringPeriodMs?: number;
    } = {}
  ): Promise<RetryResult<T>> {
    const {
      failureThreshold = 5,
      recoveryTimeoutMs = 60000,
      monitoringPeriodMs = 300000, // 5 minutes
    } = options;

    // Simple in-memory circuit breaker state
    // In production, this should be stored in Redis or similar
    const circuitBreakerState = this.getCircuitBreakerState(circuitBreakerKey);
    
    // Check if circuit is open
    if (circuitBreakerState.isOpen) {
      const timeSinceLastFailure = Date.now() - circuitBreakerState.lastFailureTime;
      
      if (timeSinceLastFailure < recoveryTimeoutMs) {
        throw new AppError(
          `Circuit breaker is open for ${circuitBreakerKey}`,
          'CIRCUIT_BREAKER_OPEN',
          503,
          { 
            circuitBreakerKey, 
            timeSinceLastFailure, 
            recoveryTimeoutMs 
          }
        );
      } else {
        // Try to close the circuit
        circuitBreakerState.isOpen = false;
        circuitBreakerState.failureCount = 0;
        this.logger.log(`Circuit breaker ${circuitBreakerKey} attempting recovery`);
      }
    }

    try {
      const result = await this.executeWithRetry(operation, options);
      
      if (result.success) {
        // Reset failure count on success
        circuitBreakerState.failureCount = 0;
        circuitBreakerState.lastSuccessTime = Date.now();
      } else {
        // Increment failure count
        circuitBreakerState.failureCount++;
        circuitBreakerState.lastFailureTime = Date.now();
        
        // Open circuit if threshold exceeded
        if (circuitBreakerState.failureCount >= failureThreshold) {
          circuitBreakerState.isOpen = true;
          this.logger.error(`Circuit breaker ${circuitBreakerKey} opened due to ${failureThreshold} consecutive failures`);
        }
      }
      
      return result;
    } catch (error) {
      circuitBreakerState.failureCount++;
      circuitBreakerState.lastFailureTime = Date.now();
      
      if (circuitBreakerState.failureCount >= failureThreshold) {
        circuitBreakerState.isOpen = true;
        this.logger.error(`Circuit breaker ${circuitBreakerKey} opened due to ${failureThreshold} consecutive failures`);
      }
      
      throw error;
    }
  }

  /**
   * Execute operation with timeout
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      this.createTimeoutPromise(timeoutMs),
    ]);
  }

  /**
   * Execute operation with both retry and timeout
   */
  async executeWithRetryAndTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    retryOptions: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    return this.executeWithRetry(
      () => this.executeWithTimeout(operation, timeoutMs),
      retryOptions
    );
  }

  /**
   * Calculate delay for retry attempt
   */
  private calculateDelay(
    attempt: number,
    baseDelayMs: number,
    maxDelayMs: number,
    backoffMultiplier: number,
    jitterMs: number
  ): number {
    // Exponential backoff
    const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * jitterMs;
    
    // Cap at maximum delay
    return Math.min(exponentialDelay + jitter, maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Get circuit breaker state (simple in-memory implementation)
   * In production, this should be stored in Redis or similar
   */
  private getCircuitBreakerState(key: string) {
    if (!this.circuitBreakerStates) {
      this.circuitBreakerStates = new Map();
    }
    
    if (!this.circuitBreakerStates.has(key)) {
      this.circuitBreakerStates.set(key, {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: 0,
        lastSuccessTime: 0,
      });
    }
    
    return this.circuitBreakerStates.get(key);
  }

  private circuitBreakerStates: Map<string, {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime: number;
    lastSuccessTime: number;
  }>;

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(circuitBreakerKey: string) {
    const state = this.getCircuitBreakerState(circuitBreakerKey);
    
    return {
      key: circuitBreakerKey,
      isOpen: state.isOpen,
      failureCount: state.failureCount,
      lastFailureTime: state.lastFailureTime,
      lastSuccessTime: state.lastSuccessTime,
      timeSinceLastFailure: Date.now() - state.lastFailureTime,
      timeSinceLastSuccess: Date.now() - state.lastSuccessTime,
    };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(circuitBreakerKey: string): void {
    const state = this.getCircuitBreakerState(circuitBreakerKey);
    state.isOpen = false;
    state.failureCount = 0;
    state.lastFailureTime = 0;
    state.lastSuccessTime = Date.now();
    
    this.logger.log(`Circuit breaker ${circuitBreakerKey} has been reset`);
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllCircuitBreakerStatuses() {
    const statuses = [];
    
    if (this.circuitBreakerStates) {
      for (const [key] of this.circuitBreakerStates) {
        statuses.push(this.getCircuitBreakerStatus(key));
      }
    }
    
    return statuses;
  }
}
