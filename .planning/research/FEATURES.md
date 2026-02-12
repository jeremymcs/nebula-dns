# Feature Landscape: Production Readiness

**Domain:** DNS SaaS Platform - Production Operations
**Researched:** 2026-02-11
**Context:** Adding comprehensive testing, DigitalOcean deployment, and production DNS handling to existing Nebula DNS platform

## Table Stakes

Features users (ops team + platform reliability) expect. Missing = platform feels incomplete or unshippable.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Unit Test Coverage** | Cannot ship without basic code confidence | Medium | NestJS Jest, Go testing package, existing spec files | ~60 spec files exist, need to expand coverage to all modules |
| **Integration Tests** | Multi-service platform requires component integration validation | High | Docker Compose, TestContainers (Go), real DB instances | Existing: ClickHouse, Redis, session tests. Need: full module coverage |
| **E2E Tests (API)** | REST API contracts must be verified end-to-end | Medium | Supertest, running NestJS app | Existing auth/policy tests, need all 95 shipped features |
| **E2E Tests (UI)** | User flows must work in real browser | Medium | Playwright (already setup), test data seeding | Existing: 20 spec files. Need: admin flows, MSP workflows, billing |
| **Health Check Endpoints** | Load balancers need to route around unhealthy instances | Low | Existing /health endpoints in API + policy-svc | Already implemented, verify completeness |
| **Readiness Probes** | K8s needs to know when service can accept traffic | Low | Health endpoints + startup time awareness | Need: distinguish liveness vs readiness |
| **Graceful Shutdown** | Zero downtime deploys require connection draining | Medium | SIGTERM handling in NestJS/Go, connection tracking | Policy-svc critical (DNS queries in-flight) |
| **Database Migrations (Automated)** | Cannot manually run migrations in production | Medium | Helm pre-install/pre-upgrade hooks | Already exists via `db-migration-job.yaml` |
| **Secrets Management** | Cannot hardcode credentials in K8s manifests | Low | K8s Secrets, DigitalOcean KMS integration | Existing Helm secrets.yaml, need rotation strategy |
| **Logging (Structured)** | Must debug issues via centralized logs | Low | Winston (NestJS), Zap (Go), JSON formatting | Existing, verify correlation IDs |
| **Metrics Endpoint** | Prometheus scraping for observability | Medium | NestJS @nestjs/terminus, Go pprof + custom metrics | Existing Prometheus setup, need app-level metrics |
| **Deployment Rollback** | Bad deploys must be quickly reversible | Low | Helm rollback command, image tagging strategy | Helm supports this, need runbook |
| **Resource Limits** | Prevent runaway pods from crashing cluster | Low | K8s resource requests/limits in manifests | Need: based on load testing data |
| **DNS Failover** | DNS service downtime = total outage, need backup | High | Secondary DNS provider, health-based routing | Critical for SaaS - not implemented |
| **Backup & Restore** | Data loss = business loss | Medium | PostgreSQL backups, ClickHouse backups, Redis snapshots | Need: automated daily backups to DO Spaces |
| **SSL/TLS Certificates** | HTTPS required, auto-renewal mandatory | Low | cert-manager (K8s), Let's Encrypt, external-dns | Standard K8s pattern |
| **Rate Limiting (API)** | Prevent abuse and runaway costs | Medium | Existing RedisRateLimitGuard | Already implemented, verify production config |
| **Monitoring Dashboards** | On-call needs visibility into system state | Medium | Existing Grafana dashboards | Need: DNS query rate, policy eval latency, error budgets |
| **Incident Runbooks** | On-call without runbooks = panic-driven ops | Low | Markdown docs in /docs or wiki | Need: DNS down, DB down, Redis down, policy-svc crash |
| **CI/CD Pipeline** | Manual deploys don't scale, error-prone | Medium | GitHub Actions, DigitalOcean Container Registry | Need: build → test → push → deploy |
| **Load Testing Baseline** | Need to know breaking points before users find them | Medium | Existing k6 scripts (dns-load-test.js, api-load-test.js) | Need: run against DigitalOcean staging, establish SLOs |

## Differentiators

