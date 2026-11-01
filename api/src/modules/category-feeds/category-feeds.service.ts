import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as https from 'https';
import * as http from 'http';
import { RedisService } from '../redis/redis.service';
import {
  UT1_CATEGORY_MAP,
  UT1_LOAD_CATEGORIES,
  ut1DomainsUrl,
} from './ut1-category-map';
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
}

@Injectable()
export class CategoryFeedsService implements OnModuleInit {
  private readonly logger = new Logger(CategoryFeedsService.name);
  private stats: CategoryLoadStats = {
    lastRun: null,
    lastError: null,
    byCategory: {},
    ut1CategoriesLoaded: 0,
  };

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit(): Promise<void> {
    setTimeout(() => {
      this.loadUt1Categories().catch((err) =>
        this.logger.error(`Initial UT1 category load failed: ${err.message}`),
      );
    }, 15_000);
  }

  getStats(): CategoryLoadStats {
    return { ...this.stats, byCategory: { ...this.stats.byCategory } };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async loadUt1CategoriesScheduled(): Promise<void> {
    await this.loadUt1Categories();
  }

  async loadUt1Categories(): Promise<CategoryLoadStats> {
    this.logger.log('Starting UT1 category blacklist load');
    const redis = this.redisService.getClient();
    const merged: Record<string, Set<string>> = {};
    let ut1Loaded = 0;
    let lastError: string | null = null;

    for (const ut1Cat of UT1_LOAD_CATEGORIES) {
      const mapped = UT1_CATEGORY_MAP[ut1Cat];
      if (!mapped) continue;

      try {
        const content = await this.fetchUrl(ut1DomainsUrl(ut1Cat));
        const domains = this.parseDomainList(content);
        if (domains.length === 0) {
          this.logger.warn(`UT1 category ${ut1Cat} returned no domains`);
          continue;
        }
        ut1Loaded++;
        if (!merged[mapped]) merged[mapped] = new Set();
        for (const d of domains) merged[mapped].add(d);
      } catch (err) {
        lastError = err.message;
        this.logger.warn(`UT1 ${ut1Cat} failed: ${err.message}`);
      }
      await this.delay(500);
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
      await this.redisService.getClient().publish(
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
    };

    return this.getStats();
  }

  private parseDomainList(content: string): string[] {
    const out: string[] = [];
    for (const line of content.split('\n')) {
      const trimmed = line.trim().toLowerCase();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
        continue;
      }
      if (this.isValidDomain(trimmed)) out.push(trimmed);
    }
    return out;
  }

  private isValidDomain(domain: string): boolean {
    if (!domain || domain.length < 3 || domain.length > 253) return false;
    if (!domain.includes('.')) return false;
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(
      domain,
    );
  }

  private async fetchUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const request = protocol.get(
        url,
        {
          headers: {
            'User-Agent': 'FluxShield-CategoryLoader/1.0',
            Accept: 'text/plain',
          },
          timeout: 120_000,
        },
        (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            const loc = res.headers.location;
            if (loc) {
              this.fetchUrl(loc).then(resolve).catch(reject);
              return;
            }
          }
          if (res.statusCode !== 200) {
            reject(
              new Error(`HTTP ${res.statusCode}: ${res.statusMessage ?? ''}`),
            );
            return;
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
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

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
