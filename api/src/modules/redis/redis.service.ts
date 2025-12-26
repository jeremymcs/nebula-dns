import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface CacheInvalidationMessage {
  type: 'policy' | 'token' | 'list' | 'threat' | 'category';
  locationId?: string;
  token?: string;
  tenantId?: string;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private readonly INVALIDATION_CHANNEL = 'nebula:invalidate';

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:4379';
    this.client = new Redis(redisUrl);
    
    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
    
    this.client.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.client.hdel(key, field);
  }

  // Cache invalidation helpers
  async invalidatePolicy(locationId: string): Promise<void> {
    const message: CacheInvalidationMessage = {
      type: 'policy',
      locationId,
    };
    await this.publish(this.INVALIDATION_CHANNEL, JSON.stringify(message));
    this.logger.debug(`Published policy invalidation for location: ${locationId}`);
  }

  async invalidateToken(tokenHash: string): Promise<void> {
    const message: CacheInvalidationMessage = {
      type: 'token',
      token: tokenHash,
    };
    await this.publish(this.INVALIDATION_CHANNEL, JSON.stringify(message));
    this.logger.debug('Published token invalidation');
  }

  async invalidateList(tenantId: string, locationId?: string): Promise<void> {
    const message: CacheInvalidationMessage = {
      type: 'list',
      tenantId,
      locationId,
    };
    await this.publish(this.INVALIDATION_CHANNEL, JSON.stringify(message));
    this.logger.debug(`Published list invalidation for tenant: ${tenantId}`);
  }

  // Compiled policy storage
  async storeCompiledPolicy(locationId: string, policy: object, ttlSeconds = 3600): Promise<void> {
    const key = `policy:compiled:${locationId}`;
    await this.set(key, JSON.stringify(policy), ttlSeconds);
  }

  async getCompiledPolicy(locationId: string): Promise<object | null> {
    const key = `policy:compiled:${locationId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Token storage
  async storeToken(tokenHash: string, tokenInfo: object, ttlSeconds = 86400): Promise<void> {
    const key = `token:${tokenHash}`;
    await this.set(key, JSON.stringify(tokenInfo), ttlSeconds);
  }

  async getToken(tokenHash: string): Promise<object | null> {
    const key = `token:${tokenHash}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteToken(tokenHash: string): Promise<void> {
    const key = `token:${tokenHash}`;
    await this.del(key);
    await this.invalidateToken(tokenHash);
  }
}