Features that set a production platform apart. Not expected by default, but demonstrate maturity.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Chaos Engineering** | Proactively find failure modes before production | High | Litmus/Steadybit, DNS failure injection | DNS-specific: simulate resolution failures, latency spikes |
| **Canary Deployments** | Reduce blast radius of bad deployments | High | Argo Rollouts, traffic splitting (25%→50%→100%) | Multi-tenant: route by tenant_id to canary |
| **Blue-Green Deployments** | Instant rollback on deploy failure | Medium | Duplicate infrastructure (expensive for startups) | Alternative to canary, higher cost |
| **Multi-Region Failover** | Survive region outages | Very High | Cross-region DB replication, GeoDNS routing | Deferred to v2 - single region sufficient for 1-10 tenants |
| **Performance Testing in CI** | Catch performance regressions before merge | Medium | k6 in GitHub Actions, thresholds as code | Validate policy eval stays O(1), API p95 < 200ms |
| **Contract Testing** | Catch breaking API changes before deploy | Medium | Pact or OpenAPI schema validation | Alternative: strict OpenAPI enforcement + versioning |
| **Visual Regression Testing** | Catch UI bugs not covered by functional tests | Medium | Percy, Chromatic, or Playwright screenshots | Nice-to-have for admin UI |
| **Distributed Tracing** | Debug cross-service request flows | High | Jaeger/Tempo, OpenTelemetry instrumentation | dnsdist→policy-svc→Redis: trace full DNS query path |
| **SLO Dashboards** | Track reliability vs customer commitments | Medium | Grafana, error budget calculations | Example: 99.9% DNS availability = 43min downtime/month |
| **Automated Incident Detection** | Alert before users complain | Medium | Prometheus alerting rules, PagerDuty integration | Already have Slack/PagerDuty, need comprehensive rules |
| **Cost Monitoring** | Track infra spend per tenant | High | ClickHouse query volume metering, K8s resource tagging | Already tracking usage for billing, extend to cost attribution |
| **Security Scanning** | Find vulnerabilities before attackers | Medium | Trivy (container scanning), Snyk (dependency scanning) | Scan on every image build |
| **Compliance Logging** | Audit trail for SOC2/GDPR | Low | Existing audit_logs table, immutability verification | Already implemented admin impersonation logging |
| **Synthetic Monitoring** | Detect outages from user perspective | Medium | External probe (UptimeRobot, Pingdom) sending DNS queries | Critical: test from multiple regions |
| **Auto-Scaling** | Handle traffic spikes without manual intervention | Medium | HPA (Horizontal Pod Autoscaler) based on metrics | Policy-svc: scale on DNS query rate |

## Anti-Features

Features to explicitly NOT build (at this stage).

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Custom CI/CD Platform** | GitHub Actions sufficient, don't reinvent | Use GitHub Actions with DigitalOcean integrations |
| **Self-Hosted Monitoring** | Managing Prometheus/Grafana in production = toil | Use DigitalOcean Managed Monitoring or cloud service |
| **Multi-Cloud Deployment** | Premature optimization, adds massive complexity | Single DigitalOcean region, document migration path for later |
| **Custom Secrets Rotation** | Vault/complex KMS = overkill at 1-10 tenants | Use K8s Secrets + manual rotation schedule, automate in v2 |
| **Feature Flags for Every Feature** | Overhead not justified at current scale | Use for deployment strategies only (canary release) |
| **A/B Testing Framework** | Not a product experimentation phase | Defer until product-market fit established |
| **Custom Observability Agents** | Reinventing OpenTelemetry | Use standard OTel collectors |
| **Zero-Downtime Migrations** | Acceptable to have brief maintenance windows | Schedule migrations during low-traffic windows, communicate to users |
| **Geo-Distributed DNS Resolution** | Single region handles 100K-999K queries/day easily | Document as future enhancement when >1M queries/day |
| **Machine Learning Anomaly Detection** | Insufficient data at current scale | Use static thresholds, graduate to ML when have 6+ months data |

## Feature Dependencies

