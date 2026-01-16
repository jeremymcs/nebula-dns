# DNS Enforcement E2E Test Suite

Nebula DNS - Enterprise DNS Security Platform
Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Overview

This test suite validates the complete DNS enforcement chain from policy configuration through actual DNS query resolution. It tests:

- Block/Allow domain policies
- Category filtering (malware, phishing, adult, ads)
- Safe search enforcement
- Fail-open behavior
- Policy sync latency
- Tenant isolation
- ClickHouse logging

## Prerequisites

### Running Locally

1. Docker and Docker Compose installed
2. Node.js 20+ installed
3. Start the full stack:

```bash
# Start all services
docker compose up -d

# Wait for services to be healthy
docker compose ps
```

### Required Services

| Service | Port | Purpose |
|---------|------|---------|
| dnsdist | 4443 | DoH endpoint |
| policy-svc | 4080 | Policy evaluation |
| unbound | 5354 | DNS resolver |
| postgres | 4432 | Database |
| redis | 4379 | Cache |
| clickhouse | 4123 | Query logs |

## Running Tests

### Run All DNS E2E Tests

```bash
cd api
npm run test:e2e:dns
```

### Run Specific Test File

```bash
cd api
npm run test:e2e:dns -- --testPathPattern=block-allow
```

### Run with Verbose Output

```bash
cd api
npm run test:e2e:dns -- --verbose
```

## Test Structure

```
tests/e2e/dns/
├── fixtures/
│   └── test-domains.ts       # Test domain configurations
├── dns-client.ts             # DNS query client
├── test-helpers.ts           # Utility functions
├── setup.ts                  # Jest setup
├── jest-dns-e2e.config.ts    # Jest configuration
├── block-allow.e2e-spec.ts   # Block/allow tests
├── category-filter.e2e-spec.ts   # Category filtering tests
├── safe-search.e2e-spec.ts   # Safe search tests
├── fail-open.e2e-spec.ts     # Fail-open behavior tests
├── policy-sync.e2e-spec.ts   # Policy sync latency tests
├── tenant-isolation.e2e-spec.ts  # Tenant isolation tests
├── clickhouse-logging.e2e-spec.ts # ClickHouse logging tests
└── README.md                 # This file
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DOH_URL | https://localhost:4443/dns-query | DoH endpoint URL |
| POLICY_SVC_URL | http://localhost:4080 | Policy service URL |
| CLICKHOUSE_URL | http://localhost:4123 | ClickHouse HTTP URL |
| API_URL | http://localhost:4010 | API endpoint URL |
| TEST_DNS_TOKEN | - | Optional DNS authentication token |
| SKIP_DOCKER_TESTS | false | Skip tests requiring Docker control |

## Test Descriptions

### Block/Allow Tests (`block-allow.e2e-spec.ts`)

- Validates blocked domains return NXDOMAIN or block page IP
- Validates allowed domains return valid A records
- Tests DNS query latency under 20ms average

### Category Filter Tests (`category-filter.e2e-spec.ts`)

- Tests malware category blocking
- Tests phishing category blocking
- Tests adult content category blocking
- Tests ads/tracking category blocking

### Safe Search Tests (`safe-search.e2e-spec.ts`)

- Tests Google safe search CNAME rewrite
- Tests Bing safe search CNAME rewrite
- Tests YouTube safe search CNAME rewrite

### Fail-Open Tests (`fail-open.e2e-spec.ts`)

- Tests DNS resolution when policy-svc is stopped
- Tests enforcement resumes when policy-svc restarts
- Requires Docker access (can be skipped with SKIP_DOCKER_TESTS=true)

### Policy Sync Tests (`policy-sync.e2e-spec.ts`)

- Tests policy changes propagate within 5 seconds
- Tests cache invalidation
- Tests concurrent policy evaluations

### Tenant Isolation Tests (`tenant-isolation.e2e-spec.ts`)

- Tests policies from Tenant A don't affect Tenant B
- Tests separate cache per tenant
- Tests location-based isolation within tenant

### ClickHouse Logging Tests (`clickhouse-logging.e2e-spec.ts`)

- Tests query logs include correct tenant_id
- Tests blocked queries logged with reason
- Tests all required fields are present

## Success Criteria

- All tests pass
- 80%+ code coverage for test infrastructure
- DNS query latency < 20ms average
- Policy sync < 5 seconds
- No cross-tenant policy leakage

## Troubleshooting

### Tests Failing with Connection Errors

1. Verify Docker services are running: `docker compose ps`
2. Check service logs: `docker compose logs policy-svc`
3. Ensure ports are not in use: `lsof -i :4443`

### Slow Tests

- Increase Jest timeout in `setup.ts`
- Check Docker resource allocation
- Run tests with `--runInBand` for sequential execution

### ClickHouse Tests Failing

- ClickHouse may need time to start
- Check ClickHouse logs: `docker compose logs clickhouse`
- Verify database exists: `docker compose exec clickhouse clickhouse-client -q "SHOW DATABASES"`
