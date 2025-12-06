/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * ClickHouse Service for Query Logging and Analytics
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, ClickHouseClient } from '@clickhouse/client';

export interface QueryLog {
  timestamp: Date;
  tenantId: string;
  locationId: string;
  locationName: string;
  domain: string;
  queryType: string;
  clientIp: string;
  action: 'allow' | 'block' | 'rewrite';
  reason: string;
  category?: string;
  responseTime: number;
  cached: boolean;
  threatType?: string;
  policyId?: string;
}

export interface QueryLogFilter {
  tenantId: string;
  locationId?: string;
  action?: string;
  domain?: string;
  dateFrom?: string;
  dateTo?: string;
  queryType?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class ClickHouseService implements OnModuleInit {
  private client: ClickHouseClient;
  private readonly logger = new Logger(ClickHouseService.name);
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('CLICKHOUSE_HOST', 'localhost');
    const port = this.configService.get<number>('CLICKHOUSE_PORT', 8123);
    const database = this.configService.get<string>('CLICKHOUSE_DATABASE', 'nebula_dns');
    const username = this.configService.get<string>('CLICKHOUSE_USER', 'default');
    const password = this.configService.get<string>('CLICKHOUSE_PASSWORD', '');

    try {
      this.client = createClient({
        host: `http://${host}:${port}`,
        database,
        username,
        password,
        clickhouse_settings: {
          async_insert: 1,
          wait_for_async_insert: 0,
        },
      });

      await this.initializeSchema();
      this.isConnected = true;
      this.logger.log('ClickHouse connection established');
    } catch (error) {
      this.logger.warn(`ClickHouse connection failed: ${error.message}. Query logging will use mock data.`);
    }
  }

  private async initializeSchema() {
    // Create database if not exists
    await this.client.query({
      query: `CREATE DATABASE IF NOT EXISTS nebula_dns`,
    });

    // Create query logs table
    await this.client.query({
      query: `
        CREATE TABLE IF NOT EXISTS nebula_dns.query_logs (
          timestamp DateTime64(3),
          tenant_id UUID,
          location_id UUID,
          location_name String,
          domain String,
          query_type String,
          client_ip String,
          action Enum8('allow' = 1, 'block' = 2, 'rewrite' = 3),
          reason String,
          category Nullable(String),
          response_time_ms UInt32,
          cached UInt8,
          threat_type Nullable(String),
          policy_id Nullable(UUID)
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMMDD(timestamp)
        ORDER BY (tenant_id, timestamp)
        TTL timestamp + INTERVAL 90 DAY
      `,
    });

    // Create materialized view for hourly aggregates
    await this.client.query({
      query: `
        CREATE TABLE IF NOT EXISTS nebula_dns.hourly_stats (
          hour DateTime,
          tenant_id UUID,
          location_id UUID,
          total_queries UInt64,
          blocked_queries UInt64,
          allowed_queries UInt64,
          threat_blocks UInt64,
          avg_response_time Float64,
          cached_queries UInt64
        ) ENGINE = SummingMergeTree()
        PARTITION BY toYYYYMM(hour)
        ORDER BY (tenant_id, hour, location_id)
      `,
    });

    // Create materialized view for category stats
    await this.client.query({
      query: `
        CREATE TABLE IF NOT EXISTS nebula_dns.category_stats (
          date Date,
          tenant_id UUID,
          category String,
          count UInt64
        ) ENGINE = SummingMergeTree()
        PARTITION BY toYYYYMM(date)
        ORDER BY (tenant_id, date, category)
      `,
    });

    // Create materialized view for domain stats
    await this.client.query({
      query: `
        CREATE TABLE IF NOT EXISTS nebula_dns.domain_stats (
          date Date,
          tenant_id UUID,
          domain String,
          action Enum8('allow' = 1, 'block' = 2, 'rewrite' = 3),
          category String,
          count UInt64
        ) ENGINE = SummingMergeTree()
        PARTITION BY toYYYYMM(date)
        ORDER BY (tenant_id, date, action, count DESC)
      `,
    });
  }