```
Testing Foundation:
  Unit Tests (API) → Integration Tests (API) → E2E Tests (API)
  Unit Tests (Go) → Integration Tests (Go)
  E2E Tests (UI) depends on: Test data seeding

Deployment Pipeline:
  CI/CD Pipeline → Container Images → K8s Deployment
  K8s Deployment depends on: Database Migrations (automated)
  K8s Deployment depends on: Secrets Management

Observability Stack:
  Logging (structured) → Centralized Logging (Loki)
  Metrics Endpoint → Prometheus Scraping → Grafana Dashboards
  Health Checks → Readiness Probes → Load Balancer Routing

Production Operations:
  Monitoring Dashboards → Incident Runbooks → Automated Alerts
  Load Testing Baseline → Resource Limits (right-sized)
  Backup & Restore → Disaster Recovery Runbooks

DNS Reliability (critical path):
  DNS Failover depends on: Health Checks, Secondary DNS provider
  Graceful Shutdown depends on: Connection draining
  Policy-svc Scaling depends on: Metrics (DNS query rate)
```

## MVP Recommendation

**Critical Path (Block v1.3 release):**
1. **Test Coverage Expansion** - Cannot ship untested admin features (user mgmt, billing ops, alerting)
2. **CI/CD Pipeline** - Manual deploys = high risk of human error
3. **Database Backups** - Data loss unacceptable for production SaaS
4. **DNS Failover** - Single point of failure for entire service
5. **Incident Runbooks** - On-call without runbooks = panic-driven ops
6. **Load Testing Validation** - Must know capacity before production traffic

**Important (Ship in v1.3 but can hotfix later):**
1. Graceful Shutdown - Minimize disruption during deploys
2. Resource Limits - Prevent resource exhaustion
3. Monitoring Dashboards - Existing Grafana setup, verify completeness
4. Automated Alerts - Already have Slack/PagerDuty, add comprehensive rules
5. Synthetic Monitoring - External validation of DNS service
6. Secrets Rotation Strategy - Document process even if manual

**Defer to v1.4:**
1. Chaos Engineering - Validate stability first
2. Canary Deployments - Blue-green simpler for initial production
3. Distributed Tracing - Nice-to-have, not critical at current scale
4. Performance Testing in CI - Run manually for now
5. SLO Dashboards - Establish baselines first
6. Security Scanning - Important but can add post-launch

**Defer to v2.x:**
1. Multi-Region Failover - Single region sufficient for 1-10 tenants
2. Auto-Scaling - Manual scaling acceptable initially
3. Cost Monitoring per Tenant - Already have usage tracking
4. Visual Regression Testing - Low ROI for admin-focused UI

## Testing Strategy Specifics

Based on existing codebase analysis:

**API (NestJS):**
- Current: ~60 spec files (unit tests), some integration tests (ClickHouse, Redis, session)
- Gap: Admin modules (19-21 phases) need comprehensive unit + E2E coverage
- Pattern: Follow existing `*.service.spec.ts` and `*.controller.spec.ts` structure
- E2E: Expand `api/test/*.e2e-spec.ts` to cover all 95 requirements
- Tools: Jest (already configured), Supertest (already in use)

**UI (Next.js):**
- Current: 20 Playwright spec files (auth, dashboard, policies, locations, lists, reports, settings, tiers, usage, MSP, billing)
- Gap: Admin UI flows (mission control) not covered
- Pattern: Follow existing Page Object Model in `ui/e2e/helpers/auth.ts`
- Tools: Playwright 1.57.0 (already configured)
- Critical: Test tier-based feature visibility (home/enterprise/msp)

**Policy Service (Go):**
- Current: Unit tests (`*_test.go`), integration tests in `tests/integration/`
- Gap: Benchmark tests for O(1) validation under load
- Pattern: Table-driven tests (Go idiomatic)
- Tools: Go testing package, TestContainers for integration

**Load Testing:**
- Current: k6 scripts exist (`scripts/load-testing/api-load-test.js`, `dns-load-test.js`)
- Gap: Never run against production-like environment, no baseline SLOs
- Target: 100K-999K queries/day = ~12 queries/second average, 100+ queries/second peak
- Validate: Policy eval latency p95 < 50ms, API p95 < 200ms

## Deployment Strategy Specifics

**DigitalOcean Kubernetes:**
- Platform: DigitalOcean Managed Kubernetes (DOKS)
- Region: Single region initially (e.g., nyc3 or sfo3)
- Node Pool: Dedicated CPU instances (not shared, per DO docs to avoid DNS UDP latency)
- DNS: CoreDNS (default), scale to 3+ replicas for DNS-heavy workload
- Load Balancer: DO Load Balancer (Layer 4) → dnsdist pods
- Storage: DO Block Storage for PostgreSQL PVCs, DO Spaces for backups

