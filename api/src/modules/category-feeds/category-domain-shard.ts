/** FNV-1a 32-bit domain shard (must match policy-svc/internal/cache/category_shard.go). */

export const DEFAULT_CATEGORY_SHARD_COUNT = 16;

export function normalizeCategoryDomain(domain: string): string {
  return domain.toLowerCase().trim();
}

export function categoryDomainShard(
  domain: string,
  shardCount: number,
): number {
  if (shardCount <= 0) {
    throw new Error('shardCount must be positive');
  }
  const normalized = normalizeCategoryDomain(domain);
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % shardCount;
}

export function resolveCategoryShardCount(
  configured: string | undefined,
): number {
  if (configured?.trim()) {
    const n = parseInt(configured.trim(), 10);
    if (Number.isFinite(n) && n >= 1 && n <= 256) return n;
  }
  return DEFAULT_CATEGORY_SHARD_COUNT;
}
