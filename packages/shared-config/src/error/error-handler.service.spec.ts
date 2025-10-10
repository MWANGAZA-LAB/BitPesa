import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ErrorHandlerService, AppError } from '../error/error-handler.service';
import { ERROR_CODES, HTTP_STATUS } from '../constants/app.constants';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorHandlerService],
    }).compile();

    service = module.get<ErrorHandlerService>(ErrorHandlerService);
    logger = module.get<Logger>(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleError', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError('Test error', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      const errorDetails = service.handleError(error, 'TestService');

      expect(errorDetails).toEqual({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Test error',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: expect.any(String),
        stack: expect.any(String),
      });
    });

    it('should handle HttpException correctly', () => {
      const error = new Error('Http error');
      error.name = 'HttpException';
      (error as any).getStatus = () => HTTP_STATUS.NOT_FOUND;

      const errorDetails = service.handleError(error, 'TestService');

      expect(errorDetails.code).toBe(ERROR_CODES.TRANSACTION_NOT_FOUND);
      expect(errorDetails.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
    });

    it('should handle ValidationError correctly', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';

      const errorDetails = service.handleError(error, 'TestService');

      expect(errorDetails.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(errorDetails.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    it('should handle PrismaClientKnownRequestError correctly', () => {
      const error = new Error('Unique constraint violation');
      error.name = 'PrismaClientKnownRequestError';
      (error as any).code = 'P2002';
      (error as any).meta = { target: ['email'] };

      const errorDetails = service.handleError(error, 'TestService');

      expect(errorDetails.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(errorDetails.statusCode).toBe(HTTP_STATUS.CONFLICT);
      expect(errorDetails.context).toEqual({ field: ['email'] });
    });

    it('should handle timeout errors correctly', () => {
      const error = new Error('Request timeout');
      error.name = 'TimeoutError';

      const errorDetails = service.handleError(error, 'TestService');

      expect(errorDetails.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_UNAVAILABLE);
      expect(errorDetails.statusCode).toBe(HTTP_STATUS.GATEWAY_TIMEOUT);
    });

    it('should handle unknown errors correctly', () => {
      const error = new Error('Unknown error');

      const errorDetails = service.handleError(error, 'TestService');

      expect(errorDetails.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect(errorDetails.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('createValidationError', () => {
    it('should create validation error', () => {
      const error = service.createValidationError('Invalid input', 'email');

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.context).toEqual({ field: 'email' });
    });
  });

  describe('createNotFoundError', () => {
    it('should create not found error', () => {
      const error = service.createNotFoundError('Transaction', '123');

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ERROR_CODES.TRANSACTION_NOT_FOUND);
      expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
      expect(error.context).toEqual({ resource: 'Transaction', id: '123' });
    });
  });

  describe('createConflictError', () => {
    it('should create conflict error', () => {
      const context = { transactionId: '123' };
      const error = service.createConflictError('Transaction already exists', context);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ERROR_CODES.TRANSACTION_ALREADY_PROCESSED);
      expect(error.statusCode).toBe(HTTP_STATUS.CONFLICT);
      expect(error.context).toEqual(context);
    });
  });

  describe('createExternalServiceError', () => {
    it('should create external service error', () => {
      const error = service.createExternalServiceError('MinMo', 'swap creation');

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_UNAVAILABLE);
      expect(error.statusCode).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
      expect(error.context).toEqual({ service: 'MinMo', operation: 'swap creation' });
    });
  });

  describe('createRateLimitError', () => {
    it('should create rate limit error', () => {
      const error = service.createRateLimitError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
      expect(error.statusCode).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
    });
  });

  describe('createTransactionExpiredError', () => {
    it('should create transaction expired error', () => {
      const error = service.createTransactionExpiredError('123');

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ERROR_CODES.TRANSACTION_EXPIRED);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.context).toEqual({ transactionId: '123' });
    });
  });

  describe('createInsufficientFundsError', () => {
    it('should create insufficient funds error', () => {
      const error = service.createInsufficientFundsError(100, 50);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ERROR_CODES.INSUFFICIENT_FUNDS);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.context).toEqual({ required: 100, available: 50 });
    });
  });

  describe('createMpesaError', () => {
    it('should create M-Pesa error', () => {
      const error = service.createMpesaError('STK Push', 'Invalid phone number');

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ERROR_CODES.MPESA_REQUEST_FAILED);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.context).toEqual({ operation: 'STK Push', details: 'Invalid phone number' });
    });
  });

  describe('createMinmoError', () => {
    it('should create MinMo error', () => {
      const error = service.createMinmoError('swap creation', 'API rate limit exceeded');

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ERROR_CODES.MINMO_API_ERROR);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.context).toEqual({ operation: 'swap creation', details: 'API rate limit exceeded' });
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors correctly', () => {
      const errors = [
        { field: 'email', message: 'Invalid email format', value: 'invalid-email' },
        { field: 'amount', message: 'Amount must be positive', value: -100 },
      ];

      const formatted = service.formatValidationErrors(errors);

      expect(formatted).toBe('email: Invalid email format (received: invalid-email), amount: Amount must be positive (received: -100)');
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable AppError', () => {
      const error = new AppError('Service unavailable', ERROR_CODES.EXTERNAL_SERVICE_UNAVAILABLE, HTTP_STATUS.SERVICE_UNAVAILABLE);
      
      expect(service.isRetryableError(error)).toBe(true);
    });

    it('should identify non-retryable AppError', () => {
      const error = new AppError('Validation failed', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
      
      expect(service.isRetryableError(error)).toBe(false);
    });

    it('should identify timeout errors as retryable', () => {
      const error = new Error('Request timeout');
      error.name = 'TimeoutError';
      
      expect(service.isRetryableError(error)).toBe(true);
    });

    it('should identify network errors as retryable', () => {
      const error = new Error('ECONNRESET');
      
      expect(service.isRetryableError(error)).toBe(true);
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff delay', () => {
      const error = new Error('Service unavailable');
      const delay1 = service.getRetryDelay(error, 1);
      const delay2 = service.getRetryDelay(error, 2);
      const delay3 = service.getRetryDelay(error, 3);

      expect(delay1).toBeGreaterThan(0);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should cap delay at maximum', () => {
      const error = new Error('Service unavailable');
      const delay = service.getRetryDelay(error, 10); // High attempt number

      expect(delay).toBeLessThanOrEqual(30000); // Max delay
    });
  });
});
