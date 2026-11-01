import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { CategoryFeedsService } from './category-feeds.service';
import { RedisService } from '../redis/redis.service';
import { DEFAULT_UT1_SOURCE_CATEGORIES } from './ut1-category-map';

describe('CategoryFeedsService', () => {
  const vectorsPath = path.join(
    __dirname,
    '../../../../shared/category-shard-test-vectors.json',
  );
  const fixture = JSON.parse(fs.readFileSync(vectorsPath, 'utf8')) as {
    shardCount: number;
    vectors: Array<{ domain: string; shard: number }>;
  };

  const makeService = (env: Record<string, string | undefined>) => {
    const config = {
      get: (key: string) => env[key],
    } as ConfigService;
    const redisService = { getClient: () => ({}) } as RedisService;
    return new CategoryFeedsService(redisService, config);
  };

  it('uses default UT1 sources without full adult unless env lists adult', () => {
    const svc = makeService({});
    const sources = svc.getEnabledUt1SourceCategories();
    expect(sources).toEqual(DEFAULT_UT1_SOURCE_CATEGORIES);
    expect(sources).not.toContain('adult');
  });

  it('loads full adult when CATEGORY_FEEDS_ENABLED includes adult', () => {
    const svc = makeService({
      CATEGORY_FEEDS_ENABLED: 'gambling,adult',
    });
    expect(svc.getEnabledUt1SourceCategories()).toContain('adult');
  });

  it('shardForDomain matches shared Go test vectors', () => {
    const svc = makeService({ CATEGORY_SHARD_COUNT: '16' });
    for (const row of fixture.vectors) {
      expect(svc.shardForDomain(row.domain)).toBe(row.shard);
    }
  });
});
