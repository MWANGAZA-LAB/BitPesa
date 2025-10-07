import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../logger/logger.service';
import { CheckRateLimitDto, RateLimitType } from './dto/check-rate-limit.dto';
import { RateLimitInfoDto } from './dto/rate-limit-info.dto';
import * as geoip from 'geoip-lite';

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
  current: number;
}

interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  uniqueIPs: number;
  topIPs: Array<{ ip: string; count: number }>;
  requestsByType: Record<string, number>;
  requestsByCountry: Record<string, number>;
}

@Injectable()
export class RateLimitService {
  private readonly rateLimitConfigs: Record<RateLimitType, RateLimitConfig> = {
    [RateLimitType.API]: {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
    },
    [RateLimitType.TRANSACTION]: {
      windowMs: 300000, // 5 minutes
      maxRequests: 10,
    },
    [RateLimitType.AUTHENTICATION]: {
      windowMs: 900000, // 15 minutes
      maxRequests: 5,
    },
    [RateLimitType.UPLOAD]: {
      windowMs: 3600000, // 1 hour
      maxRequests: 20,
    },
  };

  constructor(
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async checkRateLimit(dto: CheckRateLimitDto): Promise<RateLimitResult> {
    try {
      const config = this.rateLimitConfigs[dto.type];
      const windowMs = dto.customWindow ? dto.customWindow * 1000 : config.windowMs;
      const maxRequests = dto.customLimit || config.maxRequests;
      
      const key = `rate_limit:${dto.type}:${dto.ipAddress}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get current requests
      const requests = await this.getRequestsInWindow(key, windowStart);
      
      // Filter out old requests
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      
      const current = validRequests.length;
      const remaining = Math.max(0, maxRequests - current);
      const exceeded = current >= maxRequests;
      
      const resetTime = windowStart + windowMs;
      const retryAfter = exceeded ? Math.ceil((resetTime - now) / 1000) : undefined;

      // Record this request
      await this.recordRequest(key, now);
      
      // Update statistics
      await this.updateStats(dto.ipAddress, dto.type, exceeded);

      const result: RateLimitResult = {
        allowed: !exceeded,
        limit: maxRequests,
        remaining,
        resetTime,
        retryAfter,
        current,
      };

      if (exceeded) {
        this.logger.warn(`Rate limit exceeded for IP ${dto.ipAddress}, type ${dto.type}`);
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to check rate limit', error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        limit: 1000,
        remaining: 999,
        resetTime: Date.now() + 60000,
        current: 0,
      };
    }
  }

  async getRateLimitInfo(ipAddress: string): Promise<RateLimitInfoDto> {
    try {
      const types = Object.values(RateLimitType);
      const infoPromises = types.map(type => this.getRateLimitInfoForType(ipAddress, type));
      const infos = await Promise.all(infoPromises);
      
      // Return the most restrictive limit
      const mostRestrictive = infos.reduce((prev, current) => 
        current.remaining < prev.remaining ? current : prev
      );

      return mostRestrictive;
    } catch (error) {
      this.logger.error('Failed to get rate limit info', error);
      throw error;
    }
  }

  private async getRateLimitInfoForType(ipAddress: string, type: RateLimitType): Promise<RateLimitInfoDto> {
    const config = this.rateLimitConfigs[type];
    const key = `rate_limit:${type}:${ipAddress}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const requests = await this.getRequestsInWindow(key, windowStart);
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    const current = validRequests.length;
    const limit = config.maxRequests;
    const remaining = Math.max(0, limit - current);
    const exceeded = current >= limit;
    const resetTime = windowStart + config.windowMs;
    const retryAfter = exceeded ? Math.ceil((resetTime - now) / 1000) : undefined;

    const firstRequest = validRequests.length > 0 ? new Date(Math.min(...validRequests)).toISOString() : new Date().toISOString();
    const lastRequest = validRequests.length > 0 ? new Date(Math.max(...validRequests)).toISOString() : new Date().toISOString();

    return {
      ipAddress,
      current,
      limit,
      remaining,
      resetTime: new Date(resetTime).toISOString(),
      exceeded,
      retryAfter,
      type,
      firstRequest,
      lastRequest,
    };
  }

  async resetRateLimit(ipAddress: string): Promise<void> {
    try {
      const types = Object.values(RateLimitType);
      const deletePromises = types.map(type => {
        const key = `rate_limit:${type}:${ipAddress}`;
        return this.redis.del(key);
      });

      await Promise.all(deletePromises);
      
      this.logger.log(`Rate limit reset for IP ${ipAddress}`);
    } catch (error) {
      this.logger.error('Failed to reset rate limit', error);
      throw error;
    }
  }

  async getStats(timeframe: string): Promise<RateLimitStats> {
    try {
      const now = Date.now();
      let windowMs: number;
      
      switch (timeframe) {
        case 'hour':
          windowMs = 3600000; // 1 hour
          break;
        case 'day':
          windowMs = 86400000; // 24 hours
          break;
        case 'week':
          windowMs = 604800000; // 7 days
          break;
        default:
          windowMs = 3600000; // 1 hour
      }

      const windowStart = now - windowMs;
      const statsKey = `stats:${timeframe}:${Math.floor(windowStart / windowMs)}`;
      
      // Get cached stats or calculate new ones
      const cachedStats = await this.redis.get(statsKey);
      if (cachedStats) {
        return JSON.parse(cachedStats);
      }

      // Calculate stats from Redis data
      const stats: RateLimitStats = {
        totalRequests: 0,
        blockedRequests: 0,
        uniqueIPs: 0,
        topIPs: [],
        requestsByType: {},
        requestsByCountry: {},
      };

      // This is a simplified implementation
      // In production, you'd use Redis streams or time-series data
      const types = Object.values(RateLimitType);
      for (const type of types) {
        const pattern = `rate_limit:${type}:*`;
        // Note: In production, you'd use SCAN instead of KEYS
        const keys = await this.redis.keys(pattern);
        
        for (const key of keys) {
          const ipAddress = key.split(':')[2];
          const requests = await this.getRequestsInWindow(key, windowStart);
          const validRequests = requests.filter(timestamp => timestamp > windowStart);
          
          stats.totalRequests += validRequests.length;
          
          if (!stats.requestsByType[type]) {
            stats.requestsByType[type] = 0;
          }
          stats.requestsByType[type] += validRequests.length;

          // Get country from IP
          const geo = geoip.lookup(ipAddress);
          if (geo && geo.country) {
            if (!stats.requestsByCountry[geo.country]) {
              stats.requestsByCountry[geo.country] = 0;
            }
            stats.requestsByCountry[geo.country]++;
          }
        }
      }

      // Cache stats for 5 minutes
      await this.redis.set(statsKey, JSON.stringify(stats), 300);

      return stats;
    } catch (error) {
      this.logger.error('Failed to get stats', error);
      throw error;
    }
  }

  private async getRequestsInWindow(key: string, windowStart: number): Promise<number[]> {
    try {
      const data = await this.redis.get(key);
      if (!data) {
        return [];
      }
      
      const requests = JSON.parse(data);
      return Array.isArray(requests) ? requests : [];
    } catch (error) {
      this.logger.error('Failed to get requests in window', error);
      return [];
    }
  }

  private async recordRequest(key: string, timestamp: number): Promise<void> {
    try {
      const requests = await this.getRequestsInWindow(key, 0);
      requests.push(timestamp);
      
      // Keep only last 1000 requests to prevent memory issues
      const trimmedRequests = requests.slice(-1000);
      
      await this.redis.set(key, JSON.stringify(trimmedRequests), 3600); // 1 hour TTL
    } catch (error) {
      this.logger.error('Failed to record request', error);
    }
  }

  private async updateStats(ipAddress: string, type: RateLimitType, blocked: boolean): Promise<void> {
    try {
      const statsKey = `stats:${ipAddress}:${type}`;
      const stats = await this.redis.get(statsKey);
      
      let currentStats = stats ? JSON.parse(stats) : {
        total: 0,
        blocked: 0,
        lastUpdated: Date.now(),
      };
      
      currentStats.total++;
      if (blocked) {
        currentStats.blocked++;
      }
      currentStats.lastUpdated = Date.now();
      
      await this.redis.set(statsKey, JSON.stringify(currentStats), 3600);
    } catch (error) {
      this.logger.error('Failed to update stats', error);
    }
  }
}