**External DNS Management:**
- Use external-dns to sync K8s Ingress/Service to DigitalOcean DNS
- Primary: DigitalOcean DNS for API/UI endpoints
- Secondary: Route53 or Cloudflare for DNS failover (health-based routing to backup region)

**Helm Deployment:**
- Current: `helm/safedns/` chart exists with migrations as pre-install hooks
- Pattern: `helm upgrade --install nebula-dns ./helm/safedns -n nebula-dns`
- Strategy: Rolling update (default), validate with small tenant load first
- Rollback: `helm rollback nebula-dns` (keep last 5 revisions)

**CI/CD Pipeline (GitHub Actions):**
```yaml
1. Trigger: Push to main or release tag
2. Build:
   - api: Docker build, tag with commit SHA + 'latest'
   - ui: Docker build (Next.js production build)
   - policy-svc: Docker build (Go binary)
   - dnsdist: Docker build
   - unbound: Docker build
3. Test:
   - Unit tests (API, Go)
   - Integration tests (Docker Compose)
   - E2E tests (Playwright)
   - Load tests (k6, pass/fail on SLO thresholds)
4. Push: DigitalOcean Container Registry
5. Deploy:
   - Staging: Auto-deploy on merge to main
   - Production: Manual approval on release tag
   - Run migrations: Helm pre-upgrade hook
6. Verify:
   - Health checks pass
   - Smoke tests (synthetic DNS queries)
```

## Operational Readiness Specifics

**Incident Runbooks (Required):**
1. **DNS Service Down** - Symptom: Queries failing. Steps: Check policy-svc logs, verify Redis connection, failover to secondary DNS
2. **Database Connection Pool Exhausted** - Symptom: API 500 errors. Steps: Check active connections, scale API replicas, investigate slow queries
3. **Redis Out of Memory** - Symptom: Cache misses, policy eval failures. Steps: Check memory usage, evict old keys, scale Redis
4. **ClickHouse Ingestion Lag** - Symptom: Reports stale. Steps: Check Kafka backlog (if using), verify disk space, scale ClickHouse
5. **Policy-svc Crash Loop** - Symptom: DNS queries timing out. Steps: Check pod logs, verify Redis pub/sub connection, rollback deployment
6. **Certificate Expiration** - Symptom: HTTPS errors. Steps: Verify cert-manager, manual renewal if needed, update Let's Encrypt

**Monitoring Alerts (Prometheus + PagerDuty):**
- DNS Query Success Rate < 99.9% (5min window)
- Policy Evaluation Latency p95 > 100ms (1min window)
- API Error Rate > 1% (5min window)
- Database Connection Pool > 80% (1min window)
- Redis Memory > 90% (5min window)
- Pod Restart Count > 3 (10min window)
- Certificate Expiration < 7 days

**SLOs (Service Level Objectives):**
- DNS Availability: 99.9% (43 minutes downtime/month)
- DNS Query Latency: p95 < 50ms, p99 < 100ms
- API Availability: 99.9%
- API Latency: p95 < 200ms, p99 < 500ms
- Policy Update Propagation: < 5 seconds (Redis pub/sub)

## Complexity Notes

**High Complexity Items:**
- **Integration Tests (API)** - Requires Docker Compose orchestration, real DB seeding, multi-service coordination
- **DNS Failover** - Health-based routing between providers, GeoDNS configuration, failover testing
- **Chaos Engineering** - DNS-specific failure injection (latency, packet loss, resolution failures)
- **Canary Deployments** - Traffic splitting in multi-tenant system, rollback automation
- **Distributed Tracing** - Instrument dnsdist (Lua) → policy-svc (Go) → Redis, ClickHouse

**Medium Complexity Items:**
- **E2E Tests (UI/API)** - Test data management, async assertions, flaky test debugging
- **Graceful Shutdown** - In-flight DNS query tracking, connection draining in Go
- **CI/CD Pipeline** - Multi-stage builds, test orchestration, deployment approval gates
- **Load Testing Baseline** - Realistic traffic patterns, tenant isolation validation
- **Metrics Endpoint** - Custom app-level metrics (policy cache hit rate, tenant query distribution)

