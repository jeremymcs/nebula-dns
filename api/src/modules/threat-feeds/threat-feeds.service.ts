import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as https from 'https';
import * as http from 'http';
import { RedisService } from '../redis/redis.service';
import {
  THREAT_CATEGORIES,
  threatSetKey,
} from './redis-threat-keys';
import {
  loadFeedMeta,
  rebuildThreatCategorySet,
  storeFeedMeta,
} from './redis-set-swap';

export interface ThreatFeedSource {
  id: string;
  name: string;
  type: 'domain_list' | 'ip_list' | 'stix' | 'taxii' | 'hostfile';
  url: string;
  format: 'text' | 'json' | 'csv' | 'stix' | 'hostfile';
  category:
    | 'malware'
    | 'phishing'
    | 'ransomware'
    | 'c2'
    | 'botnet'
    | 'cryptomining'
    | 'spam'
    | 'dga';
  updateFrequency: string;
  isEnabled: boolean;
  lastUpdated: Date | null;
  entryCount: number;
  lastError?: string | null;
  description?: string;
}

export interface ThreatIndicator {
  type: 'domain' | 'ip' | 'url';
  value: string;
  category: string;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  firstSeen: Date;
  lastSeen: Date;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ThreatFeedsService implements OnModuleInit {
  private readonly logger = new Logger(ThreatFeedsService.name);
  private threatCache: Map<string, ThreatIndicator> = new Map();
  /** Domains contributed by each feed (for atomic per-category Redis rebuild). */
  private feedDomainIndex: Map<string, string[]> = new Map();

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    const phishKey = this.configService.get<string>('PHISHTANK_APP_KEY');
    const phishFeed = this.defaultFeeds.find((f) => f.id === 'phishtank');
    if (phishFeed && phishKey?.trim()) {
      phishFeed.isEnabled = true;
    }
  }

  private get phishTankUrl(): string {
    const key = this.configService.get<string>('PHISHTANK_APP_KEY');
    if (key?.trim()) {
      return `https://data.phishtank.com/data/${encodeURIComponent(key.trim())}/online-valid.csv`;
    }
    return 'https://data.phishtank.com/data/online-valid.csv';
  }

  async onModuleInit(): Promise<void> {
    setTimeout(() => {
      this.updateAllFeeds().catch((err) =>
        this.logger.error(`Initial threat feed sync failed: ${err.message}`),
      );
    }, 10_000);
  }

  private readonly defaultFeeds: ThreatFeedSource[] = [
    {
      id: 'urlhaus-malware-filter',
      name: 'URLhaus Online (malware-filter)',
      type: 'hostfile',
      url: 'https://malware-filter.gitlab.io/malware-filter/urlhaus-filter-online.txt',
      format: 'hostfile',
      category: 'malware',
      updateFrequency: '1h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
      description:
        'Online malicious URLs/domains (mirrors URLhaus; abuse.ch bulk downloads are 410)',
    },
    {
      id: 'disconnect-malware',
      name: 'Disconnect Simple Malware',
      type: 'domain_list',
      url: 'https://s3.amazonaws.com/lists.disconnect.me/simple_malware.txt',
      format: 'text',
      category: 'malware',
      updateFrequency: '6h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
      description: 'Disconnect.me simple malware domain list',
    },
    {
      id: 'shadowwhisperer-malware',
      name: 'ShadowWhisperer Malware Domains',
      type: 'domain_list',
      url: 'https://raw.githubusercontent.com/ShadowWhisperer/BlockLists/master/Lists/Malware',
      format: 'text',
      category: 'malware',
      updateFrequency: '6h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
      description: 'Community malware domain blocklist',
    },
    {
      id: 'openphish',
      name: 'OpenPhish Feed',
      type: 'domain_list',
      url: 'https://openphish.com/feed.txt',
      format: 'text',
      category: 'phishing',
      updateFrequency: '1h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
      description: 'OpenPhish phishing URLs',
    },
    {
      id: 'phishtank',
      name: 'PhishTank Verified',
      type: 'domain_list',
      url: '', // resolved via phishTankUrl
      format: 'csv',
      category: 'phishing',
      updateFrequency: '1h',
      isEnabled: false,
      lastUpdated: null,
      entryCount: 0,
      description:
        'PhishTank CSV (enable with optional PHISHTANK_APP_KEY; public endpoint is rate-limited)',
    },
    {
      id: 'phishing-army',
      name: 'Phishing Army Blocklist',
      type: 'domain_list',
      url: 'https://phishing.army/download/phishing_army_blocklist.txt',
      format: 'text',
      category: 'phishing',
      updateFrequency: '6h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
      description: 'Phishing Army domain blocklist',
    },
    {
      id: 'botvrij-botnet',
      name: 'Botvrij.eu IOC Domains',
      type: 'domain_list',
      url: 'https://www.botvrij.eu/data/ioclist.domain.raw',
      format: 'text',
      category: 'botnet',
      updateFrequency: '6h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
      description: 'Botvrij indicator domains (botnet/C2)',
    },
  ];

