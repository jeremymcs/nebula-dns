/**
 * Nebula DNS - DNS Enforcement E2E Test Fixtures
 * Test domain definitions and policy configurations
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

/**
 * Test domain definitions for DNS E2E tests
 */
export const TEST_DOMAINS = {
  // Domains that should be allowed
  allowed: [
    'google.com',
    'github.com',
    'stackoverflow.com',
    'microsoft.com',
    'cloudflare.com',
  ],

  // Domains that should be blocked (via explicit blocklist)
  blocked: [
    'blocked-test-domain.example.com',
    'malicious-site.example.com',
    'phishing-attempt.example.com',
  ],

  // Domains for category filtering tests
  categories: {
    malware: [
      'malware-test.nebula-dns.test',
      'virus-download.nebula-dns.test',
    ],
    phishing: [
      'phishing-test.nebula-dns.test',
      'fake-bank.nebula-dns.test',
    ],
    adult: [
      'adult-content.nebula-dns.test',
      'explicit-site.nebula-dns.test',
    ],
    ads: [
      'ads-server.nebula-dns.test',
      'tracking-pixel.nebula-dns.test',
    ],
  },

  // Safe search test domains
  safeSearch: {
    google: 'www.google.com',
    bing: 'www.bing.com',
    youtube: 'www.youtube.com',
  },

  // Safe search expected CNAME targets
  safeSearchTargets: {
    google: 'forcesafesearch.google.com',
    bing: 'strict.bing.com',
    youtube: 'restrictmoderate.youtube.com',
  },
};

/**
 * Test policy configurations
 */
export const TEST_POLICIES = {
  // Basic block/allow policy
  blockAllow: {
    name: 'E2E Test Block/Allow Policy',
    description: 'Policy for E2E block/allow testing',
    enabled: true,
    priority: 100,
    blockedDomains: TEST_DOMAINS.blocked,
    allowedDomains: TEST_DOMAINS.allowed,
  },

  // Category filtering policy
  categoryFilter: {
    name: 'E2E Test Category Filter Policy',
    description: 'Policy for E2E category filtering testing',
    enabled: true,
    priority: 90,
    blockedCategories: ['malware', 'phishing', 'adult', 'ads'],
  },

  // Safe search enforcement policy
  safeSearch: {
    name: 'E2E Test Safe Search Policy',
    description: 'Policy for E2E safe search testing',
    enabled: true,
    priority: 80,
    safeSearchEnabled: true,
    safeSearchEngines: ['google', 'bing', 'youtube'],
  },
};

/**
 * Test tenant configurations
 */
export const TEST_TENANTS = {
  tenantA: {
    id: 'e2e-test-tenant-a',
    name: 'E2E Test Tenant A',
    email: 'tenant-a@e2e-test.nebula-dns.local',
  },
  tenantB: {
    id: 'e2e-test-tenant-b',
    name: 'E2E Test Tenant B',
    email: 'tenant-b@e2e-test.nebula-dns.local',
  },
};

/**
 * Test location configurations
 */
export const TEST_LOCATIONS = {
  locationA: {
    id: 'e2e-test-location-a',
    name: 'E2E Test Location A',
    type: 'network',
    networks: ['10.100.0.0/24'],
  },
  locationB: {
    id: 'e2e-test-location-b',
    name: 'E2E Test Location B',
    type: 'network',
    networks: ['10.200.0.0/24'],
  },
};

/**
 * DNS response codes
 */
export const DNS_RCODES = {
  NOERROR: 0,
  FORMERR: 1,
  SERVFAIL: 2,
  NXDOMAIN: 3,
  NOTIMP: 4,
  REFUSED: 5,
};

/**
 * DNS query types
 */
export const DNS_QTYPES = {
  A: 1,
  AAAA: 28,
  CNAME: 5,
  MX: 15,
  TXT: 16,
  NS: 2,
  SOA: 6,
};

/**
 * Block response indicators
 */
export const BLOCK_INDICATORS = {
  // NXDOMAIN response code
  nxdomain: DNS_RCODES.NXDOMAIN,
  // Null route IP
  nullRouteIPv4: '0.0.0.0',
  nullRouteIPv6: '::',
  // Block page IP (configurable)
  blockPageIP: process.env.BLOCKPAGE_IP || '127.0.0.1',
};

/**
 * Test timeouts and thresholds
 */
export const TEST_THRESHOLDS = {
  // Policy sync should complete within 5 seconds (per TechSpec)
  policySyncTimeoutMs: 5000,
  // DNS query latency should be under 20ms average (per PRD)
  maxAverageLatencyMs: 20,
  // Individual query timeout
  queryTimeoutMs: 2000,
  // Fail-open test container restart timeout
  containerRestartTimeoutMs: 30000,
  // ClickHouse logging propagation delay
  clickHouseLogDelayMs: 2000,
};
