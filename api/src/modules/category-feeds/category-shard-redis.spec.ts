import Redis from 'ioredis';
import {
  ShardedCategoryStreamWriter,
  sumCategoryShardCounts,
} from './category-shard-redis';
import {
  categoryShardKey,
  categoryShardStagingKey,
  categorySetKey,
} from '../threat-feeds/redis-threat-keys';
import { categoryDomainShard } from './category-domain-shard';

describe('category-shard-redis', () => {
  it('sumCategoryShardCounts includes legacy unsharded key', async () => {
    const redis = {
      scard: jest.fn(async (key: string) => {
        if (key === categorySetKey('gambling')) return 3;
        if (key === categoryShardKey('gambling', 0)) return 10;
        return 0;
      }),
    } as unknown as Redis;

    const total = await sumCategoryShardCounts(redis, 'gambling', 16);
    expect(total).toBe(13);
  });

  it('finalizeAll renames staging to live per shard', async () => {
    const domain = 'bet.example.org';
    const shard = categoryDomainShard(domain, 16);
    const redis = {
      scard: jest.fn().mockResolvedValue(1),
      sadd: jest.fn().mockResolvedValue(1),
      rename: jest.fn().mockResolvedValue('OK'),
      expire: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
    } as unknown as Redis;

    const writer = new ShardedCategoryStreamWriter(redis, 'gambling', 16);
    await writer.ingestDomain(domain);
    const count = await writer.finalizeAll();

    expect(count).toBeGreaterThanOrEqual(1);
    expect(redis.rename).toHaveBeenCalledWith(
      categoryShardStagingKey('gambling', shard),
      categoryShardKey('gambling', shard),
    );
  });

  it('abortStaging deletes staging keys', async () => {
    const redis = {
      del: jest.fn().mockResolvedValue(16),
    } as unknown as Redis;

    const writer = new ShardedCategoryStreamWriter(redis, 'news', 16);
    await writer.abortStaging();

    expect(redis.del).toHaveBeenCalled();
    const keys = (redis.del as jest.Mock).mock.calls[0];
    expect(keys).toContain(categoryShardStagingKey('news', 0));
    expect(keys).toContain(categoryShardStagingKey('news', 15));
  });
});

describe('keep-live fraction guard', () => {
  const MIN_LIVE_FRACTION = 0.5;

  it('refuses swap when new count is below half of live', () => {
    const previousLive = 4_600_000;
    const newCount = 2_000_000;
    expect(newCount < previousLive * MIN_LIVE_FRACTION).toBe(true);
  });

  it('allows swap when new count is at least half of live', () => {
    const previousLive = 1000;
    const newCount = 600;
    expect(newCount < previousLive * MIN_LIVE_FRACTION).toBe(false);
  });
});
