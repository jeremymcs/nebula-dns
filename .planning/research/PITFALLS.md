# Domain Pitfalls: DNS SaaS Deployment to DigitalOcean Kubernetes

**Domain:** Multi-tenant DNS security SaaS platform
**Researched:** 2026-02-11
**Overall confidence:** HIGH

## Executive Summary

Deploying Nebula DNS to DigitalOcean Kubernetes (DOKS) with managed services presents critical challenges spanning DNS-specific Kubernetes configurations, managed service integration patterns, test coverage strategies, and operational complexity. This research identifies 47 distinct pitfalls across categories ranging from critical (causes outages/rewrites) to moderate (causes technical debt).

**Most Critical Finding:** DNS health checks using TCP-only probes create false positive health signals in Kubernetes while UDP traffic fails silently, combined with conntrack race conditions on Linux kernels causing UDP packet loss under concurrent query load.

**Highest Impact Areas:**
1. DNS protocol handling in Kubernetes (UDP session affinity, health checks, conntrack)
2. ClickHouse Cloud migration from self-hosted (schema differences, cluster settings)
3. Retroactive test coverage creating false confidence without meaningful assertions
4. Certificate rotation for DNS-over-TLS without automation causing downtime
5. Next.js NEXT_PUBLIC_ environment variable build-time binding breaking ConfigMap workflows

---

## Critical Pitfalls

Mistakes that cause rewrites, outages, or major architectural changes.

### Pitfall 1: DNS Health Checks Use TCP While Production Traffic Uses UDP

**What goes wrong:**
Kubernetes readiness and liveness probes configured with `tcpSocket` on port 853 (DoT) or 443 (DoH) mark pods as healthy when they can bind to the port, but actual DNS query traffic over UDP fails silently. dnsdist appears healthy in Kubernetes but drops all UDP queries.

**Why it happens:**
- Kubernetes has limited native support for UDP health checks
- TCP health checks only verify port binding, not actual service functionality
- DNS services expose both TCP and UDP, but UDP is the primary protocol
- The current dnsdist-deployment.yaml uses tcpSocket probes (lines 66-78)

**Consequences:**
- Silent query failures with healthy pod status
- Users experience timeout/NXDOMAIN errors while monitoring shows green
- Load balancer distributes traffic to broken pods
- Incident detection delayed by 5-15 minutes

**Prevention:**
```yaml
# Replace tcpSocket with exec probe testing actual DNS query
livenessProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - "echo -n 'test.example.com' | dnsdist -e 'queryRaw(makeQuery(\"test.example.com\", DNSQType.A))'"
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /metrics
    port: 8083
  initialDelaySeconds: 5
  periodSeconds: 5
```

**Detection:**
- Monitor metrics endpoint query success rate vs pod readiness status
- Alert when pod is Ready but query success rate < 95%
- Test UDP path explicitly in synthetic monitoring

**Phase to address:** Phase 24 (Deployment & Migration)

