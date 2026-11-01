import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { RedisService } from '../redis/redis.service';
import {
  DEFAULT_UT1_SOURCE_CATEGORIES,
  UT1_CATEGORY_MAP,
} from './ut1-category-map';
import {
  categoryDomainShard,
  resolveCategoryShardCount,
} from './category-domain-shard';
import {
  deleteLegacyCategoryKey,
  ShardedCategoryStreamWriter,
  sumCategoryShardCounts,
} from './category-shard-redis';
import { categoryShardKey } from '../threat-feeds/redis-threat-keys';
import { storeFeedMeta } from '../threat-feeds/redis-set-swap';
import {
  streamOlbatUt1CategoryMapped,
  streamUt1TarGzCategories,
} from './ut1-stream-loader';

export interface CategoryLoadStats {
  lastRun: Date | null;
  lastError: string | null;
  byCategory: Record<string, number>;
  ut1CategoriesLoaded: number;
  enabledUt1Sources: string[];
  shardCount: number;
}

const MIN_LIVE_FRACTION = 0.5;

@Injectable()
export class CategoryFeedsService implements OnModuleInit {
  private readonly logger = new Logger(CategoryFeedsService.name);
  private stats: CategoryLoadStats = {
    lastRun: null,
    lastError: null,
    byCategory: {},
    ut1CategoriesLoaded: 0,
    enabledUt1Sources: [],
    shardCount: 16,
  };

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    setTimeout(() => {
      this.ensureCategoryDataLoaded().catch((err) =>
        this.logger.error(`Startup category load failed: ${err.message}`),
      );
    }, 12_000);
  }

  getStats(): CategoryLoadStats {
    return {
      ...this.stats,
      byCategory: { ...this.stats.byCategory },
      enabledUt1Sources: [...this.stats.enabledUt1Sources],
    };
  }

  getShardCount(): number {
    return resolveCategoryShardCount(
      this.configService.get<string>('CATEGORY_SHARD_COUNT'),
    );
  }

  getEnabledUt1SourceCategories(): string[] {
    const raw = this.configService.get<string>('CATEGORY_FEEDS_ENABLED');
    if (raw?.trim()) {
      const list = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (list.includes('adult')) {
        this.logger.log(
          'Loading full UT1 adult list (explicit CATEGORY_FEEDS_ENABLED)',
        );
      }
      return list;
    }
    return [...DEFAULT_UT1_SOURCE_CATEGORIES];
  }

  mappedFluxCategories(sources: string[]): string[] {
    const out = new Set<string>();
    for (const src of sources) {
      const mapped = UT1_CATEGORY_MAP[src];
      if (mapped) out.add(mapped);
    }
    return [...out];
  }

  @Cron('0 3 * * *', { timeZone: 'America/Chicago' })
  async loadUt1CategoriesScheduled(): Promise<void> {
    await this.loadUt1Categories();
  }

  async ensureCategoryDataLoaded(): Promise<void> {
    const sources = this.getEnabledUt1SourceCategories();
    const shardCount = this.getShardCount();
    const fluxCats = this.mappedFluxCategories(sources);
    const redis = this.redisService.getClient();

    for (const cat of fluxCats) {
      if (await this.fluxCategoryShardsMissing(redis, cat, shardCount)) {
        this.logger.log(
          `Category ${cat} shards incomplete; running UT1 load`,
        );
        await this.loadUt1Categories();
        return;
      }
    }
    this.logger.debug('All enabled category shards present');
  }

  private async fluxCategoryShardsMissing(
    redis: ReturnType<RedisService['getClient']>,
    fluxCategory: string,
    shardCount: number,
  ): Promise<boolean> {
    for (let s = 0; s < shardCount; s++) {
      const exists = await redis.exists(categoryShardKey(fluxCategory, s));
      if (!exists) return true;
    }
    return false;
  }

  async loadUt1Categories(): Promise<CategoryLoadStats> {
    const sources = this.getEnabledUt1SourceCategories();
    const shardCount = this.getShardCount();
    const redis = this.redisService.getClient();
    const fluxCategories = this.mappedFluxCategories(sources);

    this.logger.log(
      `UT1 load: ${sources.length} sources → ${fluxCategories.length} Flux categories, ${shardCount} shards each`,
    );

    const writers = new Map<string, ShardedCategoryStreamWriter>();
    for (const cat of fluxCategories) {
      writers.set(
        cat,
        new ShardedCategoryStreamWriter(redis, cat, shardCount),
      );
    }

    const ingest = async (ut1Category: string, domain: string) => {
      const mapped = UT1_CATEGORY_MAP[ut1Category];
      if (!mapped) return;
      if (!this.isValidDomain(domain)) return;
      const writer = writers.get(mapped);
      if (writer) await writer.ingestDomain(domain);
    };

    let ut1Loaded = 0;
    let lastError: string | null = null;
    const tarLoaded = new Set<string>();

    try {
      const fromTar = await streamUt1TarGzCategories(
        new Set(sources),
        ingest,
      );
      fromTar.forEach((c) => tarLoaded.add(c));
      ut1Loaded += fromTar.size;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      this.logger.warn(`UT1 tar stream failed: ${lastError}`);
    }

    for (const ut1Cat of sources) {
      if (tarLoaded.has(ut1Cat)) continue;
      try {
        await streamOlbatUt1CategoryMapped(ut1Cat, ingest);
        ut1Loaded++;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        this.logger.warn(`UT1 mirror ${ut1Cat} failed: ${lastError}`);
      }
    }

    const byCategory: Record<string, number> = {};

    for (const [fluxCat, writer] of writers.entries()) {
      const previousLive = await sumCategoryShardCounts(
        redis,
        fluxCat,
        shardCount,
      );

      try {
        const newCount = await writer.finalizeAll();
        if (
          previousLive > 0 &&
          newCount < previousLive * MIN_LIVE_FRACTION
        ) {
          await writer.abortStaging();
          lastError = `Refusing swap for ${fluxCat}: new count ${newCount} < 50% of live ${previousLive}`;
          this.logger.warn(lastError);
          byCategory[fluxCat] = previousLive;
          continue;
        }
        await deleteLegacyCategoryKey(redis, fluxCat);
        byCategory[fluxCat] = newCount;
        this.logger.log(
          `Category ${fluxCat}: ${newCount} domains across ${shardCount} shards (~${Math.ceil(newCount / shardCount)} per shard)`,
        );
      } catch (err) {
        await writer.abortStaging();
        lastError = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to finalize ${fluxCat}: ${lastError}`);
        byCategory[fluxCat] = previousLive;
      }
    }

    if (Object.values(byCategory).some((n) => n > 0)) {
      await redis.publish(
        'nebula:invalidate',
        JSON.stringify({ type: 'categories' }),
      );
    }

    await storeFeedMeta(redis, {
      id: 'ut1-blacklists',
      name: 'UT1 Blacklists (sharded)',
      entryCount: Object.values(byCategory).reduce((a, b) => a + b, 0),
      lastUpdated: new Date().toISOString(),
      lastError,
      isEnabled: true,
    });

    this.stats = {
      lastRun: new Date(),
      lastError,
      byCategory,
      ut1CategoriesLoaded: ut1Loaded,
      enabledUt1Sources: sources,
      shardCount,
    };

    return this.getStats();
  }

  /** Exported for tests */
  isValidDomain(domain: string): boolean {
    if (!domain || domain.length < 3 || domain.length > 253) return false;
    if (!domain.includes('.')) return false;
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(
      domain,
    );
  }

  /** @internal test helper */
  shardForDomain(domain: string): number {
    return categoryDomainShard(domain, this.getShardCount());
  }
}