  async insertQueryLog(log: QueryLog): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.insert({
        table: 'query_logs',
        values: [{
          timestamp: log.timestamp,
          tenant_id: log.tenantId,
          location_id: log.locationId,
          location_name: log.locationName,
          domain: log.domain,
          query_type: log.queryType,
          client_ip: log.clientIp,
          action: log.action,
          reason: log.reason,
          category: log.category || null,
          response_time_ms: log.responseTime,
          cached: log.cached ? 1 : 0,
          threat_type: log.threatType || null,
          policy_id: log.policyId || null,
        }],
        format: 'JSONEachRow',
      });
    } catch (error) {
      this.logger.error(`Failed to insert query log: ${error.message}`);
    }
  }

  async insertQueryLogsBatch(logs: QueryLog[]): Promise<void> {
    if (!this.isConnected || logs.length === 0) {
      return;
    }

    try {
      await this.client.insert({
        table: 'query_logs',
        values: logs.map(log => ({
          timestamp: log.timestamp,
          tenant_id: log.tenantId,
          location_id: log.locationId,
          location_name: log.locationName,
          domain: log.domain,
          query_type: log.queryType,
          client_ip: log.clientIp,
          action: log.action,
          reason: log.reason,
          category: log.category || null,
          response_time_ms: log.responseTime,
          cached: log.cached ? 1 : 0,
          threat_type: log.threatType || null,
          policy_id: log.policyId || null,
        })),
        format: 'JSONEachRow',
      });
    } catch (error) {
      this.logger.error(`Failed to insert batch query logs: ${error.message}`);
    }
  }

  async getQueryLogs(filter: QueryLogFilter): Promise<{
    data: any[];
    total: number;
    pagination: { cursor: string | null; hasMore: boolean };
  }> {
    if (!this.isConnected) {
      return this.getMockQueryLogs(filter);
    }

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;

    let whereClause = `tenant_id = '${filter.tenantId}'`;
    
    if (filter.locationId) {
      whereClause += ` AND location_id = '${filter.locationId}'`;
    }
    if (filter.action) {
      whereClause += ` AND action = '${filter.action}'`;
    }
    if (filter.domain) {
      whereClause += ` AND domain LIKE '%${filter.domain}%'`;
    }
    if (filter.queryType) {
      whereClause += ` AND query_type = '${filter.queryType}'`;
    }
    if (filter.dateFrom) {
      whereClause += ` AND timestamp >= '${filter.dateFrom}'`;
    }
    if (filter.dateTo) {
      whereClause += ` AND timestamp <= '${filter.dateTo}'`;
    }

    try {
      const countResult = await this.client.query({
        query: `SELECT count() as total FROM query_logs WHERE ${whereClause}`,
        format: 'JSONEachRow',
      });
      const countData = await countResult.json();
      const total = countData[0]?.total || 0;

      const result = await this.client.query({
        query: `
          SELECT 
            timestamp,
            tenant_id,
            location_id,
            location_name,
            domain,
            query_type,
            client_ip,
            action,
            reason,
            category,
            response_time_ms,
            cached,
            threat_type,
            policy_id
          FROM query_logs
          WHERE ${whereClause}
          ORDER BY timestamp DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `,
        format: 'JSONEachRow',
      });

      const data = await result.json();

      return {
        data: data.map((row: any) => ({
          id: `${row.timestamp}-${row.domain}`,
          timestamp: row.timestamp,
          tenantId: row.tenant_id,
          locationId: row.location_id,
          locationName: row.location_name,
          domain: row.domain,
          queryType: row.query_type,
          clientIp: row.client_ip,
          action: row.action,
          reason: row.reason,
          category: row.category,
          responseTime: row.response_time_ms,
          cached: !!row.cached,
          threatType: row.threat_type,
          policyId: row.policy_id,
        })),
        total,
        pagination: {
          cursor: offset + limit < total ? String(offset + limit) : null,
          hasMore: offset + limit < total,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get query logs: ${error.message}`);
      return this.getMockQueryLogs(filter);
    }
  }

  async getSummaryStats(tenantId: string, period: string): Promise<any> {
    if (!this.isConnected) {
      return this.getMockSummaryStats();
    }

    const dateFilter = this.getPeriodFilter(period);

    try {
      const result = await this.client.query({
        query: `
          SELECT 
            count() as total_queries,
            countIf(action = 'block') as blocked_queries,
            countIf(threat_type IS NOT NULL) as threats_blocked,
            avg(response_time_ms) as avg_response_time,
            countIf(cached = 1) as cached_queries
          FROM query_logs
          WHERE tenant_id = '${tenantId}' AND ${dateFilter}
        `,
        format: 'JSONEachRow',
      });

      const data = await result.json();
      const stats = data[0] || {};

      return {
        totalQueries: Number(stats.total_queries) || 0,
        blockedQueries: Number(stats.blocked_queries) || 0,
        threatsBlocked: Number(stats.threats_blocked) || 0,
        blockRate: stats.total_queries > 0 
          ? ((stats.blocked_queries / stats.total_queries) * 100).toFixed(1) 
          : 0,
        avgResponseTime: Math.round(stats.avg_response_time) || 0,
        cacheHitRate: stats.total_queries > 0 
          ? ((stats.cached_queries / stats.total_queries) * 100).toFixed(1) 
          : 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get summary stats: ${error.message}`);
      return this.getMockSummaryStats();
    }
  }

  async getTopBlocked(tenantId: string, period: string, limit: number = 10): Promise<any[]> {
    if (!this.isConnected) {
      return this.getMockTopBlocked();
    }

    const dateFilter = this.getPeriodFilter(period);

    try {
      const result = await this.client.query({
        query: `
          SELECT 
            domain,
            any(category) as category,
            count() as count
          FROM query_logs
          WHERE tenant_id = '${tenantId}' 
            AND action = 'block'
            AND ${dateFilter}
          GROUP BY domain
          ORDER BY count DESC
          LIMIT ${limit}
        `,
        format: 'JSONEachRow',
      });

      return await result.json();
    } catch (error) {
      this.logger.error(`Failed to get top blocked: ${error.message}`);
      return this.getMockTopBlocked();
    }
  }

  async getBlocksByCategory(tenantId: string, period: string): Promise<any[]> {
    if (!this.isConnected) {
      return this.getMockBlocksByCategory();
    }

    const dateFilter = this.getPeriodFilter(period);

    try {
      const result = await this.client.query({
        query: `
          SELECT 
            ifNull(category, 'unknown') as category,
            count() as count
          FROM query_logs
          WHERE tenant_id = '${tenantId}' 
            AND action = 'block'
            AND ${dateFilter}
          GROUP BY category
          ORDER BY count DESC
        `,
        format: 'JSONEachRow',
      });

      const data = await result.json();
      const total = data.reduce((sum: number, item: any) => sum + Number(item.count), 0);

      return data.map((item: any) => ({
        category: item.category,
        count: Number(item.count),
        percentage: total > 0 ? Math.round((Number(item.count) / total) * 100) : 0,
      }));
    } catch (error) {
      this.logger.error(`Failed to get blocks by category: ${error.message}`);
      return this.getMockBlocksByCategory();
    }
  }

  async getLocationStats(tenantId: string, period: string): Promise<any[]> {
    if (!this.isConnected) {
      return this.getMockLocationStats();
    }

    const dateFilter = this.getPeriodFilter(period);

    try {
      const result = await this.client.query({
        query: `
          SELECT 
            location_id,
            any(location_name) as location_name,
            count() as total_queries,
            countIf(action = 'block') as blocked_queries
          FROM query_logs
          WHERE tenant_id = '${tenantId}' AND ${dateFilter}
          GROUP BY location_id
          ORDER BY total_queries DESC
        `,
        format: 'JSONEachRow',
      });

      const data = await result.json();

      return data.map((item: any) => ({
        locationId: item.location_id,
        locationName: item.location_name,
        totalQueries: Number(item.total_queries),
        blockedQueries: Number(item.blocked_queries),
        blockRate: item.total_queries > 0 
          ? ((item.blocked_queries / item.total_queries) * 100).toFixed(1) 
          : 0,
      }));
    } catch (error) {
      this.logger.error(`Failed to get location stats: ${error.message}`);
      return this.getMockLocationStats();
    }
  }

  async getThreatTrends(tenantId: string, period: string): Promise<any[]> {
    if (!this.isConnected) {
      return [];
    }

    const dateFilter = this.getPeriodFilter(period);

    try {
      const result = await this.client.query({
        query: `
          SELECT 
            toStartOfHour(timestamp) as hour,
            countIf(threat_type IS NOT NULL) as threat_count
          FROM query_logs
          WHERE tenant_id = '${tenantId}' AND ${dateFilter}
          GROUP BY hour
          ORDER BY hour
        `,
        format: 'JSONEachRow',
      });

      return await result.json();
    } catch (error) {
      this.logger.error(`Failed to get threat trends: ${error.message}`);
      return [];
    }
  }

  private getPeriodFilter(period: string): string {
    switch (period) {
      case '24h':
        return `timestamp >= now() - INTERVAL 24 HOUR`;
      case '7d':
        return `timestamp >= now() - INTERVAL 7 DAY`;
      case '30d':
        return `timestamp >= now() - INTERVAL 30 DAY`;
      default:
        return `timestamp >= now() - INTERVAL 7 DAY`;
    }
  }

  // Mock data methods for when ClickHouse is not available
  private getMockQueryLogs(filter: QueryLogFilter) {
    const actions = ['allow', 'block', 'rewrite'] as const;
    const queryTypes = ['A', 'AAAA', 'MX', 'TXT', 'CNAME'];
    const domains = [
      'google.com', 'facebook.com', 'twitter.com', 'ads.doubleclick.net',
      'malware-site.com', 'phishing-example.com', 'youtube.com', 'github.com',
      'tracking.analytics.com', 'cdn.example.com'
    ];
    const categories = ['advertising', 'social_media', 'malware', 'phishing', 'streaming', 'productivity'];
    const reasons = ['Allowed by policy', 'Blocked: malware', 'Blocked: advertising', 'Blocked: category'];

    const limit = filter.limit || 50;
    const mockData = [];

    for (let i = 0; i < limit; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      mockData.push({
        id: `mock-${Date.now()}-${i}`,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        domain: domains[Math.floor(Math.random() * domains.length)],
        queryType: queryTypes[Math.floor(Math.random() * queryTypes.length)],
        clientIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
        locationName: 'Main Office',
        action,
        reason: action === 'allow' ? 'Allowed by policy' : reasons[Math.floor(Math.random() * reasons.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        responseTime: Math.floor(Math.random() * 50) + 5,
        cached: Math.random() > 0.5,
      });
    }

    return {
      data: mockData,
      total: 1000,
      pagination: { cursor: null, hasMore: true },
    };
  }

  private getMockSummaryStats() {
    return {
      totalQueries: 2547893,
      blockedQueries: 127394,
      threatsBlocked: 12453,
      blockRate: 5.0,
      avgResponseTime: 12,
      cacheHitRate: 78.5,
    };
  }

  private getMockTopBlocked() {
    return [
      { domain: 'ads.doubleclick.net', category: 'advertising', count: 15234 },
      { domain: 'tracking.facebook.com', category: 'tracking', count: 12543 },
      { domain: 'malware-example.com', category: 'malware', count: 8421 },
      { domain: 'phishing-site.net', category: 'phishing', count: 5632 },
      { domain: 'ad.network.com', category: 'advertising', count: 4521 },
    ];
  }

  private getMockBlocksByCategory() {
    return [
      { category: 'advertising', count: 45234, percentage: 35 },
      { category: 'tracking', count: 32145, percentage: 25 },
      { category: 'malware', count: 19234, percentage: 15 },
      { category: 'adult', count: 12934, percentage: 10 },
      { category: 'social_media', count: 9745, percentage: 8 },
      { category: 'other', count: 9012, percentage: 7 },
    ];
  }

  private getMockLocationStats() {
    return [
      { locationId: '1', locationName: 'Main Office', totalQueries: 1234567, blockedQueries: 61728, blockRate: 5.0 },
      { locationId: '2', locationName: 'Remote Office', totalQueries: 534256, blockedQueries: 26712, blockRate: 5.0 },
      { locationId: '3', locationName: 'Data Center', totalQueries: 987654, blockedQueries: 49382, blockRate: 5.0 },
    ];
  }
}