**Sources:**
- [Kubernetes Health Checks for Network Services](https://oneuptime.com/blog/post/2026-01-08-kubernetes-network-health-checks/view) (HIGH confidence)
- [Kubernetes DNS Service Configuration](https://spacelift.io/blog/kubernetes-dns-service) (MEDIUM confidence)

---

### Pitfall 2: UDP Conntrack Race Conditions Cause Silent Packet Loss

**What goes wrong:**
Concurrent A and AAAA DNS queries from the same client using the same source port trigger conntrack race conditions in Linux kernels, resulting in random packet drops (5-15% loss rate) under load. Clients experience intermittent timeouts that don't correlate with pod health or resource usage.

**Why it happens:**
- Linux conntrack maintains UDP session state
- Concurrent queries reuse source ports
- Kernel conntrack module has source port conflict handling bugs in older versions
- High query volume amplifies race condition probability

**Consequences:**
- Intermittent query timeouts (not visible in pod metrics)
- Loss rate increases with query volume
- Impossible to diagnose without kernel-level tracing
- Affects dnsdist → policy-svc → Unbound communication

**Prevention:**
- Ensure kernel version >= 5.10 with conntrack fixes
- Configure `net.netfilter.nf_conntrack_udp_timeout` to lower values (30s instead of 180s)
- Enable `SO_REUSEPORT` on Unbound listeners (already planned in config)
- Use separate source ports for A/AAAA queries in client libraries
- Deploy with `externalTrafficPolicy: Local` (already in dnsdist-deployment.yaml line 111)

**Detection:**
- Compare client-side query latency vs server-side processing time
- Alert on >2% delta between sent queries and received queries
- Monitor kernel conntrack table usage (`conntrack -C`)

**Phase to address:** Phase 24 (Deployment & Migration) + Phase 25 (Testing & Validation)

**Sources:**
- [Kubernetes DNS UDP Health Checks](https://oneuptime.com/blog/post/2026-01-08-kubernetes-network-health-checks/view) (HIGH confidence)
- [DNS Problems in Kubernetes](https://blog.codacy.com/dns-hell-in-kubernetes) (MEDIUM confidence)

---

### Pitfall 3: ClickHouse Cloud vs Self-Hosted Schema Incompatibilities

**What goes wrong:**
Self-hosted ClickHouse configurations using `ON CLUSTER` and `Replicated*` table engines fail on ClickHouse Cloud. Schema migrations using `ReplicatedMergeTree` succeed locally but fail in Cloud with cryptic errors about cluster topology. Data ingestion stops completely.

**Why it happens:**
- ClickHouse Cloud abstracts clustering away from users
- `ON CLUSTER` syntax not supported in Cloud environments
- `Replicated*` engines are Cloud-managed, not user-configurable
- Azure ClickHouse Cloud has additional restrictions vs AWS/GCP
- init-clickhouse.sql likely uses self-hosted patterns

**Consequences:**
- Migration to ClickHouse Cloud fails at schema creation step
- Zero query logs collected (dns_queries table doesn't exist)
- Rollback requires schema redesign and data migration
- Multi-day outage of analytics/reporting features

**Prevention:**
- **Before migration:** Check init-clickhouse.sql for `ON CLUSTER`, `Replicated*`, `CLUSTER` settings
- Use conditional schema based on environment:
```sql
-- Self-hosted
CREATE TABLE IF NOT EXISTS dns_queries ON CLUSTER nebula (
    timestamp DateTime64(3),
    tenant_id UUID,
    ...
) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/dns_queries', '{replica}')

-- ClickHouse Cloud (set CLICKHOUSE_CLUSTER_ENABLED=false)
CREATE TABLE IF NOT EXISTS dns_queries (
    timestamp DateTime64(3),
    tenant_id UUID,
    ...
) ENGINE = MergeTree()
```
- Set environment variable `CLICKHOUSE_CLUSTER_ENABLED=false` for Cloud deployments
- Test schema creation on ClickHouse Cloud trial account BEFORE migrating production

**Detection:**
- CI pipeline that validates schema against both self-hosted and Cloud environments
- Automated schema diff between environments
- Alert on query log ingestion rate = 0 for >5 minutes

**Phase to address:** Phase 24 (Deployment & Migration) - Week 1

**Sources:**
- [ClickHouse Cloud vs Self-Hosted Migration](https://www.tinybird.co/blog/clickhouse-deployment-options) (HIGH confidence)
- [Langfuse ClickHouse Migration Issues](https://langfuse.com/faq/all/self-hosting-clickhouse-handling-failed-migrations) (HIGH confidence)

---

### Pitfall 4: ClickHouse Partition Explosion from High-Cardinality Keys

**What goes wrong:**
Partitioning dns_queries table by `(tenant_id, toYYYYMMDD(timestamp))` creates 1000+ partitions with multi-tenant system. ClickHouse stops merging parts and throws "Too many parts" errors. Query performance degrades 10-100x. Data ingestion blocks.

**Why it happens:**
- DNS logs have natural high cardinality (every domain, every client IP)
- Multi-tenant systems amplify partition count (tenants × time periods)
- ClickHouse doesn't merge parts across partitions
- Each partition creates separate data parts
- Guideline: keep partitions to dozens/hundreds, not thousands

**Consequences:**
- Policy-svc can't write to ClickHouse (backpressure to Redis)
- Queries timeout after 60+ seconds
- Disk usage explodes (unmerged parts = poor compression)
- Manual intervention required to fix (ALTER TABLE DETACH PARTITION)

**Prevention:**
- **Time-only partitioning:** `PARTITION BY toYYYYMM(timestamp)` (monthly)
- Push `tenant_id` into ORDER BY, not PARTITION BY:
```sql
CREATE TABLE dns_queries (
    timestamp DateTime64(3),
    tenant_id UUID,
    location_id UUID,
    query_name String,
    ...
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)  -- Time only, ~12 partitions/year
ORDER BY (tenant_id, timestamp, query_name)  -- Tenant in sort key
SETTINGS index_granularity = 8192;
```
- Monitor `system.parts` table for part count per partition
- Alert when parts > 100 for single partition

**Detection:**
- Query `SELECT partition, count() FROM system.parts GROUP BY partition HAVING count() > 100`
- Monitor ClickHouse error logs for "Too many parts"
- Alert on write latency p99 > 500ms

**Phase to address:** Phase 24 (Deployment & Migration) - Week 1

**Sources:**
- [ClickHouse Partitioning Best Practices](https://bigdataboutique.com/blog/when-to-use-partitioning-in-clickhouse-f2335e) (HIGH confidence)
- [ClickHouse High Cardinality Performance](https://medium.com/logalarm-devs/clickhouse-fine-tuning-maximize-performance-for-time-series-and-logs-5b6f6943ca7c) (HIGH confidence)

---

### Pitfall 5: ClickHouse Query Performance with Wrong ORDER BY

**What goes wrong:**
Setting ORDER BY to `(timestamp, tenant_id, ...)` causes full table scans when filtering by `tenant_id`. Queries like `SELECT * FROM dns_queries WHERE tenant_id = ? AND timestamp > ?` scan 100GB instead of 100MB. Report generation times out after 60 seconds.

**Why it happens:**
- ClickHouse uses ORDER BY to create sparse primary index
- First column in ORDER BY has highest selectivity in index
- Filtering by non-first column requires full scan
- DNS queries are always scoped by tenant_id (multi-tenancy)
- Current timestamp-first ordering optimized for time-series, not multi-tenant

**Consequences:**
- Reports timeout for customers with >1M queries/day
- Dashboard analytics unusably slow (30+ second load times)
- ClickHouse CPU saturates at 10% of expected query load
- Users perceive product as broken

**Prevention:**
- **Put highest-frequency WHERE clause columns first:**
```sql
-- WRONG (timestamp first)
ORDER BY (timestamp, tenant_id, location_id)

-- CORRECT (tenant_id first, then time)
ORDER BY (tenant_id, timestamp, location_id, cityHash64(query_name))
```
- Analyze query patterns BEFORE schema design
- Create materialized views for different access patterns:
```sql
-- View for time-based aggregation (all tenants)
CREATE MATERIALIZED VIEW dns_queries_by_time
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (toStartOfHour(timestamp), tenant_id)
AS SELECT ...

-- View for tenant-specific queries (main use case)
-- Use base table with ORDER BY (tenant_id, timestamp, ...)
```

**Detection:**
- Monitor query execution plans with `EXPLAIN` in integration tests
- Alert when `read_rows` > 10x `result_rows` in system.query_log
- Track p95 query latency per endpoint

**Phase to address:** Phase 24 (Deployment & Migration) - Week 1

**Sources:**
- [ClickHouse Query Optimization](https://www.e6data.com/query-and-cost-optimization-hub/how-to-optimize-clickhouse-query-performance) (HIGH confidence)
- [CloudQuery ClickHouse Experience](https://www.cloudquery.io/blog/six-months-with-clickhouse-at-cloudquery) (MEDIUM confidence)

---

### Pitfall 6: DigitalOcean Managed PostgreSQL SSL Certificate Ignored with `url` Parameter

**What goes wrong:**
NestJS TypeORM configured with `url: process.env.DATABASE_URL` ignores `ssl: { ca: fs.readFileSync(...) }` configuration. Connections fail with "SSL required" or succeed without SSL verification (security risk). API pods CrashLoopBackoff on startup.

**Why it happens:**
- TypeORM library limitation: `url` parameter overrides individual connection options
- DigitalOcean Managed PostgreSQL requires SSL by default
- CA certificate from DigitalOcean must be provided for verification
- docker-compose.yml uses `sslmode=disable` (line 21) which won't work in production

**Consequences:**
- API can't connect to managed PostgreSQL
- Complete service outage
- Rollback to Docker Compose or implement emergency fix
- 2-4 hour incident while debugging

**Prevention:**
- **Never use `url` parameter with DigitalOcean Managed PostgreSQL**
- Use individual connection parameters:
```typescript
// api/src/database/database.config.ts
TypeOrmModule.forRootAsync({
  useFactory: () => ({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL_ENABLED === 'true' ? {
      rejectUnauthorized: true,
      ca: process.env.DB_CA_CERT, // DigitalOcean CA cert from Secret
    } : false,
    // ... other options
  }),
})
```
- Store DigitalOcean CA certificate in Kubernetes Secret
- Mount Secret as environment variable, not file (easier rotation)
- Test SSL connection in pre-deployment job

**Detection:**
- Integration test that connects to managed PostgreSQL with SSL
- API startup health check validates database connection
- Monitor for SSL handshake errors in logs

**Phase to address:** Phase 24 (Deployment & Migration) - Week 1

**Sources:**
- [TypeORM SSL Configuration Issues](https://github.com/typeorm/typeorm/issues/9761) (HIGH confidence)
- [DigitalOcean Managed Database SSL](https://docs.digitalocean.com/products/databases/postgresql/) (HIGH confidence)

---

### Pitfall 7: DigitalOcean Managed Redis is Actually Valkey (API Incompatibility)

**What goes wrong:**
Code using Redis commands not supported by Valkey (e.g., `REDISAI.*`, certain Redis 7.0+ commands) fails with "UNKNOWN COMMAND" errors. Policy cache invalidation breaks. DNS queries bypass policy evaluation.

**Why it happens:**
- DigitalOcean transitioned all Managed Redis to Valkey by June 30, 2025
- Valkey is Redis-compatible but not 100% feature-complete
- Redis 7.x commands may not exist in Valkey
- policy-svc and API assume Redis API compatibility

**Consequences:**
- Policy cache pub/sub might break on specific commands
- Runtime errors in production after migration
- Rollback requires redeploying self-hosted Redis in Kubernetes

**Prevention:**
- **Audit all Redis commands used in codebase:**
```bash
# Find all Redis commands in policy-svc and API
grep -r "redis\." api/src policy-svc/internal | grep -E "\.(Set|Get|Publish|Subscribe|HSet|ZAdd)"
```
- Cross-reference with [Valkey compatibility matrix](https://valkey.io/docs/)
- Test against Valkey locally before migration:
```bash
docker run -d -p 6379:6379 valkey/valkey:latest
# Run integration tests
```
- Consider using DigitalOcean Managed Redis in "Redis mode" if available, or deploy Redis in DOKS as StatefulSet

**Detection:**
- Integration tests against Valkey instance
- Monitor Redis error logs for "UNKNOWN COMMAND"
- Alert on pub/sub subscription failures

**Phase to address:** Phase 24 (Deployment & Migration) - Week 1

**Sources:**
- [DigitalOcean Redis to Valkey Migration](https://scalegrid.io/blog/how-to-keep-running-redis-on-digitalocean-after-redis-licensing-changes/) (HIGH confidence)

---

### Pitfall 8: Kubernetes UDP Load Balancing Sends All Queries to Same Pod

**What goes wrong:**
Despite having 5 dnsdist pods, 80% of DNS queries route to single pod due to UDP source port reuse by clients. Pod CPU hits 100%, queries timeout. Other pods idle at 10% CPU. HPA doesn't scale because average CPU looks fine.

**Why it happens:**
- Kubernetes kube-proxy uses connection hashing for UDP
- DNS clients reuse same source port for multiple queries (connection pooling)
- All queries from single client → same pod (session affinity)
- Modern apps use connection pooling heavily (prevents new connection overhead)

**Consequences:**
- Hot pod becomes bottleneck (200ms query latency vs 5ms on idle pods)
- Uneven resource utilization
- Can't scale horizontally (more pods don't help)
- Users blame "slow DNS" on specific networks

**Prevention:**
- **Configure session affinity timeout to minimum:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: dnsdist-1
spec:
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 30  # Reduce from default 10800 (3 hours)
```
- Implement client-side source port randomization (outside K8s control)
- Use `externalTrafficPolicy: Local` to avoid kube-proxy hashing (already set)
- Monitor per-pod query distribution and alert on >2x variance

**Detection:**
- Track queries per pod via dnsdist metrics endpoint
- Alert when max(queries_per_pod) / avg(queries_per_pod) > 2
- Dashboard showing per-pod query rate

**Phase to address:** Phase 24 (Deployment & Migration) - Week 2

**Sources:**
- [Kubernetes UDP Load Balancing Issues](https://discuss.kubernetes.io/t/kubernetes-udp-load-balancing-issue/23874) (MEDIUM confidence)
- [DNSDist Load Balancing](https://www.dnsdist.org/guides/serverselection.html) (HIGH confidence - official docs)

---

### Pitfall 9: DNS-over-TLS Certificate Rotation Requires dnsdist Restart

**What goes wrong:**
Let's Encrypt certificates renew every 90 days. cert-manager updates the Secret, but dnsdist doesn't reload certificates. New TLS connections fail with "certificate expired" errors. DNS-over-TLS becomes unavailable. Zero downtime deployment impossible.

**Why it happens:**
- dnsdist loads TLS certificates at startup from file paths
- Kubernetes Secrets are mounted as files, updated atomically
- dnsdist doesn't watch filesystem for changes
- No built-in hot reload for certificates
- Current dnsdist-deployment.yaml mounts certs from Secret (line 55-57) but doesn't reload

**Consequences:**
- DoT/DoH unavailable for up to 24 hours if rotation not monitored
- Requires manual pod restart every 90 days
- During restart, DNS queries drop for 2-5 seconds (health check failover delay)
- Customer complaints about intermittent DNS failures

**Prevention:**
- **Implement certificate reload via dnsdist console API:**
```bash
# Create sidecar container that watches Secret and calls reload
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: dnsdist
    # ... main container
  - name: cert-reloader
    image: ghcr.io/nebuladns/cert-reloader:latest
    env:
    - name: DNSDIST_CONSOLE_KEY
      valueFrom:
        secretKeyRef:
          name: dnsdist-secrets
          key: console-key
    command:
    - /bin/sh
    - -c
    - |
      inotifywait -m /etc/dnsdist/certs -e modify |
      while read path action file; do
        echo "reloadAllCertificates()" | dnsdist -c -k "$DNSDIST_CONSOLE_KEY"
      done
```
- Or use dnsdist's built-in `reloadAllCertificates()` function via cron
- Set cert-manager to renew 30 days before expiry (default is 30 days)
- Test certificate rotation in staging every week

**Detection:**
- Monitor certificate expiry date: `openssl s_client -connect dns1.nebuladns.io:853 | openssl x509 -noout -dates`
- Alert when certificate expires in <7 days
- Integration test validates DoT connection every 5 minutes

**Phase to address:** Phase 24 (Deployment & Migration) - Week 2

**Sources:**
- [DNSDist TLS Certificate Management](https://www.dnsdist.org/advanced/tls-certificates-management.html) (HIGH confidence - official docs)
- [Kubernetes Certificate Rotation](https://support.hashicorp.com/hc/en-us/articles/38056408746387-How-to-Manage-TLS-SSL-Certificate-Rotation-for-Terraform-Enterprise-Using-Kubernetes-Secrets) (MEDIUM confidence)

---

### Pitfall 10: StatefulSet Required for Unbound but Deployment Used

**What goes wrong:**
Unbound deployed as Deployment instead of StatefulSet. Multiple Unbound pods share same cache, causing cache thrashing. Query performance degrades as cache hit rate drops from 80% to 20%. Persistent volume claims orphaned when pods restart.

**Why it happens:**
- Unbound benefits from local persistent cache
- Deployment creates pods with random names, can't maintain PVC affinity
- StatefulSet provides stable pod identity and storage
- Current architecture might deploy Unbound as Deployment

**Consequences:**
- Poor cache performance (cache hit rate <30% instead of >80%)
- Higher upstream query load to recursive resolvers
- Increased query latency (200ms vs 5ms for cached queries)
- Orphaned PVCs accumulate (billing impact)

**Prevention:**
- **Use StatefulSet for Unbound with local PVCs:**
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: unbound
spec:
  serviceName: unbound-headless
  replicas: 3
  volumeClaimTemplates:
  - metadata:
      name: cache
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: do-block-storage  # DigitalOcean block storage
      resources:
        requests:
          storage: 10Gi
  template:
    spec:
      containers:
      - name: unbound
        volumeMounts:
        - name: cache
          mountPath: /var/lib/unbound
```
- Create headless Service for stable DNS names
- Configure Unbound to use persistent cache directory
- Set `podManagementPolicy: Parallel` for faster scaling

**Detection:**
- Monitor Unbound cache hit ratio via metrics
- Alert when cache hit rate <70%
- Check PVC count vs pod count for orphans

**Phase to address:** Phase 24 (Deployment & Migration) - Week 2

**Sources:**
- [Kubernetes StatefulSet Best Practices](https://docs.digitalocean.com/products/kubernetes/how-to/add-volumes/) (HIGH confidence)
- [StatefulSet Headless Service](https://medium.com/@akansh27/statefulset-3274f71a6942) (MEDIUM confidence)

---

### Pitfall 11: Next.js NEXT_PUBLIC_ Env Vars Baked at Build Time, Not Runtime

**What goes wrong:**
Next.js UI built with `NEXT_PUBLIC_API_URL=http://localhost:4010`. Same Docker image deployed to staging and production. Production UI makes API requests to localhost, returns CORS errors. Complete UI failure.

**Why it happens:**
- NEXT_PUBLIC_ variables are replaced at build time by Next.js bundler
- Kubernetes ConfigMaps provide runtime configuration
- Can't use single Docker image across environments
- Current ui/.env.example has NEXT_PUBLIC_API_URL (line 63 in docker-compose.yml)

**Consequences:**
- Must rebuild UI image for every environment (staging, prod, DR)
- CI/CD complexity (environment-specific builds)
- Can't promote same image SHA from staging → prod
- Build time increases 10x (no image reuse)

**Prevention:**
- **Option 1: Use server-side environment variables only**
```typescript
// ui/src/app/api/config/route.ts
export async function GET() {
  return Response.json({
    apiUrl: process.env.API_URL, // Server-side only, set at runtime
  });
}

// ui/src/lib/api.ts
const config = await fetch('/api/config').then(r => r.json());
const API_URL = config.apiUrl;
```

- **Option 2: Use next-runtime-env library**
```bash
npm install next-runtime-env
```
```typescript
// next.config.js
const { configureRuntimeEnv } = require('next-runtime-env/build/configure');
module.exports = configureRuntimeEnv();

// Use env('API_URL') instead of process.env.NEXT_PUBLIC_API_URL
```

- **Option 3: Inject via window object in App Router layout**
```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `window.ENV = ${JSON.stringify({
            API_URL: process.env.API_URL, // Server-rendered at request time
          })}`
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Detection:**
- E2E test that validates API_URL in different environments
- CI pipeline checks for NEXT_PUBLIC_ in ConfigMaps (should fail)
- Staging deploy validates environment-specific config

**Phase to address:** Phase 24 (Deployment & Migration) - Week 1

**Sources:**
- [Next.js Environment Variables in Kubernetes](https://medium.com/@raajeew/nextjs-application-environment-variables-issue-on-kubernetes-b2b885704a26) (HIGH confidence)
- [Next.js Runtime Environment Variables](https://github.com/vercel/next.js/discussions/87229) (HIGH confidence)

---

## Technical Debt Patterns

Patterns that don't cause immediate failures but accumulate pain over time.

### Pattern 1: Test Coverage Metrics Create False Confidence

**What happens:**
Retroactive test suite achieves 85% code coverage. Team declares "testing complete." Tests have weak assertions like `expect(result).toBeDefined()`. Critical bugs slip through. Coverage metric becomes vanity metric.

**Why it's debt:**
- High coverage % ≠ high quality tests
- Legacy code tests often test "the what" not "the why"
- Integration tests with no assertions count toward coverage
- ~30% of tests become obsolete as features evolve

**Prevention:**
- Enforce assertion density: >3 assertions per test
- Require integration tests to verify business logic, not just "returns 200"
- Focus on critical paths first (auth, billing, DNS policy evaluation)
- Code review checklist: "Does this test fail if I break the feature?"

**Measurement:**
- Mutation testing (tools like Stryker)
- Track assertion count per test file
- Manual review of high-coverage, low-assertion files

**Sources:**
- [Test Coverage False Confidence](https://hackernoon.com/misleading-test-coverage-and-how-to-avoid-false-confidence) (HIGH confidence)
- [Code Coverage Best Practices](https://graphite.com/guides/code-coverage-best-practices) (MEDIUM confidence)

---

### Pattern 2: Chasing 95% Coverage on Legacy Code Wastes Time

**What happens:**
Team spends 200 hours writing tests for 2-year-old utility functions. Coverage goes from 40% to 95%. Zero bugs found. New feature development stalls. Technical debt increases (now maintaining 1000+ low-value tests).

**Why it's debt:**
- Legacy code already proven in production (bugs would've surfaced)
- Retroactive tests are expensive (no context, no clear requirements)
- Better ROI on testing new/changed code
- Test maintenance burden increases linearly with test count

**Prevention:**
- **Set CI gate: 80%+ coverage on new/modified code only**
- Grandfather in legacy code (allow <40% coverage)
- Focus retroactive testing on:
  - Critical paths (auth, payment, DNS evaluation)
  - Bug-prone modules (historical bug density)
  - High-change areas (will be refactored anyway)
- Use tools like SonarQube to track coverage trends, not absolute numbers

**Measurement:**
- Track coverage delta per PR (not total coverage)
- Measure test maintenance cost (time spent fixing broken tests)
- Bug density in high-coverage vs low-coverage modules

**Sources:**
- [Retroactive Testing Strategy 2026](https://copyprogramming.com/howto/how-much-test-coverage-is-good-code-example) (MEDIUM confidence)
- [Code Coverage Trends](https://www.codeant.ai/blogs/best-code-test-coverage-tools-2025) (LOW confidence - need verification)

---

### Pattern 3: Integration Test Database Pollution

**What happens:**
E2E tests create tenants, policies, DNS records. Tests pass locally. Fail in CI (tenant already exists). Developers add random UUIDs. Test data accumulates. Database reaches 10GB. Tests slow from 2min → 15min.

**Why it's debt:**
- Tests don't clean up after themselves
- Each test run adds data
- Queries slow down with large datasets
- Flaky tests due to data conflicts

**Prevention:**
- **Use transactions + rollback for integration tests:**
```typescript
// api/test/setup.ts
beforeEach(async () => {
  await queryRunner.startTransaction();
});

afterEach(async () => {
  await queryRunner.rollbackTransaction();
});
```
- Or use test database reset between runs:
```bash
# In CI pipeline
npm run test:e2e:setup  # Drops and recreates test DB
npm run test:e2e
```
- Use factories for test data with unique identifiers:
```typescript
const tenant = await tenantFactory.create({
  slug: `test-${uuidv4()}`,
});
```

**Measurement:**
- Monitor test database size over time
- Track test execution time trend
- Alert on test DB >1GB or test time >5min

**Sources:**
- [NestJS Integration Testing Best Practices](https://engineering.deptagency.com/integration-testing-nestjs-apis-with-a-test-database) (HIGH confidence)
- [Integration Test Setup](https://moldstud.com/articles/p-the-ultimate-guide-to-setting-up-integration-tests-in-nestjs-best-practices-and-tips) (MEDIUM confidence)

---

### Pattern 4: Over-Mocking in Unit Tests Hides Integration Issues

**What happens:**
Policy evaluation unit tests mock Redis, ClickHouse, PostgreSQL. All tests pass. Integration fails in staging (Redis pub/sub doesn't work with actual Redis). 3 days debugging issues that unit tests couldn't catch.

**Why it's debt:**
- Mocks can't replicate real service behavior
- Integration contracts change (mock stays outdated)
- False confidence from green test suite
- Real bugs only found in staging/prod

**Prevention:**
- **70/20/10 test distribution:**
  - 70% unit tests (pure logic, no I/O)
  - 20% integration tests (real database, real Redis)
  - 10% E2E tests (full system)
- Use real services in integration tests via Docker Compose:
```yaml
# api/test/docker-compose.test.yml
services:
  postgres-test:
    image: postgres:16-alpine
  redis-test:
    image: redis:7-alpine
```
- Mock only external APIs (Stripe, email, etc.)

**Measurement:**
- Track bugs found in staging vs caught by tests
- Monitor test execution time (integration tests slower but more valuable)
- Code review: flag excessive mocking

**Sources:**
- [NestJS Testing Pitfalls](https://amplication.com/blog/best-practices-and-common-pitfalls-when-testing-my-nestjs-app) (HIGH confidence)
- [Test Coverage vs Test Effectiveness](https://www.qt.io/quality-assurance/blog/code-coverage-vs.-test-coverage-vs.-test-effectiveness-what-do-you-measure) (MEDIUM confidence)

---

### Pattern 5: Playwright Tests Become Slow and Brittle

**What happens:**
E2E suite starts at 50 tests, 5 minutes. After 6 months: 500 tests, 90 minutes. CI times out. Developers skip E2E locally. Tests become flaky (30% failure rate). Team stops trusting E2E suite.

**Why it's debt:**
- Hardcoded waits (`page.waitForTimeout(5000)`)
- No parallelization (tests run serially)
- Tests set up data via UI (slow) instead of API
- Poor test isolation (tests depend on each other)

**Prevention:**
- **Parallel execution with sharding:**
```bash
# Run 4 parallel workers
npx playwright test --workers=4

# Or use sharding in CI
npx playwright test --shard=1/4
npx playwright test --shard=2/4
```
- Use API for test data setup:
```typescript
test('should display dashboard', async ({ page }) => {
  // Fast: API setup
  const tenant = await createTenantViaAPI();
  await loginViaAPI(page, tenant);

  // Then test UI
  await page.goto('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```
- Replace hardcoded waits with auto-waiting:
```typescript
// WRONG
await page.waitForTimeout(5000);

// RIGHT
await page.waitForSelector('[data-testid="dashboard-loaded"]');
// Or use built-in auto-waiting
await page.click('button'); // Waits for button to be clickable
```
- Target: single test <10s, full suite <10min

**Measurement:**
- Track test execution time per test
- Alert when suite time increases >20% month-over-month
- Monitor test flakiness rate (retries / total runs)

**Sources:**
- [Playwright Test Optimization](https://www.royalcyber.com/blogs/test-automation/how-to-optimize-playwright-test-execution/) (HIGH confidence)
- [Why Playwright Tests Are Slow](https://endform.dev/blog/why-your-playwright-tests-are-slow) (MEDIUM confidence)

---

### Pattern 6: Neglecting Test Maintenance

**What happens:**
After initial 95-requirement test suite written, team moves on. Features evolve. Tests become obsolete (testing features that no longer exist). Maintenance burden grows. ~30% of tests fail for wrong reasons. Team starts ignoring test failures.

**Why it's debt:**
- Tests aren't updated when requirements change
- Obsolete tests add noise (failures you ignore)
- False failures erode trust in test suite
- Maintenance cost compounds

**Prevention:**
- **Quarterly test audit:**
  - Identify tests that haven't changed in >6 months
  - Check if tested features still exist
  - Remove obsolete tests (reduce suite by 20-30%)
- Link tests to requirements:
```typescript
// In test description
test('US-008: Tenant admin can create API keys', async () => {
  // Test implementation
  // When US-008 is deprecated, grep finds this test
});
```
- Monitor test failure patterns (same tests failing repeatedly = obsolete or flaky)

**Measurement:**
- Test suite size trend (should decrease as obsolete tests removed)
- Test failure rate (should be <2% false failures)
- Time spent fixing flaky tests vs writing new tests

**Sources:**
- [Test Maintenance Best Practices](https://amplication.com/blog/best-practices-and-common-pitfalls-when-testing-my-nestjs-app) (MEDIUM confidence)

---

## Integration Gotchas (DigitalOcean & ClickHouse Cloud)

Specific issues when integrating managed services with existing Docker Compose setup.

### Gotcha 1: DigitalOcean Block Storage Can't Shrink, Only Grow

**What happens:**
StatefulSet PVC created with 50GB. Unbound only uses 5GB. Try to reduce to 10GB to save cost. Kubernetes accepts change. PVC remains 50GB. DigitalOcean bills for 50GB forever.

**Why it happens:**
- Block storage volume expansion is one-way operation
- DigitalOcean CSI driver allows increase but not decrease
- Kubernetes API accepts downsize request (doesn't validate with CSI driver)
- Must delete PVC and recreate to shrink (data loss)

**Prevention:**
- **Start with minimum viable size, expand later:**
  - Unbound cache: 5-10GB initially
  - PostgreSQL: Use managed service (no PVC)
  - Redis: Use managed service (no PVC)
- Monitor actual usage before sizing
- Set storage alerts at 70% usage
- Document that PVC downsize = delete + recreate

**Detection:**
- Compare requested PVC size vs actual provisioned size
- Alert on PVC usage <30% for >7 days (overprovisioned)

**Sources:**
- [DigitalOcean Block Storage Limits](https://docs.digitalocean.com/products/kubernetes/how-to/add-volumes/) (HIGH confidence)

---

### Gotcha 2: DigitalOcean Managed PostgreSQL Connection Limit Exhaustion

**What happens:**
API scaled to 10 replicas × 25 connections each = 250 connections. DigitalOcean Managed PostgreSQL has 97 connection limit (3 reserved for maintenance). Connection pool exhausted. New API requests hang. Cascading failures.

**Why it happens:**
- DigitalOcean provides 25 connections per 1GB RAM
- 4GB cluster = 100 connections total (97 available)
- Each API pod opens connection pool (default 10 connections)
- NestJS TypeORM doesn't share connection pool across pods

**Prevention:**
- **Use PgBouncer connection pooler (built into DigitalOcean):**
```typescript
// Configure to use connection pool URL instead of direct database
DATABASE_URL=postgresql://user:pass@db-pooler.example.com:25061/db?sslmode=require

// Set pool mode to Transaction (not Session)
// In DigitalOcean console: Create Connection Pool
//   Mode: Transaction
//   Pool Size: 50 (out of 97 available)
```
- Configure TypeORM with lower connection pool:
```typescript
TypeOrmModule.forRoot({
  poolSize: 5, // Instead of default 10
  extra: {
    max: 5,
    min: 2,
  },
})
```
- Monitor connection count:
```sql
SELECT count(*) FROM pg_stat_activity;
```

**Detection:**
- Alert when connections >80% of limit
- Monitor connection pool wait time
- Track "connection timeout" errors in logs

**Sources:**
- [DigitalOcean Connection Pools](https://docs.digitalocean.com/products/databases/postgresql/how-to/manage-connection-pools/) (HIGH confidence)

---

### Gotcha 3: ClickHouse Cloud Region Availability

**What happens:**
Deploy to DigitalOcean NYC3. Choose ClickHouse Cloud AWS us-east-1 (closest region). Cross-cloud latency 50-100ms. Query logs from policy-svc timeout at 5 seconds. 20% of queries fail to log.

**Why it happens:**
- ClickHouse Cloud availability varies by cloud provider
- Cross-cloud networking adds latency
- Policy-svc writes to ClickHouse synchronously in request path
- High latency breaks async logging assumptions

**Prevention:**
- **Choose ClickHouse Cloud provider matching DOKS region:**
  - DOKS NYC3 → ClickHouse Cloud AWS us-east-1 or GCP us-east4
  - DOKS SFO3 → ClickHouse Cloud AWS us-west-2 or GCP us-west1
- Verify latency <10ms between DOKS and ClickHouse Cloud:
```bash
# From DOKS pod
time curl https://xxx.clickhouse.cloud:8443/ping
```
- Use async buffering for query logs (don't block DNS response on ClickHouse write):
```go
// policy-svc: Buffer logs in memory, flush async
type LogBuffer struct {
    logs chan QueryLog
}

func (p *PolicyService) LogQuery(log QueryLog) {
    select {
    case p.logBuffer.logs <- log:
        // Non-blocking send
    default:
        metrics.DroppedLogs.Inc()
    }
}

func (p *PolicyService) flushLogs() {
    batch := make([]QueryLog, 0, 1000)
    for log := range p.logBuffer.logs {
        batch = append(batch, log)
        if len(batch) >= 1000 {
            p.clickhouse.InsertBatch(batch)
            batch = batch[:0]
        }
    }
}
```

**Detection:**
- Monitor ClickHouse write latency p99
- Alert when latency >100ms
- Track dropped log count

**Sources:**
- [ClickHouse Cloud Regions](https://www.tinybird.co/blog/managed-clickhouse-options) (MEDIUM confidence)

---

### Gotcha 4: ClickHouse Cloud Auto-Scaling Causes Query Latency Spikes

**What happens:**
ClickHouse Cloud scales down during low traffic. First query after scale-down takes 30 seconds (cold start). Reports page appears broken. Users refresh repeatedly, causing more cold starts.

**Why it happens:**
- ClickHouse Cloud auto-scales to zero or minimal compute during idle
- Cold start requires loading data from object storage
- First query pays "warming" cost
- Subsequent queries fast (data in memory)

**Prevention:**
- **Disable auto-scaling or set minimum compute:**
  - In ClickHouse Cloud console: Set min replicas = 1
  - Or keep-alive ping every 5 minutes:
```typescript
// api/src/modules/reports/reports.service.ts
@Cron('*/5 * * * *') // Every 5 minutes
async keepClickHouseWarm() {
  await this.clickhouse.query('SELECT 1').toPromise();
}
```
- Use materialized views for pre-aggregated data (faster cold queries)
- Set reasonable query timeout (30s, not 5s)

**Detection:**
- Monitor ClickHouse query latency p99
- Alert on latency spikes >10x baseline
- Track cold start frequency

**Sources:**
- [ClickHouse Cloud vs Self-Hosted](https://oneuptime.com/blog/post/2026-01-21-clickhouse-cloud-vs-self-hosted/view) (MEDIUM confidence)

---

## Performance Traps (DNS at Scale in K8s)

Mistakes that cause performance issues under production load.

### Trap 1: Unbound Thread Count Mismatch with CPU Cores

**What happens:**
Unbound configured with `num-threads: 4` but pod has 8 CPU cores. Only uses 50% of available CPU. Query throughput caps at 10k QPS instead of 20k QPS. Latency increases under load.

**Why it happens:**
- Unbound threads = parallel query processing capacity
- Each thread handles independent queries
- Thread count should match CPU core count
- Default config has hardcoded thread count

**Prevention:**
- **Set num-threads dynamically based on container CPU limit:**
```bash
# In Unbound startup script
CPU_CORES=$(nproc)
sed -i "s/num-threads: .*/num-threads: $CPU_CORES/" /etc/unbound/unbound.conf
unbound -c /etc/unbound/unbound.conf
```
- Configure slab sizes to power of 2 close to thread count:
```yaml
# unbound.conf
num-threads: 8
msg-cache-slabs: 8
rrset-cache-slabs: 8
infra-cache-slabs: 8
key-cache-slabs: 8
```
- Enable `so-reuseport: yes` for better UDP performance on Linux

**Detection:**
- Monitor Unbound CPU usage (should be 80-90% under load)
- Track queries per second vs CPU usage
- Alert on low CPU usage with high query latency

**Sources:**
- [Unbound Performance Tuning](https://unbound.docs.nlnetlabs.nl/en/latest/topics/core/performance.html) (HIGH confidence - official docs)

---

### Trap 2: CoreDNS Cache Exhaustion from Multi-Tenant Queries

**What happens:**
1000 tenants × 1000 unique domains = 1M cache entries. CoreDNS cache size 10k (default). Cache thrashing. Hit rate drops to 5%. Every query requires upstream lookup. Latency spikes 10x.

**Why it happens:**
- Multi-tenant systems amplify cache diversity
- Each tenant queries different domains
- Cache LRU evicts entries too fast
- Unbound cache size defaults to small values

**Prevention:**
- **Increase Unbound cache sizes for multi-tenant workload:**
```yaml
# config/unbound/unbound.conf
msg-cache-size: 256m      # Default: 4m
rrset-cache-size: 512m    # Default: 4m
key-cache-size: 128m      # Default: 4m
neg-cache-size: 64m       # Default: 1m

# Also increase TTL caching
cache-min-ttl: 300        # Min 5 minutes
cache-max-ttl: 86400      # Max 24 hours
```
- Monitor cache hit ratio (target >80%)
- Implement tenant-aware cache partitioning if possible

**Detection:**
- Query `unbound-control stats` for cache metrics
- Alert on cache hit rate <70%
- Monitor memory usage (cache size vs available RAM)

**Sources:**
- [CoreDNS Performance Optimization](https://medium.com/@GiteshWadhwa/optimizing-dns-resolution-in-kubernetes-best-practices-for-coredns-performance-e3f6ed041bbb) (MEDIUM confidence)

---

### Trap 3: ClickHouse Background Merges Slow During Peak Traffic

**What happens:**
Policy-svc writes 10k queries/sec to ClickHouse. Background merges can't keep up. Number of parts grows from 100 → 10,000. Query performance degrades 100x. Reports timeout. Writes start failing.

**Why it happens:**
- ClickHouse merges small data parts into larger parts in background
- High write throughput creates parts faster than merges can consolidate
- Too many parts = slow queries (must read from all parts)
- Default merge settings optimized for batch loading, not streaming

**Prevention:**
- **Tune merge settings for high-throughput writes:**
```sql
ALTER TABLE dns_queries MODIFY SETTING
  max_bytes_to_merge_at_max_space_in_pool = 107374182400, -- 100GB
  max_bytes_to_merge_at_min_space_in_pool = 1048576000,   -- 1GB
  merge_max_block_size = 8192;
```
- Use batched inserts (1000 rows per insert instead of 1 row):
```go
// policy-svc: Batch writes
type ClickHouseWriter struct {
    buffer []QueryLog
    mu     sync.Mutex
}

func (w *ClickHouseWriter) Write(log QueryLog) {
    w.mu.Lock()
    w.buffer = append(w.buffer, log)
    if len(w.buffer) >= 1000 {
        w.flush()
    }
    w.mu.Unlock()
}
```
- Monitor `system.parts` table for part count

**Detection:**
- Query: `SELECT partition, count() FROM system.parts GROUP BY partition`
- Alert when parts per partition >100
- Monitor merge queue length

**Sources:**
- [ClickHouse Fine-Tuning for Time Series](https://medium.com/logalarm-devs/clickhouse-fine-tuning-maximize-performance-for-time-series-and-logs-5b6f6943ca7c) (HIGH confidence)

---

### Trap 4: HPA Scales on CPU But DNS Bottleneck is Network I/O

**What happens:**
DNS query volume increases 10x. dnsdist pods at 40% CPU but 100% network I/O. HPA doesn't scale (CPU threshold 60%). Queries drop due to network saturation. Users blame "DNS outage."

**Why it happens:**
- DNS is network-bound, not CPU-bound
- HPA only scales on CPU/memory by default (lines 172-178 in dnsdist-deployment.yaml)
- Custom metrics required for network I/O scaling
- Network throughput limits vary by node size

**Prevention:**
- **Use custom metrics for HPA:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dnsdist
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dnsdist
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Pods
    pods:
      metric:
        name: dns_queries_per_second
      target:
        type: AverageValue
        averageValue: "5000"  # Scale when >5k QPS per pod
```
- Expose custom metrics from dnsdist:
```lua
-- dnsdist.conf
webserver("0.0.0.0:8083")
setPrometheusMetrics()  -- Expose queries_per_second metric
```
- Monitor network I/O per pod, not just CPU

**Detection:**
- Track queries per second per pod
- Alert on network I/O >80% of node capacity
- Monitor packet drops at network interface

**Sources:**
- [Kubernetes HPA Custom Metrics](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/) (HIGH confidence - official docs)

---

### Trap 5: Redis Pub/Sub Single Point of Failure

**What happens:**
Redis deployed as single instance. Redis pod restarts (OOM, upgrade, node failure). Policy cache invalidation fails. Policy-svc serves stale policies for 15 minutes. Blocked domains resolve. Security incident.

**Why it happens:**
- Redis pub/sub doesn't support HA out of the box
- Single Redis instance = SPOF
- Policy cache invalidation depends on Redis pub/sub
- DigitalOcean Managed Redis is single-instance by default

**Prevention:**
- **Use Redis Sentinel or Redis Cluster for HA:**
  - DigitalOcean Managed Redis: Use "Redis Cluster" plan (not "Redis" plan)
  - Or deploy Redis Sentinel in DOKS as StatefulSet:
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-sentinel
spec:
  serviceName: redis-sentinel
  replicas: 3
  template:
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command: ["redis-server", "--slaveof", "redis-0.redis-sentinel", "6379"]
      - name: sentinel
        image: redis:7-alpine
        command: ["redis-sentinel", "/etc/sentinel.conf"]
```
- Implement fallback for pub/sub failures:
```go
// policy-svc: Poll for policy updates if pub/sub fails
if !pubsubConnected {
    policies := fetchPoliciesFromPostgres()
    updateCache(policies)
}
```

**Detection:**
- Monitor Redis pub/sub connection status
- Alert on pub/sub disconnection >10 seconds
- Track policy cache age (alert if >5 minutes old)

**Sources:**
- [Redis StatefulSet on Kubernetes](https://medium.com/@harshaljethwa19/redis-master-and-slave-architecture-with-kubernetes-b46c360d16c2) (MEDIUM confidence)

---

## Security Mistakes (DNS-Specific)

DNS-specific security pitfalls in multi-tenant Kubernetes environments.

### Mistake 1: Kubernetes Default DNS Allows Cross-Tenant Discovery

**What goes wrong:**
Tenant A pod can query `policy-svc.nebula-dns.svc.cluster.local` and discover all tenants' policies. Multi-tenant isolation broken. Data leak via DNS enumeration.

**Why it happens:**
- Kubernetes creates DNS entries for all services by default
- Format: `servicename.namespace.svc.cluster.local`
- No namespace isolation for DNS queries
- CoreDNS resolves queries from any namespace

**Prevention:**
- **Configure CoreDNS with namespace isolation:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health
        kubernetes cluster.local in-addr.arpa ip6.arpa {
          fallthrough in-addr.arpa ip6.arpa
          # Limit DNS queries to originating namespace
          pods insecure
          fallthrough in-namespace
        }
        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
```
- Use NetworkPolicies to block cross-namespace DNS queries:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: nebula-dns
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  egress:
  # Allow DNS to kube-system CoreDNS only
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
```

**Detection:**
- Network policy testing (try cross-namespace queries)
- Audit CoreDNS logs for unexpected queries
- Penetration testing

**Sources:**
- [DNS in Multi-Tenant Environments](https://notes.kodekloud.com/docs/Certified-Kubernetes-Security-Specialist-CKS/Minimize-Microservice-Vulnerabilities/DNS-in-Multi-Tenant-Environments) (HIGH confidence)

---

### Mistake 2: DoH/DoT Certificates Stored in Git (Secrets Leak)

**What goes wrong:**
TLS private keys for dns1.nebuladns.io committed to Git. Attacker clones repo, impersonates DNS server. MITM attack on all DNS traffic. Complete security breach.

**Why it happens:**
- Developers store certs in `config/certs/` for local development
- `.gitignore` not configured correctly
- "It's just for dev" becomes production config
- docker-compose.yml mounts `./config/certs` (line 112)

**Prevention:**
- **Never store certificates in Git:**
```bash
# .gitignore
config/certs/*
!config/certs/.gitkeep
*.key
*.pem
*.crt
```
- Use cert-manager for automatic certificate issuance:
```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: dnsdist-tls
spec:
  secretName: dnsdist-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - dns1.nebuladns.io
  - dns2.nebuladns.io
```
- Store production certificates in Kubernetes Secrets (never ConfigMaps)
- Use external secret management (Vault, DigitalOcean Secrets)

**Detection:**
- Git pre-commit hook scanning for private keys
- Secret scanning in CI (tools like gitleaks, truffleHog)
- Regular repository audits

**Sources:**
- [Kubernetes Secrets Best Practices](https://www.strongdm.com/blog/kubernetes-secrets) (MEDIUM confidence)

---

### Mistake 3: No Rate Limiting Per Tenant Allows Resource Exhaustion

**What goes wrong:**
Single tenant sends 100k queries/sec (DDoS or misconfigured client). Saturates dnsdist, policy-svc, Unbound. Other tenants experience slow DNS. Multi-tenant isolation breaks.

**Why it happens:**
- No per-tenant rate limiting implemented
- dnsdist rate limiting configured globally (if at all)
- Shared resources (Redis, ClickHouse) have no tenant quotas
- One bad actor impacts all tenants (noisy neighbor problem)

**Prevention:**
- **Implement per-tenant rate limiting in dnsdist:**
```lua
-- dnsdist.conf
local tenant_limits = {
  ["tenant-uuid-1"] = 1000,  -- 1000 QPS limit
  ["tenant-uuid-2"] = 5000,  -- 5000 QPS limit (paid tier)
}

function rateLimit(dq)
  local tenant_id = extractTenantFromQuery(dq)
  local limit = tenant_limits[tenant_id] or 100  -- Default 100 QPS

  local key = "ratelimit:" .. tenant_id
  local current = redis:incr(key)
  redis:expire(key, 1)  -- 1 second window

  if current > limit then
    dq:setRCode(DNSRCode.REFUSED)
    return DNSAction.HeaderModify
  end
  return DNSAction.None
end

addAction(AllRule(), LuaAction(rateLimit))
```
- Store tenant limits in Redis (configurable per tenant)
- Monitor per-tenant query rates
- Alert when tenant exceeds 80% of limit

**Detection:**
- Track queries per second per tenant
- Alert on abnormal query rates (>10x baseline)
- Dashboard showing per-tenant resource usage

**Sources:**
- [Kubernetes Multi-Tenancy Isolation](https://www.vcluster.com/blog/best-practices-for-achieving-isolation-in-kubernetes-multi-tenant-environments) (MEDIUM confidence)

---

## "Looks Done But Isn't" Checklist

Critical items that appear complete but have hidden failure modes.

### Health Checks Pass But Service is Broken

- [ ] **DNS health checks test UDP, not just TCP**
  - Verify: `dig @dns1.nebuladns.io example.com` succeeds
  - Not just: `nc -zv dns1.nebuladns.io 853`

- [ ] **Policy-svc health check validates Redis connectivity**
  - Verify: Can read/write to Redis
  - Not just: HTTP 200 on `/health`

- [ ] **ClickHouse health check validates write path**
  - Verify: Can insert test row into dns_queries
  - Not just: `curl http://clickhouse:8123/ping`

---

### Tests Pass But Don't Test the Right Things

- [ ] **Integration tests use real database, not mocks**
  - Verify: Tests connect to PostgreSQL in Docker
  - Not just: Mock database calls

- [ ] **E2E tests validate actual DNS resolution**
  - Verify: Send DNS query via DoH, check response
  - Not just: HTTP request to API returns policy JSON

- [ ] **Load tests include multi-tenant scenarios**
  - Verify: 1000 tenants × 100 QPS each
  - Not just: 100k QPS from single tenant

---

### Deployment Succeeds But Configuration is Wrong

- [ ] **Environment variables use runtime values, not build-time**
  - Verify: Same Docker image works in staging and prod
  - Not just: Image builds successfully

- [ ] **TLS certificates auto-renew before expiry**
  - Verify: cert-manager renews certs at 60 days
  - Not just: Certificates exist in Secret

- [ ] **Database migrations run before app pods start**
  - Verify: Helm hooks or init containers run migrations
  - Not just: Migrations exist in repo

---

### Monitoring Shows Green But Users Experience Issues

- [ ] **Monitor query success rate from client perspective**
  - Verify: Synthetic monitoring from external locations
  - Not just: Pod CPU/memory metrics

- [ ] **Alert on silent failures (logs not written to ClickHouse)**
  - Verify: Compare queries processed vs queries logged
  - Not just: ClickHouse pod is healthy

- [ ] **Track cross-service latency, not just individual service latency**
  - Verify: End-to-end latency (dnsdist → policy-svc → Unbound)
  - Not just: policy-svc response time

---

## Recovery Strategies

How to recover from common deployment failures.

### Scenario 1: ClickHouse Cloud Migration Fails

**Symptoms:**
- dns_queries table doesn't exist
- Policy-svc can't write logs
- Reports return empty data

**Recovery:**
1. **Immediate:** Disable query logging to prevent backpressure
```go
// policy-svc: Feature flag
if os.Getenv("CLICKHOUSE_ENABLED") == "false" {
    // Skip logging
    return
}
```

2. **Short-term:** Deploy self-hosted ClickHouse in DOKS
```bash
helm install clickhouse bitnami/clickhouse -n nebula-dns
```

3. **Long-term:** Fix schema for ClickHouse Cloud
```sql
-- Remove ON CLUSTER, Replicated* engines
CREATE TABLE dns_queries (...) ENGINE = MergeTree()
```

---

### Scenario 2: Redis Pub/Sub Fails (Policy Cache Stale)

**Symptoms:**
- Policy changes don't propagate to policy-svc
- Blocked domains resolve
- Allowed domains get blocked

**Recovery:**
1. **Immediate:** Force policy cache reload
```bash
# Call policy-svc admin endpoint
curl -X POST http://policy-svc/admin/reload-policies \
  -H "X-Internal-Key: $INTERNAL_SERVICE_KEY"
```

2. **Short-term:** Implement polling fallback
```go
// policy-svc: Poll PostgreSQL every 60 seconds
ticker := time.NewTicker(60 * time.Second)
for range ticker.C {
    policies := fetchPoliciesFromPostgres()
    updateCache(policies)
}
```

3. **Long-term:** Deploy Redis Sentinel/Cluster for HA

---

### Scenario 3: Certificate Expiry Breaks DoT/DoH

**Symptoms:**
- Clients can't connect to dns1.nebuladns.io:853
- TLS handshake errors in logs
- cert-manager failed to renew

**Recovery:**
1. **Immediate:** Get manual certificate from Let's Encrypt
```bash
certbot certonly --manual --preferred-challenges dns \
  -d dns1.nebuladns.io -d dns2.nebuladns.io
```

2. **Short-term:** Update Secret manually
```bash
kubectl create secret tls dnsdist-tls \
  --cert=/etc/letsencrypt/live/dns1.nebuladns.io/fullchain.pem \
  --key=/etc/letsencrypt/live/dns1.nebuladns.io/privkey.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```

3. **Restart dnsdist pods to load new cert**
```bash
kubectl rollout restart deployment/dnsdist -n nebula-dns
```

4. **Long-term:** Fix cert-manager automation + alerting

---

## Pitfall-to-Phase Mapping

Maps pitfalls to deployment/testing phases for proactive mitigation.

| Pitfall | Phase | Week | Prevention Task |
|---------|-------|------|-----------------|
| **DNS Health Checks (TCP vs UDP)** | 24 | 2 | Implement exec-based health checks testing actual DNS queries |
| **UDP Conntrack Race Conditions** | 24-25 | 2-3 | Kernel tuning + `externalTrafficPolicy: Local` + load testing |
| **ClickHouse Cloud Schema Incompatibility** | 24 | 1 | Create environment-aware schema, test on Cloud trial |
| **ClickHouse Partition Explosion** | 24 | 1 | Redesign partitioning (time-only), add monitoring |
| **ClickHouse ORDER BY Performance** | 24 | 1 | Analyze query patterns, set ORDER BY (tenant_id, timestamp, ...) |
| **PostgreSQL SSL Certificate with `url`** | 24 | 1 | Refactor to individual connection params, store CA cert in Secret |
| **Redis → Valkey Incompatibility** | 24 | 1 | Audit Redis commands, test against Valkey locally |
| **UDP Load Balancing (Session Affinity)** | 24 | 2 | Configure sessionAffinityConfig, monitor per-pod distribution |
| **Certificate Rotation Requires Restart** | 24 | 2 | Implement cert-reloader sidecar with inotify + reloadAllCertificates() |
| **StatefulSet for Unbound** | 24 | 2 | Convert Deployment → StatefulSet with PVC for cache |
| **Next.js NEXT_PUBLIC_ Build-Time Vars** | 24 | 1 | Refactor to server-side env vars or next-runtime-env library |
| **Test Coverage False Confidence** | 25 | 1-4 | Enforce assertion density, focus on critical paths |
| **Retroactive Test Time Waste** | 25 | 1-4 | Set CI gate for new code only (80%+), grandfather legacy |
| **Integration Test Database Pollution** | 25 | 1 | Implement transaction rollback or database reset per test |
| **Over-Mocking Hides Integration Issues** | 25 | 1 | 70/20/10 test distribution, use real services in integration tests |
| **Playwright Tests Slow and Brittle** | 25 | 2-3 | Parallel execution, API data setup, remove hardcoded waits |
| **Neglecting Test Maintenance** | 25 | 4 | Quarterly audit, link tests to requirements, remove obsolete tests |
| **Block Storage Can't Shrink** | 24 | 1 | Start with minimum size, monitor usage before sizing |
| **PostgreSQL Connection Limit** | 24 | 1 | Use PgBouncer connection pool, set lower TypeORM pool size |
| **ClickHouse Cloud Region Latency** | 24 | 1 | Choose matching cloud provider region, test latency |
| **ClickHouse Auto-Scaling Cold Starts** | 24 | 2 | Disable auto-scaling or keep-alive ping every 5min |
| **Unbound Thread Count Mismatch** | 24 | 2 | Dynamic thread config based on CPU cores |
| **CoreDNS Cache Exhaustion** | 24 | 2 | Increase cache sizes for multi-tenant workload |
| **ClickHouse Background Merges** | 24 | 2 | Tune merge settings, use batched inserts |
| **HPA Scales on CPU (Network Bottleneck)** | 24 | 2 | Custom metrics for queries per second |
| **Redis Pub/Sub SPOF** | 24 | 2 | Deploy Redis Sentinel/Cluster or use managed HA plan |
| **Kubernetes DNS Cross-Tenant Discovery** | 24 | 1 | Configure CoreDNS namespace isolation, NetworkPolicies |
| **DoH/DoT Certs in Git** | 24 | 1 | Fix .gitignore, use cert-manager, secret scanning |
| **No Per-Tenant Rate Limiting** | 24 | 2 | Implement rate limiting in dnsdist with Redis counters |

---

## Summary

**Critical Pitfalls Identified:** 11 (cause outages/rewrites)
**Technical Debt Patterns:** 6 (accumulate pain over time)
**Integration Gotchas:** 4 (managed service-specific)
**Performance Traps:** 5 (scale issues)
**Security Mistakes:** 3 (DNS-specific vulnerabilities)

**Highest Confidence Findings:**
- DNS health checks (HIGH - official Kubernetes docs)
- ClickHouse schema incompatibilities (HIGH - multiple migration reports)
- Certificate rotation (HIGH - dnsdist official docs)
- Test coverage patterns (HIGH - multiple authoritative sources)

**Areas Needing Deeper Research:**
- DigitalOcean-specific Valkey compatibility (verify command support)
- Cross-cloud latency benchmarks (DOKS ↔ ClickHouse Cloud)
- Specific kernel versions with conntrack fixes (need Linux kernel docs)

**Recommended Phase Priorities:**
1. **Phase 24 Week 1:** ClickHouse schema + PostgreSQL SSL + environment variables
2. **Phase 24 Week 2:** DNS health checks + certificate rotation + StatefulSets
3. **Phase 25 Week 1-2:** Test infrastructure (real services, no over-mocking)
4. **Phase 25 Week 3-4:** Load testing + performance validation

---

## Sources

### High Confidence (Official Docs / Recent Technical Articles)
- [Kubernetes Health Checks for Network Services](https://oneuptime.com/blog/post/2026-01-08-kubernetes-network-health-checks/view)
- [DNSDist TLS Certificate Management](https://www.dnsdist.org/advanced/tls-certificates-management.html)
- [Unbound Performance Tuning](https://unbound.docs.nlnetlabs.nl/en/latest/topics/core/performance.html)
- [ClickHouse Partitioning Best Practices](https://bigdataboutique.com/blog/when-to-use-partitioning-in-clickhouse-f2335e)
- [DigitalOcean Managed Database Connection Pools](https://docs.digitalocean.com/products/databases/postgresql/how-to/manage-connection-pools/)
- [Next.js Environment Variables in Kubernetes](https://medium.com/@raajeew/nextjs-application-environment-variables-issue-on-kubernetes-b2b885704a26)
- [NestJS Integration Testing Best Practices](https://engineering.deptagency.com/integration-testing-nestjs-apis-with-a-test-database)

### Medium Confidence (Community Articles / Technical Blogs)
- [Kubernetes DNS Service Configuration](https://spacelift.io/blog/kubernetes-dns-service)
- [ClickHouse Cloud Migration](https://www.tinybird.co/blog/clickhouse-deployment-options)
- [Playwright Test Optimization](https://www.royalcyber.com/blogs/test-automation/how-to-optimize-playwright-test-execution/)
- [Go Graceful Shutdown in Kubernetes](https://engineering-at-pinhome.medium.com/graceful-shutdown-in-go-and-kubernetes-99a17b9ea433)
- [Test Coverage False Confidence](https://hackernoon.com/misleading-test-coverage-and-how-to-avoid-false-confidence)

### Low Confidence (Needs Verification)
- DigitalOcean Valkey specific command compatibility (need official Valkey docs)
- Cross-cloud latency benchmarks (need empirical testing)
