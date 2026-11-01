import * as fs from 'fs';
import * as path from 'path';
import {
  categoryDomainShard,
  DEFAULT_CATEGORY_SHARD_COUNT,
} from './category-domain-shard';

describe('categoryDomainShard', () => {
  const vectorsPath = path.join(
    __dirname,
    '../../../../shared/category-shard-test-vectors.json',
  );
  const fixture = JSON.parse(fs.readFileSync(vectorsPath, 'utf8')) as {
    shardCount: number;
    vectors: Array<{ domain: string; shard: number }>;
  };

  it('matches shared cross-language test vectors', () => {
    expect(fixture.shardCount).toBe(DEFAULT_CATEGORY_SHARD_COUNT);
    for (const v of fixture.vectors) {
      expect(categoryDomainShard(v.domain, fixture.shardCount)).toBe(v.shard);
    }
  });
});
