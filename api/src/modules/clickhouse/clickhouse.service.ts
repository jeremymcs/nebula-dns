/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
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
  private lastConnectionAttempt: Date | null = null;
  private connectionRetryIntervalMs = 30000; // 30 seconds between retry attempts
  private consecutiveFailures = 0;
  private readonly maxConsecutiveFailures = 5;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const clickhouseUrl = this.configService.get<string>('CLICKHOUSE_URL', '');
    const database = this.configService.get<string>(
      'CLICKHOUSE_DATABASE',
      'nebula_dns',
    );
    const username = this.configService.get<string>(
      'CLICKHOUSE_USER',
      'default',
    );
    const password = this.configService.get<string>('CLICKHOUSE_PASSWORD', '');

    // Resolve the host URL: prefer CLICKHOUSE_URL (supports HTTPS for ClickHouse Cloud),
    // fall back to constructing from CLICKHOUSE_HOST + CLICKHOUSE_PORT.
    let host: string;
    if (clickhouseUrl) {
      host = clickhouseUrl;
    } else {
      const rawHost = this.configService.get<string>(
        'CLICKHOUSE_HOST',
        'localhost',
      );
      const port = this.configService.get<number>('CLICKHOUSE_PORT', 8123);
      host = `http://${rawHost}:${port}`;
    }

    // ClickHouse Cloud databases are pre-created — skip the bootstrap CREATE DATABASE step.
    const isCloud = host.startsWith('https://');

    try {
      if (!isCloud) {
        // Self-hosted: bootstrap with 'default' database to create our database if needed.
        const bootstrapClient = createClient({
          host,
          database: 'default',
          username,
          password,
        });
        await bootstrapClient.query({
          query: `CREATE DATABASE IF NOT EXISTS ${database}`,
        });
        await bootstrapClient.close();
      }

      this.client = createClient({
        host,
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
      this.lastConnectionAttempt = new Date();
      this.logger.warn(
        `ClickHouse connection failed: ${error.message}. Query logging will use mock data.`,
      );
      this.scheduleReconnect();
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  getConnectionStatus(): {
    connected: boolean;
    lastAttempt: Date | null;
    consecutiveFailures: number;
    usingMockData: boolean;
  } {
    return {
      connected: this.isConnected,
      lastAttempt: this.lastConnectionAttempt,
      consecutiveFailures: this.consecutiveFailures,
      usingMockData: !this.isConnected,
    };
  }

  isUsingMockData(): boolean {
    return !this.isConnected;
  }

  /**
   * Run a read-only analytics query and return the first numeric column of the first row.
   * Returns null when ClickHouse is unavailable or the query fails.
   */
  async queryScalarNumber(
    query: string,
    query_params?: Record<string, unknown>,
  ): Promise<number | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const result = await this.client.query({
        query,
        query_params,
        format: 'JSONEachRow',
      });
      const data = (await result.json()) as Record<string, unknown>[];
      if (!data.length) {
        return 0;
      }
      const firstValue = Object.values(data[0])[0];
      return Number(firstValue) || 0;
    } catch (error) {
      this.consecutiveFailures++;
      this.logger.warn(
        `ClickHouse scalar query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Run a read-only analytics query and return all rows as objects.
   * Returns null when ClickHouse is unavailable or the query fails.
   */
  async queryJsonRows<T extends Record<string, unknown>>(
    query: string,
    query_params?: Record<string, unknown>,
  ): Promise<T[] | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const result = await this.client.query({
        query,
        query_params,
        format: 'JSONEachRow',
      });
      return (await result.json()) as T[];
    } catch (error) {
      this.consecutiveFailures++;
      this.logger.warn(
        `ClickHouse row query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  private scheduleReconnect(): void {
    setTimeout(async () => {
      if (!this.isConnected) {
        this.logger.log('Attempting to reconnect to ClickHouse...');
        await this.attemptReconnect();
      }
    }, this.connectionRetryIntervalMs);
  }

  private async attemptReconnect(): Promise<void> {
    this.lastConnectionAttempt = new Date();

    try {
      await this.client.query({ query: 'SELECT 1', format: 'JSONEachRow' });
      await this.initializeSchema();
      this.isConnected = true;
      this.consecutiveFailures = 0;
      this.logger.log('ClickHouse reconnection successful');
    } catch (error) {
      this.consecutiveFailures++;
      this.logger.warn(
        `ClickHouse reconnection attempt failed (${this.consecutiveFailures}/${this.maxConsecutiveFailures}): ${error.message}`,
      );

      const backoffMs = Math.min(
        this.connectionRetryIntervalMs *
          Math.pow(2, this.consecutiveFailures - 1),
        300000,
      );

      if (this.consecutiveFailures < this.maxConsecutiveFailures) {
        this.logger.log(
          `Scheduling next reconnect attempt in ${backoffMs / 1000} seconds`,
        );
        setTimeout(() => this.attemptReconnect(), backoffMs);
      } else {
        this.logger.error(
          `ClickHouse reconnection failed after ${this.maxConsecutiveFailures} attempts. Will continue using mock data.`,
        );
        setTimeout(() => {
          this.consecutiveFailures = 0;
          this.attemptReconnect();
        }, 600000);
      }
    }
  }

  private async safeQuery<T>(
    queryFn: () => Promise<T>,
    fallbackFn: () => T,
    operationName: string,
  ): Promise<T> {
    if (!this.isConnected) {
      return fallbackFn();
    }

    try {
      const result = await queryFn();
      if (this.consecutiveFailures > 0) {
        this.consecutiveFailures = 0;
      }
      return result;
    } catch (error) {
      this.consecutiveFailures++;
      this.logger.error(`ClickHouse ${operationName} failed: ${error.message}`);

      if (this.consecutiveFailures >= 3) {
        this.logger.warn(
          'Multiple consecutive ClickHouse failures detected, marking as disconnected',
        );
        this.isConnected = false;
        this.scheduleReconnect();
      }

      return fallbackFn();
    }
  }

  private async initializeSchema() {
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
        TTL toDateTime(timestamp) + INTERVAL 90 DAY
      `,
    });

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
        ORDER BY (tenant_id, date, action, domain)
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
        values: [
          {
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
          },
        ],
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
        values: logs.map((log) => ({
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

  /**
   * Build parameterized WHERE clause from filter.
   * Returns { clause, params } where clause uses {param:Type} placeholders.
   */
  private buildFilterClause(filter: QueryLogFilter): {
    clause: string;
    params: Record<string, unknown>;
  } {
    const conditions: string[] = ['tenant_id = {tenantId:UUID}'];
    const params: Record<string, unknown> = { tenantId: filter.tenantId };

    if (filter.locationId) {
      conditions.push('location_id = {locationId:UUID}');
      params.locationId = filter.locationId;
    }
    if (filter.action) {
      conditions.push(
        "action = {action:Enum8('allow' = 1, 'block' = 2, 'rewrite' = 3)}",
      );
      params.action = filter.action;
    }
    if (filter.domain) {
      conditions.push('domain LIKE {domainPattern:String}');
      params.domainPattern = `%${filter.domain}%`;
    }
    if (filter.queryType) {
      conditions.push('query_type = {queryType:String}');
      params.queryType = filter.queryType;
    }
    if (filter.dateFrom) {
      conditions.push('timestamp >= {dateFrom:DateTime64(3)}');
      params.dateFrom = filter.dateFrom;
    }
    if (filter.dateTo) {
      conditions.push('timestamp <= {dateTo:DateTime64(3)}');
      params.dateTo = filter.dateTo;
    }

    return { clause: conditions.join(' AND '), params };
  }

  async getQueryLogs(filter: QueryLogFilter): Promise<{
    data: any[];
    total: number;
    pagination: { cursor: string | null; hasMore: boolean };
  }> {
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;

    return this.safeQuery(
      async () => {
        const { clause, params } = this.buildFilterClause(filter);

        const countResult = await this.client.query({
          query: `SELECT count() as total FROM query_logs WHERE ${clause}`,
          query_params: params,
          format: 'JSONEachRow',
        });
        const countData = (await countResult.json()) as any[];
        const total = countData[0]?.total || 0;

        const result = await this.client.query({
          query: `
            SELECT
              timestamp, tenant_id, location_id, location_name,
              domain, query_type, client_ip, action, reason,
              category, response_time_ms, cached, threat_type, policy_id
            FROM query_logs
            WHERE ${clause}
            ORDER BY timestamp DESC
            LIMIT {limit:UInt32}
            OFFSET {offset:UInt32}
          `,
          query_params: { ...params, limit, offset },
          format: 'JSONEachRow',
        });

        const data = (await result.json()) as any[];

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
      },
      () => this.getMockQueryLogs(filter),
      'getQueryLogs',
    );
  }

  async getSummaryStats(tenantId: string, period: string): Promise<any> {
    const dateFilter = this.getPeriodFilter(period);

    return this.safeQuery(
      async () => {
        const result = await this.client.query({
          query: `
            SELECT
              count() as total_queries,
              countIf(action = 'block') as blocked_queries,
              countIf(threat_type IS NOT NULL) as threats_blocked,
              avg(response_time_ms) as avg_response_time,
              countIf(cached = 1) as cached_queries
            FROM query_logs
            WHERE tenant_id = {tenantId:UUID} AND ${dateFilter}
          `,
          query_params: { tenantId },
          format: 'JSONEachRow',
        });

        const data = (await result.json()) as any[];
        const stats = data[0] || {};

        return {
          totalQueries: Number(stats.total_queries) || 0,
          blockedQueries: Number(stats.blocked_queries) || 0,
          threatsBlocked: Number(stats.threats_blocked) || 0,
          blockRate:
            stats.total_queries > 0
              ? ((stats.blocked_queries / stats.total_queries) * 100).toFixed(1)
              : 0,
          avgResponseTime: Math.round(stats.avg_response_time) || 0,
          cacheHitRate:
            stats.total_queries > 0
              ? ((stats.cached_queries / stats.total_queries) * 100).toFixed(1)
              : 0,
        };
      },
      () => this.getMockSummaryStats(),
      'getSummaryStats',
    );
  }

  async getTopBlocked(
    tenantId: string,
    period: string,
    limit: number = 10,
  ): Promise<any[]> {
    const dateFilter = this.getPeriodFilter(period);

    return this.safeQuery(
      async () => {
        const result = await this.client.query({
          query: `
            SELECT
              domain,
              any(category) as category,
              count() as count
            FROM query_logs
            WHERE tenant_id = {tenantId:UUID}
              AND action = 'block'
              AND ${dateFilter}
            GROUP BY domain
            ORDER BY count DESC
            LIMIT {limit:UInt32}
          `,
          query_params: { tenantId, limit },
          format: 'JSONEachRow',
        });

        return await result.json();
      },
      () => this.getMockTopBlocked(),
      'getTopBlocked',
    );
  }

  async getTopBlockedDomains(
    tenantId: string,
    period: string,
    limit: number = 10,
  ): Promise<any[]> {
    return this.getTopBlocked(tenantId, period, limit);
  }

  async getBlocksByCategory(tenantId: string, period: string): Promise<any[]> {
    const dateFilter = this.getPeriodFilter(period);

    return this.safeQuery(
      async () => {
        const result = await this.client.query({
          query: `
            SELECT
              ifNull(category, 'unknown') as category,
              count() as count
            FROM query_logs
            WHERE tenant_id = {tenantId:UUID}
              AND action = 'block'
              AND ${dateFilter}
            GROUP BY category
            ORDER BY count DESC
          `,
          query_params: { tenantId },
          format: 'JSONEachRow',
        });

        const data = (await result.json()) as any[];
        const total = data.reduce(
          (sum: number, item: any) => sum + Number(item.count),
          0,
        );

        return data.map((item: any) => ({
          category: item.category,
          count: Number(item.count),
          percentage:
            total > 0 ? Math.round((Number(item.count) / total) * 100) : 0,
        }));
      },
      () => this.getMockBlocksByCategory(),
      'getBlocksByCategory',
    );
  }

  async getLocationStats(tenantId: string, period: string): Promise<any[]> {
    const dateFilter = this.getPeriodFilter(period);

    return this.safeQuery(
      async () => {
        const result = await this.client.query({
          query: `
            SELECT
              location_id,
              any(location_name) as location_name,
              count() as total_queries,
              countIf(action = 'block') as blocked_queries
            FROM query_logs
            WHERE tenant_id = {tenantId:UUID} AND ${dateFilter}
            GROUP BY location_id
            ORDER BY total_queries DESC
          `,
          query_params: { tenantId },
          format: 'JSONEachRow',
        });

        const data = (await result.json()) as any[];

        return data.map((item: any) => ({
          locationId: item.location_id,
          locationName: item.location_name,
          totalQueries: Number(item.total_queries),
          blockedQueries: Number(item.blocked_queries),
          blockRate:
            item.total_queries > 0
              ? ((item.blocked_queries / item.total_queries) * 100).toFixed(1)
              : 0,
        }));
      },
      () => this.getMockLocationStats(),
      'getLocationStats',
    );
  }

  async getHeatmapData(
    tenantId: string,
    period: string,
  ): Promise<Array<{ hour: number; day: number; value: number }>> {
    const dateFilter = this.getPeriodFilter(period);

    return this.safeQuery(
      async () => {
        const result = await this.client.query({
          query: `
            SELECT
              toDayOfWeek(timestamp) - 1 as day,
              toHour(timestamp) as hour,
              count() as value
            FROM query_logs
            WHERE tenant_id = {tenantId:UUID}
              AND action = 'block'
              AND ${dateFilter}
            GROUP BY day, hour
            ORDER BY day, hour
          `,
          query_params: { tenantId },
          format: 'JSONEachRow',
        });

        const data = (await result.json()) as any[];
        return data.map((item: any) => ({
          day: Number(item.day),
          hour: Number(item.hour),
          value: Number(item.value),
        }));
      },
      () => [],
      'getHeatmapData',
    );
  }

  async getThreatTrends(tenantId: string, period: string): Promise<any[]> {
    const dateFilter = this.getPeriodFilter(period);

    return this.safeQuery(
      async () => {
        const result = await this.client.query({
          query: `
            SELECT
              toStartOfHour(timestamp) as hour,
              countIf(threat_type IS NOT NULL) as threat_count
            FROM query_logs
            WHERE tenant_id = {tenantId:UUID} AND ${dateFilter}
            GROUP BY hour
            ORDER BY hour
          `,
          query_params: { tenantId },
          format: 'JSONEachRow',
        });

        return await result.json();
      },
      () => [],
      'getThreatTrends',
    );
  }

  async getClientIPStats(
    tenantId: string,
    period: string,
  ): Promise<
    Array<{
      clientIp: string;
      queryCount: number;
      blockedCount: number;
    }>
  > {
    const dateFilter = this.getPeriodFilter(period);

    return this.safeQuery(
      async () => {
        const result = await this.client.query({
          query: `
            SELECT
              client_ip as clientIp,
              count() as queryCount,
              countIf(action = 'block') as blockedCount
            FROM query_logs
            WHERE tenant_id = {tenantId:UUID} AND ${dateFilter}
            GROUP BY client_ip
            ORDER BY queryCount DESC
            LIMIT 1000
          `,
          query_params: { tenantId },
          format: 'JSONEachRow',
        });

        const data = (await result.json()) as any[];
        return data.map((item) => ({
          clientIp: item.clientIp,
          queryCount: Number(item.queryCount),
          blockedCount: Number(item.blockedCount),
        }));
      },
      () => this.getMockClientIPStats(),
      'getClientIPStats',
    );
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

  private getMockQueryLogs(filter: QueryLogFilter) {
    const actions = ['allow', 'block', 'rewrite'] as const;
    const queryTypes = ['A', 'AAAA', 'MX', 'TXT', 'CNAME'];
    const domains = [
      'google.com',
      'facebook.com',
      'twitter.com',
      'ads.doubleclick.net',
      'malware-site.com',
      'phishing-example.com',
      'youtube.com',
      'github.com',
      'tracking.analytics.com',
      'cdn.example.com',
    ];
    const categories = [
      'advertising',
      'social_media',
      'malware',
      'phishing',
      'streaming',
      'productivity',
    ];
    const reasons = [
      'Allowed by policy',
      'Blocked: malware',
      'Blocked: advertising',
      'Blocked: category',
    ];

    const limit = filter.limit || 50;
    const mockData = [];

    for (let i = 0; i < limit; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const threatTypes = ['malware', 'phishing', 'botnet', null];
      mockData.push({
        id: `mock-${Date.now()}-${i}`,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        tenantId: filter.tenantId,
        locationId: filter.locationId || 'loc-mock-001',
        locationName: 'Main Office',
        domain: domains[Math.floor(Math.random() * domains.length)],
        queryType: queryTypes[Math.floor(Math.random() * queryTypes.length)],
        clientIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
        action,
        reason:
          action === 'allow'
            ? 'Allowed by policy'
            : reasons[Math.floor(Math.random() * reasons.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        responseTime: Math.floor(Math.random() * 50) + 5,
        cached: Math.random() > 0.5,
        threatType:
          action === 'block'
            ? threatTypes[Math.floor(Math.random() * threatTypes.length)]
            : null,
        policyId: 'policy-mock-001',
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
      {
        locationId: '1',
        locationName: 'Main Office',
        totalQueries: 1234567,
        blockedQueries: 61728,
        blockRate: 5.0,
      },
      {
        locationId: '2',
        locationName: 'Remote Office',
        totalQueries: 534256,
        blockedQueries: 26712,
        blockRate: 5.0,
      },
      {
        locationId: '3',
        locationName: 'Data Center',
        totalQueries: 987654,
        blockedQueries: 49382,
        blockRate: 5.0,
      },
    ];
  }

  private getMockClientIPStats() {
    return [
      { clientIp: '192.168.1.100', queryCount: 15234, blockedCount: 234 },
      { clientIp: '192.168.1.101', queryCount: 12543, blockedCount: 156 },
      { clientIp: '10.0.0.50', queryCount: 8421, blockedCount: 89 },
      { clientIp: '172.16.0.25', queryCount: 5632, blockedCount: 42 },
      { clientIp: '192.168.2.200', queryCount: 4521, blockedCount: 31 },
    ];
  }

  async getQueryTrends(
    tenantId: string,
    period: string,
  ): Promise<
    Array<{
      timestamp: string;
      total: number;
      allowed: number;
      blocked: number;
    }>
  > {
    let interval: string;
    let dateFilter: string;

    switch (period) {
      case '24h':
        interval = 'toStartOfHour(timestamp)';
        dateFilter = `timestamp >= now() - INTERVAL 24 HOUR`;
        break;
      case '7d':
        interval = 'toStartOfDay(timestamp)';
        dateFilter = `timestamp >= now() - INTERVAL 7 DAY`;
        break;
      case '30d':
        interval = 'toStartOfDay(timestamp)';
        dateFilter = `timestamp >= now() - INTERVAL 30 DAY`;
        break;
      case '90d':
        interval = 'toStartOfDay(timestamp)';
        dateFilter = `timestamp >= now() - INTERVAL 90 DAY`;
        break;
      default:
        interval = 'toStartOfDay(timestamp)';
        dateFilter = `timestamp >= now() - INTERVAL 7 DAY`;
    }

    return this.safeQuery(
      async () => {
        const result = await this.client.query({
          query: `
            SELECT
              ${interval} as ts,
              count() as total,
              countIf(action = 'allow') as allowed,
              countIf(action = 'block') as blocked
            FROM query_logs
            WHERE tenant_id = {tenantId:UUID} AND ${dateFilter}
            GROUP BY ts
            ORDER BY ts
          `,
          query_params: { tenantId },
          format: 'JSONEachRow',
        });

        const data = (await result.json()) as any[];
        return data.map((item) => ({
          timestamp: item.ts,
          total: Number(item.total),
          allowed: Number(item.allowed),
          blocked: Number(item.blocked),
        }));
      },
      () => this.getMockQueryTrends(period),
      'getQueryTrends',
    );
  }

  private getMockQueryTrends(period: string): Array<{
    timestamp: string;
    total: number;
    allowed: number;
    blocked: number;
  }> {
    const now = new Date();
    const data: Array<{
      timestamp: string;
      total: number;
      allowed: number;
      blocked: number;
    }> = [];

    let points: number;
    let intervalMs: number;

    switch (period) {
      case '24h':
        points = 24;
        intervalMs = 60 * 60 * 1000;
        break;
      case '7d':
        points = 7;
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case '30d':
        points = 30;
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case '90d':
        points = 90;
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      default:
        points = 7;
        intervalMs = 24 * 60 * 60 * 1000;
    }

    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMs);
      const baseTotal = 300000 + Math.floor(Math.random() * 100000);
      const blockRate = 0.04 + Math.random() * 0.02;
      const blocked = Math.floor(baseTotal * blockRate);

      data.push({
        timestamp: timestamp.toISOString(),
        total: baseTotal,
        allowed: baseTotal - blocked,
        blocked,
      });
    }

    return data;
  }
}
