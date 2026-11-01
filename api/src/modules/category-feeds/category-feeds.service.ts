import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import * as https from 'https';
import * as http from 'http';
import { RedisService } from '../redis/redis.service';
import {
  DEFAULT_UT1_SOURCE_CATEGORIES,
  UT1_CATEGORY_MAP,
  UT1_TAR_URL,
  olbatDomainsUrl,
} from './ut1-category-map';
import {
  extractUt1DomainsFromTarGz,
  parseDomainLines,
} from './ut1-tar-extract';
import {
  rebuildCategoryContentSet,
  storeFeedMeta,
} from '../threat-feeds/redis-set-swap';
import { categorySetKey } from '../threat-feeds/redis-threat-keys';

export interface CategoryLoadStats {
  lastRun: Date | null;
  lastError: string | null;
  byCategory: Record<string, number>;
  ut1CategoriesLoaded: number;
  enabledUt1Sources: string[];
}

@Injectable()
export class CategoryFeedsService implements OnModuleInit {
  private readonly logger = new Logger(CategoryFeedsService.name);
  private stats: CategoryLoadStats = {
    lastRun: null,
    lastError: null,
    byCategory: {},
    ut1CategoriesLoaded: 0,
    enabledUt1Sources: [],
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

  getEnabledUt1SourceCategories(): string[] {
    const raw = this.configService.get<string>('CATEGORY_FEEDS_ENABLED');
    if (raw?.trim()) {
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [...DEFAULT_UT1_SOURCE_CATEGORIES];
  }

  @Cron('0 3 * * *', { timeZone: 'America/Chicago' })
  async loadUt1CategoriesScheduled(): Promise<void> {
    await this.loadUt1Categories();
  }

  async ensureCategoryDataLoaded(): Promise<void> {
    const redis = this.redisService.getClient();
    const probeKey = categorySetKey('gambling');
    const exists = await redis.exists(probeKey);
    if (exists) {
      this.logger.debug(
        'Category Redis sets present; skipping startup full reload',
      );
      return;
    }
    await this.loadUt1Categories();
  }

  async loadUt1Categories(): Promise<CategoryLoadStats> {
    const sources = this.getEnabledUt1SourceCategories();
    this.logger.log(
      `Starting UT1 category load (${sources.length} source categories)`,
    );

    const redis = this.redisService.getClient();
    const merged: Record<string, Set<string>> = {};
    let ut1Loaded = 0;
    let lastError: string | null = null;

    const fromTar = await this.tryLoadFromUt1Tar(sources);
    for (const [ut1Cat, domains] of fromTar.entries()) {
      const mapped = UT1_CATEGORY_MAP[ut1Cat];
      if (!mapped || domains.length === 0) continue;
      ut1Loaded++;
      if (!merged[mapped]) merged[mapped] = new Set();
      for (const d of domains) {
        if (this.isValidDomain(d)) merged[mapped].add(d);
      }
    }

    for (const ut1Cat of sources) {
      if (fromTar.has(ut1Cat)) continue;
      const mapped = UT1_CATEGORY_MAP[ut1Cat];
      if (!mapped) {
        this.logger.warn(
          `Unknown UT1 category in CATEGORY_FEEDS_ENABLED: ${ut1Cat}`,
        );
        continue;
      }
      try {
        const content = await this.fetchUrl(olbatDomainsUrl(ut1Cat));
        const domains = parseDomainLines(content).filter((d) =>
          this.isValidDomain(d),
        );
        if (domains.length === 0) {
          this.logger.warn(`UT1 mirror ${ut1Cat} returned no domains`);
          continue;
        }
        ut1Loaded++;
        if (!merged[mapped]) merged[mapped] = new Set();
        for (const d of domains) merged[mapped].add(d);
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        this.logger.warn(`UT1 mirror ${ut1Cat} failed: ${lastError}`);
      }
      await this.delay(300);
    }

    const byCategory: Record<string, number> = {};
    for (const [cat, set] of Object.entries(merged)) {
      const domains = [...set];
      await rebuildCategoryContentSet(redis, cat, domains);
      byCategory[cat] = domains.length;
      this.logger.log(
        `Loaded ${domains.length} domains into ${categorySetKey(cat)}`,
      );
    }

    if (Object.keys(byCategory).length > 0) {
      await redis.publish(
        'nebula:invalidate',
        JSON.stringify({ type: 'categories' }),
      );
    }

    await storeFeedMeta(redis, {
      id: 'ut1-blacklists',
      name: 'UT1 Blacklists (Université Toulouse Capitole)',
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
    };

    return this.getStats();
  }

  private async tryLoadFromUt1Tar(
    categories: string[],
  ): Promise<Map<string, string[]>> {
    try {
      const buffer = await this.fetchBuffer(UT1_TAR_URL);
      return await extractUt1DomainsFromTarGz(buffer, categories);
    } catch (err) {
      this.logger.warn(
        `UT1 tar.gz load failed, will use mirror fallback: ${err instanceof Error ? err.message : err}`,
      );
      return new Map();
    }
  }

  private isValidDomain(domain: string): boolean {
    if (!domain || domain.length < 3 || domain.length > 253) return false;
    if (!domain.includes('.')) return false;
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(
      domain,
    );
  }

  private async fetchBuffer(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const request = protocol.get(
        url,
        {
          headers: { 'User-Agent': 'FluxShield-CategoryLoader/1.0' },
          timeout: 300_000,
        },
        (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            const loc = res.headers.location;
            if (loc) {
              this.fetchBuffer(loc).then(resolve).catch(reject);
              return;
            }
          }
          if (res.statusCode !== 200) {
            reject(
              new Error(`HTTP ${res.statusCode}: ${res.statusMessage ?? ''}`),
            );
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        },
      );
      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  private async fetchUrl(url: string): Promise<string> {
    const buffer = await this.fetchBuffer(url);
    return buffer.toString('utf8');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
