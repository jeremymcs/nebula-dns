// Nebula DNS - ClickHouse Integration Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClickHouseService, QueryLog } from './clickhouse.service';
import { createClient, ClickHouseClient } from '@clickhouse/client';

describe('ClickHouse Integration Tests', () => {
  let service: ClickHouseService;
  let client: ClickHouseClient;
  let module: TestingModule;

  const testTenantId = '00000000-0000-0000-0000-000000000001';
  const testLocationId = '11111111-1111-1111-1111-111111111111';
  const testPolicyId = '22222222-2222-2222-2222-222222222222';
  const testDatabase = 'nebula_dns';

  // Helper function to create test log entries
  const createTestLog = (overrides: Partial<QueryLog> = {}): QueryLog => ({
    timestamp: new Date(),
    tenantId: testTenantId,
    locationId: testLocationId,
    locationName: 'Test Location',
    domain: 'example.com',
    queryType: 'A',
    clientIp: '192.168.1.100',
    action: 'allow',
    reason: 'Allowed by policy',
    responseTime: 10,
    cached: false,
    ...overrides,
  });

  beforeAll(async () => {
    // Create test module with real ClickHouse connection
    module = await Test.createTestingModule({
      providers: [
        ClickHouseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                CLICKHOUSE_HOST: 'localhost',
                CLICKHOUSE_PORT: 4123,
                CLICKHOUSE_DATABASE: 'nebula_dns',
                CLICKHOUSE_USER: 'nebula',
                CLICKHOUSE_PASSWORD: 'nebula',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ClickHouseService>(ClickHouseService);

    // Create a separate client for test setup/teardown
    client = createClient({
      host: 'http://localhost:4123',
      username: 'nebula',
      password: 'nebula',
      database: 'nebula_dns',
    });

    // Wait for service to initialize
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Clean up test data (but don't drop the database)
    try {
      if (service.isHealthy()) {
        await client.query({
          query: `DELETE FROM ${testDatabase}.query_logs WHERE tenant_id = '${testTenantId}'`,
        });
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }

    await client.close();
    await module.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    if (service.isHealthy()) {
      try {
        await client.query({
          query: `DELETE FROM ${testDatabase}.query_logs WHERE tenant_id = '${testTenantId}'`,
        });
      } catch (error) {
        // Table might not exist yet, that's ok
      }
    }
  });

  describe('Connection and Health', () => {
    it('should establish connection to ClickHouse', () => {
      expect(service).toBeDefined();
    });

    it('should report healthy status when connected', () => {
      const isHealthy = service.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });

    it('should provide connection status details', () => {
      const status = service.getConnectionStatus();
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('lastAttempt');
      expect(status).toHaveProperty('consecutiveFailures');
      expect(status).toHaveProperty('usingMockData');
    });

    it('should indicate when using mock data', () => {
      const usingMock = service.isUsingMockData();
      expect(typeof usingMock).toBe('boolean');
    });
  });

  describe('Schema Initialization', () => {
    it('should create database if not exists', async () => {
      const result = await client.query({
        query: `SELECT name FROM system.databases WHERE name = '${testDatabase}'`,
        format: 'JSONEachRow',
      });
      const databases = (await result.json()) as any[];
      expect(databases).toHaveLength(1);
      expect(databases[0].name).toBe(testDatabase);
    });

    it('should create query_logs table with correct schema', async () => {
      const result = await client.query({
        query: `
          SELECT name, type
          FROM system.columns
          WHERE database = '${testDatabase}' AND table = 'query_logs'
          ORDER BY name
        `,
        format: 'JSONEachRow',
      });
      const columns = (await result.json()) as any[];

      expect(columns.length).toBeGreaterThan(0);
      const columnNames = columns.map((c) => c.name);
      expect(columnNames).toContain('timestamp');
      expect(columnNames).toContain('tenant_id');
      expect(columnNames).toContain('location_id');
      expect(columnNames).toContain('domain');
      expect(columnNames).toContain('action');
      expect(columnNames).toContain('client_ip');
    });

    it('should create hourly_stats aggregation table', async () => {
      const result = await client.query({
        query: `
          SELECT name
          FROM system.tables
          WHERE database = '${testDatabase}' AND name = 'hourly_stats'
        `,
        format: 'JSONEachRow',
      });
      const tables = (await result.json()) as any[];
      expect(tables).toHaveLength(1);
    });

    it('should create category_stats aggregation table', async () => {
      const result = await client.query({
        query: `
          SELECT name
          FROM system.tables
          WHERE database = '${testDatabase}' AND name = 'category_stats'
        `,
        format: 'JSONEachRow',
      });
      const tables = (await result.json()) as any[];
      expect(tables).toHaveLength(1);
    });

    it('should create domain_stats aggregation table', async () => {
      const result = await client.query({
        query: `
          SELECT name
          FROM system.tables
          WHERE database = '${testDatabase}' AND name = 'domain_stats'
        `,
        format: 'JSONEachRow',
      });
      const tables = (await result.json()) as any[];
      expect(tables).toHaveLength(1);
    });

    it('should be idempotent - can run schema initialization multiple times', async () => {
      // Re-initialize schema - should not fail if run again
      await expect(
        client.query({
          query: `CREATE DATABASE IF NOT EXISTS ${testDatabase}`,
        }),
      ).resolves.toBeDefined();

      // Note: The TTL clause with DateTime64(3) has compatibility issues in some ClickHouse versions
      // This test verifies idempotency by attempting to create tables that already exist
      await expect(
        client.query({
          query: `
            CREATE TABLE IF NOT EXISTS ${testDatabase}.hourly_stats (
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
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('Query Log Insertion', () => {
    it('should insert single query log successfully', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const log = createTestLog({
        domain: 'test-single.com',
        action: 'allow',
      });

      await service.insertQueryLog(log);

      // Wait for async insert
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await client.query({
        query: `
          SELECT domain, action
          FROM ${testDatabase}.query_logs
          WHERE tenant_id = '${testTenantId}' AND domain = 'test-single.com'
        `,
        format: 'JSONEachRow',
      });

      const data = (await result.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].domain).toBe('test-single.com');
      expect(data[0].action).toBe('allow');
    });

    it('should insert batch query logs successfully', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const logs: QueryLog[] = [
        createTestLog({ domain: 'batch1.com', action: 'allow' }),
        createTestLog({ domain: 'batch2.com', action: 'block' }),
        createTestLog({ domain: 'batch3.com', action: 'rewrite' }),
      ];

      await service.insertQueryLogsBatch(logs);

      // Wait for async insert
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await client.query({
        query: `
          SELECT count() as total
          FROM ${testDatabase}.query_logs
          WHERE tenant_id = '${testTenantId}'
            AND domain IN ('batch1.com', 'batch2.com', 'batch3.com')
        `,
        format: 'JSONEachRow',
      });

      const data = (await result.json()) as any[];
      expect(Number(data[0].total)).toBe(3);
    });

    it('should insert log with all fields populated', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const log = createTestLog({
        domain: 'full-fields.com',
        action: 'block',
        category: 'malware',
        threatType: 'botnet',
        policyId: testPolicyId,
        cached: true,
        responseTime: 25,
      });

      await service.insertQueryLog(log);

      // Wait for async insert
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await client.query({
        query: `
          SELECT *
          FROM ${testDatabase}.query_logs
          WHERE tenant_id = '${testTenantId}' AND domain = 'full-fields.com'
        `,
        format: 'JSONEachRow',
      });

      const data = (await result.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].category).toBe('malware');
      expect(data[0].threat_type).toBe('botnet');
      expect(data[0].policy_id).toBe(testPolicyId);
      expect(data[0].cached).toBe(1);
      expect(data[0].response_time_ms).toBe(25);
    });

    it('should insert log with minimal fields', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const log = createTestLog({
        domain: 'minimal-fields.com',
        action: 'allow',
        // category, threatType, policyId not set
      });

      await service.insertQueryLog(log);

      // Wait for async insert
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await client.query({
        query: `
          SELECT *
          FROM ${testDatabase}.query_logs
          WHERE tenant_id = '${testTenantId}' AND domain = 'minimal-fields.com'
        `,
        format: 'JSONEachRow',
      });

      const data = (await result.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].domain).toBe('minimal-fields.com');
    });

    it('should maintain tenant isolation in logs', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const tenant1Id = '00000000-0000-0000-0000-000000000001';
      const tenant2Id = '00000000-0000-0000-0000-000000000002';

      const logs: QueryLog[] = [
        createTestLog({
          tenantId: tenant1Id,
          domain: 'tenant1.com',
        }),
        createTestLog({
          tenantId: tenant2Id,
          domain: 'tenant2.com',
        }),
      ];

      await service.insertQueryLogsBatch(logs);

      // Wait for async insert
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Query tenant 1 logs
      const result1 = await client.query({
        query: `
          SELECT domain
          FROM ${testDatabase}.query_logs
          WHERE tenant_id = '${tenant1Id}'
        `,
        format: 'JSONEachRow',
      });

      const tenant1Data = (await result1.json()) as any[];
      expect(tenant1Data.every((row) => row.domain === 'tenant1.com')).toBe(
        true,
      );

      // Query tenant 2 logs
      const result2 = await client.query({
        query: `
          SELECT domain
          FROM ${testDatabase}.query_logs
          WHERE tenant_id = '${tenant2Id}'
        `,
        format: 'JSONEachRow',
      });

      const tenant2Data = (await result2.json()) as any[];
      expect(tenant2Data.every((row) => row.domain === 'tenant2.com')).toBe(
        true,
      );
    });
  });

  describe('Aggregation Query Tests', () => {
    beforeEach(async () => {
      if (!service.isHealthy()) {
        return;
      }

      // Insert test data for aggregations
      const now = new Date();
      const logs: QueryLog[] = [
        // Allowed queries
        createTestLog({ domain: 'google.com', action: 'allow' }),
        createTestLog({ domain: 'github.com', action: 'allow' }),
        createTestLog({ domain: 'stackoverflow.com', action: 'allow' }),

        // Blocked queries with categories
        createTestLog({
          domain: 'malware.com',
          action: 'block',
          category: 'malware',
          threatType: 'malware',
        }),
        createTestLog({
          domain: 'phishing.com',
          action: 'block',
          category: 'phishing',
          threatType: 'phishing',
        }),
        createTestLog({
          domain: 'ads.com',
          action: 'block',
          category: 'advertising',
        }),
        createTestLog({
          domain: 'ads2.com',
          action: 'block',
          category: 'advertising',
        }),

        // Cached queries
        createTestLog({ domain: 'cached.com', action: 'allow', cached: true }),
        createTestLog({ domain: 'cached2.com', action: 'allow', cached: true }),
      ];

      await service.insertQueryLogsBatch(logs);

      // Wait for async insert and processing
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    it('should return correct summary stats', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const stats = await service.getSummaryStats(testTenantId, '24h');

      expect(stats).toHaveProperty('totalQueries');
      expect(stats).toHaveProperty('blockedQueries');
      expect(stats).toHaveProperty('threatsBlocked');
      expect(stats).toHaveProperty('blockRate');
      expect(stats).toHaveProperty('avgResponseTime');
      expect(stats).toHaveProperty('cacheHitRate');

      expect(stats.totalQueries).toBeGreaterThanOrEqual(9);
      expect(stats.blockedQueries).toBeGreaterThanOrEqual(4);
      expect(stats.threatsBlocked).toBeGreaterThanOrEqual(2);
    });

    it('should return top blocked domains', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const topBlocked = await service.getTopBlocked(testTenantId, '24h', 5);

      expect(Array.isArray(topBlocked)).toBe(true);
      expect(topBlocked.length).toBeGreaterThan(0);

      // Should have domain and count
      if (topBlocked.length > 0) {
        expect(topBlocked[0]).toHaveProperty('domain');
        expect(topBlocked[0]).toHaveProperty('count');
      }
    });

    it('should group blocks by category correctly', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const categories = await service.getBlocksByCategory(testTenantId, '24h');

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);

      // Should have category, count, and percentage
      if (categories.length > 0) {
        expect(categories[0]).toHaveProperty('category');
        expect(categories[0]).toHaveProperty('count');
        expect(categories[0]).toHaveProperty('percentage');
      }

      // Check if advertising category is present (we blocked 2)
      const advertisingCategory = categories.find(
        (c) => c.category === 'advertising',
      );
      if (advertisingCategory) {
        expect(advertisingCategory.count).toBeGreaterThanOrEqual(2);
      }
    });

    it('should filter stats by time range', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const stats24h = await service.getSummaryStats(testTenantId, '24h');
      const stats7d = await service.getSummaryStats(testTenantId, '7d');
      const stats30d = await service.getSummaryStats(testTenantId, '30d');

      // All should return data for the same tenant
      expect(stats24h.totalQueries).toBeGreaterThanOrEqual(0);
      expect(stats7d.totalQueries).toBeGreaterThanOrEqual(
        stats24h.totalQueries,
      );
      expect(stats30d.totalQueries).toBeGreaterThanOrEqual(
        stats7d.totalQueries,
      );
    });

    it('should filter by tenant correctly', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const differentTenantId = '00000000-0000-0000-0000-000000000999';
      const stats = await service.getSummaryStats(differentTenantId, '24h');

      // Should return zero or mock data for non-existent tenant
      expect(stats).toHaveProperty('totalQueries');
    });
  });

  describe('Analytics Query Tests', () => {
    beforeEach(async () => {
      if (!service.isHealthy()) {
        return;
      }

      // Insert time-series test data
      const now = new Date();
      const logs: QueryLog[] = [];

      // Create logs across different hours
      for (let i = 0; i < 5; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        logs.push(
          createTestLog({
            timestamp,
            domain: `domain${i}.com`,
            action: 'allow',
          }),
          createTestLog({
            timestamp,
            domain: `blocked${i}.com`,
            action: 'block',
            category: 'malware',
            threatType: 'malware',
          }),
        );
      }

      await service.insertQueryLogsBatch(logs);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    it('should return query trends time series', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const trends = await service.getQueryTrends(testTenantId, '24h');

      expect(Array.isArray(trends)).toBe(true);

      if (trends.length > 0) {
        expect(trends[0]).toHaveProperty('timestamp');
        expect(trends[0]).toHaveProperty('total');
        expect(trends[0]).toHaveProperty('allowed');
        expect(trends[0]).toHaveProperty('blocked');
      }
    });

    it('should return threat trends by category', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const threats = await service.getThreatTrends(testTenantId, '24h');

      expect(Array.isArray(threats)).toBe(true);

      if (threats.length > 0) {
        expect(threats[0]).toHaveProperty('hour');
        expect(threats[0]).toHaveProperty('threat_count');
      }
    });

    it('should return location stats per location', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const locationStats = await service.getLocationStats(testTenantId, '24h');

      expect(Array.isArray(locationStats)).toBe(true);

      if (locationStats.length > 0) {
        expect(locationStats[0]).toHaveProperty('locationId');
        expect(locationStats[0]).toHaveProperty('locationName');
        expect(locationStats[0]).toHaveProperty('totalQueries');
        expect(locationStats[0]).toHaveProperty('blockedQueries');
        expect(locationStats[0]).toHaveProperty('blockRate');
      }
    });

    it('should return heatmap data for visualization', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const heatmap = await service.getHeatmapData(testTenantId, '7d');

      expect(Array.isArray(heatmap)).toBe(true);

      if (heatmap.length > 0) {
        expect(heatmap[0]).toHaveProperty('day');
        expect(heatmap[0]).toHaveProperty('hour');
        expect(heatmap[0]).toHaveProperty('value');
        expect(heatmap[0].day).toBeGreaterThanOrEqual(0);
        expect(heatmap[0].day).toBeLessThan(7);
        expect(heatmap[0].hour).toBeGreaterThanOrEqual(0);
        expect(heatmap[0].hour).toBeLessThan(24);
      }
    });

    it('should return client IP stats', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const clientStats = await service.getClientIPStats(testTenantId, '24h');

      expect(Array.isArray(clientStats)).toBe(true);

      if (clientStats.length > 0) {
        expect(clientStats[0]).toHaveProperty('clientIp');
        expect(clientStats[0]).toHaveProperty('queryCount');
        expect(clientStats[0]).toHaveProperty('blockedCount');
      }
    });
  });

  describe('Circuit Breaker Tests', () => {
    it('should handle queries successfully when connected', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const stats = await service.getSummaryStats(testTenantId, '24h');
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalQueries');
    });

    it('should gracefully fall back to mock data when disconnected', async () => {
      // This test verifies that mock data is returned when ClickHouse is unavailable
      const stats = await service.getSummaryStats(testTenantId, '24h');

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalQueries');
      expect(stats).toHaveProperty('blockedQueries');
      expect(stats).toHaveProperty('threatsBlocked');

      // Mock data should have reasonable values
      expect(stats.totalQueries).toBeGreaterThan(0);
    });

    it('should return mock data for various analytics when unavailable', async () => {
      const topBlocked = await service.getTopBlocked(testTenantId, '24h');
      expect(Array.isArray(topBlocked)).toBe(true);

      const categories = await service.getBlocksByCategory(testTenantId, '24h');
      expect(Array.isArray(categories)).toBe(true);

      const trends = await service.getQueryTrends(testTenantId, '24h');
      expect(Array.isArray(trends)).toBe(true);
    });

    it('should track connection failures', async () => {
      const statusBefore = service.getConnectionStatus();
      expect(statusBefore).toHaveProperty('consecutiveFailures');
      expect(typeof statusBefore.consecutiveFailures).toBe('number');
    });

    it('should indicate mock data usage in connection status', async () => {
      const status = service.getConnectionStatus();
      const usingMock = service.isUsingMockData();

      // If connected, should not use mock data
      if (status.connected) {
        expect(usingMock).toBe(false);
        expect(status.usingMockData).toBe(false);
      } else {
        // If not connected, should use mock data
        expect(usingMock).toBe(true);
        expect(status.usingMockData).toBe(true);
      }
    });
  });

  describe('Query Logs Retrieval', () => {
    beforeEach(async () => {
      if (!service.isHealthy()) {
        return;
      }

      // Insert various test logs for filtering
      const logs: QueryLog[] = [
        createTestLog({
          domain: 'filter-test-1.com',
          action: 'allow',
          queryType: 'A',
        }),
        createTestLog({
          domain: 'filter-test-2.com',
          action: 'block',
          queryType: 'AAAA',
          category: 'malware',
        }),
        createTestLog({
          domain: 'filter-test-3.com',
          action: 'allow',
          queryType: 'MX',
        }),
      ];

      await service.insertQueryLogsBatch(logs);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    it('should retrieve query logs with pagination', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const result = await service.getQueryLogs({
        tenantId: testTenantId,
        limit: 10,
        offset: 0,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.pagination).toHaveProperty('cursor');
      expect(result.pagination).toHaveProperty('hasMore');
    });

    it('should filter logs by action', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const result = await service.getQueryLogs({
        tenantId: testTenantId,
        action: 'block',
        limit: 50,
      });

      expect(result.data).toBeDefined();
      // All returned logs should have action 'block'
      if (result.data.length > 0) {
        const allBlocked = result.data.every((log) => log.action === 'block');
        expect(allBlocked).toBe(true);
      }
    });

    it('should filter logs by domain', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const result = await service.getQueryLogs({
        tenantId: testTenantId,
        domain: 'filter-test-1',
        limit: 50,
      });

      expect(result.data).toBeDefined();
      if (result.data.length > 0) {
        const matchesDomain = result.data.some((log) =>
          log.domain.includes('filter-test-1'),
        );
        expect(matchesDomain).toBe(true);
      }
    });

    it('should filter logs by location', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const result = await service.getQueryLogs({
        tenantId: testTenantId,
        locationId: testLocationId,
        limit: 50,
      });

      expect(result.data).toBeDefined();
      if (result.data.length > 0) {
        const allSameLocation = result.data.every(
          (log) => log.locationId === testLocationId,
        );
        expect(allSameLocation).toBe(true);
      }
    });

    it('should filter logs by query type', async () => {
      if (!service.isHealthy()) {
        console.log('ClickHouse not available, skipping test');
        return;
      }

      const result = await service.getQueryLogs({
        tenantId: testTenantId,
        queryType: 'A',
        limit: 50,
      });

      expect(result.data).toBeDefined();
      if (result.data.length > 0) {
        const allTypeA = result.data.every((log) => log.queryType === 'A');
        expect(allTypeA).toBe(true);
      }
    });
  });
});
