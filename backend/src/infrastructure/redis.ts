import Redis from 'ioredis';
import { Logger } from '../utils/logger';

/**
 * Redis Infrastructure
 * 
 * Provides a centralized Redis client for caching and session management.
 */
export class RedisService {
  private static instance: RedisService;
  private client: Redis;
  private readonly logger = new Logger('RedisService');

  private constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.logger.info(`🔌 Connecting to Redis at ${redisUrl}...`);
    
    this.client = new Redis(redisUrl, {
      // Fail fast on per-request errors (0 = no retries, reject immediately)
      maxRetriesPerRequest: 0,
      // Reconnection backoff for the persistent connection (unrelated to per-request retries)
      retryStrategy: (times) => {
        if (times > 5) return null; // Stop reconnecting after 5 attempts
        return Math.min(times * 200, 2000);
      },
      enableOfflineQueue: false, // Don't queue commands when disconnected — fail immediately
    });

    this.client.on('connect', () => {
      this.logger.info('✅ Redis connection established');
    });

    this.client.on('error', (err) => {
      this.logger.error('❌ Redis connection error:', err);
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Get the raw ioredis client
   */
  public getClient(): Redis {
    return this.client;
  }

  /**
   * Universal set with TTL
   */
  public async set(key: string, value: any, ttlSeconds: number = 86400): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await this.client.set(key, stringValue, 'EX', ttlSeconds);
  }

  /**
   * Universal get with automatic JSON parsing
   */
  public async get<T = any>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  /**
   * Delete key
   */
  public async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Check health
   */
  public async isHealthy(): Promise<boolean> {
    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }
}

export default RedisService.getInstance();
