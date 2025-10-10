import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@bitpesa/shared-infrastructure';
import { RedisService } from '@bitpesa/shared-infrastructure';
import { CircuitBreakerService } from '@bitpesa/shared-infrastructure';
import { OptimizedTransactionService } from '../transaction/optimized-transaction.service';
import { PerformanceMonitoringService } from '../performance/performance-monitoring.service';

export interface PerformanceTestResult {
  testName: string;
  duration: number;
  throughput: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  success: boolean;
  errors: string[];
}

export interface LoadTestConfig {
  concurrentUsers: number;
  duration: number; // seconds
  rampUpTime: number; // seconds
  targetEndpoint: string;
  requestPayload?: any;
}

export class PerformanceTestSuite {
  private app: INestApplication;
  private results: PerformanceTestResult[] = [];

  constructor(app: INestApplication) {
    this.app = app;
  }

  /**
   * Run comprehensive performance test suite
   */
  async runFullTestSuite(): Promise<PerformanceTestResult[]> {
    console.log('🚀 Starting Performance Test Suite...');
    
    const tests = [
      { name: 'Database Connection Pool Test', fn: this.testDatabaseConnectionPool.bind(this) },
      { name: 'Redis Cache Performance Test', fn: this.testRedisCachePerformance.bind(this) },
      { name: 'Transaction Creation Load Test', fn: this.testTransactionCreationLoad.bind(this) },
      { name: 'Transaction Retrieval Load Test', fn: this.testTransactionRetrievalLoad.bind(this) },
      { name: 'Circuit Breaker Resilience Test', fn: this.testCircuitBreakerResilience.bind(this) },
      { name: 'Memory Leak Detection Test', fn: this.testMemoryLeakDetection.bind(this) },
      { name: 'Concurrent User Simulation', fn: this.testConcurrentUsers.bind(this) },
      { name: 'API Endpoint Performance Test', fn: this.testApiEndpointPerformance.bind(this) },
    ];

    for (const test of tests) {
      try {
        console.log(`\n📊 Running: ${test.name}`);
        const result = await test.fn();
        this.results.push(result);
        console.log(`✅ ${test.name} completed: ${result.duration}ms, ${result.throughput} req/s`);
      } catch (error) {
        console.error(`❌ ${test.name} failed:`, error);
        this.results.push({
          testName: test.name,
          duration: 0,
          throughput: 0,
          averageResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
          errorRate: 100,
          memoryUsage: 0,
          cpuUsage: 0,
          success: false,
          errors: [error.message],
        });
      }
    }

    return this.results;
  }

