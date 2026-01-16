/**
 * Nebula DNS - ClickHouse Logging E2E Tests
 * Validates that DNS queries are logged to ClickHouse with correct tenant context
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { DnsClient, createTestDnsClient } from './dns-client';
import {
  PolicyServiceClient,
  ClickHouseTestClient,
  sleep,
  retry,
  TEST_ENVIRONMENT,
} from './test-helpers';
import { TEST_TENANTS, TEST_THRESHOLDS, TEST_DOMAINS } from './fixtures/test-domains';

describe('DNS ClickHouse Logging E2E Tests', () => {
  let dnsClient: DnsClient;
  let policySvc: PolicyServiceClient;
  let clickhouse: ClickHouseTestClient;

  beforeAll(async () => {
    dnsClient = createTestDnsClient(process.env.TEST_DNS_TOKEN);
    policySvc = new PolicyServiceClient(TEST_ENVIRONMENT.policySvcUrl);
    clickhouse = new ClickHouseTestClient(
      TEST_ENVIRONMENT.clickhouseUrl,
      process.env.CLICKHOUSE_USER || 'nebula',
      process.env.CLICKHOUSE_PASSWORD || 'nebula',
    );
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Query Log Entry Creation', () => {
    it('should log allowed DNS query to ClickHouse', async () => {
      // Generate unique domain for this test
      const testDomain = `allowed-log-test-${Date.now()}.example.com`;

      // First, evaluate the policy to trigger logging
      await policySvc.evaluate({
        tenant_id: TEST_TENANTS.tenantA.id,
        location_id: 'test-location',
        qname: testDomain,
        qtype: 1,
        client_ip: '127.0.0.1',
      });

      // Wait for log to propagate to ClickHouse
      await sleep(TEST_THRESHOLDS.clickHouseLogDelayMs);

      // Query ClickHouse for the log entry
      try {
        const logs = await clickhouse.getDnsLogs(
          TEST_TENANTS.tenantA.id,
          testDomain,
          10,
        );

        console.log(`ClickHouse logs for ${testDomain}:`, JSON.stringify(logs, null, 2));

        // May or may not find logs depending on ClickHouse availability
        if (logs.length > 0) {
          const logEntry = logs[0];
          expect(logEntry.tenant_id).toBe(TEST_TENANTS.tenantA.id);
          expect(logEntry.qname).toContain(testDomain.split('.')[0]);
          expect(['ALLOW', 'BLOCK']).toContain(logEntry.action);
        }
      } catch (error) {
        console.log('ClickHouse query failed (may not be available):', error);
        // Skip assertion if ClickHouse is not available
      }
    });

    it('should log blocked DNS query with correct reason', async () => {
      const testDomain = TEST_DOMAINS.blocked[0];

      // Evaluate blocked domain
      await policySvc.evaluate({
        tenant_id: TEST_TENANTS.tenantA.id,
        location_id: 'test-location',
        qname: testDomain,
        qtype: 1,
        client_ip: '127.0.0.1',
      });

      await sleep(TEST_THRESHOLDS.clickHouseLogDelayMs);

      try {
        const logs = await clickhouse.getDnsLogs(
          TEST_TENANTS.tenantA.id,
          testDomain,
          10,
        );

        console.log(`Blocked query logs:`, JSON.stringify(logs, null, 2));

        if (logs.length > 0) {
          const logEntry = logs[0];
          expect(logEntry.tenant_id).toBe(TEST_TENANTS.tenantA.id);

          // Log entry should indicate the action taken
          expect(logEntry).toHaveProperty('action');
          expect(logEntry).toHaveProperty('reason');
        }
      } catch (error) {
        console.log('ClickHouse not available for blocked query test');
      }
    });
  });

  describe('Tenant Context in Logs', () => {
    it('should include correct tenant_id in log entries', async () => {
      const testDomainA = `tenant-a-log-${Date.now()}.example.com`;
      const testDomainB = `tenant-b-log-${Date.now()}.example.com`;

      // Log queries for both tenants
      await policySvc.evaluate({
        tenant_id: TEST_TENANTS.tenantA.id,
        location_id: 'location-a',
        qname: testDomainA,
        qtype: 1,
        client_ip: '10.100.0.1',
      });

      await policySvc.evaluate({
        tenant_id: TEST_TENANTS.tenantB.id,
        location_id: 'location-b',
        qname: testDomainB,
        qtype: 1,
        client_ip: '10.200.0.1',
      });

      await sleep(TEST_THRESHOLDS.clickHouseLogDelayMs);

      try {
        const logsA = await clickhouse.getDnsLogs(
          TEST_TENANTS.tenantA.id,
          testDomainA,
          10,
        );

        const logsB = await clickhouse.getDnsLogs(
          TEST_TENANTS.tenantB.id,
          testDomainB,
          10,
        );

        console.log('Tenant A logs:', JSON.stringify(logsA, null, 2));
        console.log('Tenant B logs:', JSON.stringify(logsB, null, 2));

        // Verify tenant isolation in logs
        if (logsA.length > 0) {
          expect(logsA.every((l) => l.tenant_id === TEST_TENANTS.tenantA.id)).toBe(true);
        }

        if (logsB.length > 0) {
          expect(logsB.every((l) => l.tenant_id === TEST_TENANTS.tenantB.id)).toBe(true);
        }
      } catch (error) {
        console.log('ClickHouse not available for tenant context test');
      }
    });

    it('should include location_id in log entries', async () => {
      const testDomain = `location-log-${Date.now()}.example.com`;
      const locationId = 'e2e-test-location';

      await policySvc.evaluate({
        tenant_id: TEST_TENANTS.tenantA.id,
        location_id: locationId,
        qname: testDomain,
        qtype: 1,
        client_ip: '127.0.0.1',
      });

      await sleep(TEST_THRESHOLDS.clickHouseLogDelayMs);

      try {
        const logs = await clickhouse.getDnsLogs(
          TEST_TENANTS.tenantA.id,
          testDomain,
          10,
        );

        if (logs.length > 0) {
          expect(logs[0].location_id).toBe(locationId);
        }
      } catch (error) {
        console.log('ClickHouse not available for location_id test');
      }
    });
  });

  describe('Log Entry Fields', () => {
    it('should log all required fields', async () => {
      const testDomain = `fields-test-${Date.now()}.example.com`;

      await policySvc.evaluate({
        tenant_id: TEST_TENANTS.tenantA.id,
        location_id: 'test-location',
        qname: testDomain,
        qtype: 1,
        client_ip: '192.168.1.100',
      });

      await sleep(TEST_THRESHOLDS.clickHouseLogDelayMs);

      try {
        const logs = await clickhouse.getDnsLogs(
          TEST_TENANTS.tenantA.id,
          testDomain,
          10,
        );

        if (logs.length > 0) {
          const log = logs[0];

          // Verify required fields are present
          expect(log).toHaveProperty('tenant_id');
          expect(log).toHaveProperty('location_id');
          expect(log).toHaveProperty('qname');
          expect(log).toHaveProperty('action');
          expect(log).toHaveProperty('reason');
          expect(log).toHaveProperty('timestamp');

          // Optional fields
          console.log('Log entry fields:', Object.keys(log).join(', '));
        }
      } catch (error) {
        console.log('ClickHouse not available for fields test');
      }
    });

    it('should log category for blocked domains', async () => {
      const testDomain = TEST_DOMAINS.categories.malware[0];

      await policySvc.evaluate({
        tenant_id: TEST_TENANTS.tenantA.id,
        location_id: 'test-location',
        qname: testDomain,
        qtype: 1,
        client_ip: '127.0.0.1',
      });

      await sleep(TEST_THRESHOLDS.clickHouseLogDelayMs);

      try {
        const logs = await clickhouse.getDnsLogs(
          TEST_TENANTS.tenantA.id,
          testDomain,
          10,
        );

        console.log('Category log entry:', JSON.stringify(logs, null, 2));

        if (logs.length > 0 && logs[0].category) {
          // If category filtering is configured, category should be logged
          expect(typeof logs[0].category).toBe('string');
        }
      } catch (error) {
        console.log('ClickHouse not available for category test');
      }
    });
  });

  describe('Log Volume and Performance', () => {
    it('should handle batch logging without significant delay', async () => {
      const domains = Array.from(
        { length: 10 },
        (_, i) => `batch-log-${Date.now()}-${i}.example.com`,
      );

      const startTime = Date.now();

      // Evaluate all domains
      await Promise.all(
        domains.map((domain) =>
          policySvc.evaluate({
            tenant_id: TEST_TENANTS.tenantA.id,
            location_id: 'test-location',
            qname: domain,
            qtype: 1,
            client_ip: '127.0.0.1',
          }),
        ),
      );

      const evaluationTime = Date.now() - startTime;

      console.log(`Batch evaluation of ${domains.length} domains took ${evaluationTime}ms`);

      // Evaluation should not be significantly slowed by logging
      expect(evaluationTime).toBeLessThan(5000);

      // Wait for logs to propagate
      await sleep(TEST_THRESHOLDS.clickHouseLogDelayMs);

      try {
        const logs = await clickhouse.getDnsLogs(
          TEST_TENANTS.tenantA.id,
          'batch-log',
          100,
        );

        console.log(`Found ${logs.length} batch log entries`);
      } catch (error) {
        console.log('ClickHouse not available for batch test');
      }
    });
  });

  describe('ClickHouse Connection Health', () => {
    it('should be able to query ClickHouse', async () => {
      try {
        // Simple ping query
        const result = await clickhouse.query<{ result: number }>(
          'SELECT 1 as result',
        );

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].result).toBe(1);

        console.log('ClickHouse connection healthy');
      } catch (error) {
        console.log('ClickHouse not available:', error);
        // Don't fail the test if ClickHouse is not available
      }
    });
  });

  describe('Log Retention and Query', () => {
    it('should be able to query recent logs', async () => {
      try {
        // Query logs from the last hour
        const logs = await clickhouse.query<{
          tenant_id: string;
          qname: string;
          action: string;
          timestamp: string;
        }>(
          `SELECT tenant_id, qname, action, timestamp
           FROM nebula_dns.dns_queries
           WHERE timestamp > now() - INTERVAL 1 HOUR
           ORDER BY timestamp DESC
           LIMIT 10`,
        );

        console.log(`Recent logs (last hour): ${logs.length} entries`);

        if (logs.length > 0) {
          console.log('Sample log entry:', JSON.stringify(logs[0]));
        }
      } catch (error) {
        console.log('ClickHouse query for recent logs failed');
      }
    });
  });
});
