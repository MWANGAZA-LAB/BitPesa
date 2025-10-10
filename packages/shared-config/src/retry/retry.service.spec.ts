import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RetryService } from '../retry/retry.service';
import { ErrorHandlerService } from '../error/error-handler.service';
import { TRANSACTION_CONSTANTS } from '../constants/app.constants';

describe('RetryService', () => {
  let service: RetryService;
  let errorHandler: ErrorHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RetryService, ErrorHandlerService],
    }).compile();

    service = module.get<RetryService>(RetryService);
    errorHandler = module.get<ErrorHandlerService>(ErrorHandlerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await service.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue('success');

      const result = await service.executeWithRetry(operation, {
        maxAttempts: 3,
        baseDelayMs: 10, // Short delay for testing
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Permanent failure'));

      const result = await service.executeWithRetry(operation, {
        maxAttempts: 2,
        baseDelayMs: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.attempts).toBe(2);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Validation error'));
      jest.spyOn(errorHandler, 'isRetryableError').mockReturnValue(false);

      const result = await service.executeWithRetry(operation, {
        maxAttempts: 3,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use custom retry condition', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Custom error'));
      const retryCondition = jest.fn().mockReturnValue(true);

      const result = await service.executeWithRetry(operation, {
        maxAttempts: 2,
        baseDelayMs: 10,
        retryCondition,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(retryCondition).toHaveBeenCalledTimes(2);
    });
  });

  describe('executeMultipleWithRetry', () => {
    it('should execute multiple operations in parallel', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockResolvedValue('result2'),
        jest.fn().mockResolvedValue('result3'),
      ];

      const results = await service.executeMultipleWithRetry(operations);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[0].data).toBe('result1');
      expect(results[1].success).toBe(true);
      expect(results[1].data).toBe('result2');
      expect(results[2].success).toBe(true);
      expect(results[2].data).toBe('result3');
    });

    it('should handle mixed success and failure results', async () => {
      const operations = [
        jest.fn().mockResolvedValue('success'),
        jest.fn().mockRejectedValue(new Error('failure')),
        jest.fn().mockResolvedValue('success'),
      ];

      const results = await service.executeMultipleWithRetry(operations, {
        maxAttempts: 1, // No retries for this test
      });

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('executeWithCircuitBreaker', () => {
    it('should execute operation when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await service.executeWithCircuitBreaker(operation, 'test-service');

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service error'));

      // Execute operation multiple times to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        await service.executeWithCircuitBreaker(operation, 'test-service', {
          failureThreshold: 3,
        });
      }

      // Next call should fail immediately due to open circuit
      const result = await service.executeWithCircuitBreaker(operation, 'test-service', {
        failureThreshold: 3,
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Circuit breaker is open');
    });

    it('should attempt recovery after timeout', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service error'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await service.executeWithCircuitBreaker(operation, 'test-service', {
          failureThreshold: 2,
          recoveryTimeoutMs: 100,
        });
      }

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Mock successful operation for recovery attempt
      operation.mockResolvedValue('recovery success');

      const result = await service.executeWithCircuitBreaker(operation, 'test-service', {
        failureThreshold: 2,
        recoveryTimeoutMs: 100,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('recovery success');
    });
  });

  describe('executeWithTimeout', () => {
    it('should execute operation within timeout', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await service.executeWithTimeout(operation, 1000);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should timeout slow operations', async () => {
      const operation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow'), 2000))
      );

      await expect(service.executeWithTimeout(operation, 100)).rejects.toThrow('Operation timed out after 100ms');
    });
  });

  describe('executeWithRetryAndTimeout', () => {
    it('should retry and timeout', async () => {
      const operation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 2000))
      );

      const result = await service.executeWithRetryAndTimeout(operation, 100, {
        maxAttempts: 2,
        baseDelayMs: 10,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(result.error.message).toContain('timed out');
    });
  });

  describe('getCircuitBreakerStatus', () => {
    it('should return circuit breaker status', () => {
      const status = service.getCircuitBreakerStatus('test-service');

      expect(status).toEqual({
        key: 'test-service',
        isOpen: false,
        failureCount: 0,
        lastFailureTime: 0,
        lastSuccessTime: 0,
        timeSinceLastFailure: expect.any(Number),
        timeSinceLastSuccess: expect.any(Number),
      });
    });
  });

  describe('resetCircuitBreaker', () => {
    it('should reset circuit breaker', () => {
      service.resetCircuitBreaker('test-service');
      
      const status = service.getCircuitBreakerStatus('test-service');
      
      expect(status.isOpen).toBe(false);
      expect(status.failureCount).toBe(0);
      expect(status.lastFailureTime).toBe(0);
    });
  });

  describe('getAllCircuitBreakerStatuses', () => {
    it('should return all circuit breaker statuses', () => {
      const statuses = service.getAllCircuitBreakerStatuses();
      
      expect(Array.isArray(statuses)).toBe(true);
    });
  });
});
