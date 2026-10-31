// Nebula DNS - Cloudflare DNS fair queue (Phase 1 skeleton)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

const QUEUE_DEPTH_KEY = 'dns:cf:platform:queue_depth';

@Injectable()
export class CfFairQueueService {
  private readonly logger = new Logger(CfFairQueueService.name);
  private localDepth = 0;

  constructor(private readonly redisService: RedisService) {}

  async runPlatform<T>(
    lane: 'admin' | 'tenant',
    operation: () => Promise<T>,
  ): Promise<T> {
    await this.incrementDepth();
    const start = Date.now();
    try {
      return await operation();
    } finally {
      await this.decrementDepth();
      const waitMs = Date.now() - start;
      if (waitMs > 5000) {
        this.logger.warn(`Slow Cloudflare call on ${lane} lane (${waitMs}ms)`);
      }
    }
  }

  async getQueueDepth(): Promise<number> {
    const raw = await this.redisService.get(QUEUE_DEPTH_KEY);
    if (raw) {
      return parseInt(raw, 10) || 0;
    }
    return this.localDepth;
  }

  private async incrementDepth(): Promise<void> {
    this.localDepth += 1;
    try {
      const current = parseInt(
        (await this.redisService.get(QUEUE_DEPTH_KEY)) || '0',
        10,
      );
      await this.redisService.set(QUEUE_DEPTH_KEY, String(current + 1));
    } catch {
      // Redis optional in tests
    }
  }

  private async decrementDepth(): Promise<void> {
    this.localDepth = Math.max(0, this.localDepth - 1);
    try {
      const current = parseInt(
        (await this.redisService.get(QUEUE_DEPTH_KEY)) || '0',
        10,
      );
      await this.redisService.set(QUEUE_DEPTH_KEY, String(Math.max(0, current - 1)));
    } catch {
      // Redis optional in tests
    }
  }
}
