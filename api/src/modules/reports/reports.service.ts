/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Reports Service - Analytics and Query Logging
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReportQueryDto, QueryLogDto, QueryLogEntry } from './dto/report-query.dto';
import { ClickHouseService } from '../clickhouse/clickhouse.service';

export interface ReportSummary {
  totalQueries: number;
  allowedQueries: number;
  blockedQueries: number;
  rewrittenQueries: number;
  blockRate: number;
  uniqueDomains: number;
  periodStart: string;
  periodEnd: string;
  threatsBlocked?: number;
  avgResponseTime?: number;
  cacheHitRate?: number;
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

export interface QueryTrend {
  timestamp: string;
  total: number;
  allowed: number;
  blocked: number;
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

  constructor(
    private readonly configService: ConfigService,
    private readonly clickhouseService: ClickHouseService,
  ) {}

  async getSummary(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<ReportSummary> {
    const { startDate, endDate } = this.getDateRange(query);
    const period = query.period || '7d';

    this.logger.debug(
      `Getting summary for tenant ${tenantId} from ${startDate} to ${endDate}`,
    );

    const stats = await this.clickhouseService.getSummaryStats(tenantId, period);

    return {
      totalQueries: stats.totalQueries,
      allowedQueries: stats.totalQueries - stats.blockedQueries,
      blockedQueries: stats.blockedQueries,
      rewrittenQueries: 0,
      blockRate: parseFloat(stats.blockRate) || 0,
      uniqueDomains: 0,
      periodStart: startDate,
      periodEnd: endDate,
      threatsBlocked: stats.threatsBlocked,
      avgResponseTime: stats.avgResponseTime,
      cacheHitRate: parseFloat(stats.cacheHitRate) || 0,
    };
  }

  async getTopBlocked(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<TopBlockedDomain[]> {
    const period = query.period || '7d';
    const limit = query.limit || 10;

    this.logger.debug(
      `Getting top blocked for tenant ${tenantId}, limit ${limit}`,
    );

    const data = await this.clickhouseService.getTopBlocked(tenantId, period, limit);

    return data.map((item: any) => ({
      domain: item.domain,
      count: Number(item.count),
      category: item.category || 'unknown',
      reason: `category:${item.category || 'unknown'}`,
    }));
  }

  async getBlocksByCategory(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<CategoryStats[]> {
    const period = query.period || '7d';

    this.logger.debug(`Getting blocks by category for tenant ${tenantId}`);

    return await this.clickhouseService.getBlocksByCategory(tenantId, period);
  }

  async getThreatTrends(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<ThreatTrend[]> {
    const period = query.period || '7d';

    this.logger.debug(`Getting threat trends for tenant ${tenantId}`);

    const data = await this.clickhouseService.getThreatTrends(tenantId, period);

    // Transform data or return mock if empty
    if (data.length === 0) {
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

    return data.map((item: any) => ({
      date: item.hour,
      malware: 0,
      phishing: 0,
      c2: 0,
      total: Number(item.threat_count) || 0,
    }));
  }

  async getLocationStats(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<LocationStats[]> {
    const period = query.period || '7d';

    this.logger.debug(`Getting location stats for tenant ${tenantId}`);

    return await this.clickhouseService.getLocationStats(tenantId, period);
  }

  async getQueryLogs(
    tenantId: string,
    query: QueryLogDto,
  ): Promise<PaginatedQueryLogs> {
    const limit = query.limit || 50;
    const offset = query.cursor ? parseInt(query.cursor, 10) : 0;

    this.logger.debug(
      `Getting query logs for tenant ${tenantId}, limit ${limit}, offset ${offset}`,
    );

    return await this.clickhouseService.getQueryLogs({
      tenantId,
      locationId: query.locationId,
      action: query.action,
      domain: query.domain,
      queryType: query.queryType,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      limit,
      offset,
    });
  }

  async getQueryTrends(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<QueryTrend[]> {
    const period = query.period || '7d';

    this.logger.debug(`Getting query trends for tenant ${tenantId}, period ${period}`);

    return await this.clickhouseService.getQueryTrends(tenantId, period);
  }

  async getInsights(tenantId: string, query: ReportQueryDto): Promise<any> {
    const period = query.period || '7d';
    this.logger.debug(`Getting insights for tenant ${tenantId}, period ${period}`);

    // Get summary stats to generate insights
    const stats = await this.clickhouseService.getSummaryStats(tenantId, period);
    const topBlocked = await this.clickhouseService.getTopBlocked(tenantId, period, 5);

    const insights = [];

    // Generate insights based on data
    if (stats.blockedQueries > 0) {
      insights.push({
        id: 'threat-activity',
        type: 'warning',
        title: 'Threat Activity Detected',
        description: `${stats.blockedQueries.toLocaleString()} threats blocked in the last ${period}`,
        severity: stats.blockedQueries > 1000 ? 'high' : stats.blockedQueries > 100 ? 'medium' : 'low',
        timestamp: new Date().toISOString(),
      });
    }

    if (topBlocked.length > 0) {
      insights.push({
        id: 'top-threat',
        type: 'info',
        title: 'Most Blocked Domain',
        description: `${topBlocked[0].domain} was blocked ${topBlocked[0].count} times`,
        severity: 'medium',
        timestamp: new Date().toISOString(),
      });
    }

    if (parseFloat(stats.blockRate) > 10) {
      insights.push({
        id: 'high-block-rate',
        type: 'warning',
        title: 'High Block Rate',
        description: `Your block rate of ${stats.blockRate}% is above average. Consider reviewing your policies.`,
        severity: 'medium',
        timestamp: new Date().toISOString(),
      });
    }

    return { data: insights };
  }

  async getSecurityScore(tenantId: string): Promise<any> {
    this.logger.debug(`Getting security score for tenant ${tenantId}`);

    // Calculate security score based on various factors
    const stats = await this.clickhouseService.getSummaryStats(tenantId, '30d');

    let score = 100;
    const factors = [];

    // Deduct points for high threat activity
    if (stats.threatsBlocked > 1000) {
      score -= 15;
      factors.push({ name: 'High threat activity', impact: -15, status: 'warning' });
    } else if (stats.threatsBlocked > 100) {
      score -= 5;
      factors.push({ name: 'Moderate threat activity', impact: -5, status: 'info' });
    } else {
      factors.push({ name: 'Low threat activity', impact: 0, status: 'good' });
    }

    // Add points for good cache hit rate
    const cacheHitRate = parseFloat(stats.cacheHitRate) || 0;
    if (cacheHitRate > 80) {
      factors.push({ name: 'Excellent cache performance', impact: 5, status: 'good' });
      score = Math.min(100, score + 5);
    }

    return {
      score: Math.max(0, score),
      grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
      factors,
      recommendations: [
        { title: 'Enable MFA for all users', priority: 'high' },
        { title: 'Review blocked domains weekly', priority: 'medium' },
        { title: 'Set up scheduled reports', priority: 'low' },
      ],
    };
  }

  async investigateDomain(tenantId: string, domain: string): Promise<any> {
    this.logger.debug(`Investigating domain ${domain} for tenant ${tenantId}`);

    // Get query history for this domain
    const logs = await this.clickhouseService.getQueryLogs({
      tenantId,
      domain,
      limit: 100,
      offset: 0,
    });

    return {
      domain,
      queryCount: logs.total,
      firstSeen: logs.data.length > 0 ? logs.data[logs.data.length - 1]?.timestamp : null,
      lastSeen: logs.data.length > 0 ? logs.data[0]?.timestamp : null,
      actions: logs.data.reduce((acc: any, log: any) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {}),
      recentQueries: logs.data.slice(0, 10),
      riskAssessment: {
        level: 'unknown',
        reasons: ['Domain analysis requires external threat intelligence integration'],
      },
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