  async getFeeds(): Promise<ThreatFeedSource[]> {
    return this.defaultFeeds.map((f) =>
      f.id === 'phishtank' ? { ...f, url: this.phishTankUrl } : { ...f },
    );
  }

  async getFeedsByCategory(category: string): Promise<ThreatFeedSource[]> {
    const feeds = await this.getFeeds();
    return feeds.filter((f) => f.category === category);
  }

  async toggleFeed(
    feedId: string,
    enabled: boolean,
  ): Promise<ThreatFeedSource | null> {
    const feed = this.defaultFeeds.find((f) => f.id === feedId);
    if (feed) {
      feed.isEnabled = enabled;
      await this.rebuildThreatCategoryInRedis(feed.category);
      return feed.id === 'phishtank'
        ? { ...feed, url: this.phishTankUrl }
        : { ...feed };
    }
    return null;
  }

  async updateFeed(feedId: string): Promise<{
    success: boolean;
    entryCount: number;
    error?: string;
    duration?: number;
  }> {
    const feed = this.defaultFeeds.find((f) => f.id === feedId);
    if (!feed) {
      return { success: false, entryCount: 0, error: 'Feed not found' };
    }

    const startTime = Date.now();
    const url = feed.id === 'phishtank' ? this.phishTankUrl : feed.url;

    try {
      this.logger.log(`Fetching feed: ${feed.name} from ${url}`);
      const content = await this.fetchFeed(url);
      const entries = this.parseFeed(content, feed);

      for (const entry of entries) {
        this.threatCache.set(entry.value, entry);
      }

      this.feedDomainIndex.set(
        feed.id,
        entries.map((e) => e.value),
      );

      await this.rebuildThreatCategoryInRedis(feed.category);

      feed.lastUpdated = new Date();
      feed.entryCount = entries.length;
      feed.lastError = null;

      const redis = this.redisService.getClient();
      await storeFeedMeta(redis, {
        id: feed.id,
        name: feed.name,
        entryCount: feed.entryCount,
        lastUpdated: feed.lastUpdated.toISOString(),
        lastError: null,
        isEnabled: feed.isEnabled,
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `Updated feed ${feed.name}: ${entries.length} entries in ${duration}ms`,
      );
      return { success: true, entryCount: entries.length, duration };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      feed.lastError = message;
      this.logger.error(`Failed to update feed ${feed.name}: ${message}`);

      const redis = this.redisService.getClient();
      await storeFeedMeta(redis, {
        id: feed.id,
        name: feed.name,
        entryCount: feed.entryCount,
        lastUpdated: feed.lastUpdated?.toISOString() ?? null,
        lastError: message,
        isEnabled: feed.isEnabled,
      });

      return { success: false, entryCount: 0, error: message };
    }
  }

  private async rebuildThreatCategoryInRedis(category: string): Promise<void> {
    const merged = new Set<string>();
    for (const feed of this.defaultFeeds) {
      if (feed.category !== category || !feed.isEnabled) continue;
      for (const d of this.feedDomainIndex.get(feed.id) ?? []) {
        merged.add(d);
      }
    }
    await rebuildThreatCategorySet(
      this.redisService.getClient(),
      category,
      [...merged],
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateAllFeeds(): Promise<{
    updated: number;
    failed: number;
    total: number;
  }> {
    this.logger.log('Starting scheduled threat feed update');

    let updated = 0;
    let failed = 0;

    for (const feed of this.defaultFeeds) {
      if (feed.isEnabled) {
        const result = await this.updateFeed(feed.id);
        if (result.success) updated++;
        else failed++;
        await this.delay(1000);
      }
    }

    if (updated > 0) {
      await this.redisService.getClient().publish(
        'nebula:invalidate',
        JSON.stringify({ type: 'threats' }),
      );
    }

    return {
      updated,
      failed,
      total: this.defaultFeeds.filter((f) => f.isEnabled).length,
    };
  }

  async checkDomain(domain: string): Promise<ThreatIndicator | null> {
    const normalized = domain.toLowerCase().trim();
    const cached = this.threatCache.get(normalized);
    if (cached) return cached;

    const redis = this.redisService.getClient();
    for (const suffix of this.domainSuffixes(normalized)) {
      for (const category of THREAT_CATEGORIES) {
        const isMember = await redis.sismember(threatSetKey(category), suffix);
        if (isMember) {
          return {
            type: 'domain',
            value: normalized,
            category,
            source: 'redis',
            severity: this.getSeverityForCategory(category),
            firstSeen: new Date(),
            lastSeen: new Date(),
          };
        }
      }
    }

    return null;
  }

  async checkDomainBatch(
    domains: string[],
  ): Promise<Map<string, ThreatIndicator>> {
    const results = new Map<string, ThreatIndicator>();
    for (const domain of domains) {
      const indicator = await this.checkDomain(domain);
      if (indicator) results.set(domain, indicator);
    }
    return results;
  }

  checkIP(ip: string): ThreatIndicator | null {
    return this.threatCache.get(ip) || null;
  }

  async getStats(): Promise<{
    totalIndicators: number;
    byCategory: Record<string, number>;
    feedStats: Array<{
      id: string;
      name: string;
      entryCount: number;
      lastUpdated: Date | null;
      lastError: string | null;
      isEnabled: boolean;
    }>;
  }> {
    const byCategory: Record<string, number> = {};
    const redis = this.redisService.getClient();

    for (const category of THREAT_CATEGORIES) {
      const count = await redis.scard(threatSetKey(category));
      if (count > 0) byCategory[category] = count;
    }

    const feedStats = await Promise.all(
      this.defaultFeeds.map(async (f) => {
        const meta = await loadFeedMeta(redis, f.id);
        return {
          id: f.id,
          name: f.name,
          entryCount: f.entryCount,
          lastUpdated: f.lastUpdated,
          lastError: f.lastError ?? meta?.lastError ?? null,
          isEnabled: f.isEnabled,
        };
      }),
    );

    return {
      totalIndicators: Object.values(byCategory).reduce((a, b) => a + b, 0),
      byCategory,
      feedStats,
    };
  }

  private domainSuffixes(domain: string): string[] {
    const parts = domain.split('.');
    if (parts.length < 2) return [domain];
    const out: string[] = [];
    for (let i = 0; i < parts.length - 1; i++) {
      out.push(parts.slice(i).join('.'));
    }
    return out;
  }

  private getSeverityForCategory(
    category: string,
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (category) {
      case 'ransomware':
      case 'c2':
        return 'critical';
      case 'malware':
      case 'phishing':
      case 'botnet':
        return 'high';
      case 'cryptomining':
      case 'dga':
        return 'medium';
      default:
        return 'low';
    }
  }

  private async fetchFeed(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const request = protocol.get(
        url,
        {
          headers: {
            'User-Agent': 'FluxShield-ThreatLoader/1.0',
            Accept: 'text/plain, application/json, text/csv',
          },
          timeout: 120_000,
        },
        (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            const redirectUrl = res.headers.location;
            if (redirectUrl) {
              this.fetchFeed(redirectUrl).then(resolve).catch(reject);
              return;
            }
          }

          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
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

  private parseFeed(
    content: string,
    feed: ThreatFeedSource,
  ): ThreatIndicator[] {
    const now = new Date();
    switch (feed.format) {
      case 'text':
        return this.parseTextFeed(content, feed, now);
      case 'hostfile':
        return this.parseHostfileFeed(content, feed, now);
      case 'csv':
        return this.parseCsvFeed(content, feed, now);
      case 'json':
        return this.parseJsonFeed(content, feed, now);
      default:
        return this.parseTextFeed(content, feed, now);
    }
  }

  private parseTextFeed(
    content: string,
    feed: ThreatFeedSource,
    now: Date,
  ): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];
    const lines = content
      .split('\n')
      .filter(
        (line) =>
          line.trim() &&
          !line.startsWith('#') &&
          !line.startsWith('//') &&
          !line.startsWith(';') &&
          !line.startsWith('!'),
      );

    for (const line of lines) {
      const domain = this.extractDomain(line.trim().toLowerCase());
      if (domain && this.isValidDomain(domain)) {
        indicators.push({
          type: feed.type === 'ip_list' ? 'ip' : 'domain',
          value: domain,
          category: feed.category,
          source: feed.id,
          severity: this.getSeverityForCategory(feed.category),
          firstSeen: now,
          lastSeen: now,
        });
      }
    }

    return indicators;
  }

  private parseHostfileFeed(
    content: string,
    feed: ThreatFeedSource,
    now: Date,
  ): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];
    const lines = content
      .split('\n')
      .filter(
        (line) =>
          line.trim() && !line.startsWith('#') && !line.startsWith('!'),
      );

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const domain = parts[1].toLowerCase();
        if (domain && domain !== 'localhost' && this.isValidDomain(domain)) {
          indicators.push({
            type: 'domain',
            value: domain,
            category: feed.category,
            source: feed.id,
            severity: this.getSeverityForCategory(feed.category),
            firstSeen: now,
            lastSeen: now,
          });
        }
      }
    }

