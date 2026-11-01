import Redis from 'ioredis';
import {
  REDIS_CATEGORY_SET_TTL_SECONDS,
  REDIS_FEED_META_PREFIX,
  REDIS_THREAT_SET_TTL_SECONDS,
  categoryStagingKey,
  categorySetKey,
  threatStagingKey,
  threatSetKey,
} from '../threat-feeds/redis-threat-keys';

const SADD_BATCH = 5000;

export interface FeedMetaRecord {
  id: string;
  name: string;
  entryCount: number;
  lastUpdated: string | null;
  lastError: string | null;
  isEnabled: boolean;
}

export async function swapRedisSet(
  redis: Redis,
  liveKey: string,
  stagingKey: string,
  members: string[],
  ttlSeconds: number,
): Promise<void> {
  await redis.del(stagingKey);
  if (members.length === 0) {
    await redis.del(liveKey);
    return;
  }

  for (let i = 0; i < members.length; i += SADD_BATCH) {
    const batch = members.slice(i, i + SADD_BATCH);
    await redis.sadd(stagingKey, ...batch);
  }
  await redis.rename(stagingKey, liveKey);
  await redis.expire(liveKey, ttlSeconds);
}

export async function rebuildThreatCategorySet(
  redis: Redis,
  category: string,
  domains: string[],
): Promise<void> {
  await swapRedisSet(
    redis,
    threatSetKey(category),
    threatStagingKey(category),
    domains,
    REDIS_THREAT_SET_TTL_SECONDS,
  );
}

export async function rebuildCategoryContentSet(
  redis: Redis,
  category: string,
  domains: string[],
): Promise<void> {
  await swapRedisSet(
    redis,
    categorySetKey(category),
    categoryStagingKey(category),
    domains,
    REDIS_CATEGORY_SET_TTL_SECONDS,
  );
}

export async function storeFeedMeta(
  redis: Redis,
  meta: FeedMetaRecord,
): Promise<void> {
  const key = `${REDIS_FEED_META_PREFIX}${meta.id}`;
  await redis.set(key, JSON.stringify(meta), 'EX', REDIS_THREAT_SET_TTL_SECONDS);
}

export async function loadFeedMeta(
  redis: Redis,
  feedId: string,
): Promise<FeedMetaRecord | null> {
  const raw = await redis.get(`${REDIS_FEED_META_PREFIX}${feedId}`);
  if (!raw) return null;
  return JSON.parse(raw) as FeedMetaRecord;
}