**Low Complexity Items:**
- **Health Checks** - Already implemented, verify liveness vs readiness distinction
- **Secrets Management** - Use K8s Secrets, document rotation (automate later)
- **Logging** - Already structured (Winston/Zap), add correlation IDs
- **Deployment Rollback** - Helm supports natively
- **SSL/TLS Certificates** - Standard cert-manager + Let's Encrypt pattern

## Sources

### DNS SaaS Testing Best Practices
- [Top 20 SaaS Testing Tools for 2026](https://testrigor.com/blog/saas-testing-tools/)
- [How To Use DNS Trace Tests To Monitor Critical SaaS Services](https://www.thousandeyes.com/blog/dns-trace-tests)
- [Getting DNS Right: Principles for Effective Monitoring](https://thenewstack.io/getting-dns-right-principles-for-effective-monitoring/)
- [SaaS Testing Guide: Process, Tools, & Best Practices](https://testsigma.com/blog/saas-testing/)

### Kubernetes DNS Deployment Patterns
- [DNS for Services and Pods | Kubernetes](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [How to Use CoreDNS with Kubernetes](https://oneuptime.com/blog/post/2026-01-26-coredns-kubernetes/view)
- [Kubernetes DNS Service: Practical Guide](https://www.tigera.io/learn/guides/kubernetes-networking/kubernetes-dns-service/)

### Production DNS Monitoring & Observability
- [11 Key Observability Best Practices You Should Know in 2026](https://spacelift.io/blog/observability-best-practices)
- [Observability Predictions for 2026](https://middleware.io/blog/observability-predictions/)
- [Kubernetes Observability and Monitoring Trends in 2026](https://www.usdsi.org/data-science-insights/kubernetes-observability-and-monitoring-trends-in-2026)

### DigitalOcean Kubernetes Best Practices
- [How can I improve the performance of cluster DNS?](https://docs.digitalocean.com/support/how-can-i-improve-the-performance-of-cluster-dns/)
- [external-dns DigitalOcean Tutorial](https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/digitalocean.md)
- [How to Customize CoreDNS for Kubernetes Clusters](https://docs.digitalocean.com/products/kubernetes/how-to/customize-coredns/)
- [Kubernetes Best Practices | DigitalOcean](https://docs.digitalocean.com/products/kubernetes/concepts/best-practices/)

### SaaS Testing Strategy (Integration & E2E)
- [Test Automation Strategy for End-to-End SaaS Applications](https://www.wildnetedge.com/blogs/saas-test-automation-strategies-for-seamless-end-to-end-testing)
- [End-to-end Testing - Tools and Frameworks Guide for 2026](https://bugbug.io/blog/test-automation/end-to-end-testing/)
- [Ultimate Guide - Best Automated Testing Solutions For SaaS Platforms](https://www.testsprite.com/use-cases/en/the-fastest-automated-testing-solutions-for-saas-platforms)

### Chaos Engineering & DNS Reliability
- [Chaos Testing Guide: Best Practices](https://katalon.com/resources-center/blog/chaos-testing-a-complete-guide)
- [Building Resilience with Chaos Engineering and Litmus](https://www.infracloud.io/blogs/building-resilience-chaos-engineering-litmus/)
- [REL12-BP04 Test resiliency using chaos engineering](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_testing_resiliency_failure_injection_resiliency.html)

### Helm Security & Deployment
- [Securing Helm Charts with Security Contexts and Network Policies](https://oneuptime.com/blog/post/2026-01-17-helm-security-contexts-network-policies/view)
- [Best Practices for Securing and Hardening Helm Charts](https://techdocs.broadcom.com/us/en/vmware-tanzu/bitnami-secure-images/bitnami-secure-images/services/bsi-doc/apps-tutorials-best-practices-hardening-charts-index.html)
- [Helm security and best practices](https://www.sysdig.com/blog/how-to-secure-helm)

### DNS Provider SLA & Uptime Monitoring
- [Top 6 Best DNS Hosting Providers in 2026](https://www.quicksprout.com/best-dns-hosting-providers/)
- [10 Best DNS Monitoring Tools in 2026](https://betterstack.com/community/comparisons/dns-monitoring-tools/)
- [IBM NS1 Connect 100% uptime SLA](https://www.ibm.com/products/ns1-connect)
- [DNSSEC Operations in 2026 – What Keeps 16 TLDs Up at Night](https://blog.nlnetlabs.nl/dnssec-operations-in-2026-what-keeps-16-tlds-up-at-night/)

### Deployment Strategies (Canary/Blue-Green)
- [Blue-Green and Canary Deployments Explained](https://www.harness.io/blog/blue-green-canary-deployment-strategies)
- [When to use canary vs. blue/green vs. rolling deployment](https://www.techtarget.com/searchitoperations/answer/When-to-use-canary-vs-blue-green-vs-rolling-deployment)
- [Releasing Canary on multi-tenant microservice platform](https://www.linkedin.com/pulse/releasing-canary-top-centralized-multi-tenant-platform-guillermo-wrba)

### ClickHouse for DNS Logging at Scale
- [How Cloudflare analyzes 1M DNS queries per second](https://blog.cloudflare.com/how-cloudflare-analyzes-1m-dns-queries-per-second/)
- [HTTP Analytics for 6M requests per second using ClickHouse](https://blog.cloudflare.com/http-analytics-for-6m-requests-per-second-using-clickhouse/)
- [How to Optimize ClickHouse Queries for Better Performance](https://oneuptime.com/blog/post/2026-01-21-clickhouse-query-optimization/view)

### NestJS Testing Patterns
- [Testing in NestJs — Unit & E2E](https://tushar-chy.medium.com/testing-in-nestjs-unit-e2e-3f9ba58d7f77)
- [How to Write Unit Tests and E2E Tests for NestJS Applications](https://www.freecodecamp.org/news/nestjs-unit-testing-e2e-testing-guide/)
- [Testing NestJS Apps: Best Practices & Common Pitfalls](https://amplication.com/blog/best-practices-and-common-pitfalls-when-testing-my-nestjs-app)
- [How to Write Tests in NestJS](https://oneuptime.com/blog/post/2026-02-02-nestjs-testing/view)

### Next.js Playwright Testing
- [Testing: Playwright | Next.js](https://nextjs.org/docs/pages/guides/testing/playwright)
- [How to Test Next.js Apps with Playwright: Complete Guide](https://www.getautonoma.com/blog/nextjs-playwright-testing-guide)
- [Testing a Next.js Form Component with Playwright](https://www.browserstack.com/guide/nextjs-playwright)

### Go Testing Patterns
- [Testing in Go: Unit, Integration, and Benchmark Tests](https://dasroot.net/posts/2026/01/testing-in-go-unit-integration-benchmark-tests/)
- [Go Testing Excellence: Table-Driven Tests and Mocking](https://dasroot.net/posts/2026/01/go-testing-excellence-table-driven-tests-mocking/)
- [Integration testing for Go with Testcontainers](https://devblogs.microsoft.com/cosmosdb/integration-testing-for-go-applications-using-testcontainers-and-containerized-databases/)
- [4 practical principles of high-quality database integration tests in Go](https://threedots.tech/post/database-integration-testing/)

### Incident Response & Runbooks
- [Incident Response Runbooks: Templates, Examples & Guide](https://rootly.com/incident-response/runbooks)
- [The Enterprise Incident Response Plan - SRE Guide](https://uptimelabs.io/learn/enterprise-incident-response-plan-sre-guide/)
- [10 Essential Runbook Examples for DevOps](https://www.stew.so/blog/runbook-examples-for-devops)
- [When DNS Breaks the Cloud: What AWS/Azure Outages Teach Us](https://medium.com/@cypanrisk/when-dns-breaks-the-cloud-what-the-aws-and-azure-m365-outages-teach-us-d9087463e70d)

### DNS Failover & Disaster Recovery
- [A Beginner's Guide to DNS Failover](https://dnsmadeeasy.com/resources/dns_failover)
- [What Is DNS Failover? | IBM](https://www.ibm.com/think/topics/dns-failover)
- [Reliability in Azure DNS](https://learn.microsoft.com/en-us/azure/reliability/reliability-dns)
- [Cross-Region Failover Design for Disaster Recovery](https://www.serverion.com/uncategorized/cross-region-failover-design-disaster-recovery/)