    return indicators;
  }

  private parseCsvFeed(
    content: string,
    feed: ThreatFeedSource,
    now: Date,
  ): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];
    const lines = content
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('#'));

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      for (const part of parts) {
        const domain = this.extractDomain(part.replace(/"/g, '').trim());
        if (domain && this.isValidDomain(domain)) {
          indicators.push({
            type: 'domain',
            value: domain,
            category: feed.category,
            source: feed.id,
            severity: this.getSeverityForCategory(feed.category),
            firstSeen: now,
            lastSeen: now,
          });
          break;
        }
      }
    }

    return indicators;
  }

  private parseJsonFeed(
    content: string,
    feed: ThreatFeedSource,
    now: Date,
  ): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];

    try {
      const data = JSON.parse(content);
      const items = Array.isArray(data)
        ? data
        : data.domains || data.items || data.data || [];

      for (const item of items) {
        const domain =
          typeof item === 'string'
            ? item
            : item.domain || item.url || item.value;
        if (domain) {
          const extracted = this.extractDomain(String(domain));
          if (extracted && this.isValidDomain(extracted)) {
            indicators.push({
              type: 'domain',
              value: extracted,
              category: feed.category,
              source: feed.id,
              severity: this.getSeverityForCategory(feed.category),
              firstSeen: now,
              lastSeen: now,
            });
          }
        }
      }
    } catch (e) {
      this.logger.error(
        `Failed to parse JSON feed ${feed.id}: ${e instanceof Error ? e.message : e}`,
      );
    }

    return indicators;
  }

  private extractDomain(input: string): string {
    let domain = input.replace(/^https?:\/\//, '');
    domain = domain.split('/')[0];
    domain = domain.split(':')[0];
    domain = domain.replace(/^www\./, '');
    return domain.toLowerCase();
  }

  private isValidDomain(domain: string): boolean {
    if (!domain || domain.length < 3 || domain.length > 253) return false;
    if (domain.includes(' ')) return false;
    if (domain.startsWith('.') || domain.endsWith('.')) return false;
    if (domain.startsWith('-') || domain.endsWith('-')) return false;
    if (!domain.includes('.')) return false;
    const domainPattern =
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
    return domainPattern.test(domain);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
