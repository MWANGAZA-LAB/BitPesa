import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { createClient, RedisClientType, RedisClientOptions } from 'redis';
import { ConfigService } from '@nestjs/config';

export interface RedisConfig {
  url: string;
  retryDelayOnFailover: number;
  enableReadyCheck: boolean;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  connectTimeout: number;
  commandTimeout: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  namespace?: string; // Namespace for key organization
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: RedisClientType;
  private readonly config: RedisConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      url: configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
      retryDelayOnFailover: configService.get<number>('REDIS_RETRY_DELAY', 100),
      enableReadyCheck: configService.get<boolean>('REDIS_READY_CHECK', true),
      maxRetriesPerRequest: configService.get<number>('REDIS_MAX_RETRIES', 3),
      lazyConnect: configService.get<boolean>('REDIS_LAZY_CONNECT', true),
      keepAlive: configService.get<number>('REDIS_KEEPALIVE', 30000),
      connectTimeout: configService.get<number>('REDIS_CONNECT_TIMEOUT', 10000),
      commandTimeout: configService.get<number>('REDIS_COMMAND_TIMEOUT', 5000),
    };
  }

  async onModuleInit() {
    try {
      const options: RedisClientOptions = {
        url: this.config.url,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              this.logger.error('Redis connection failed after 10 retries');
              return new Error('Redis connection failed');
            }
            return Math.min(retries * 100, 3000);
          },
          keepAlive: this.config.keepAlive,
          connectTimeout: this.config.connectTimeout,
          // commandTimeout: this.config.commandTimeout, // Not supported in current Redis client version
        },
        retryDelayOnFailover: this.config.retryDelayOnFailover,
        enableReadyCheck: this.config.enableReadyCheck,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        lazyConnect: this.config.lazyConnect,
      };

      this.client = createClient(options) as RedisClientType;

      this.client.on('error', (err) => {
        this.logger.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        this.logger.log('Redis client connected');
      });

      this.client.on('ready', () => {
        this.logger.log('Redis client ready');
      });

      this.client.on('end', () => {
        this.logger.log('Redis client disconnected');
      });

      await this.client.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.client?.isOpen) {
        await this.client.disconnect();
        this.logger.log('Redis client disconnected');
      }
    } catch (error) {
      this.logger.error('Error disconnecting Redis client', error);
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, namespace?: string): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, namespace);
      const value = await this.client.get(fullKey);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to get key ${key}`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const fullKey = this.buildKey(key, options.namespace);
      const serializedValue = JSON.stringify(value);
      
      if (options.ttl) {
        await this.client.setEx(fullKey, options.ttl, serializedValue);
      } else {
        await this.client.set(fullKey, serializedValue);
      }

      // Store tags for cache invalidation
      if (options.tags && options.tags.length > 0) {
        await this.storeTags(fullKey, options.tags);
      }
    } catch (error) {
      this.logger.error(`Failed to set key ${key}`, error);
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string, namespace?: string): Promise<void> {
    try {
      const fullKey = this.buildKey(key, namespace);
      await this.client.del(fullKey);
    } catch (error) {
      this.logger.error(`Failed to delete key ${key}`, error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, namespace?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, namespace);
      const result = await this.client.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}`, error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T>(keys: string[], namespace?: string): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => this.buildKey(key, namespace));
      const values = await this.client.mGet(fullKeys);
      
      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      this.logger.error(`Failed to get multiple keys`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset<T>(keyValuePairs: Record<string, T>, options: CacheOptions = {}): Promise<void> {
    try {
      const pipeline = this.client.multi();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const fullKey = this.buildKey(key, options.namespace);
        const serializedValue = JSON.stringify(value);
        
        if (options.ttl) {
          pipeline.setEx(fullKey, options.ttl, serializedValue);
        } else {
          pipeline.set(fullKey, serializedValue);
        }
      }
      
      await pipeline.exec();
    } catch (error) {
      this.logger.error(`Failed to set multiple keys`, error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const keys = await this.client.sMembers(`tag:${tag}`);
        if (keys.length > 0) {
          await this.client.del(keys);
          await this.client.del(`tag:${tag}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to invalidate cache by tags`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(namespace?: string): Promise<void> {
    try {
      if (namespace) {
        const pattern = `${namespace}:*`;
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      } else {
        await this.client.flushDb();
      }
    } catch (error) {
      this.logger.error(`Failed to clear cache`, error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    memory: any;
    stats: any;
    info: any;
  }> {
    try {
      const [memory, stats, info] = await Promise.all([
        // this.client.memory('USAGE'), // Memory command not available in current Redis client
        this.client.info('stats'),
        this.client.info('server'),
      ]);

      return {
        connected: this.client.isOpen,
        memory,
        stats,
        info,
      };
    } catch (error) {
      this.logger.error('Failed to get Redis stats', error);
      return {
        connected: false,
        memory: null,
        stats: null,
        info: null,
      };
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{ status: string; latency: number; memory: number }> {
    const start = Date.now();
    
    try {
      await this.client.ping();
      const latency = Date.now() - start;
      
      // const memory = await this.client.memory('USAGE'); // Memory command not available
      
      return {
        status: 'healthy',
        latency,
        memory: 0, // Memory info not available in current Redis client
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        memory: 0,
      };
    }
  }

  /**
   * Build full key with namespace
   */
  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  /**
   * Store cache tags for invalidation
   */
  private async storeTags(key: string, tags: string[]): Promise<void> {
    try {
      const pipeline = this.client.multi();
      
      for (const tag of tags) {
        pipeline.sAdd(`tag:${tag}`, key);
        pipeline.expire(`tag:${tag}`, 86400); // 24 hours
      }
      
      await pipeline.exec();
    } catch (error) {
      this.logger.error(`Failed to store tags for key ${key}`, error);
    }
  }
}
