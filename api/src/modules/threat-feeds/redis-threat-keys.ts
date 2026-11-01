/** Redis keys shared with policy-svc (see policy-svc/internal/cache/threat_keys.go). */

export const REDIS_THREAT_SET_PREFIX = 'nebula:threats:';
export const REDIS_CATEGORY_SET_PREFIX = 'nebula:categories:';
export const REDIS_FEED_META_PREFIX = 'nebula:feeds:meta:';
export const REDIS_STAGING_SUFFIX = ':staging';

/** Longer than the hourly refresh interval so lookups never see an empty set mid-refresh. */
export const REDIS_THREAT_SET_TTL_SECONDS = 172_800; // 48h
export const REDIS_CATEGORY_SET_TTL_SECONDS = 604_800; // 7d

export const THREAT_CATEGORIES = [
  'malware',
  'phishing',
  'ransomware',
  'c2',
  'botnet',
  'cryptomining',
  'spam',
  'dga',
] as const;

export type ThreatCategory = (typeof THREAT_CATEGORIES)[number];

export function threatSetKey(category: string): string {
  return `${REDIS_THREAT_SET_PREFIX}${category}`;
}

export function threatStagingKey(category: string): string {
  return `${threatSetKey(category)}${REDIS_STAGING_SUFFIX}`;
}

export function categorySetKey(category: string): string {
  return `${REDIS_CATEGORY_SET_PREFIX}${category}`;
}

export function categoryStagingKey(category: string): string {
  return `${categorySetKey(category)}${REDIS_STAGING_SUFFIX}`;
}
