import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReportQueryDto, QueryLogDto, QueryLogEntry } from './dto/report-query.dto';

// Placeholder for ClickHouse integration
// In production, this would use @clickhouse/client

export interface ReportSummary {
  totalQueries: number;
  allowedQueries: number;
  blockedQueries: number;
  rewrittenQueries: number;
  blockRate: number;
  uniqueDomains: number;
  periodStart: string;
  periodEnd: string;
}

export interface TopBlockedDomain {
  domain: string;
  count: number;
  category: string;
  reason: string;
}

export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

export interface ThreatTrend {
  date: string;
  malware: number;
  phishing: number;
  c2: number;
  total: number;
}

export interface LocationStats {
  locationId: string;
  locationName: string;
  totalQueries: number;
  blockedQueries: number;
  blockRate: number;
}

export interface PaginatedQueryLogs {
  data: QueryLogEntry[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
  };
  total: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly configService: ConfigService) {}

  async getSummary(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<ReportSummary> {
    // Placeholder - would query ClickHouse
    const { startDate, endDate } = this.getDateRange(query);

    this.logger.debug(
      `Getting summary for tenant ${tenantId} from ${startDate} to ${endDate}`,
    );

    // Mock data for development
    return {
      totalQueries: 125000,
      allowedQueries: 118750,
      blockedQueries: 5000,
      rewrittenQueries: 1250,
      blockRate: 4.0,
      uniqueDomains: 8500,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  async getTopBlocked(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<TopBlockedDomain[]> {
    const { startDate, endDate } = this.getDateRange(query);
    const limit = query.limit || 10;

    this.logger.debug(
      `Getting top blocked for tenant ${tenantId}, limit ${limit}`,
    );

    // Mock data
    return [
      { domain: 'malware-site.com', count: 450, category: 'malware', reason: 'threat:malware' },
      { domain: 'phishing-example.net', count: 320, category: 'phishing', reason: 'threat:phishing' },
      { domain: 'ads.tracker.com', count: 280, category: 'advertising', reason: 'category:advertising' },
      { domain: 'social.media.net', count: 200, category: 'social_media', reason: 'category:social_media' },
      { domain: 'gambling-site.com', count: 150, category: 'gambling', reason: 'category:gambling' },
    ];
  }

  async getBlocksByCategory(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<CategoryStats[]> {
    const { startDate, endDate } = this.getDateRange(query);

    this.logger.debug(`Getting blocks by category for tenant ${tenantId}`);

    // Mock data
    return [
      { category: 'malware', count: 1500, percentage: 30 },
      { category: 'phishing', count: 1000, percentage: 20 },
      { category: 'advertising', count: 800, percentage: 16 },
      { category: 'social_media', count: 600, percentage: 12 },
      { category: 'adult', count: 500, percentage: 10 },
      { category: 'gambling', count: 300, percentage: 6 },
      { category: 'other', count: 300, percentage: 6 },
    ];
  }

  async getThreatTrends(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<ThreatTrend[]> {
    const { startDate, endDate } = this.getDateRange(query);

    this.logger.debug(`Getting threat trends for tenant ${tenantId}`);

    // Mock data - last 7 days
    const trends: ThreatTrend[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        malware: Math.floor(Math.random() * 100) + 50,
        phishing: Math.floor(Math.random() * 80) + 30,
        c2: Math.floor(Math.random() * 20) + 5,
        total: 0,
      });
      
      trends[trends.length - 1].total =
        trends[trends.length - 1].malware +
        trends[trends.length - 1].phishing +
        trends[trends.length - 1].c2;
    }

    return trends;
  }

  async getLocationStats(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<LocationStats[]> {
    const { startDate, endDate } = this.getDateRange(query);

    this.logger.debug(`Getting location stats for tenant ${tenantId}`);

    // Mock data
    return [
      {
        locationId: '550e8400-e29b-41d4-a716-446655440001',
        locationName: 'Main Office',
        totalQueries: 75000,
        blockedQueries: 3000,
        blockRate: 4.0,
      },
      {
        locationId: '550e8400-e29b-41d4-a716-446655440002',
        locationName: 'Branch Office',
        totalQueries: 35000,
        blockedQueries: 1500,
        blockRate: 4.3,
      },
      {
        locationId: '550e8400-e29b-41d4-a716-446655440003',
        locationName: 'Remote Workers',
        totalQueries: 15000,
        blockedQueries: 500,
        blockRate: 3.3,
      },
    ];
  }

  async getQueryLogs(
    tenantId: string,
    query: QueryLogDto,
  ): Promise<PaginatedQueryLogs> {
    const limit = query.limit || 50;

    this.logger.debug(
      `Getting query logs for tenant ${tenantId}, limit ${limit}`,
    );

    // Mock data for development - would query ClickHouse in production
    const domains = [
      'google.com', 'facebook.com', 'microsoft.com', 'github.com', 
      'malware-site.bad.com', 'phishing.fake.net', 'ads.tracker.com',
      'youtube.com', 'slack.com', 'zoom.us', 'twitter.com', 'instagram.com',
      'linkedin.com', 'amazon.com', 'cloudflare.com', 'gambling.site.net'
    ];
    const locations = [
      { id: '1', name: 'Main Office' },
      { id: '2', name: 'Branch Office' },
      { id: '3', name: 'Remote Workers' },
      { id: '4', name: 'Guest Network' }
    ];
    const queryTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];
    const actions: ('allow' | 'block' | 'rewrite')[] = ['allow', 'allow', 'allow', 'block', 'rewrite'];
    const blockReasons = [
      'Category: Social Media', 'Category: Adult', 'Threat: Malware', 
      'Threat: Phishing', 'Custom Blocklist', 'Category: Gambling'
    ];
    const categories = ['Malware', 'Phishing', 'Social Media', 'Adult', 'Advertising', 'Gambling'];

    const logs: QueryLogEntry[] = Array.from({ length: limit }, (_, i) => {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const now = new Date();
      now.setMinutes(now.getMinutes() - i * 2);
      
      return {
        id: `log-${Date.now()}-${i}`,
        timestamp: now.toISOString(),
        domain,
        queryType: queryTypes[Math.floor(Math.random() * queryTypes.length)],
        clientIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        locationId: location.id,
        locationName: location.name,
        action,
        reason: action === 'block' 
          ? blockReasons[Math.floor(Math.random() * blockReasons.length)]
          : action === 'rewrite' 
            ? 'SafeSearch Enforcement' 
            : 'Policy: Default Allow',
        category: action === 'block' ? categories[Math.floor(Math.random() * categories.length)] : undefined,
        responseTime: Math.floor(Math.random() * 50) + 1,
        cached: Math.random() > 0.7,
      };
    });

    // Apply filters
    let filteredLogs = logs;
    
    if (query.action) {
      filteredLogs = filteredLogs.filter(log => log.action === query.action);
    }
    if (query.locationId) {
      filteredLogs = filteredLogs.filter(log => log.locationId === query.locationId);
    }
    if (query.domain) {
      filteredLogs = filteredLogs.filter(log => 
        log.domain.toLowerCase().includes(query.domain!.toLowerCase())
      );
    }
    if (query.queryType) {
      filteredLogs = filteredLogs.filter(log => log.queryType === query.queryType);
    }

    return {
      data: filteredLogs,
      pagination: {
        cursor: filteredLogs.length >= limit 
          ? Buffer.from(filteredLogs[filteredLogs.length - 1].timestamp).toString('base64')
          : null,
        hasMore: filteredLogs.length >= limit,
      },
      total: 10000, // Mock total
    };
  }

  private getDateRange(query: ReportQueryDto): { startDate: string; endDate: string } {
    const now = new Date();
    let startDate: Date;

    switch (query.period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        startDate = query.startDate ? new Date(query.startDate) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const endDate = query.endDate ? new Date(query.endDate) : now;

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }
}
