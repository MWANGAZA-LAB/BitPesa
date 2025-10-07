import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../logger/logger.service';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

@Injectable()
export class RateLimitService {
  private readonly rateLimits = new Map<string, { count: number; resetTime: number }>();
  
  private readonly rateLimitConfigs: Record<string, RateLimitConfig> = {
    'lightning/invoice': {
      windowMs: 60000, // 1 minute
      maxRequests: 10,
    },
    'mpesa/send': {
      windowMs: 300000, // 5 minutes
      maxRequests: 5,
    },
    'mpesa/airtime': {
      windowMs: 300000, // 5 minutes
      maxRequests: 10,
    },
    'mpesa/paybill': {
      windowMs: 300000, // 5 minutes
      maxRequests: 10,
    },
    'mpesa/till': {
      windowMs: 300000, // 5 minutes
      maxRequests: 10,
    },
    'transactions/btc-to-mpesa': {
      windowMs: 300000, // 5 minutes
      maxRequests: 5,
    },
    'conversion/quote': {
      windowMs: 60000, // 1 minute
      maxRequests: 30,
    },
    'receipts': {
      windowMs: 60000, // 1 minute
      maxRequests: 20,
    },
    'default': {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
    },
  };

  constructor(private readonly logger: LoggerService) {
    // Clean up expired rate limits every minute
    setInterval(() => {
      this.cleanupExpiredRateLimits();
    }, 60000);
  }

  async checkRateLimit(
    key: string,
    endpoint: string,
    ipAddress: string,
  ): Promise<RateLimitResult> {
    const config = this.getRateLimitConfig(endpoint);
    const rateLimitKey = `${ipAddress}:${endpoint}`;
    const now = Date.now();
    
    // Get current rate limit data
    const current = this.rateLimits.get(rateLimitKey);
    
    if (!current || now > current.resetTime) {
      // First request or window expired
      this.rateLimits.set(rateLimitKey, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }
    
    if (current.count >= config.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((current.resetTime - now) / 1000);
      
      this.logger.warn(`Rate limit exceeded for ${ipAddress} on ${endpoint}`);
      
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: current.resetTime,
        retryAfter,
      };
    }
    
    // Increment counter
    current.count++;
    this.rateLimits.set(rateLimitKey, current);
    
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - current.count,
      resetTime: current.resetTime,
    };
  }

  private getRateLimitConfig(endpoint: string): RateLimitConfig {
    // Find matching config for endpoint
    for (const [pattern, config] of Object.entries(this.rateLimitConfigs)) {
      if (pattern !== 'default' && endpoint.includes(pattern)) {
        return config;
      }
    }
    
    return this.rateLimitConfigs.default;
  }

  private cleanupExpiredRateLimits(): void {
    const now = Date.now();
    
    for (const [key, data] of this.rateLimits.entries()) {
      if (now > data.resetTime) {
        this.rateLimits.delete(key);
      }
    }
  }

  getRateLimitStats(): {
    totalKeys: number;
    activeKeys: number;
    configs: Record<string, RateLimitConfig>;
  } {
    const now = Date.now();
    const activeKeys = Array.from(this.rateLimits.entries())
      .filter(([_, data]) => now <= data.resetTime)
      .length;
    
    return {
      totalKeys: this.rateLimits.size,
      activeKeys,
      configs: this.rateLimitConfigs,
    };
  }
}
