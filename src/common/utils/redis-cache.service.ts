import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly fallbackStore = new Map<string, { value: string; expiresAt: number }>();
  private readonly client?: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn('REDIS_URL is not set. Falling back to in-memory cache.');
      return;
    }

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });

    void this.client.connect().catch((error: unknown) => {
      this.logger.warn(
        `Redis connection failed, switching to in-memory cache: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.client?.status === 'ready') {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    }

    const existing = this.fallbackStore.get(key);
    if (!existing) {
      return null;
    }

    if (Date.now() > existing.expiresAt) {
      this.fallbackStore.delete(key);
      return null;
    }

    return JSON.parse(existing.value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.client?.status === 'ready') {
      await this.client.set(key, serialized, 'EX', ttlSeconds);
      return;
    }

    this.fallbackStore.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.client?.status === 'ready') {
      await this.client.del(key);
      return;
    }

    this.fallbackStore.delete(key);
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds = 300,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async ping(): Promise<'redis' | 'memory'> {
    if (this.client?.status === 'ready') {
      await this.client.ping();
      return 'redis';
    }

    return 'memory';
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }
}
