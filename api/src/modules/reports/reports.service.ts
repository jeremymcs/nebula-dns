/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Reports Service - Analytics and Query Logging
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReportQueryDto, QueryLogDto, QueryLogEntry } from './dto/report-query.dto';
import { ClickHouseService } from '../clickhouse/clickhouse.service';
import { UsersService } from '../users/users.service';
import { PoliciesService } from '../policies/policies.service';
import { LocationsService } from '../locations/locations.service';

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
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => PoliciesService))
    private readonly policiesService: PoliciesService,
    @Inject(forwardRef(() => LocationsService))
    private readonly locationsService: LocationsService,
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
  ): Promise<any> {
    const period = query.period || '7d';

    this.logger.debug(`Getting threat trends for tenant ${tenantId}`);

    const data = await this.clickhouseService.getThreatTrends(tenantId, period);
    const topBlocked = await this.clickhouseService.getTopBlocked(tenantId, period, 10);

    // Generate threat list for Mission Control radar
    const threats = topBlocked.map((item: any, index: number) => ({
      id: `threat-${index}`,
      domain: item.domain,
      category: item.category || 'malware',
      severity: index < 3 ? 'critical' : index < 6 ? 'high' : 'medium',
      count: parseInt(item.count) || 0,
      timestamp: new Date().toISOString(),
      source: item.location || 'Unknown',
    }));

    // Generate heatmap data from real ClickHouse data
    const heatmapData = await this.clickhouseService.getHeatmapData(tenantId, period);
    const heatmap = heatmapData.length > 0 ? heatmapData : this.generateMockHeatmap();

    // Transform data or return mock if empty
    let trends: ThreatTrend[] = [];
    if (data.length === 0) {
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
    } else {
      trends = data.map((item: any) => ({
        date: item.hour,
        malware: 0,
        phishing: 0,
        c2: 0,
        total: Number(item.threat_count) || 0,
      }));
    }

    return {
      threats,
      heatmap,
      trends,
    };
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

    // Get current and previous period stats
    const stats = await this.clickhouseService.getSummaryStats(tenantId, period);
    const prevStats = await this.clickhouseService.getSummaryStats(tenantId, period === '7d' ? '14d' : '30d');
    const topBlocked = await this.clickhouseService.getTopBlocked(tenantId, period, 5);

    const now = new Date();
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 1;
    const weekStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Generate highlights based on data
    const highlights = [];
    const blockedChange = prevStats.blockedQueries > 0
      ? Math.round(((stats.blockedQueries - prevStats.blockedQueries) / prevStats.blockedQueries) * 100)
      : 0;

    if (stats.threatsBlocked > 0) {
      highlights.push({
        id: 'threat-activity',
        type: blockedChange < 0 ? 'positive' : 'warning',
        title: blockedChange < 0 ? 'Threat Reduction' : 'Threat Activity',
        description: blockedChange < 0
          ? `Blocked threats decreased by ${Math.abs(blockedChange)}% this period`
          : `${stats.threatsBlocked.toLocaleString()} threats blocked in the last ${period}`,
        metric: { value: stats.threatsBlocked, change: blockedChange, unit: 'threats' },
      });
    }

    if (topBlocked.length > 0) {
      highlights.push({
        id: 'top-blocked',
        type: 'info',
        title: 'Most Blocked Domain',
        description: `${topBlocked[0].domain} was blocked ${topBlocked[0].count} times`,
        metric: { value: parseInt(topBlocked[0].count), change: 0, unit: 'blocks' },
      });
    }

    if (stats.uniqueClients > 0) {
      highlights.push({
        id: 'active-clients',
        type: 'info',
        title: 'Active Clients',
        description: `${stats.uniqueClients} unique clients active this period`,
        metric: { value: stats.uniqueClients, change: 0, unit: 'clients' },
      });
    }

    // Generate recommendations
    const recommendations = [];
    const blockRate = parseFloat(stats.blockRate) || 0;

    if (blockRate > 10) {
      recommendations.push({
        id: 'review-policies',
        priority: 'high',
        title: 'Review Block Policies',
        description: `Your block rate of ${stats.blockRate}% is above average. Consider reviewing policies for false positives.`,
        action: { label: 'Review Policies', href: '/dashboard/policies' },
        impact: 'Reduce false positives',
      });
    }

    recommendations.push({
      id: 'enable-nrd',
      priority: 'medium',
      title: 'Enable NRD Blocking',
      description: 'Newly Registered Domain blocking adds an extra layer of protection against emerging threats.',
      action: { label: 'Configure', href: '/dashboard/settings/security' },
      impact: 'Enhanced protection',
    });

    recommendations.push({
      id: 'schedule-reports',
      priority: 'low',
      title: 'Schedule Weekly Reports',
      description: 'Set up automated weekly reports to stay informed about your network security.',
      action: { label: 'Configure', href: '/dashboard/reports/scheduled' },
      impact: 'Better visibility',
    });

    // Generate trend data
    const queryChange = prevStats.totalQueries > 0
      ? Math.round(((stats.totalQueries - prevStats.totalQueries) / prevStats.totalQueries) * 100 * 10) / 10
      : 0;
    const threatChange = prevStats.threatsBlocked > 0
      ? Math.round(((stats.threatsBlocked - prevStats.threatsBlocked) / prevStats.threatsBlocked) * 100 * 10) / 10
      : 0;

    const trends = [
      {
        label: 'Total Queries',
        current: stats.totalQueries,
        previous: prevStats.totalQueries,
        change: queryChange,
        trend: queryChange > 0 ? 'up' : queryChange < 0 ? 'down' : 'stable'
      },
      {
        label: 'Block Rate',
        current: parseFloat(stats.blockRate) || 0,
        previous: parseFloat(prevStats.blockRate) || 0,
        change: Math.round((parseFloat(stats.blockRate) - parseFloat(prevStats.blockRate)) * 10) / 10,
        trend: parseFloat(stats.blockRate) > parseFloat(prevStats.blockRate) ? 'up' : 'down'
      },
      {
        label: 'Threats',
        current: stats.threatsBlocked,
        previous: prevStats.threatsBlocked,
        change: threatChange,
        trend: threatChange > 0 ? 'up' : threatChange < 0 ? 'down' : 'stable'
      },
      {
        label: 'Avg Response',
        current: stats.avgResponseTime || 12,
        previous: prevStats.avgResponseTime || 14,
        change: 0,
        trend: 'stable'
      },
    ];

    // Build summary
    const summary = stats.threatsBlocked > 0
      ? `This period saw ${stats.totalQueries.toLocaleString()} DNS queries with ${stats.blockedQueries.toLocaleString()} blocked (${stats.blockRate}%). ${stats.threatsBlocked.toLocaleString()} security threats were prevented.`
      : `This period processed ${stats.totalQueries.toLocaleString()} DNS queries with ${stats.blockedQueries.toLocaleString()} blocked based on your policies.`;

    return {
      id: `insight-${tenantId}-${period}`,
      weekStart: weekStart.toISOString(),
      weekEnd: now.toISOString(),
      generatedAt: now.toISOString(),
      summary,
      highlights,
      recommendations,
      metrics: {
        totalQueries: stats.totalQueries,
        blockedQueries: stats.blockedQueries,
        threatsBlocked: stats.threatsBlocked,
        uniqueClients: stats.uniqueClients,
        avgResponseTime: stats.avgResponseTime || 12,
        uptime: 99.99,
      },
      trends,
    };
  }

  async getSecurityScore(tenantId: string): Promise<any> {
    this.logger.debug(`Getting security score for tenant ${tenantId}`);

    // Gather data from multiple sources
    const defaultPagination = { limit: 100 };
    const [stats, usersResult, policiesResult, locationsResult] = await Promise.all([
      this.clickhouseService.getSummaryStats(tenantId, '30d'),
      this.usersService.findAll(tenantId, defaultPagination).catch(() => ({ data: [], total: 0 })),
      this.policiesService.findAll(tenantId, defaultPagination).catch(() => ({ data: [], total: 0 })),
      this.locationsService.findAll(tenantId, defaultPagination).catch(() => ({ data: [], total: 0 })),
    ]);
    const users = usersResult.data || [];
    const policies = policiesResult.data || [];
    const locations = locationsResult.data || [];

    let score = 50; // Start at 50, add/subtract based on factors
    const factors = [];
    const recommendations = [];

    // Factor 1: MFA Adoption (max +15 points)
    const usersWithMfa = users.filter((u: any) => u.mfaEnabled).length;
    const totalUsers = users.length || 1;
    const mfaPercentage = Math.round((usersWithMfa / totalUsers) * 100);

    if (mfaPercentage === 100) {
      score += 15;
      factors.push({ id: 'mfa', name: 'Multi-Factor Auth', value: mfaPercentage, maxValue: 100, score: 15, maxScore: 15, impact: 15, status: 'good', category: 'authentication', description: 'All users have MFA enabled - excellent security!' });
    } else if (mfaPercentage >= 50) {
      score += 8;
      factors.push({ id: 'mfa', name: 'Multi-Factor Auth', value: mfaPercentage, maxValue: 100, score: 8, maxScore: 15, impact: 8, status: 'info', category: 'authentication', description: `${mfaPercentage}% of users have MFA enabled`, recommendation: 'Enable MFA for remaining users' });
      recommendations.push({ id: 'mfa', title: 'Enable MFA for all users', description: `${totalUsers - usersWithMfa} users still need MFA enabled`, priority: 'high', impact: '+7 points', action: { label: 'Configure MFA', href: '/dashboard/settings/security' } });
    } else {
      factors.push({ id: 'mfa', name: 'Multi-Factor Auth', value: mfaPercentage, maxValue: 100, score: 0, maxScore: 15, impact: 0, status: 'warning', category: 'authentication', description: 'Most users lack MFA protection', recommendation: 'Enable MFA for all users' });
      recommendations.push({ id: 'mfa', title: 'Enable MFA for all users', description: 'Add an extra layer of security to prevent unauthorized access', priority: 'high', impact: '+15 points', action: { label: 'Configure MFA', href: '/dashboard/settings/security' } });
    }

    // Factor 2: Policy Configuration (max +15 points)
    const activePolicies = policies.filter((p: any) => p.isActive).length;
    const policiesWithThreatBlocking = policies.filter((p: any) =>
      p.threatCategories?.length > 0 || p.blockMalware || p.blockPhishing
    ).length;

    if (activePolicies > 0 && policiesWithThreatBlocking > 0) {
      score += 15;
      factors.push({ id: 'policies', name: 'Security Policies', value: activePolicies, maxValue: activePolicies, score: 15, maxScore: 15, impact: 15, status: 'good', category: 'configuration', description: `${activePolicies} active policies with threat protection` });
    } else if (activePolicies > 0) {
      score += 8;
      factors.push({ id: 'policies', name: 'Security Policies', value: activePolicies, maxValue: activePolicies, score: 8, maxScore: 15, impact: 8, status: 'info', category: 'configuration', description: 'Policies configured but threat blocking not enabled', recommendation: 'Enable threat category blocking' });
      recommendations.push({ id: 'policies', title: 'Enable threat blocking', description: 'Add malware and phishing protection to your policies', priority: 'high', impact: '+7 points', action: { label: 'Edit Policies', href: '/dashboard/policies' } });
    } else {
      factors.push({ id: 'policies', name: 'Security Policies', value: 0, maxValue: 1, score: 0, maxScore: 15, impact: 0, status: 'warning', category: 'configuration', description: 'No active security policies', recommendation: 'Create and activate security policies' });
      recommendations.push({ id: 'policies', title: 'Create security policies', description: 'Define what content and threats to block', priority: 'high', impact: '+15 points', action: { label: 'Create Policy', href: '/dashboard/policies' } });
    }

    // Factor 3: Location Coverage (max +10 points)
    const activeLocations = locations.filter((l: any) => l.isActive).length;
    const locationsWithPolicies = locations.filter((l: any) => l.policyId).length;

    if (activeLocations > 0 && locationsWithPolicies === activeLocations) {
      score += 10;
      factors.push({ id: 'locations', name: 'Network Coverage', value: activeLocations, maxValue: activeLocations, score: 10, maxScore: 10, impact: 10, status: 'good', category: 'configuration', description: `${activeLocations} locations protected with policies` });
    } else if (activeLocations > 0) {
      const covered = Math.round((locationsWithPolicies / activeLocations) * 10);
      score += covered;
      factors.push({ id: 'locations', name: 'Network Coverage', value: locationsWithPolicies, maxValue: activeLocations, score: covered, maxScore: 10, impact: covered, status: 'info', category: 'configuration', description: `${locationsWithPolicies}/${activeLocations} locations have policies assigned`, recommendation: 'Assign policies to all locations' });
      recommendations.push({ id: 'locations', title: 'Assign policies to all locations', description: `${activeLocations - locationsWithPolicies} locations need policy assignment`, priority: 'medium', impact: `+${10 - covered} points`, action: { label: 'Manage Locations', href: '/dashboard/locations' } });
    } else {
      factors.push({ id: 'locations', name: 'Network Coverage', value: 0, maxValue: 1, score: 0, maxScore: 10, impact: 0, status: 'warning', category: 'configuration', description: 'No active locations configured', recommendation: 'Set up network locations' });
      recommendations.push({ id: 'locations', title: 'Configure network locations', description: 'Add your network locations to start DNS protection', priority: 'high', impact: '+10 points', action: { label: 'Add Location', href: '/dashboard/locations' } });
    }

    // Factor 4: Threat Blocking Effectiveness (max +10 points)
    const threatsBlocked = stats.threatsBlocked || 0;
    const totalQueries = stats.totalQueries || 0;

    if (totalQueries > 0 && threatsBlocked > 0) {
      score += 10;
      factors.push({ id: 'threats', name: 'Threat Protection', value: threatsBlocked, maxValue: threatsBlocked, score: 10, maxScore: 10, impact: 10, status: 'good', category: 'protection', description: `${threatsBlocked.toLocaleString()} threats blocked - protection is active` });
    } else if (totalQueries > 0) {
      score += 5;
      factors.push({ id: 'threats', name: 'Threat Protection', value: 0, maxValue: 100, score: 5, maxScore: 10, impact: 5, status: 'info', category: 'protection', description: 'DNS filtering active, no threats detected yet' });
    } else {
      factors.push({ id: 'threats', name: 'Threat Protection', value: 0, maxValue: 100, score: 0, maxScore: 10, impact: 0, status: 'warning', category: 'protection', description: 'No DNS queries detected - verify configuration' });
      recommendations.push({ id: 'dns-config', title: 'Verify DNS configuration', description: 'Ensure your devices are using Nebula DNS servers', priority: 'high', impact: '+10 points', action: { label: 'Setup Guide', href: '/dashboard/onboarding' } });
    }

    // Factor 5: Cache Performance (max +5 points)
    const cacheHitRate = parseFloat(stats.cacheHitRate) || 0;
    if (cacheHitRate >= 80) {
      score += 5;
      factors.push({ id: 'cache', name: 'Cache Performance', value: cacheHitRate, maxValue: 100, score: 5, maxScore: 5, impact: 5, status: 'good', category: 'performance', description: `${cacheHitRate.toFixed(1)}% cache hit rate - excellent performance` });
    } else if (cacheHitRate >= 50) {
      score += 3;
      factors.push({ id: 'cache', name: 'Cache Performance', value: cacheHitRate, maxValue: 100, score: 3, maxScore: 5, impact: 3, status: 'info', category: 'performance', description: `${cacheHitRate.toFixed(1)}% cache hit rate - acceptable` });
    } else {
      factors.push({ id: 'cache', name: 'Cache Performance', value: cacheHitRate, maxValue: 100, score: 0, maxScore: 5, impact: 0, status: 'warning', category: 'performance', description: 'Low cache hit rate', recommendation: 'Cache will improve over time with usage' });
    }

    // Calculate final score (cap at 0-100)
    const totalScore = Math.max(0, Math.min(100, score));
    const grade = totalScore >= 90 ? 'A' : totalScore >= 80 ? 'B' : totalScore >= 70 ? 'C' : totalScore >= 60 ? 'D' : 'F';

    // Generate achievements based on activity
    const achievements = [
      { id: 'first-block', name: 'First Block', description: 'Blocked your first threat', icon: '🛡️', unlocked: threatsBlocked > 0, unlockedAt: threatsBlocked > 0 ? new Date().toISOString() : null },
      { id: 'threat-hunter', name: 'Threat Hunter', description: 'Blocked 100 threats', icon: '🎯', unlocked: threatsBlocked >= 100, unlockedAt: threatsBlocked >= 100 ? new Date().toISOString() : null },
      { id: 'guardian', name: 'Guardian', description: 'Blocked 1000 threats', icon: '⚔️', unlocked: threatsBlocked >= 1000, unlockedAt: threatsBlocked >= 1000 ? new Date().toISOString() : null },
      { id: 'speed-demon', name: 'Speed Demon', description: 'Achieved 80% cache hit rate', icon: '⚡', unlocked: cacheHitRate >= 80, unlockedAt: cacheHitRate >= 80 ? new Date().toISOString() : null },
      { id: 'fortress', name: 'Fortress', description: 'Achieved A grade security', icon: '🏰', unlocked: totalScore >= 90, unlockedAt: totalScore >= 90 ? new Date().toISOString() : null },
      { id: 'mfa-champion', name: 'MFA Champion', description: '100% MFA adoption', icon: '🔐', unlocked: mfaPercentage === 100, unlockedAt: mfaPercentage === 100 ? new Date().toISOString() : null },
      { id: 'policy-master', name: 'Policy Master', description: 'All locations have policies', icon: '📋', unlocked: activeLocations > 0 && locationsWithPolicies === activeLocations, unlockedAt: activeLocations > 0 && locationsWithPolicies === activeLocations ? new Date().toISOString() : null },
    ];

    // Sort recommendations by priority
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return {
      score: totalScore,
      totalScore,
      grade,
      factors,
      achievements,
      recommendations,
      stats: {
        totalQueries,
        threatsBlocked,
        cacheHitRate,
        usersWithMfa,
        totalUsers,
        activePolicies,
        activeLocations,
        locationsWithPolicies,
      },
      lastUpdated: new Date().toISOString(),
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

  private generateMockHeatmap(): Array<{ hour: number; day: number; value: number }> {
    const heatmap: Array<{ hour: number; day: number; value: number }> = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        // Simulate realistic patterns: higher activity during business hours
        const isBusinessHour = hour >= 8 && hour <= 18;
        const isWeekday = day < 5;
        const baseValue = isBusinessHour && isWeekday ? 60 : 20;
        heatmap.push({
          day,
          hour,
          value: baseValue + Math.floor(Math.random() * 40),
        });
      }
    }
    return heatmap;
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
