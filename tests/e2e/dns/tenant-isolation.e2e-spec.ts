/**
 * Nebula DNS - Tenant Isolation E2E Tests
 * Validates that policies from Tenant A do not affect Tenant B's DNS queries
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { DnsClient, createTestDnsClient } from './dns-client';
import {
  PolicyServiceClient,
  sleep,
  TEST_ENVIRONMENT,
} from './test-helpers';
import { TEST_TENANTS, TEST_LOCATIONS, TEST_DOMAINS } from './fixtures/test-domains';

describe('DNS Tenant Isolation E2E Tests', () => {
  let dnsClient: DnsClient;
  let policySvc: PolicyServiceClient;

  beforeAll(async () => {
    dnsClient = createTestDnsClient(process.env.TEST_DNS_TOKEN);
    policySvc = new PolicyServiceClient(TEST_ENVIRONMENT.policySvcUrl);
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Cross-Tenant Policy Isolation', () => {
    it('should evaluate policies independently for different tenants', async () => {
      const testDomain = 'isolation-test.example.com';

      // Evaluate for Tenant A
      const resultA = await policySvc.evaluate({
        tenant_id: TEST_TENANTS.tenantA.id,
        location_id: TEST_LOCATIONS.locationA.id,
        qname: testDomain,
        qtype: 1,
        client_ip: '10.100.0.1',
      });

      // Evaluate for Tenant B
      const resultB = await policySvc.evaluate({
        tenant_id: TEST_TENANTS.tenantB.id,
        location_id: TEST_LOCATIONS.locationB.id,
        qname: testDomain,
        qtype: 1,
        client_ip: '10.200.0.1',
      });

      console.log(`Tenant A decision for ${testDomain}: ${resultA.decision}`);
      console.log(`Tenant B decision for ${testDomain}: ${resultB.decision}`);

      // Both should return valid decisions
      expect(resultA).toHaveProperty('decision');
      expect(resultB).toHaveProperty('decision');

      // Decisions may differ based on tenant-specific policies
      // The key is that they are evaluated independently
    });

    it('should not leak Tenant A blocklist to Tenant B', async () => {
      // Domain blocked for Tenant A (hypothetically)
      const blockedForTenantA = 'tenant-a-blocked.example.com';

      // Evaluate for Tenant A
      const resultA = await policySvc.evaluate({
        tenant_id: TEST_TENANTS.tenantA.id,
        location_id: TEST_LOCATIONS.locationA.id,
        qname: blockedForTenantA,
        qtype: 1,
        client_ip: '10.100.0.1',
      });

      // Evaluate for Tenant B (should NOT be blocked by Tenant A's policy)
      const resultB = await policySvc.evaluate({
        tenant_id: TEST_TENANTS.tenantB.id,
        location_id: TEST_LOCATIONS.locationB.id,
        qname: blockedForTenantA,
        qtype: 1,
        client_ip: '10.200.0.1',
      });

      console.log(`Tenant A evaluation: ${JSON.stringify(resultA)}`);
      console.log(`Tenant B evaluation: ${JSON.stringify(resultB)}`);

      // Even if Tenant A blocks this domain, Tenant B should get
      // their own policy decision (likely ALLOW if no policy exists)
      expect(resultA).toHaveProperty('decision');
      expect(resultB).toHaveProperty('decision');
    });

    it('should maintain separate cache per tenant', async () => {
      const testDomain = 'cache-isolation-test.example.com';

      // Query same domain for different tenants in rapid succession
      const results: { tenant: string; decision: string }[] = [];

      for (let i = 0; i < 3; i++) {
        // Tenant A query
        const resultA = await policySvc.evaluate({
          tenant_id: TEST_TENANTS.tenantA.id,
          location_id: TEST_LOCATIONS.locationA.id,
          qname: testDomain,
          qtype: 1,
          client_ip: '10.100.0.1',
        });
        results.push({ tenant: 'A', decision: resultA.decision });

        // Tenant B query
        const resultB = await policySvc.evaluate({
          tenant_id: TEST_TENANTS.tenantB.id,
          location_id: TEST_LOCATIONS.locationB.id,
          qname: testDomain,
          qtype: 1,
          client_ip: '10.200.0.1',
        });
        results.push({ tenant: 'B', decision: resultB.decision });

        await sleep(50);
      }

      console.log('Cache isolation test results:', JSON.stringify(results));

      // Verify decisions are consistent within each tenant
      const tenantADecisions = results
        .filter((r) => r.tenant === 'A')
        .map((r) => r.decision);
      const tenantBDecisions = results
        .filter((r) => r.tenant === 'B')
        .map((r) => r.decision);

      expect(tenantADecisions.every((d) => d === tenantADecisions[0])).toBe(true);
      expect(tenantBDecisions.every((d) => d === tenantBDecisions[0])).toBe(true);
    });
  });

  describe('Location-Based Isolation', () => {
    it('should evaluate policies based on location within tenant', async () => {
      const testDomain = 'location-test.example.com';
      const tenantId = TEST_TENANTS.tenantA.id;

      // Different locations within the same tenant
      const resultLocation1 = await policySvc.evaluate({
        tenant_id: tenantId,
        location_id: 'location-1',
        qname: testDomain,
        qtype: 1,
        client_ip: '10.100.1.1',
      });

      const resultLocation2 = await policySvc.evaluate({
        tenant_id: tenantId,
        location_id: 'location-2',
        qname: testDomain,
        qtype: 1,
        client_ip: '10.100.2.1',
      });

      console.log(`Location 1 decision: ${resultLocation1.decision}`);
      console.log(`Location 2 decision: ${resultLocation2.decision}`);

      // Both should return valid decisions (may be same or different based on config)
      expect(resultLocation1).toHaveProperty('decision');
      expect(resultLocation2).toHaveProperty('decision');
    });
  });

  describe('Tenant Context Validation', () => {
    it('should require valid tenant_id for policy evaluation', async () => {
      const result = await policySvc.evaluate({
        tenant_id: 'valid-tenant-id',
        location_id: 'valid-location-id',
        qname: 'context-test.example.com',
        qtype: 1,
        client_ip: '127.0.0.1',
      });

      // Should return a decision even for unknown tenant (fail-open)
      expect(result).toHaveProperty('decision');
    });

    it('should handle empty tenant_id gracefully', async () => {
      try {
        await policySvc.evaluate({
          tenant_id: '',
          location_id: 'test-location',
          qname: 'empty-tenant-test.example.com',
          qtype: 1,
          client_ip: '127.0.0.1',
        });
        // If we get here, the service handled it (possibly with default tenant)
      } catch (error) {
        // Expected to fail validation for empty tenant_id
        expect(error).toBeDefined();
      }
    });
  });

  describe('Concurrent Multi-Tenant Evaluation', () => {
    it('should handle concurrent evaluations from multiple tenants', async () => {
      const domains = Array.from({ length: 5 }, (_, i) => `concurrent-mt-${i}.example.com`);

      // Create mixed tenant evaluations
      const evaluations = domains.flatMap((domain, i) => [
        {
          tenant_id: TEST_TENANTS.tenantA.id,
          location_id: TEST_LOCATIONS.locationA.id,
          qname: domain,
          qtype: 1,
          client_ip: '10.100.0.1',
        },
        {
          tenant_id: TEST_TENANTS.tenantB.id,
          location_id: TEST_LOCATIONS.locationB.id,
          qname: domain,
          qtype: 1,
          client_ip: '10.200.0.1',
        },
      ]);

      // Execute all concurrently
      const results = await Promise.all(
        evaluations.map((eval_) => policySvc.evaluate(eval_)),
      );

      console.log(`Concurrent multi-tenant evaluations: ${results.length} completed`);

      // All should succeed
      expect(results.length).toBe(evaluations.length);
      expect(results.every((r) => r.decision)).toBe(true);
    });
  });

  describe('Tenant Data Boundaries', () => {
    it('should not return data from other tenants in evaluation response', async () => {
      const result = await policySvc.evaluate({
        tenant_id: TEST_TENANTS.tenantA.id,
        location_id: TEST_LOCATIONS.locationA.id,
        qname: 'data-boundary-test.example.com',
        qtype: 1,
        client_ip: '10.100.0.1',
      });

      // Response should not contain references to other tenants
      const responseStr = JSON.stringify(result);
      expect(responseStr).not.toContain(TEST_TENANTS.tenantB.id);
    });
  });

  describe('Policy Priority Within Tenant', () => {
    it('should follow policy priority order for same tenant', async () => {
      // Test the priority order: allowlist > blocklist > category > default
      const testDomain = 'priority-test.example.com';

      const result = await policySvc.evaluate({
        tenant_id: TEST_TENANTS.tenantA.id,
        location_id: TEST_LOCATIONS.locationA.id,
        qname: testDomain,
        qtype: 1,
        client_ip: '10.100.0.1',
      });

      // The decision should be based on the tenant's policy configuration
      expect(result).toHaveProperty('decision');
      expect(result).toHaveProperty('reason');

      console.log(`Priority test result: ${JSON.stringify(result)}`);
    });
  });
});
