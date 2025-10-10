/**
 * Centralized error handling service
 * Provides consistent error handling across all services
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES, HTTP_STATUS } from './constants/app.constants';

export interface ErrorDetails {
  code: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  method?: string;
  stack?: string;
  context?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string = ERROR_CODES.INTERNAL_SERVER_ERROR,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, AppError);
  }
}

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  /**
   * Handle and log errors consistently
   */
  handleError(error: Error, context?: string): ErrorDetails {
    const errorDetails = this.createErrorDetails(error, context);
    
    // Log error based on severity
    if (errorDetails.statusCode >= 500) {
      this.logger.error(`[${errorDetails.code}] ${errorDetails.message}`, error.stack);
    } else if (errorDetails.statusCode >= 400) {
      this.logger.warn(`[${errorDetails.code}] ${errorDetails.message}`);
    } else {
      this.logger.log(`[${errorDetails.code}] ${errorDetails.message}`);
    }
    
    return errorDetails;
  }

  /**
   * Create standardized error details
   */
  private createErrorDetails(error: Error, context?: string): ErrorDetails {
    if (error instanceof AppError) {
      return {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        timestamp: error.timestamp,
        context: error.context,
        stack: error.stack,
      };
    }

    if (error instanceof HttpException) {
      return {
        code: this.getErrorCodeFromHttpStatus(error.getStatus()),
        message: error.message,
        statusCode: error.getStatus(),
        timestamp: new Date().toISOString(),
        stack: error.stack,
      };
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
        context: { validationError: error.message },
        stack: error.stack,
      };
    }

    // Handle database errors
    if (error.name === 'PrismaClientKnownRequestError') {
      return this.handlePrismaError(error);
    }

    // Handle network/timeout errors
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return {
        code: ERROR_CODES.EXTERNAL_SERVICE_UNAVAILABLE,
        message: 'Request timeout',
        statusCode: HTTP_STATUS.GATEWAY_TIMEOUT,
        timestamp: new Date().toISOString(),
        context: { timeout: true },
        stack: error.stack,
      };
    }

    // Default error handling
    return {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: error.message || 'Internal server error',
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      context: { originalError: error.name },
      stack: error.stack,
    };
  }

  /**
   * Handle Prisma database errors
   */
  private handlePrismaError(error: any): ErrorDetails {
    const timestamp = new Date().toISOString();
    
    switch (error.code) {
      case 'P2002':
        return {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Unique constraint violation',
          statusCode: HTTP_STATUS.CONFLICT,
          timestamp,
          context: { field: error.meta?.target },
          stack: error.stack,
        };
      
      case 'P2025':
        return {
          code: ERROR_CODES.TRANSACTION_NOT_FOUND,
          message: 'Record not found',
          statusCode: HTTP_STATUS.NOT_FOUND,
          timestamp,
          stack: error.stack,
        };
      
      case 'P2003':
        return {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Foreign key constraint violation',
          statusCode: HTTP_STATUS.BAD_REQUEST,
          timestamp,
          stack: error.stack,
        };
      
      default:
        return {
          code: ERROR_CODES.DATABASE_CONNECTION_ERROR,
          message: 'Database operation failed',
          statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          timestamp,
          context: { prismaCode: error.code },
          stack: error.stack,
        };
    }
  }

  /**
   * Get error code from HTTP status
   */
  private getErrorCodeFromHttpStatus(statusCode: number): string {
    switch (statusCode) {
      case HTTP_STATUS.BAD_REQUEST:
        return ERROR_CODES.VALIDATION_ERROR;
      case HTTP_STATUS.UNAUTHORIZED:
        return ERROR_CODES.VALIDATION_ERROR;
      case HTTP_STATUS.FORBIDDEN:
        return ERROR_CODES.VALIDATION_ERROR;
      case HTTP_STATUS.NOT_FOUND:
        return ERROR_CODES.TRANSACTION_NOT_FOUND;
      case HTTP_STATUS.CONFLICT:
        return ERROR_CODES.TRANSACTION_ALREADY_PROCESSED;
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        return ERROR_CODES.RATE_LIMIT_EXCEEDED;
      case HTTP_STATUS.BAD_GATEWAY:
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
      case HTTP_STATUS.GATEWAY_TIMEOUT:
        return ERROR_CODES.EXTERNAL_SERVICE_UNAVAILABLE;
      default:
        return ERROR_CODES.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * Create validation error
   */
  createValidationError(message: string, field?: string): AppError {
    return new AppError(
      message,
      ERROR_CODES.VALIDATION_ERROR,
      HTTP_STATUS.BAD_REQUEST,
      field ? { field } : undefined
    );
  }

  /**
   * Create not found error
   */
  createNotFoundError(resource: string, id?: string): AppError {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    return new AppError(
      message,
      ERROR_CODES.TRANSACTION_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      { resource, id }
    );
  }

  /**
   * Create conflict error
   */
  createConflictError(message: string, context?: Record<string, any>): AppError {
    return new AppError(
      message,
      ERROR_CODES.TRANSACTION_ALREADY_PROCESSED,
      HTTP_STATUS.CONFLICT,
      context
    );
  }

  /**
   * Create external service error
   */
  createExternalServiceError(service: string, operation: string): AppError {
    return new AppError(
      `${service} ${operation} failed`,
      ERROR_CODES.EXTERNAL_SERVICE_UNAVAILABLE,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      { service, operation }
    );
  }

  /**
   * Create rate limit error
   */
  createRateLimitError(): AppError {
    return new AppError(
      'Rate limit exceeded',
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      HTTP_STATUS.TOO_MANY_REQUESTS
    );
  }

  /**
   * Create transaction expired error
   */
  createTransactionExpiredError(transactionId: string): AppError {
    return new AppError(
      'Transaction has expired',
      ERROR_CODES.TRANSACTION_EXPIRED,
      HTTP_STATUS.BAD_REQUEST,
      { transactionId }
    );
  }

  /**
   * Create insufficient funds error
   */
  createInsufficientFundsError(required: number, available: number): AppError {
    return new AppError(
      'Insufficient funds',
      ERROR_CODES.INSUFFICIENT_FUNDS,
      HTTP_STATUS.BAD_REQUEST,
      { required, available }
    );
  }

  /**
   * Create M-Pesa error
   */
  createMpesaError(operation: string, details?: string): AppError {
    return new AppError(
      `M-Pesa ${operation} failed${details ? `: ${details}` : ''}`,
      ERROR_CODES.MPESA_REQUEST_FAILED,
      HTTP_STATUS.BAD_REQUEST,
      { operation, details }
    );
  }

  /**
   * Create MinMo error
   */
  createMinmoError(operation: string, details?: string): AppError {
    return new AppError(
      `MinMo ${operation} failed${details ? `: ${details}` : ''}`,
      ERROR_CODES.MINMO_API_ERROR,
      HTTP_STATUS.BAD_REQUEST,
      { operation, details }
    );
  }

  /**
   * Format validation errors
   */
  formatValidationErrors(errors: ValidationError[]): string {
    return errors.map(error => 
      `${error.field}: ${error.message}${error.value ? ` (received: ${error.value})` : ''}`
    ).join(', ');
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.statusCode >= 500 || 
             error.code === ERROR_CODES.EXTERNAL_SERVICE_UNAVAILABLE ||
             error.code === ERROR_CODES.DATABASE_CONNECTION_ERROR;
    }
    
    return error.name === 'TimeoutError' || 
           error.message.includes('timeout') ||
           error.message.includes('ECONNRESET') ||
           error.message.includes('ENOTFOUND');
  }

  /**
   * Get retry delay for error
   */
  getRetryDelay(error: Error, attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    
    return Math.min(exponentialDelay + jitter, maxDelay);
  }
}
