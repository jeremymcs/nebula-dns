# Phase 28: Test Infrastructure - Research

**Date**: 2026-02-13
**Phase Goal**: Test environments and frameworks configured for comprehensive testing
**Success Criteria**: Testcontainers with PostgreSQL/Redis/ClickHouse, Playwright 60+ specs, ephemeral DOKS test namespaces, database reset scripts, k6 baseline testing

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [TEST-02: Testcontainers Setup](#test-02-testcontainers-setup)
3. [TEST-04: Playwright Expansion](#test-04-playwright-expansion)
4. [TEST-07: k6 Load Testing](#test-07-k6-load-testing)
5. [Ephemeral Test Namespaces](#ephemeral-test-namespaces)
6. [Database Reset Scripts](#database-reset-scripts)
7. [Architecture Decisions](#architecture-decisions)
8. [Implementation Complexity](#implementation-complexity)
9. [Sources](#sources)

---

## Current State Analysis

### Existing Test Infrastructure

**API Testing (NestJS + Jest)**
- ✅ Testcontainers package already installed (`testcontainers@11.11.0`)
- ✅ 9 integration test files using real services
- ✅ 60+ unit test files (.spec.ts)
- ✅ E2E test suite with 8 test files in `/api/test/`
- ⚠️ Integration tests currently use in-memory SQLite (e.g., family-members.service.integration.spec.ts)
- ⚠️ No Testcontainers usage detected in actual test code (package installed but not used)
- ⚠️ No ClickHouse Testcontainer configuration

**Current Integration Tests**:
```
api/src/modules/clickhouse/clickhouse.integration.spec.ts    (882 lines)
api/src/modules/redis/redis.integration.spec.ts              (655 lines)
api/src/modules/rate-limit/rate-limit.integration.spec.ts
api/src/modules/secrets/secrets.integration.spec.ts
api/src/modules/subscription-lapse/...integration.spec.ts
api/src/modules/limits/limits.service.integration.spec.ts
api/src/modules/msp-clients/msp-clients.service.integration.spec.ts
api/src/modules/family/family-members.service.integration.spec.ts
api/src/modules/auth/session.integration.spec.ts
api/src/modules/trials/trials.service.integration.spec.ts
```

**UI Testing (Next.js + Playwright)**
- ✅ Playwright installed (`@playwright/test@1.57.0`)
- ✅ 14 E2E test specs (5,101 total lines)
- ⚠️ Basic parallel config (workers: 1 in CI, undefined locally)
- ⚠️ Only Chromium and Firefox projects configured
- ⚠️ No mobile viewport testing
- ⚠️ baseURL hardcoded to localhost:3000 (should be 4011 based on docker-compose)

**Existing E2E Tests** (14 files, ~365 lines avg):
```
auth.spec.ts           (49 lines)
billing.spec.ts        (571 lines)
dashboard.spec.ts      (142 lines)
error-states.spec.ts   (486 lines)
lists.spec.ts          (436 lines)
locations.spec.ts      (375 lines)
msp.spec.ts            (586 lines)
navigation.spec.ts     (39 lines)
policies.spec.ts       (302 lines)
reports.spec.ts        (425 lines)
responsive.spec.ts     (402 lines)
settings.spec.ts       (457 lines)
tiers.spec.ts          (526 lines)
usage-tiers.spec.ts    (305 lines)
```

**Load Testing (k6)**
- ✅ 2 load test scripts already exist:
  - `scripts/load-testing/api-load-test.js` (168 lines) - Smoke/Load/Stress scenarios
  - `scripts/load-testing/dns-load-test.js` (202 lines) - DNS query performance
- ✅ Well-structured with custom metrics, thresholds, scenarios
- ⚠️ Not configured to run against DOKS staging
- ⚠️ No CI integration
- ⚠️ No k6-operator for distributed Kubernetes testing

**CI/CD Pipeline (.github/workflows/ci.yml)**
- ✅ API unit tests run with PostgreSQL and Redis services
- ✅ UI build testing
- ✅ Policy service (Go) tests with Redis
- ✅ DNS E2E tests with Docker Compose
- ⚠️ No Playwright E2E tests in CI
- ⚠️ No load testing in CI
- ⚠️ ClickHouse not included in service matrix
- ⚠️ DNS E2E tests marked as `continue-on-error: true`

**Docker Compose**
- ✅ Complete stack defined (PostgreSQL, Redis, ClickHouse, API, UI, Admin-UI, dnsdist, policy-svc, unbound)
- ✅ Health checks configured
- ⚠️ No dedicated test compose file

**Helm Charts**
- ✅ Helm chart exists at `helm/safedns/`
- ✅ Database migration job template (`db-migration-job.yaml`)
- ✅ ClickHouse init job template (`clickhouse-init-job.yaml`)
- ⚠️ No test namespace or ephemeral environment support

---

## TEST-02: Testcontainers Setup

### What is Testcontainers?

Testcontainers is a library that provides lightweight, throwaway instances of databases, message brokers, and other services that run in Docker containers. It enables integration testing against real dependencies without requiring mocks or in-memory databases.

**Key Benefits**:
- Test against real PostgreSQL, Redis, and ClickHouse instead of mocks
- More deterministic tests that closely replicate production
- Automatic cleanup (containers destroyed after tests)
- No test data pollution between runs
- Dynamic port mapping avoids conflicts in CI

### Current Package Status

**Already Installed**:
```json
// api/package.json
"devDependencies": {
  "testcontainers": "^11.11.0"
}
```

**Additional Modules Needed**:
```bash
npm install --save-dev @testcontainers/postgresql
npm install --save-dev @testcontainers/redis
npm install --save-dev @testcontainers/clickhouse
```

### Best Practices for Multi-Service Setup

1. **Use Specific Image Versions**
   - Pin PostgreSQL version (e.g., `postgres:16`)
   - Pin Redis version (e.g., `redis:7-alpine`)
   - Pin ClickHouse version (e.g., `clickhouse/clickhouse-server:24.1`)
   - Avoid `latest` tag to prevent surprises from upstream changes

2. **Dynamic Port Mapping**
   - Never hardcode ports in test configuration
   - Use `container.getHost()` and `container.getMappedPort()`
   - Override environment variables dynamically

3. **Container Lifecycle Management**
   - Start containers in `beforeAll()` hook
   - Stop containers in `afterAll()` hook
   - Use `startedTestContainer.stop()` for cleanup
   - Consider using `testcontainers-node` reaper for automatic cleanup

4. **Performance Optimization**
   - Reuse containers across tests in same file
   - Use `.withReuse()` for local development (requires Ryuk disabled)
   - Set `TESTCONTAINERS_RYUK_DISABLED=true` in local dev
   - In CI, use fresh containers every run

5. **Database Initialization**
   - PostgreSQL: Use `.withDatabase()` and `.withInitDb()` for schema
   - ClickHouse: Mount SQL scripts via `.withCopyFileToContainer()`
   - Apply migrations before tests run

### Architecture Pattern for NestJS

```typescript
// api/test/testcontainers-setup.ts (new file)

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { ClickHouseContainer } from '@testcontainers/clickhouse';
import { StartedTestContainer } from 'testcontainers';

export class TestContainersManager {
  private static postgres: StartedTestContainer;
  private static redis: StartedTestContainer;
  private static clickhouse: StartedTestContainer;

  static async startAll() {
    // Start in parallel for speed
    [this.postgres, this.redis, this.clickhouse] = await Promise.all([
      new PostgreSqlContainer('postgres:16')
        .withDatabase('nebula_test')
        .withUsername('test')
        .withPassword('test')
        .start(),

      new RedisContainer('redis:7-alpine').start(),

      new ClickHouseContainer('clickhouse/clickhouse-server:24.1')
        .withUsername('nebula')
        .withPassword('nebula')
        .withDatabase('nebula_dns')
        .start()
    ]);

    return {
      DATABASE_URL: this.postgres.getConnectionUri(),
      REDIS_URL: `redis://${this.redis.getHost()}:${this.redis.getMappedPort(6379)}`,
      CLICKHOUSE_HOST: this.clickhouse.getHost(),
      CLICKHOUSE_PORT: this.clickhouse.getMappedPort(8123),
    };
  }

  static async stopAll() {
    await Promise.all([
      this.postgres?.stop(),
      this.redis?.stop(),
      this.clickhouse?.stop()
    ]);
  }
}
```

### Migration Strategy

**Phase 1**: Convert existing integration tests that use SQLite
- Start with `family-members.service.integration.spec.ts`
- Replace SQLite with PostgreSqlContainer
- Verify all existing assertions pass

**Phase 2**: Add Redis and ClickHouse to integration tests
- Update `clickhouse.integration.spec.ts` to use ClickHouseContainer
- Update `redis.integration.spec.ts` to use RedisContainer
- Remove hardcoded localhost references

**Phase 3**: Create comprehensive integration test suite
- New tests for multi-service interactions
- Test cache invalidation flows (Redis pub/sub + PostgreSQL updates)
- Test analytics pipeline (API → ClickHouse logging)

### CI Integration

Update `.github/workflows/ci.yml`:
```yaml
- name: Run integration tests with Testcontainers
  working-directory: ./api
  run: npm run test:integration
  env:
    NODE_ENV: test
    # Testcontainers will handle service startup
```

**No need for service containers in GitHub Actions** - Testcontainers manages them!

### Estimated Effort

- **Testcontainers Setup**: 4 hours
  - Install modules and create manager class
  - Configure jest.config for integration tests
  - Add helper utilities

- **Test Migration**: 8 hours
  - Convert 10 integration tests from SQLite to Testcontainers
  - Fix connection string handling
  - Verify all assertions pass

- **CI Pipeline**: 2 hours
  - Update GitHub Actions workflow
  - Remove redundant service containers
  - Add caching for Docker images

**Total: 14 hours**

---

## TEST-04: Playwright Expansion

### Current State: 14 Specs → Goal: 60+ Specs

**Coverage Gaps Identified**:

1. **Admin UI (0 tests) - Need ~15 specs**
   - MSP onboarding wizard
   - Tenant billing management
   - System health dashboard
   - User impersonation flows
   - Admin session timeout

2. **Security & Auth (1 spec) - Need ~8 more specs**
   - MFA setup and verification
   - SSO login flows (OIDC/SAML)
   - API key management
   - Session expiration
   - Password reset flow
   - Account lockout

3. **Advanced Features (partial coverage) - Need ~12 specs**
   - SIEM integration configuration
   - Webhook setup and testing
   - Scheduled reports
   - Custom policy builder
   - AI insights dashboard
   - Security score details
   - Playbooks execution

4. **Edge Cases & Error Handling (1 spec) - Need ~10 more specs**
   - Network timeouts
   - API rate limiting
   - Form validation edge cases
   - Concurrent user actions
   - Browser back/forward navigation
   - Large dataset rendering (pagination)

### Playwright Configuration Improvements

**Current Config Issues**:
```typescript
// ui/playwright.config.ts
use: {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',  // ❌ Wrong port
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
},
workers: process.env.CI ? 1 : undefined,  // ⚠️ Not optimized
```

**Recommended Configuration**:
```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,  // ✅ Run all tests in parallel
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,  // ✅ 4 workers in CI

  // ✅ Multiple reporters for better visibility
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['github']  // For GitHub Actions annotations
  ],

  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:4011',  // ✅ Correct port
    trace: 'retain-on-failure',  // ✅ Keep traces for failed tests
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',  // ✅ Record videos for debugging

    // ✅ Auto-waiting configuration
    actionTimeout: 10000,
    navigationTimeout: 30000,

    // ✅ Better error messages
    contextOptions: {
      recordVideo: process.env.CI ? { dir: './test-results/videos' } : undefined
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },  // ✅ Add Safari
    },
    // ✅ Mobile testing
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4011',  // ✅ Correct port
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### Parallel Testing Best Practices

**Worker Isolation**:
- Each worker gets its own browser context
- Tests cannot share state between workers
- Database seeding must be idempotent

**Test Independence**:
```typescript
// ✅ Good: Each test creates its own data
test('should create policy', async ({ page }) => {
  const policyName = `Test Policy ${Date.now()}`;
  // ... test code
});

// ❌ Bad: Tests depend on shared state
let sharedPolicy;
test.beforeAll(() => {
  sharedPolicy = createPolicy();  // Race condition with parallel tests
});
```

**Playwright Auto-Waiting**:
- Automatically waits for elements to be visible, enabled, stable
- Waits for navigation to complete
- Retries failed actions (default: 5 seconds)
- No need for manual `waitForSelector` in most cases

```typescript
// ✅ Playwright auto-waits for element
await page.click('button[type="submit"]');

// ❌ Unnecessary manual waiting
await page.waitForSelector('button[type="submit"]');
await page.click('button[type="submit"]');
```

### Page Object Model (POM)

**Recommended Structure**:
```
ui/e2e/
├── pages/
│   ├── auth/
│   │   ├── LoginPage.ts
│   │   ├── MfaPage.ts
│   │   └── SsoPage.ts
│   ├── dashboard/
│   │   ├── DashboardPage.ts
│   │   ├── PoliciesPage.ts
│   │   └── LocationsPage.ts
│   ├── admin/
│   │   ├── TenantBillingPage.ts
│   │   ├── MspOnboardingPage.ts
│   │   └── SystemHealthPage.ts
│   └── common/
│       ├── NavigationComponent.ts
│       └── ModalComponent.ts
├── fixtures/
│   ├── test-data.ts
│   └── api-helpers.ts
└── specs/
    ├── auth/
    ├── dashboard/
    ├── admin/
    └── integration/
```

### Test Data Management

**Use API for Setup, UI for Verification**:
```typescript
import { test as base } from '@playwright/test';

const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Use API to create user and login (faster than UI)
    const token = await createUserViaAPI();
    await page.goto('/');
    await page.evaluate((t) => localStorage.setItem('token', t), token);
    await use(page);
  },
});

test('should display dashboard', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  // Test starts already authenticated
});
```

### CI Integration

```yaml
# .github/workflows/ci.yml
ui-e2e-test:
  name: UI E2E Tests
  runs-on: ubuntu-latest

  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: ui/package-lock.json

    - name: Install dependencies
      working-directory: ./ui
      run: npm ci --legacy-peer-deps

    - name: Install Playwright browsers
      working-directory: ./ui
      run: npx playwright install --with-deps

    - name: Run E2E tests
      working-directory: ./ui
      run: npm run test:e2e
      env:
        TEST_BASE_URL: http://localhost:4011

    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: ui/playwright-report/
        retention-days: 30

    - name: Upload videos
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: test-videos
        path: ui/test-results/videos/
```

### Estimated Effort

- **Config Updates**: 2 hours
  - Fix baseURL and ports
  - Add Safari and mobile projects
  - Configure reporters and artifacts

- **New Test Specs (46 new tests)**: 32 hours
  - Admin UI tests: 12 hours
  - Security/Auth tests: 6 hours
  - Advanced features: 10 hours
  - Edge cases: 4 hours

- **Page Object Model**: 8 hours
  - Extract common page objects
  - Create fixtures and helpers
  - Refactor existing tests

- **CI Integration**: 2 hours
  - Add E2E job to workflow
  - Configure artifact uploads
  - Set up test reporting

**Total: 44 hours**

---

## TEST-07: k6 Load Testing

### Current Scripts Analysis

**Existing Scripts** (well-structured, need enhancement):

1. **`api-load-test.js`**:
   - ✅ Smoke, Load, and Stress scenarios
   - ✅ Custom metrics (login, policies, locations duration)
   - ✅ Thresholds defined (p95 < 500ms, errors < 1%)
   - ⚠️ Targets localhost:4000 (should be configurable for DOKS)
   - ⚠️ Single tenant testing only
   - ⚠️ No distributed execution support

2. **`dns-load-test.js`**:
   - ✅ Sustained load (1K QPS) and spike (5K QPS) scenarios
   - ✅ DNS wire format encoding for DoH
   - ✅ Blocked vs allowed query tracking
   - ⚠️ No DoT (DNS over TLS) testing
   - ⚠️ No multi-location tenant testing

### k6 Baseline Requirements

**Performance Targets** (to establish in Phase 28):

| Metric | P50 | P95 | P99 | Error Rate |
|--------|-----|-----|-----|------------|
| API Authentication | <200ms | <500ms | <1s | <0.1% |
| API Policy Fetch | <100ms | <200ms | <500ms | <0.1% |
| DNS Query (DoH) | <50ms | <100ms | <200ms | <0.01% |
| DNS Query (DoT) | <50ms | <100ms | <200ms | <0.01% |
| ClickHouse Query | <500ms | <2s | <5s | <1% |

### k6 on Kubernetes (k6-operator)

**Why Use k6-operator?**
- Distributed load generation (overcome single-process limits)
- Run tests from within the cluster (eliminate network latency)
- Auto-scaling test pods based on target load
- Native Kubernetes resource management

**Installation**:
```bash
# Install k6-operator in DOKS staging cluster
kubectl create namespace k6-operator-system
kubectl apply -f https://github.com/grafana/k6-operator/releases/latest/download/bundle.yaml
```

**TestRun Custom Resource** (example):
```yaml
# k8s/test/k6-api-load-test.yaml
apiVersion: k6.io/v1alpha1
kind: TestRun
metadata:
  name: api-baseline-test
  namespace: nebula-dns-staging
spec:
  parallelism: 4  # 4 k6 pods for distributed load
  script:
    configMap:
      name: k6-api-load-test
      file: api-load-test.js
  arguments: --out json=results.json
  runner:
    image: grafana/k6:latest
    env:
      - name: API_URL
        value: "http://api.nebula-dns-staging.svc.cluster.local:3000"
      - name: TEST_EMAIL
        valueFrom:
          secretKeyRef:
            name: k6-test-credentials
            key: email
      - name: TEST_PASSWORD
        valueFrom:
          secretKeyRef:
            name: k6-test-credentials
            key: password
```

### Enhanced Test Scenarios

**Multi-Tenant Testing**:
```javascript
// scripts/load-testing/api-multi-tenant-test.js (new)

const tenants = [
  { email: 'tenant1@example.com', password: 'pass1' },
  { email: 'tenant2@example.com', password: 'pass2' },
  { email: 'tenant3@example.com', password: 'pass3' },
];

export default function() {
  // Randomly select tenant to simulate multi-tenancy
  const tenant = tenants[Math.floor(Math.random() * tenants.length)];

  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: tenant.email,
    password: tenant.password,
  }), { headers: { 'Content-Type': 'application/json' } });

  // ... rest of test
}
```

**DNS Multi-Protocol Testing**:
```javascript
// scripts/load-testing/dns-multi-protocol-test.js (new)

import { check } from 'k6';
import http from 'k6/http';
import ws from 'k6/ws';

export default function() {
  // 70% DoH, 20% DoT, 10% plain DNS
  const protocol = Math.random();

  if (protocol < 0.7) {
    testDoH();
  } else if (protocol < 0.9) {
    testDoT();
  } else {
    testPlainDNS();
  }
}
```

### DOKS Staging Configuration

**Environment Variables for Staging**:
```bash
# .env.staging (new file)
API_URL=https://api.staging.nebuladns.io
DOH_URL=https://doh.staging.nebuladns.io/dns-query
DOT_URL=dot.staging.nebuladns.io:853
CLICKHOUSE_URL=https://clickhouse.staging.nebuladns.io:8443

# Test credentials (store in Kubernetes secrets)
TEST_EMAIL=loadtest@staging.nebuladns.io
TEST_PASSWORD=<from-k8s-secret>
```

**Staging Ingress Endpoints**:
```yaml
# helm/safedns/templates/ingress.yaml (add staging annotations)
annotations:
  cert-manager.io/cluster-issuer: letsencrypt-staging
  nginx.ingress.kubernetes.io/rate-limit: "1000"  # Protect from excessive load
```

### Baseline Establishment Process

1. **Week 1: Single-User Baseline**
   - Run smoke tests (1 VU, 30s) to establish minimum response times
   - Capture baseline metrics for 0 concurrent users

2. **Week 2: Normal Load Baseline**
   - Gradually ramp to 50 VUs (expected normal traffic)
   - Run for 30 minutes to capture sustained performance
   - Identify memory leaks or gradual degradation

3. **Week 3: Stress Testing**
   - Ramp to 200+ VUs to find breaking point
   - Document at what load each service starts to degrade
   - Capture resource utilization (CPU, memory, network)

4. **Week 4: Spike Testing**
   - Sudden traffic spikes (0 → 500 VUs in 30s)
   - Verify auto-scaling behavior
   - Test circuit breaker effectiveness

### Observability Integration

**Export k6 Metrics to Prometheus**:
```javascript
// k6 config for Prometheus Remote Write
export const options = {
  ext: {
    loadimpact: {
      projectID: 'nebula-dns',
      name: 'API Baseline Test',
      distribution: {
        'nebula-dns-staging': { loadZone: 'amazon:us:ashburn', percent: 100 },
      },
    },
  },
};
```

**Grafana Dashboard**:
- Create dashboard to visualize k6 metrics
- Compare baseline vs current performance
- Alert on SLA violations

### CI Integration

```yaml
# .github/workflows/load-test.yml (new workflow)
name: Load Test

on:
  schedule:
    - cron: '0 2 * * 1'  # Every Monday at 2 AM UTC
  workflow_dispatch:

jobs:
  load-test:
    name: Run k6 Load Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.49.0/k6-v0.49.0-linux-amd64.tar.gz -L | tar xvz
          sudo mv k6-v0.49.0-linux-amd64/k6 /usr/local/bin

      - name: Run API load test
        run: k6 run scripts/load-testing/api-load-test.js
        env:
          API_URL: https://api.staging.nebuladns.io
          TEST_EMAIL: ${{ secrets.STAGING_TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.STAGING_TEST_PASSWORD }}

      - name: Upload results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: k6-results
          path: results.json
```

### Estimated Effort

- **k6-operator Setup**: 4 hours
  - Install operator in DOKS staging
  - Create TestRun CRDs
  - Configure secrets and ConfigMaps

- **Enhanced Test Scripts**: 8 hours
  - Multi-tenant testing scenario
  - DNS multi-protocol tests
  - Staging environment configuration

- **Baseline Establishment**: 16 hours (spread over 4 weeks)
  - Week 1: Single-user baseline (4h)
  - Week 2: Normal load baseline (4h)
  - Week 3: Stress testing (4h)
  - Week 4: Spike testing (4h)

- **Observability Integration**: 6 hours
  - Prometheus exporter config
  - Grafana dashboards
  - Alerting rules

- **CI Integration**: 2 hours
  - GitHub Actions workflow
  - Scheduled runs
  - Result archiving

**Total: 36 hours**

---

## Ephemeral Test Namespaces

### What Are Ephemeral Namespaces?

Ephemeral namespaces are short-lived Kubernetes namespaces created for testing purposes and automatically destroyed after tests complete. They provide:
- **Isolation**: Each test run gets its own namespace
- **Parallelization**: Multiple test runs can occur simultaneously
- **Cost Efficiency**: Resources are cleaned up immediately after use
- **Reproducibility**: Fresh environment every time

### Architecture Options

**Option 1: Namespace-per-PR (Recommended)**
- Create namespace when PR is opened
- Keep namespace alive during PR review
- Destroy namespace when PR is merged/closed
- **Pros**: Persistent environment for manual testing
- **Cons**: Higher resource usage for long-lived PRs

**Option 2: Namespace-per-Test-Run**
- Create namespace at test start
- Destroy immediately after test completion
- **Pros**: Minimal resource usage
- **Cons**: Can't inspect environment after failure

**Option 3: Hybrid Approach** (Best for Nebula DNS)
- Namespace-per-PR for E2E tests
- Namespace-per-test-run for load tests
- Retention period: 4 hours after PR merge

### Implementation Strategy

**Namespace Creation Script**:
```bash
#!/bin/bash
# scripts/k8s/create-ephemeral-namespace.sh

set -e

NAMESPACE_PREFIX="nebula-test"
PR_NUMBER="${1:-0}"
TIMESTAMP=$(date +%s)
NAMESPACE="${NAMESPACE_PREFIX}-pr-${PR_NUMBER}-${TIMESTAMP}"

echo "Creating ephemeral namespace: ${NAMESPACE}"

# Create namespace
kubectl create namespace "${NAMESPACE}"

# Label for cleanup
kubectl label namespace "${NAMESPACE}" \
  ephemeral=true \
  pr-number="${PR_NUMBER}" \
  created-at="${TIMESTAMP}"

# Apply resource quotas
kubectl apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ephemeral-quota
  namespace: ${NAMESPACE}
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    persistentvolumeclaims: "5"
    services.loadbalancers: "0"  # No external LBs for test envs
EOF

# Apply network policy for isolation
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-external-egress
  namespace: ${NAMESPACE}
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector: {}  # Allow internal cluster traffic only
EOF

echo "Namespace ${NAMESPACE} created successfully"
echo "::set-output name=namespace::${NAMESPACE}"
```

**Cleanup Script (Time-based)**:
```bash
#!/bin/bash
# scripts/k8s/cleanup-ephemeral-namespaces.sh

set -e

MAX_AGE_SECONDS=$((4 * 3600))  # 4 hours
CURRENT_TIME=$(date +%s)

echo "Cleaning up ephemeral namespaces older than 4 hours..."

kubectl get namespaces -l ephemeral=true -o json | \
jq -r '.items[] | select(.metadata.labels."created-at" != null) | .metadata.name' | \
while read -r ns; do
  CREATED_AT=$(kubectl get namespace "$ns" -o jsonpath='{.metadata.labels.created-at}')
  AGE=$((CURRENT_TIME - CREATED_AT))

  if [ "$AGE" -gt "$MAX_AGE_SECONDS" ]; then
    echo "Deleting namespace: $ns (age: ${AGE}s)"
    kubectl delete namespace "$ns" --wait=false
  fi
done
```

**CronJob for Automated Cleanup**:
```yaml
# k8s/test/ephemeral-cleanup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ephemeral-namespace-cleanup
  namespace: nebula-dns-staging
spec:
  schedule: "0 */2 * * *"  # Every 2 hours
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: namespace-cleanup
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Inline cleanup script
              MAX_AGE_SECONDS=$((4 * 3600))
              CURRENT_TIME=$(date +%s)

              kubectl get namespaces -l ephemeral=true -o json | \
              jq -r '.items[] | select(.metadata.labels."created-at" != null) | .metadata.name' | \
              while read -r ns; do
                CREATED_AT=$(kubectl get namespace "$ns" -o jsonpath='{.metadata.labels.created-at}')
                AGE=$((CURRENT_TIME - CREATED_AT))

                if [ "$AGE" -gt "$MAX_AGE_SECONDS" ]; then
                  echo "Deleting namespace: $ns (age: ${AGE}s)"
                  kubectl delete namespace "$ns" --wait=false
                fi
              done
          restartPolicy: OnFailure
```

**RBAC for Cleanup**:
```yaml
# k8s/test/namespace-cleanup-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: namespace-cleanup
  namespace: nebula-dns-staging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-cleanup
rules:
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: namespace-cleanup
subjects:
- kind: ServiceAccount
  name: namespace-cleanup
  namespace: nebula-dns-staging
roleRef:
  kind: ClusterRole
  name: namespace-cleanup
  apiGroup: rbac.authorization.k8s.io
```

### CI Integration (GitHub Actions)

```yaml
# .github/workflows/pr-ephemeral-env.yml (new workflow)
name: PR Ephemeral Environment

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  create-ephemeral-env:
    name: Create Ephemeral Test Environment
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          method: kubeconfig
          kubeconfig: ${{ secrets.DOKS_KUBECONFIG }}
          context: do-nyc1-nebula-dns-staging

      - name: Create ephemeral namespace
        id: create-ns
        run: |
          bash scripts/k8s/create-ephemeral-namespace.sh ${{ github.event.pull_request.number }}

      - name: Deploy to ephemeral namespace
        run: |
          helm upgrade --install nebula-dns-test-${{ github.event.pull_request.number }} \
            ./helm/safedns \
            --namespace ${{ steps.create-ns.outputs.namespace }} \
            --set image.tag=${{ github.sha }} \
            --set ingress.enabled=false \
            --wait --timeout 10m

      - name: Run E2E tests
        run: |
          export TEST_NAMESPACE=${{ steps.create-ns.outputs.namespace }}
          kubectl port-forward -n $TEST_NAMESPACE svc/api 4010:3000 &
          sleep 5
          cd ui && npm run test:e2e

      - name: Comment PR with environment info
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Ephemeral test environment created: `${{ steps.create-ns.outputs.namespace }}`\n\nEnvironment will be automatically cleaned up 4 hours after PR is merged.'
            })
```

### Cost Management

**Resource Quotas per Namespace**:
- CPU: 4 cores request, 8 cores limit
- Memory: 8Gi request, 16Gi limit
- Storage: 50Gi total PVC claims
- No external LoadBalancers (use NodePort or port-forward)

**Estimated Cost (DigitalOcean)**:
- Ephemeral namespace: ~$0.50/hour (based on resource usage)
- Maximum concurrent namespaces: 10
- Average PR lifetime: 6 hours
- Monthly cost: ~$900 (assuming 20 PRs/month)

**Cost Optimization**:
- Use spot instances for test nodes
- Aggressive cleanup (4 hour TTL)
- Namespace-level resource quotas
- Disable unnecessary services (monitoring, logging)

### Estimated Effort

- **Script Development**: 6 hours
  - Namespace creation script
  - Cleanup script
  - RBAC configuration

- **CronJob Setup**: 2 hours
  - Deploy cleanup CronJob
  - Test automated cleanup
  - Verify RBAC permissions

- **CI Integration**: 4 hours
  - GitHub Actions workflow
  - PR comment automation
  - Port-forwarding for tests

- **Testing & Validation**: 4 hours
  - Test namespace creation
  - Test cleanup process
  - Verify resource quotas

**Total: 16 hours**

---

## Database Reset Scripts

### Requirements

Database reset scripts must:
1. **Work in CI Environment**: No interactive prompts, idempotent
2. **Preserve Schema**: Drop data, keep tables and migrations
3. **Fast Execution**: Complete in <30 seconds
4. **Multi-Database Support**: PostgreSQL, Redis, ClickHouse
5. **Seed Test Data**: Optional flag to populate with fixtures

### PostgreSQL Reset Script

```bash
#!/bin/bash
# scripts/db/reset-postgres.sh

set -e

DATABASE_URL="${DATABASE_URL:-postgresql://nebula:nebula@localhost:4432/nebula}"
SEED_DATA="${SEED_DATA:-false}"

echo "🔄 Resetting PostgreSQL database..."

# Extract connection details
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's/.*@([^:]+).*/\1/')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's/.*:([0-9]+)\/.*/\1/')
DB_NAME=$(echo "$DATABASE_URL" | sed -E 's/.*\/([^?]+).*/\1/')
DB_USER=$(echo "$DATABASE_URL" | sed -E 's/.*\/\/([^:]+).*/\1/')
DB_PASSWORD=$(echo "$DATABASE_URL" | sed -E 's/.*:([^@]+)@.*/\1/')

export PGPASSWORD="$DB_PASSWORD"

# Terminate existing connections
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
  SELECT pg_terminate_backend(pg_stat_activity.pid)
  FROM pg_stat_activity
  WHERE pg_stat_activity.datname = '$DB_NAME'
    AND pid <> pg_backend_pid();
" 2>/dev/null || true

# Drop and recreate database
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

echo "✅ Database dropped and recreated"

# Run migrations
cd api
npm run migration:run

echo "✅ Migrations applied"

# Seed data if requested
if [ "$SEED_DATA" = "true" ]; then
  npm run seed
  echo "✅ Test data seeded"
fi

echo "🎉 PostgreSQL reset complete"
```

### Redis Reset Script

```bash
#!/bin/bash
# scripts/db/reset-redis.sh

set -e

REDIS_URL="${REDIS_URL:-redis://localhost:4379}"

echo "🔄 Resetting Redis cache..."

# Extract connection details
REDIS_HOST=$(echo "$REDIS_URL" | sed -E 's/.*@?([^:]+).*/\1/' | sed 's/redis:\/\///')
REDIS_PORT=$(echo "$REDIS_URL" | grep -oE ':[0-9]+$' | tr -d ':' || echo "6379")

# Flush all databases
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" FLUSHALL

echo "✅ All Redis databases flushed"
echo "🎉 Redis reset complete"
```

### ClickHouse Reset Script

```bash
#!/bin/bash
# scripts/db/reset-clickhouse.sh

set -e

CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-localhost}"
CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-4123}"
CLICKHOUSE_USER="${CLICKHOUSE_USER:-nebula}"
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-nebula}"
CLICKHOUSE_DATABASE="${CLICKHOUSE_DATABASE:-nebula_dns}"

echo "🔄 Resetting ClickHouse database..."

# ClickHouse client command
CH_CLIENT="clickhouse-client --host=$CLICKHOUSE_HOST --port=$CLICKHOUSE_PORT --user=$CLICKHOUSE_USER --password=$CLICKHOUSE_PASSWORD"

# Drop database and recreate
$CH_CLIENT --query="DROP DATABASE IF EXISTS $CLICKHOUSE_DATABASE"
$CH_CLIENT --query="CREATE DATABASE IF NOT EXISTS $CLICKHOUSE_DATABASE"

echo "✅ Database dropped and recreated"

# Re-run schema initialization (from ClickHouse service)
$CH_CLIENT --database=$CLICKHOUSE_DATABASE --multiquery < config/clickhouse/init-schema.sql

echo "✅ Schema initialized"
echo "🎉 ClickHouse reset complete"
```

### Master Reset Script

```bash
#!/bin/bash
# scripts/db/reset-all.sh

set -e

SEED_DATA="${SEED_DATA:-false}"

echo "🔄 Resetting all databases..."

# Run resets in parallel
bash scripts/db/reset-postgres.sh &
POSTGRES_PID=$!

bash scripts/db/reset-redis.sh &
REDIS_PID=$!

bash scripts/db/reset-clickhouse.sh &
CLICKHOUSE_PID=$!

# Wait for all to complete
wait $POSTGRES_PID
wait $REDIS_PID
wait $CLICKHOUSE_PID

echo "🎉 All databases reset complete"
```

### CI Integration

```yaml
# .github/workflows/ci.yml (add to existing workflow)

- name: Reset databases before tests
  run: bash scripts/db/reset-all.sh
  env:
    DATABASE_URL: postgresql://test:test@localhost:5432/nebula_test
    REDIS_URL: redis://localhost:6379
    CLICKHOUSE_HOST: localhost
    CLICKHOUSE_PORT: 8123

- name: Run API tests
  working-directory: ./api
  run: npm run test:integration
```

### Database Seed Data

**Test Fixtures Structure**:
```
api/test/fixtures/
├── tenants.json
├── users.json
├── policies.json
├── locations.json
├── lists.json
└── seed.ts
```

**Seed Script**:
```typescript
// api/test/fixtures/seed.ts

import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export async function seedTestData(dataSource: DataSource) {
  const fixturesDir = path.join(__dirname);

  // Seed in dependency order
  const seedOrder = [
    'tenants',
    'users',
    'policies',
    'locations',
    'lists'
  ];

  for (const entityName of seedOrder) {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(fixturesDir, `${entityName}.json`), 'utf-8')
    );

    await dataSource.query(
      `INSERT INTO ${entityName} (${Object.keys(fixture[0]).join(', ')}) VALUES ${
        fixture.map((row) =>
          `(${Object.values(row).map(v => `'${v}'`).join(', ')})`
        ).join(', ')
      } ON CONFLICT DO NOTHING`
    );

    console.log(`✅ Seeded ${fixture.length} ${entityName}`);
  }
}
```

### Testcontainers Integration

For Testcontainers-based tests, database reset is handled differently:

```typescript
// api/test/testcontainers-setup.ts

export class TestContainersManager {
  // ... (from earlier section)

  /**
   * Reset databases without destroying containers
   * Faster than stopping/starting containers
   */
  static async resetDatabases() {
    await Promise.all([
      this.resetPostgres(),
      this.resetRedis(),
      this.resetClickHouse()
    ]);
  }

  private static async resetPostgres() {
    const client = await this.postgres.getClient();
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    // Re-run migrations
  }

  private static async resetRedis() {
    const client = await this.redis.getClient();
    await client.flushAll();
  }

  private static async resetClickHouse() {
    const client = await this.clickhouse.getClient();
    await client.query({ query: 'DROP DATABASE IF EXISTS nebula_dns' });
    await client.query({ query: 'CREATE DATABASE nebula_dns' });
    // Re-run schema
  }
}
```

### Performance Optimization

**Strategies to Speed Up Resets**:

1. **Use Transactions for PostgreSQL**:
   ```sql
   BEGIN;
   TRUNCATE TABLE users CASCADE;
   TRUNCATE TABLE policies CASCADE;
   -- ... other tables
   COMMIT;
   ```

2. **Schema Snapshots** (for very fast resets):
   ```bash
   # Create snapshot after migrations
   pg_dump -h localhost -U nebula -d nebula -s -f schema-snapshot.sql

   # Restore from snapshot (faster than running migrations)
   psql -h localhost -U nebula -d nebula -f schema-snapshot.sql
   ```

3. **Redis RDB Snapshots**:
   ```bash
   # Save clean state
   redis-cli SAVE
   cp /var/lib/redis/dump.rdb /tmp/clean-state.rdb

   # Restore clean state
   redis-cli SHUTDOWN NOSAVE
   cp /tmp/clean-state.rdb /var/lib/redis/dump.rdb
   redis-server &
   ```

### Estimated Effort

- **Script Development**: 6 hours
  - PostgreSQL reset script
  - Redis reset script
  - ClickHouse reset script
  - Master reset script

- **Seed Data Fixtures**: 4 hours
  - Create JSON fixtures
  - Seed script with dependency ordering
  - Validation and testing

- **CI Integration**: 2 hours
  - Add reset steps to workflows
  - Test parallel execution
  - Verify timing (<30s goal)

- **Testcontainers Integration**: 3 hours
  - Reset methods for each database
  - Testing and optimization

**Total: 15 hours**

---

## Architecture Decisions

### Decision 1: Testcontainers vs. Docker Compose for Integration Tests

**Decision**: Use Testcontainers for API integration tests

**Rationale**:
- **Dynamic port mapping**: Avoids port conflicts in CI
- **Programmatic control**: Start/stop services from test code
- **Isolation**: Each test file can have its own containers
- **Cleanup**: Automatic container teardown
- **CI-friendly**: No need for `docker-compose.yml` in GitHub Actions

**Trade-offs**:
- **Slower startup**: Containers start for each test run (~10-20s overhead)
- **Docker dependency**: Requires Docker on developer machines and CI
- **Memory usage**: More containers = more memory in CI

**Mitigation**:
- Use container reuse for local development (`.withReuse()`)
- Cache Docker images in CI
- Run integration tests only on pre-commit, not on every save

---

### Decision 2: Playwright Full Parallelization vs. Sequential

**Decision**: Enable `fullyParallel: true` for all E2E tests

**Rationale**:
- **Speed**: 60 tests sequentially = ~30 minutes, parallel with 4 workers = ~8 minutes
- **CI efficiency**: Faster feedback loops
- **Real-world simulation**: Parallel tests expose race conditions

**Trade-offs**:
- **Test complexity**: Must ensure test independence
- **Flakiness risk**: Shared resources can cause intermittent failures
- **Debugging difficulty**: Harder to reproduce failures locally

**Mitigation**:
- Use Page Object Model for isolation
- Create test data with unique identifiers (timestamps, UUIDs)
- Implement retry logic (2 retries in CI)
- Record traces and videos for failed tests

---

### Decision 3: Ephemeral Namespaces - Per-PR vs. Per-Test-Run

**Decision**: Hybrid approach (per-PR for E2E, per-run for load tests)

**Rationale**:
- **E2E tests**: Developers need persistent environment for manual testing
- **Load tests**: Short-lived, high resource usage, no need for persistence
- **Cost efficiency**: Only keep namespaces alive when actively used

**Trade-offs**:
- **Complexity**: Two different namespace management strategies
- **Resource usage**: Long-lived PR namespaces consume more resources

**Mitigation**:
- 4-hour TTL after PR merge (aggressive cleanup)
- Resource quotas per namespace (prevent runaway usage)
- CronJob to clean up stale namespaces

---

### Decision 4: k6 Local Scripts vs. k6-Operator in Kubernetes

**Decision**: Use both - local scripts for development, k6-operator for staging

**Rationale**:
- **Local scripts**: Fast iteration, no cluster dependency
- **k6-operator**: Distributed load generation, test from within cluster
- **Staging**: Realistic network conditions, auto-scaling tests

**Trade-offs**:
- **Maintenance burden**: Two execution paths for same tests
- **Configuration drift**: Scripts might diverge

**Mitigation**:
- Share test scripts between local and k8s (ConfigMap mounts)
- CI runs both paths (local smoke test, k8s baseline)
- Document when to use each approach

---

### Decision 5: Database Reset - Full Drop/Recreate vs. TRUNCATE

**Decision**: Full drop/recreate for CI, TRUNCATE for local development

**Rationale**:
- **CI**: Clean slate guarantees no state pollution
- **Local**: Faster iteration, preserve schema
- **Migrations**: Full drop/recreate tests migration correctness

**Trade-offs**:
- **Speed**: Drop/recreate is slower (~10s vs ~2s)
- **Two code paths**: More complexity

**Mitigation**:
- Environment variable toggles strategy (CI vs. local)
- Document when to use each approach
- Default to safe option (drop/recreate)

---

## Implementation Complexity

### Complexity Matrix

| Task | Complexity | Effort | Risk | Dependencies |
|------|-----------|--------|------|--------------|
| Testcontainers Setup | Medium | 14h | Low | Docker, Node.js |
| Playwright Expansion | High | 44h | Medium | UI features complete |
| k6 Load Testing | Medium | 36h | Medium | DOKS staging cluster |
| Ephemeral Namespaces | Medium | 16h | Medium | Kubernetes, RBAC |
| Database Reset Scripts | Low | 15h | Low | DB access, migrations |

**Total Estimated Effort**: 125 hours (~3 weeks for 1 developer)

### Risk Assessment

**High Risks**:
1. **Playwright test flakiness** (parallel execution)
   - **Mitigation**: Extensive use of auto-waiting, retry logic, trace recording
   - **Contingency**: Fall back to sequential execution if >10% flakiness

2. **DOKS staging resource costs** (ephemeral namespaces)
   - **Mitigation**: Aggressive cleanup, resource quotas, spot instances
   - **Contingency**: Reduce max concurrent namespaces from 10 to 5

**Medium Risks**:
1. **Testcontainers CI performance** (slow container startup)
   - **Mitigation**: Docker layer caching, parallel container starts
   - **Contingency**: Use GitHub Actions services instead

2. **k6 baseline variability** (network inconsistency)
   - **Mitigation**: Run tests multiple times, use percentiles (p95, p99)
   - **Contingency**: Widen thresholds to account for variability

**Low Risks**:
1. **Database reset script failures**
   - **Mitigation**: Extensive error handling, idempotent operations
   - **Contingency**: Manual database reset procedures documented

### Dependencies

**External Dependencies**:
- Docker (for Testcontainers) - Installed on developer machines and CI
- DOKS staging cluster - Already provisioned in Phase 24
- DigitalOcean Container Registry - For storing test images
- k6 Cloud (optional) - For advanced load testing features

**Internal Dependencies**:
- Phase 27 complete: Control plane deployed (API + UI must be accessible)
- Database migrations: All migrations must be idempotent
- Helm charts: Must support dynamic namespace injection

### Phasing Plan

**Phase 28.1: Foundation (Week 1)**
- ✅ Testcontainers setup and basic integration tests
- ✅ Database reset scripts (all 3 databases)
- ✅ CI pipeline updates for Testcontainers

**Phase 28.2: E2E Expansion (Week 2)**
- ✅ Playwright configuration improvements
- ✅ Page Object Model refactoring
- ✅ 20 new E2E test specs (Admin UI, Security)

**Phase 28.3: Advanced Testing (Week 3)**
- ✅ 26 additional E2E specs (Advanced Features, Edge Cases)
- ✅ k6-operator setup and baseline testing
- ✅ Ephemeral namespace creation and cleanup

**Phase 28.4: Validation & Documentation (Week 4)**
- ✅ End-to-end testing of entire test infrastructure
- ✅ Performance tuning (container startup, parallel tests)
- ✅ Documentation and runbook creation

---

## Sources

### Testcontainers Research
- [Testcontainers Best Practices | Docker](https://www.docker.com/blog/testcontainers-best-practices/)
- [NestJS integration testing with Testcontainers](https://www.blockydevs.com/blog/nestjs-integration-testing-with-testcontainers)
- [Testcontainers Best Practices for .NET Integration Testing](https://www.milanjovanovic.tech/blog/testcontainers-best-practices-dotnet-integration-testing)
- [GitHub - andredesousa/nest-postgres-testcontainers](https://github.com/andredesousa/nest-postgres-testcontainers)
- [Supercharge Your Integration Tests for NestJS Application with Testcontainers](https://medium.com/@umakantabehera/supercharge-your-integration-tests-for-nestjs-application-with-testcontainers-751e66119814)
- [How to Configure Integration Testing with Testcontainers](https://oneuptime.com/blog/post/2026-01-25-integration-testing-testcontainers/view)
- [Isolated Test Environments with Testcontainer - Yarsa DevBlog](https://blog.yarsalabs.com/isolating-test-environments-with-testcontainers-in-nodejs/)
- [Simplifying Node.js/Typescript Application Testing by Using Testcontainers](https://www.atomicjar.com/2023/07/testing-nodejs-typescript-app-using-testcontainers/)
- [Testcontainers ClickHouse Module](https://testcontainers.com/modules/clickhouse/)
- [ClickHouse - Testcontainers for NodeJS](https://node.testcontainers.org/modules/clickhouse/)

### Playwright Research
- [Parallelism | Playwright](https://playwright.dev/docs/test-parallel)
- [How to run Playwright tests in parallel - Checkly Docs](https://www.checklyhq.com/docs/learn/playwright/testing-in-parallel/)
- [How to Writing Scalable Playwright Test Scripts in 2026](https://www.browserstack.com/guide/playwright-scripts)
- [How to Run Playwright Tests in Parallel](https://www.browserstack.com/guide/playwright-parallel-test)
- [Configuration | Playwright](https://playwright.dev/docs/test-configuration)
- [Mastering Parallelism in Playwright Test for Faster QA](https://www.qable.io/blog/mastering-parallelism-playwright-test-configuration-examples)
- [Best Practices | Playwright](https://playwright.dev/docs/best-practices)

### k6 Load Testing Research
- [Running distributed tests | Grafana k6 documentation](https://grafana.com/docs/k6/latest/testing-guides/running-distributed-tests/)
- [An Introduction to Distributed Load Testing with k6 on Kubernetes](https://medium.com/neural-engineer/an-introduction-to-distributed-load-testing-with-k6-on-kubernetes-ba7fc87299c5)
- [K6 Performance Testing with Kubernetes & CI/CD](https://www.testrigtechnologies.com/k6-performance-testing-scalable-load-testing-with-kubernetes-and-ci-cd-integration/)
- [Load testing with k6 and k8s](https://www.toucantoco.com/en/tech-blog/tech-blog/load-testing-with-k6-and-k8s)
- [k6 Load Testing in Kubernetes with Testkube](https://testkube.io/blog/load-testing-in-kubernetes-with-k6-and-testkube)
- [GitHub - grafana/k6-operator](https://github.com/grafana/k6-operator)

### Ephemeral Environments Research
- [Ephemeral Environment Testing in Kubernetes](https://testkube.io/use-cases/ephemeral-clusters)
- [Guide to Ephemeral Environments in Kubernetes](https://www.signadot.com/guide-to-ephemeral-environments-kubernetes)
- [Ephemeral Environments for Cost-Effective and Reliable CI/CD Pipelines with Kubernetes](https://seifrajhi.github.io/blog/ephemeral-environments-kubernetes-cicd/)
- [Ephemeral Environments: How Testkube Unleashes Their Power](https://testkube.io/learn/what-are-ephemeral-environments-testkube-guide)
- [Ephemeral Environments for CI/CD (GitOps) Pipelines](https://medium.com/@bunnyshell/ephemeral-environments-for-ci-cd-gitops-pipelines-5b20a00f4ed0)
- [Ephemeral Kubernetes environments on CI/CD systems](https://medium.com/@k8spin/ephemeral-kubernetes-environments-on-ci-cd-systems-3df936a67666)
- [Kubernetes Ephemeral Environments: Cost, Setup & Best Practices](https://devtron.ai/blog/unlocking-the-power-of-ephemeral-environments-with-devtron/)
- [Ephemeral Kubernetes Environments on CI/CD Systems with vCluster](https://www.vcluster.com/blog/ephemeral-kubernetes-environments-on-ci-cd-systems-with-vcluster)

---

## Next Steps for Planning

Before writing the implementation plan (28-01-PLAN.md), you should:

1. **Review Current Test Coverage**
   - Audit existing unit tests for gaps
   - Identify critical paths not covered by current E2E tests
   - Document any flaky tests that need fixing

2. **Validate DOKS Staging Access**
   - Confirm kubectl access to staging cluster
   - Verify RBAC permissions for namespace creation
   - Check available resources (CPU, memory, storage quotas)

3. **Clarify Performance Targets**
   - Define SLAs for API response times
   - Set DNS query latency goals
   - Determine acceptable error rates

4. **Plan Test Data Strategy**
   - Design seed data fixtures
   - Document test user personas
   - Plan for multi-tenant test scenarios

5. **Review Budget for Test Infrastructure**
   - Confirm DigitalOcean budget for ephemeral namespaces
   - Approve estimated monthly costs (~$900)
   - Plan for cost monitoring and alerts

---

**Research Complete**: This document provides comprehensive information to plan Phase 28 implementation.
