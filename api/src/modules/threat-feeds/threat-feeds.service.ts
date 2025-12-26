import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as https from 'https';

export interface ThreatFeedSource {
  id: string;
  name: string;
  type: 'domain_list' | 'ip_list' | 'stix' | 'taxii';
  url: string;
  format: 'text' | 'json' | 'csv' | 'stix';
  updateFrequency: string;
  isEnabled: boolean;
  lastUpdated: Date | null;
  entryCount: number;
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

@Injectable()
export class ThreatFeedsService {
  private readonly logger = new Logger(ThreatFeedsService.name);
  private threatCache: Map<string, ThreatIndicator> = new Map();

  // Default threat feed sources
  private readonly defaultFeeds: ThreatFeedSource[] = [
    {
      id: 'malware-domains',
      name: 'Malware Domain List',
      type: 'domain_list',
      url: 'https://mirror1.malwaredomains.com/files/justdomains',
      format: 'text',
      updateFrequency: '24h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
    },
    {
      id: 'phishing-database',
      name: 'OpenPhish Database',
      type: 'domain_list',
      url: 'https://openphish.com/feed.txt',
      format: 'text',
      updateFrequency: '1h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
    },
    {
      id: 'ransomware-tracker',
      name: 'Ransomware Tracker',
      type: 'domain_list',
      url: 'https://ransomwaretracker.abuse.ch/downloads/RW_DOMBL.txt',
      format: 'text',
      updateFrequency: '6h',
      isEnabled: true,
      lastUpdated: null,
      entryCount: 0,
    },
  ];

  async getFeeds(): Promise<ThreatFeedSource[]> {
    return this.defaultFeeds;
  }

  async updateFeed(feedId: string): Promise<{ success: boolean; entryCount: number; error?: string }> {
    const feed = this.defaultFeeds.find(f => f.id === feedId);
    if (!feed) {
      return { success: false, entryCount: 0, error: 'Feed not found' };
    }

    try {
      const content = await this.fetchFeed(feed.url);
      const entries = this.parseFeed(content, feed.format, feed.type);
      
      // Update cache
      for (const entry of entries) {
        this.threatCache.set(entry.value, entry);
      }

      feed.lastUpdated = new Date();
      feed.entryCount = entries.length;

      this.logger.log(`Updated feed ${feed.name}: ${entries.length} entries`);
      return { success: true, entryCount: entries.length };
    } catch (error) {
      this.logger.error(`Failed to update feed ${feed.name}: ${error.message}`);
      return { success: false, entryCount: 0, error: error.message };
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateAllFeeds() {
    this.logger.log('Starting scheduled threat feed update');
    
    for (const feed of this.defaultFeeds) {
      if (feed.isEnabled) {
        await this.updateFeed(feed.id);
      }
    }
  }

  checkDomain(domain: string): ThreatIndicator | null {
    return this.threatCache.get(domain) || null;
  }

  checkIP(ip: string): ThreatIndicator | null {
    return this.threatCache.get(ip) || null;
  }

  getStats(): { totalIndicators: number; byCategory: Record<string, number> } {
    const byCategory: Record<string, number> = {};
    
    for (const indicator of this.threatCache.values()) {
      byCategory[indicator.category] = (byCategory[indicator.category] || 0) + 1;
    }

    return {
      totalIndicators: this.threatCache.size,
      byCategory,
    };
  }

  private async fetchFeed(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    });
  }

  private parseFeed(content: string, format: string, type: string): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];
    const now = new Date();

    if (format === 'text') {
      const lines = content.split('\n').filter(line => 
        line.trim() && !line.startsWith('#') && !line.startsWith('//')
      );

      for (const line of lines) {
        const value = line.trim().toLowerCase();
        if (value) {
          indicators.push({
            type: type === 'ip_list' ? 'ip' : 'domain',
            value,
            category: this.inferCategory(type),
            source: 'threat-feed',
            severity: 'high',
            firstSeen: now,
            lastSeen: now,
          });
        }
      }
    }

    return indicators;
  }

  private inferCategory(type: string): string {
    if (type.includes('malware')) return 'malware';
    if (type.includes('phishing')) return 'phishing';
    if (type.includes('ransomware')) return 'ransomware';
    return 'threat';
  }
}