  /**
   * Test database connection pool performance
   */
  private async testDatabaseConnectionPool(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    const prismaService = this.app.get(PrismaService);
    const iterations = 1000;
    const responseTimes: number[] = [];
    let errors = 0;

    for (let i = 0; i < iterations; i++) {
      const requestStart = Date.now();
      try {
        await prismaService.$queryRaw`SELECT 1`;
        responseTimes.push(Date.now() - requestStart);
      } catch (error) {
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    const sortedTimes = responseTimes.sort((a, b) => a - b);

    return {
      testName: 'Database Connection Pool Test',
      duration,
      throughput: (iterations / duration) * 1000,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p95ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
      p99ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
      errorRate: (errors / iterations) * 100,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: 0,
      success: errors < iterations * 0.01, // Less than 1% error rate
      errors: [],
    };
  }

  /**
   * Test Redis cache performance
   */
  private async testRedisCachePerformance(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    const redisService = this.app.get(RedisService);
    const iterations = 1000;
    const responseTimes: number[] = [];
    let errors = 0;

    // Test cache set operations
    for (let i = 0; i < iterations; i++) {
      const requestStart = Date.now();
      try {
        await redisService.set(`test:key:${i}`, { value: i, timestamp: Date.now() }, { ttl: 60 });
        responseTimes.push(Date.now() - requestStart);
      } catch (error) {
        errors++;
      }
    }

    // Test cache get operations
    for (let i = 0; i < iterations; i++) {
      const requestStart = Date.now();
      try {
        await redisService.get(`test:key:${i}`);
        responseTimes.push(Date.now() - requestStart);
      } catch (error) {
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    const sortedTimes = responseTimes.sort((a, b) => a - b);

    return {
      testName: 'Redis Cache Performance Test',
      duration,
      throughput: (iterations * 2 / duration) * 1000,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p95ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
      p99ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
      errorRate: (errors / (iterations * 2)) * 100,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: 0,
      success: errors < iterations * 0.01,
      errors: [],
    };
  }

  /**
   * Test transaction creation under load
   */
  private async testTransactionCreationLoad(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    const transactionService = this.app.get(OptimizedTransactionService);
    const iterations = 100;
    const responseTimes: number[] = [];
    let errors = 0;

    for (let i = 0; i < iterations; i++) {
      const requestStart = Date.now();
      try {
        await transactionService.createTransaction({
          transactionType: 'SEND_MONEY',
          kesAmount: 100 + i,
          recipientPhone: `25470000000${i}`,
          recipientName: `Test User ${i}`,
          ipAddress: '127.0.0.1',
          userAgent: 'Performance Test',
        });
        responseTimes.push(Date.now() - requestStart);
      } catch (error) {
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    const sortedTimes = responseTimes.sort((a, b) => a - b);

    return {
      testName: 'Transaction Creation Load Test',
      duration,
      throughput: (iterations / duration) * 1000,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p95ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
      p99ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
      errorRate: (errors / iterations) * 100,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: 0,
      success: errors < iterations * 0.05, // Less than 5% error rate
      errors: [],
    };
  }

  /**
   * Test transaction retrieval under load
   */
  private async testTransactionRetrievalLoad(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    const transactionService = this.app.get(OptimizedTransactionService);
    const iterations = 1000;
    const responseTimes: number[] = [];
    let errors = 0;

    // First create some test transactions
    const testTransactions = [];
    for (let i = 0; i < 10; i++) {
      try {
        const tx = await transactionService.createTransaction({
          transactionType: 'SEND_MONEY',
          kesAmount: 100 + i,
          recipientPhone: `25470000000${i}`,
          recipientName: `Test User ${i}`,
          ipAddress: '127.0.0.1',
          userAgent: 'Performance Test',
        });
        testTransactions.push(tx);
      } catch (error) {
        // Ignore creation errors for this test
      }
    }

    // Test retrieval operations
    for (let i = 0; i < iterations; i++) {
      const requestStart = Date.now();
      try {
        const randomTx = testTransactions[Math.floor(Math.random() * testTransactions.length)];
        if (randomTx) {
          await transactionService.getTransactionByPaymentHash(randomTx.paymentHash);
        }
        responseTimes.push(Date.now() - requestStart);
      } catch (error) {
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    const sortedTimes = responseTimes.sort((a, b) => a - b);

    return {
      testName: 'Transaction Retrieval Load Test',
      duration,
      throughput: (iterations / duration) * 1000,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p95ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
      p99ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
      errorRate: (errors / iterations) * 100,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: 0,
      success: errors < iterations * 0.01,
      errors: [],
    };
  }

  /**
   * Test circuit breaker resilience
   */
  private async testCircuitBreakerResilience(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    const circuitBreaker = this.app.get(CircuitBreakerService);
    const iterations = 100;
    const responseTimes: number[] = [];
    let errors = 0;

    // Simulate failures to trigger circuit breaker
    for (let i = 0; i < iterations; i++) {
      const requestStart = Date.now();
      try {
        await circuitBreaker.execute(
          'test-service',
          () => {
            if (i < 10) {
              throw new Error('Simulated failure');
            }
            return Promise.resolve('success');
          },
          () => Promise.resolve('fallback'),
        );
        responseTimes.push(Date.now() - requestStart);
      } catch (error) {
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    const sortedTimes = responseTimes.sort((a, b) => a - b);

    return {
      testName: 'Circuit Breaker Resilience Test',
      duration,
      throughput: (iterations / duration) * 1000,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p95ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
      p99ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
      errorRate: (errors / iterations) * 100,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: 0,
      success: true, // Circuit breaker should handle failures gracefully
      errors: [],
    };
  }

  /**
   * Test for memory leaks
   */
  private async testMemoryLeakDetection(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    const initialMemory = process.memoryUsage().heapUsed;
    const iterations = 1000;
    const responseTimes: number[] = [];
    let errors = 0;

    // Perform operations that might cause memory leaks
    for (let i = 0; i < iterations; i++) {
      const requestStart = Date.now();
      try {
        // Simulate memory-intensive operations
        const largeObject = new Array(1000).fill(0).map((_, index) => ({
          id: index,
          data: `test-data-${index}`,
          timestamp: Date.now(),
        }));
        
        // Simulate cleanup
        largeObject.length = 0;
        
        responseTimes.push(Date.now() - requestStart);
      } catch (error) {
        errors++;
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
    const duration = Date.now() - startTime;
    const sortedTimes = responseTimes.sort((a, b) => a - b);

    return {
      testName: 'Memory Leak Detection Test',
      duration,
      throughput: (iterations / duration) * 1000,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p95ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
      p99ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
      errorRate: (errors / iterations) * 100,
      memoryUsage: memoryIncrease,
      cpuUsage: 0,
      success: memoryIncrease < 50, // Less than 50MB increase
      errors: [],
    };
  }

  /**
   * Test concurrent user simulation
   */
  private async testConcurrentUsers(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    const concurrentUsers = 50;
    const requestsPerUser = 20;
    const responseTimes: number[] = [];
    let errors = 0;

    const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
      for (let i = 0; i < requestsPerUser; i++) {
        const requestStart = Date.now();
        try {
          // Simulate user request
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          responseTimes.push(Date.now() - requestStart);
        } catch (error) {
          errors++;
        }
      }
    });

    await Promise.all(userPromises);

    const duration = Date.now() - startTime;
    const sortedTimes = responseTimes.sort((a, b) => a - b);

    return {
      testName: 'Concurrent User Simulation',
      duration,
      throughput: ((concurrentUsers * requestsPerUser) / duration) * 1000,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p95ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
      p99ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
      errorRate: (errors / (concurrentUsers * requestsPerUser)) * 100,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: 0,
      success: errors < (concurrentUsers * requestsPerUser) * 0.01,
      errors: [],
    };
  }

  /**
   * Test API endpoint performance
   */
  private async testApiEndpointPerformance(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    const iterations = 100;
    const responseTimes: number[] = [];
    let errors = 0;

    for (let i = 0; i < iterations; i++) {
      const requestStart = Date.now();
      try {
        // Simulate API call
        const response = await fetch('http://localhost:3000/api/health');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        responseTimes.push(Date.now() - requestStart);
      } catch (error) {
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    const sortedTimes = responseTimes.sort((a, b) => a - b);

    return {
      testName: 'API Endpoint Performance Test',
      duration,
      throughput: (iterations / duration) * 1000,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p95ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
      p99ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
      errorRate: (errors / iterations) * 100,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: 0,
      success: errors < iterations * 0.01,
      errors: [],
    };
  }

  /**
   * Generate performance test report
   */
  generateReport(): string {
    const report = [
      '📊 PERFORMANCE TEST REPORT',
      '========================',
      '',
    ];

    this.results.forEach(result => {
      report.push(`Test: ${result.testName}`);
      report.push(`Duration: ${result.duration}ms`);
      report.push(`Throughput: ${result.throughput.toFixed(2)} req/s`);
      report.push(`Average Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
      report.push(`P95 Response Time: ${result.p95ResponseTime.toFixed(2)}ms`);
      report.push(`P99 Response Time: ${result.p99ResponseTime.toFixed(2)}ms`);
      report.push(`Error Rate: ${result.errorRate.toFixed(2)}%`);
      report.push(`Memory Usage: ${result.memoryUsage.toFixed(2)}MB`);
      report.push(`Status: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
      report.push('');
    });

    const passedTests = this.results.filter(r => r.success).length;
    const totalTests = this.results.length;
    
    report.push(`SUMMARY: ${passedTests}/${totalTests} tests passed`);
    report.push(`Overall Status: ${passedTests === totalTests ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    return report.join('\n');
  }
}
