import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as https from 'https';
import * as http from 'http';
import Redis from 'ioredis';

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
  metadata?: Record<string, any>;
}

const REDIS_THREAT_PREFIX = 'nebula:threats:';
const REDIS_THREAT_TTL = 86400; // 24 hours

@Injectable()
export class ThreatFeedsService {
  private readonly logger = new Logger(ThreatFeedsService.name);
  private threatCache: Map<string, ThreatIndicator> = new Map();
  private redisClient: Redis | null = null;

  constructor(@Optional() @Inject('REDIS_CLIENT') redis?: Redis) {
    this.redisClient = redis || null;
    if (!this.redisClient) {
      this.logger.warn(
        'Redis not available, using in-memory threat cache only',
      );
    }
  }

  // Comprehensive threat feed sources - all free and publicly available
  private readonly defaultFeeds: ThreatFeedSource[] = [
    // ==================== MALWARE ====================
    {
      id: 'urlhaus-domains',
      name: 'URLhaus Malware Domains',
      type: 'hostfile',
      url: 'https://urlhaus.abuse.ch/downloads/hostfile/',
      format: 'hostfile',
      category: 'malware',
      updateFrequency: '1h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
      description: 'Abuse.ch URLhaus malware distribution domains',
    },
    {
      id: 'abuse-ssl-blacklist',
      name: 'Abuse.ch SSL Blacklist',
      type: 'domain_list',
      url: 'https://sslbl.abuse.ch/blacklist/sslblacklist.txt',
      format: 'text',
      category: 'malware',
      updateFrequency: '6h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
      description: 'SSL certificates associated with malware',
    },

    // ==================== PHISHING ====================
    {
      id: 'phishtank',
      name: 'PhishTank Verified',
      type: 'domain_list',
      url: 'https://data.phishtank.com/data/online-valid.csv',
      format: 'csv',
      category: 'phishing',
      updateFrequency: '1h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
      description: 'Community-verified phishing URLs',
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

    // ==================== C2 / BOTNET ====================
    {
      id: 'feodotracker',
      name: 'Feodo Tracker',
      type: 'domain_list',
      url: 'https://feodotracker.abuse.ch/downloads/domainblocklist.txt',
      format: 'text',
      category: 'c2',
      updateFrequency: '1h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
      description: 'Feodo/Emotet/Dridex C2 domains',
    },
    {
      id: 'threatfox-iocs',
      name: 'ThreatFox IOCs',
      type: 'domain_list',
      url: 'https://threatfox.abuse.ch/downloads/hostfile/',
      format: 'hostfile',
      category: 'c2',
      updateFrequency: '1h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
      description: 'ThreatFox indicators of compromise',
    },

    // ==================== RANSOMWARE ====================
    {
      id: 'ransomware-live',
      name: 'Ransomware.live',
      type: 'domain_list',
      url: 'https://ransomware.live/api/domains',
      format: 'json',
      category: 'ransomware',
      updateFrequency: '6h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
      description: 'Active ransomware group domains',
    },

    // ==================== CRYPTOMINING ====================
    {
      id: 'cryptomining-hosts',
      name: 'Cryptomining Blocklist',
      type: 'hostfile',
      url: 'https://raw.githubusercontent.com/nickspaargaren/no-google/master/categories/cryptominers.txt',
      format: 'text',
      category: 'cryptomining',
      updateFrequency: '24h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
      description: 'Known cryptomining domains',
    },

    // ==================== SPAM ====================
    {
      id: 'spamhaus-dbl',
      name: 'Spamhaus DBL',
      type: 'domain_list',
      url: 'https://www.spamhaus.org/drop/drop.txt',
      format: 'text',
      category: 'spam',
      updateFrequency: '24h',
      isEnabled: false, // Requires registration
      lastUpdated: null,
      entryCount: 0,
      description: 'Spamhaus Domain Block List',
    },

    // ==================== DGA ====================
    {
      id: 'dga-feed',
      name: 'DGA Feed',
      type: 'domain_list',
      url: 'https://dgafeed.caad.fkie.fraunhofer.de/today',
      format: 'text',
      category: 'dga',
      updateFrequency: '24h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
      description: 'Domain Generation Algorithm detected domains',
    },
  ];

  async getFeeds(): Promise<ThreatFeedSource[]> {
    return this.defaultFeeds;
  }

  async getFeedsByCategory(category: string): Promise<ThreatFeedSource[]> {
    return this.defaultFeeds.filter((f) => f.category === category);
  }

  async toggleFeed(
    feedId: string,
    enabled: boolean,
  ): Promise<ThreatFeedSource | null> {
    const feed = this.defaultFeeds.find((f) => f.id === feedId);
    if (feed) {
      feed.isEnabled = enabled;
      return feed;
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

    try {
      this.logger.log(`Fetching feed: ${feed.name} from ${feed.url}`);
      const content = await this.fetchFeed(feed.url);
      const entries = this.parseFeed(content, feed);

      // Update in-memory cache
      for (const entry of entries) {
        this.threatCache.set(entry.value, entry);
      }

      // Update Redis if available
      if (this.redisClient) {
        await this.updateRedisCache(feed.category, entries);
      }

      feed.lastUpdated = new Date();
      feed.entryCount = entries.length;

      const duration = Date.now() - startTime;
      this.logger.log(
        `Updated feed ${feed.name}: ${entries.length} entries in ${duration}ms`,
      );
      return { success: true, entryCount: entries.length, duration };
    } catch (error) {
      this.logger.error(`Failed to update feed ${feed.name}: ${error.message}`);
      return { success: false, entryCount: 0, error: error.message };
    }
  }

  private async updateRedisCache(
    category: string,
    entries: ThreatIndicator[],
  ): Promise<void> {
    if (!this.redisClient) return;

    const pipeline = this.redisClient.pipeline();
    const key = `${REDIS_THREAT_PREFIX}${category}`;

    // Add all domains to a Redis set for O(1) lookup
    for (const entry of entries) {
      pipeline.sadd(key, entry.value);
    }
    pipeline.expire(key, REDIS_THREAT_TTL);

    await pipeline.exec();
    this.logger.debug(
      `Updated Redis cache for ${category}: ${entries.length} entries`,
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
        if (result.success) {
          updated++;
        } else {
          failed++;
        }
        // Small delay between feeds to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Publish invalidation message
    if (this.redisClient && updated > 0) {
      await this.redisClient.publish(
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
    // Check in-memory cache first
    const cached = this.threatCache.get(domain);
    if (cached) return cached;

    // Check Redis if available
    if (this.redisClient) {
      for (const category of [
        'malware',
        'phishing',
        'c2',
        'ransomware',
        'cryptomining',
        'dga',
      ]) {
        const isMember = await this.redisClient.sismember(
          `${REDIS_THREAT_PREFIX}${category}`,
          domain,
        );
        if (isMember) {
          return {
            type: 'domain',
            value: domain,
            category,
            source: 'redis-cache',
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
      if (indicator) {
        results.set(domain, indicator);
      }
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
      isEnabled: boolean;
    }>;
  }> {
    const byCategory: Record<string, number> = {};

    for (const indicator of this.threatCache.values()) {
      byCategory[indicator.category] =
        (byCategory[indicator.category] || 0) + 1;
    }

    // Also check Redis counts if available
    if (this.redisClient) {
      for (const category of [
        'malware',
        'phishing',
        'c2',
        'ransomware',
        'cryptomining',
        'dga',
        'spam',
        'botnet',
      ]) {
        const count = await this.redisClient.scard(
          `${REDIS_THREAT_PREFIX}${category}`,
        );
        if (count > 0) {
          byCategory[category] = Math.max(byCategory[category] || 0, count);
        }
      }
    }

    return {
      totalIndicators: this.threatCache.size,
      byCategory,
      feedStats: this.defaultFeeds.map((f) => ({
        id: f.id,
        name: f.name,
        entryCount: f.entryCount,
        lastUpdated: f.lastUpdated,
        isEnabled: f.isEnabled,
      })),
    };
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
            'User-Agent': 'Nebula-DNS-Threat-Loader/1.0',
            Accept: 'text/plain, application/json, text/csv',
          },
          timeout: 30000,
        },
        (res) => {
          // Handle redirects
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
    const indicators: ThreatIndicator[] = [];
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
          !line.startsWith(';'),
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
      .filter((line) => line.trim() && !line.startsWith('#'));

    for (const line of lines) {
      // Hostfile format: "127.0.0.1 domain.com" or "0.0.0.0 domain.com"
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

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      // Try to find URL or domain in the row
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
          break; // Only take first valid domain per row
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
          const extracted = this.extractDomain(domain);
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
      this.logger.error(`Failed to parse JSON feed ${feed.id}: ${e.message}`);
    }

    return indicators;
  }

  private extractDomain(input: string): string {
    // Remove protocol
    let domain = input.replace(/^https?:\/\//, '');
    // Remove path
    domain = domain.split('/')[0];
    // Remove port
    domain = domain.split(':')[0];
    // Remove www prefix
    domain = domain.replace(/^www\./, '');
    return domain.toLowerCase();
  }

  private isValidDomain(domain: string): boolean {
    if (!domain || domain.length < 3 || domain.length > 253) return false;
    if (domain.includes(' ')) return false;
    if (domain.startsWith('.') || domain.endsWith('.')) return false;
    if (domain.startsWith('-') || domain.endsWith('-')) return false;
    // Must have at least one dot
    if (!domain.includes('.')) return false;
    // Basic domain pattern check
    const domainPattern =
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
    return domainPattern.test(domain);
  }
}
