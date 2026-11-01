import Redis from 'ioredis';
import {
  REDIS_CATEGORY_SET_TTL_SECONDS,
  categoryShardKey,
  categoryShardStagingKey,
  categorySetKey,
} from '../threat-feeds/redis-threat-keys';
import { categoryDomainShard } from './category-domain-shard';

const SADD_BATCH = 5000;

export async function sumCategoryShardCounts(
  redis: Redis,
  fluxCategory: string,
  shardCount: number,
): Promise<number> {
  let total = 0;
  for (let shard = 0; shard < shardCount; shard++) {
    total += await redis.scard(categoryShardKey(fluxCategory, shard));
  }
  const legacy = await redis.scard(categorySetKey(fluxCategory));
  return total + legacy;
}

export async function deleteLegacyCategoryKey(
  redis: Redis,
  fluxCategory: string,
): Promise<void> {
  await redis.del(categorySetKey(fluxCategory));
  await redis.del(`${categorySetKey(fluxCategory)}:staging`);
}

export async function deleteCategoryShardStaging(
  redis: Redis,
  fluxCategory: string,
  shardCount: number,
): Promise<void> {
  const keys: string[] = [];
  for (let s = 0; s < shardCount; s++) {
    keys.push(categoryShardStagingKey(fluxCategory, s));
  }
  if (keys.length) await redis.del(...keys);
}

/**
 * Streams domains into per-shard staging SETs; one shard RENAME at a time (peak ≈ live + one shard).
 */
export class ShardedCategoryStreamWriter {
  private pending = new Map<number, string[]>();

  constructor(
    private readonly redis: Redis,
    private readonly fluxCategory: string,
    private readonly shardCount: number,
  ) {}

  async ingestDomain(domain: string): Promise<void> {
    const shard = categoryDomainShard(domain, this.shardCount);
    let batch = this.pending.get(shard);
    if (!batch) {
      batch = [];
      this.pending.set(shard, batch);
    }
    batch.push(domain);
    if (batch.length >= SADD_BATCH) {
      await this.flushShard(shard);
    }
  }

  async flushShard(shard: number): Promise<void> {
    const batch = this.pending.get(shard);
    if (!batch?.length) return;
    const staging = categoryShardStagingKey(this.fluxCategory, shard);
    await this.redis.sadd(staging, ...batch);
    batch.length = 0;
  }

  async finalizeAll(): Promise<number> {
    let total = 0;
    for (let shard = 0; shard < this.shardCount; shard++) {
      await this.flushShard(shard);
      const staging = categoryShardStagingKey(this.fluxCategory, shard);
      const count = await this.redis.scard(staging);
      const live = categoryShardKey(this.fluxCategory, shard);
      if (count === 0) {
        await this.redis.del(staging, live);
      } else {
        await this.redis.rename(staging, live);
        await this.redis.expire(live, REDIS_CATEGORY_SET_TTL_SECONDS);
        total += count;
      }
    }
    this.pending.clear();
    return total;
  }

  async abortStaging(): Promise<void> {
    await deleteCategoryShardStaging(
      this.redis,
      this.fluxCategory,
      this.shardCount,
    );
    this.pending.clear();
  }
}
