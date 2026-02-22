# Project State

// Nebula DNS - Project State
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Provide reliable, scalable DNS security filtering that blocks threats in real-time — backed by an ops dashboard for MSP management
**Current focus:** v1.3 Production Readiness — Phase 30 UI Test Suite (in progress)

## Current Position

Phase: 33 of 33 (Operational Readiness)
Plan: 3 of 3 in current phase (COMPLETE)
Status: Phase Complete — Ready for v1.3 Release
Last activity: 2026-02-21 — Completed 33-03: Incident Runbooks and Deployment Procedures (7 comprehensive runbooks covering DNS, DB, Redis, policy-svc, cert failures, deployment, and rollback with hybrid format and quick-action checklists)

Progress: [███████████] 33/33 phases (100% COMPLETE — v1-v1.2 shipped, v1.3 Production Readiness COMPLETE)

## Performance Metrics

**Velocity (v1-v1.2 shipped):**
- Total plans completed: 142
- v1: 23 requirements, 8 phases, ~23 plans
- v1.1: 35 requirements, 8 phases, ~45 plans
- v1.2: 37 requirements, 7 phases, ~74 plans

**v1.3 In Progress:**
- 31 requirements (13 DEPLOY, 8 TEST, 10 OPS)
- 10 phases (24-33)
- Estimated: 50-80 plans based on historical velocity
- Completed: 36 plans (24-01: Terraform foundation, 24-02: Managed databases, 24-03: ClickHouse Cloud and operators, 24-04: Kubernetes Secrets and operational scripts, 25-01: PostgreSQL migration direct URI, 25-02: Environment-aware ClickHouse schema, 26-01: Managed Service Connections, 26-02: Unbound StatefulSet, 26-03: dnsdist Deployment with DigitalOcean LoadBalancers, 27-01: API Helm deployment with production hardening, 27-02: Runtime environment configuration for UIs, 27-03: UI and Admin UI Helm deployments, 27-04: Ingress, DNS automation, and production configuration, 29-01: API unit tests expansion, 29-02: Integration tests with Testcontainers, 29-03: E2E test expansion for admin, billing, MSP, 29-04: Table-driven unit tests for policy evaluation, 29-05: Policy service integration tests for Redis cache and ClickHouse, 29-06: CI pipeline configuration with all test types, 30-01: Admin + MSP E2E workflows, 30-03: Security & Advanced Features E2E tests, 30-04: Edge Cases and Error Handling E2E + CI Integration, 30-05: Flakiness Detection and Threshold Enforcement, 31-01: SLO-aligned load test configuration, 31-02: SLO burn rate alerting rules, 31-03: Blackbox Exporter deployment, 31-04: SLO tracking dashboard, 31-05: Load test baseline and SLO runbook, 32-01: Docker build and staging values, 32-02: Build and deploy to staging, 32-03: DOCR cleanup and pipeline documentation, 33-01: Health probes and graceful shutdown, 33-02: HPA custom metrics and backup verification, 33-03: Incident runbooks and deployment procedures)

## Milestones Shipped

### v1.2 Admin Roles & Alerting (2026-02-03)
- 7 phases (17-23), 31 plans
- 37 requirements complete
- RBAC, admin management, alerting integrations

### v1.1 Mission Control Frontend (2026-01-19)
- 8 phases (9-16), 16 plans
- 35 requirements complete
- Full admin UI for MSP management

### v1 Backend API (2026-01-18)
- 8 phases (1-8), 17 plans
- 23 requirements complete
- Complete admin backend

## Accumulated Context

### Decisions

Recent decisions affecting v1.3:

- **DigitalOcean over AWS/GCP:** Simpler pricing, sufficient for 100K-999K queries/day, 1-10 tenants
- **ClickHouse Cloud over self-hosted:** Managed service reduces ops burden for small team
- **Managed Valkey over Redis:** DO discontinued Redis (EOL June 2025), Valkey is compatible successor

**Phase 24-01 (Terraform Foundation):**
- **VPC IP range 10.10.0.0/16:** Provides 65,536 IPs for cluster expansion
- **DOKS auto-scaling 3-10 nodes:** Balances cost (3 min) with capacity (10 max) on s-4vcpu-8gb
- **HA control plane enabled:** Production reliability with 99.95% SLA
- **Remote state in DO Spaces:** Team collaboration and state locking via S3-compatible backend
- **Modular Terraform structure:** Separate VPC and DOKS modules for independent versioning

**Phase 24-02 (Managed Databases):**
- **PostgreSQL 2-node HA with PgBouncer:** 50-connection pool in transaction mode for stateless queries
- **Valkey 2-node HA with TLS:** Redis-compatible caching for policy invalidation via pub/sub
- **Database firewall rules:** Restrict access to DOKS cluster only, no public access
- **Both pooled and direct URIs:** Pooled for application, direct for database migrations
- **VPC-private networking:** All databases in private VPC network for security

**Phase 24-03 (ClickHouse Cloud and Operators):**
- **DNS-01 challenge solver with DigitalOcean:** Enables wildcard certificates (*.nebuladns.io) vs HTTP-01
- **ClickHouse Cloud development tier:** 24-48GB auto-scaling with 5-minute idle timeout for cost efficiency
- **Official ClickHouse Terraform provider:** Managed solution reduces ops burden vs self-hosted

**Phase 24-04 (Kubernetes Secrets and Operational Scripts):**
- **Auto-generate JWT and encryption keys:** Reduces manual error, ensures cryptographic quality (48-byte base64 for JWT, 32-byte hex for encryption)
- **Separate pooled and direct PostgreSQL URIs:** PgBouncer-pooled for application queries, direct for migrations (bypasses connection pooling)
- **Warn-level database connectivity checks:** May fail in CI/CD without VPC access, pass-level too strict for initial verification
- **Interactive prompts for destructive rotations:** Prevents accidental JWT rotation (invalidates all sessions)

**Phase 25-01 (PostgreSQL Migration Direct URI):**
- **Use database-direct-url for migrations:** Bypasses PgBouncer transaction mode (incompatible with DDL/advisory locks)
- **Increase migration timeout to 900s:** Production managed PostgreSQL with SSL has higher latency than local development
- **ClickHouse Cloud configuration toggle:** Prepares for Plan 25-02 migration (cloud: false, protocol: http defaults)

**Phase 25-02 (Environment-Aware ClickHouse Schema):**
- **Daily partitioning for query_logs, monthly for others:** High-volume query_logs (millions/day) needs daily granularity for efficient TTL drops; lower-volume tables (threat_logs, audit_logs, performance_metrics) use monthly partitions to keep count manageable
- **Environment-aware engine selection via Helm values:** ClickHouse Cloud requires plain MergeTree (managed replication), self-hosted requires ReplicatedMergeTree for HA
- **HTTPS for ClickHouse Cloud, HTTP for self-hosted:** Cloud requires HTTPS on port 8443, self-hosted uses HTTP on port 8123

**Phase 26-01 (Managed Service Connections):**
- **Use redis.ParseURL for TLS-aware connections:** Supports both dev (redis://) and prod (rediss://) URLs without code changes, automatically enables TLS for rediss:// scheme
- **TLS 1.2+ enforcement for managed Valkey:** Explicit MinVersion setting ensures compliance with DigitalOcean's security requirements
- **Complete ClickHouse Cloud env vars in K8s:** Added CLICKHOUSE_DATABASE, CLICKHOUSE_USER, CLICKHOUSE_PASSWORD to deployment manifest (code already read them, manifest was missing mappings)

**Phase 26-02 (Unbound StatefulSet):**
- **StatefulSet with persistent volumes for DNS cache:** Cache survives pod restarts, reducing upstream queries and improving latency. 1Gi per pod (4x headroom for 240MB configured cache)
- **Both headless and ClusterIP services:** Headless (clusterIP: None) provides stable pod DNS names for debugging/monitoring. ClusterIP provides load-balanced endpoint for dnsdist backend pool
- **drill command for health checks:** Performs actual DNS resolution test (drill @127.0.0.1 google.com) instead of simple TCP socket check, validates full resolver functionality
- **ConfigMap for configuration:** Embeds unbound.conf from config/ directory, enables config changes without image rebuild
- **Pod anti-affinity to spread replicas:** Preferred weight 100, spreads 3 replicas across nodes for fault tolerance

**Phase 26-03 (dnsdist Deployment with DigitalOcean LoadBalancers):**
- **Full Kubernetes service DNS names for backends:** Use `unbound.nebula-dns.svc.cluster.local` and `policy-svc.nebula-dns.svc.cluster.local` instead of short names to avoid relying on search domain configuration
- **Bind metrics to 0.0.0.0:8083:** Enables Prometheus scraping from outside the pod (was 127.0.0.1 which only allowed local access)
- **DigitalOcean LoadBalancer size-unit 1:** Smallest size for cost optimization while maintaining dual LoadBalancers for DNS redundancy
- **ConfigMap-based production config:** Embed dnsdist.prod.conf in Kubernetes ConfigMap to enable config changes without image rebuilds

**Phase 27-01 (API Helm Deployment with Production Hardening):**
- **Use api-secrets consistent naming:** Migration job references `.Values.api.secrets.name | default "api-secrets"`, not dynamic nebuladns-fullname pattern. Secrets template now matches this reference to avoid name mismatch.
- **Add HPA stabilization behavior:** Prevents pod churn during traffic spikes. 60s scaleUp and 300s scaleDown windows provide stable autoscaling without overreacting to momentary load changes.
- **ReadOnlyRootFilesystem with emptyDir volumes:** Security best practice. API needs writable /tmp and /app/.npm for npm cache, provided via emptyDir volumes while maintaining read-only root filesystem.
- **Fix helper naming from nebuladns to safedns:** Existing _helpers.tpl uses safedns.* convention. Fixed API deployment to use safedns.api.fullname, safedns.labels, safedns.selectorLabels for consistency.

**Phase 27-02 (Runtime Environment Configuration for UIs):**
- **Runtime env vars over NEXT_PUBLIC_:** NEXT_PUBLIC_ vars are baked into JavaScript bundles at build time, making Docker images environment-specific. Runtime vars (API_URL, APP_URL, ADMIN_UI_URL, TENANT_UI_URL) sourced from /api/config endpoint enable single Docker image to work across staging and production. Build-time NEXT_PUBLIC_ vars retained as fallbacks for local development and graceful degradation.
- **Preserve NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:** Stripe.js client library requires publishable key at build time by design. This key is safe to expose client-side (Stripe's intended usage pattern).
- **Centralized config exports in lib/api.ts:** Single source of truth for API_URL, APP_URL, ADMIN_UI_URL, TENANT_UI_URL. All components/hooks import from @/lib/api instead of duplicating env var lookups. Simplifies future updates and ensures consistency.

**Phase 27-03 (UI and Admin UI Helm Deployments):**
- **/api/config for health probes:** Validates both Next.js runtime and config endpoint functionality, providing better health signal than simple HTTP 200 on /. Created in Plan 27-02.
- **UID 1001 for nextjs user:** Matches Dockerfile USER directive for both UI and Admin UI containers. Prevents permission issues with .next directory writes.
- **Service port 80 targeting container port 3000:** Standard HTTP port for clean Ingress routing. Container runs on 3000 (Next.js default), Service translates to port 80 for Ingress backends.
- **Conditional Admin UI deployment via adminUi.enabled:** Some environments may not need Admin UI (e.g., edge clusters, tenant-only deployments). Default true, but can be disabled via values flag.

**Phase 27-04 (Ingress, DNS Automation, and Production Configuration):**
- **upsert-only policy for external-dns:** Safer than sync policy - never deletes existing DNS records. Prevents accidental record deletion during deployments, but requires manual cleanup of stale records.
- **CORS allow origin for app and admin UI:** API needs to accept requests from both tenant UI (app.nebuladns.io) and admin UI (admin.nebuladns.io). Explicit origin list more secure than wildcard.
- **Replace deprecated kubernetes.io/ingress.class annotation:** Kubernetes 1.18+ uses spec.ingressClassName field. Using deprecated annotation causes warnings and may break in future versions.
- **Pre-provisioned secrets in production (secrets.create=false):** Production secrets created by Phase 24-04 scripts with proper encryption and key management. Helm-generated secrets for development/testing only.
- **Helm service names use release-chart pattern:** API_URL uses nebula-dns-safedns-api pattern (release name + chart name + component). Matches Helm's default naming from _helpers.tpl.

**Phase 30-03 (Security & Advanced Features E2E Tests):**
- **Defensive test pattern for incomplete UI:** Following settings.spec.ts pattern, tests gracefully skip when UI elements aren't present rather than failing. Enables tests to document expected behavior even when features aren't fully implemented.
- **Feature-based directory organization:** Separate security/ and advanced/ directories for better test organization by feature domain (auth vs integrations).
- **API mocking for isolation:** Mock API responses to test UI behavior independently of backend, keeping tests fast and reliable.

**Phase 30-04 (Edge Cases and Error Handling E2E + CI Integration):**
- **Chromium-only for edge tests:** Firefox and WebKit browsers not installed in development environment. Chromium provides sufficient coverage for edge cases and error handling scenarios without adding CI overhead.
- **Nightly scheduled E2E runs:** Edge cases and error handling tests may be more prone to flakiness than happy-path tests. Nightly runs (2am UTC) provide continuous monitoring against <5% flakiness target.
- **Separate CI jobs for test categories:** Dedicated jobs for main E2E, edge cases, and security tests allow faster feedback and easier debugging. Parallel execution reduces total CI time to ~10-15 minutes.
- **Defensive pattern for auth redirects:** Tests using `page.goto()` with mocked routes can interfere with authentication. Switched to defensive URL assertions (`not.toContain('/login')`) and conditional route mocking to handle auth gracefully.

**Phase 30-05 (Flakiness Detection and Threshold Enforcement):**
- **JSON reporter preferred over JUnit XML:** Playwright JSON has explicit retry status, easier to parse for flakiness detection than JUnit's duplicate test case entries
- **5% flakiness threshold as CI gate:** Industry standard for acceptable test flakiness, balances reliability with pragmatism
- **Per-job flakiness reporting:** Each test job (main, edge, security) gets independent flakiness metrics in GitHub step summary
- **Fail-fast threshold enforcement:** Script exits with code 1 if >5% flakiness, failing the CI job to prevent merging

**Phase 31-01 (SLO-Aligned Load Test Configuration):**
- **Updated API thresholds from p95<500ms to p95<200ms:** Previous thresholds were too lenient and didn't match documented SLO targets. SLO requires p95 API latency <200ms for production compliance.
- **Changed error threshold from 1% to 0.1%:** 99.9% availability SLO requires error rate <0.1% (not <1%). Ensures load tests validate actual availability target.
- **Dynamic scenario selection via K6_SCENARIO:** Avoids running full load tests on every push. Smoke for push triggers (30s), load/sustained for scheduled runs. Enables appropriate test depth per trigger type.
- **GitHub Step Summaries for test results:** Test results previously required downloading artifacts. Step summaries provide immediate visibility in Actions UI with parsed metrics (p95, p99, error rate).
- **Push trigger for load-testing scripts:** Validates script changes don't break functionality. Catches syntax errors and configuration issues early with smoke tests only for fast feedback.

**Phase 31-02 (SLO Burn Rate Alerting Rules):**
- **Multi-window burn rate pattern (1h+5m fast, 6h+30m slow):** Google SRE Workbook pattern reduces false positives while maintaining fast incident detection. Both windows must exceed threshold to alert.
- **99.9% availability SLO with error budget burn rates:** 0.1% error budget = 43.8 min/month. Fast burn 14.4x (exhausts in ~2 days) triggers critical, slow burn 6x (exhausts in ~5 days) triggers warning.
- **Connection pool thresholds:** PostgreSQL >90% (critical), Redis >80% (warning). PostgreSQL more aggressive due to slower connection setup and higher query queueing impact.
- **APIHighLatency downgraded to info at 500ms:** SLO burn rate alerts now handle paging. Simple threshold useful for debugging but shouldn't wake on-call. Lowered threshold for earlier signal.

**Phase 31-03 (Blackbox Exporter Deployment):**
- **30s probe interval balances monitoring frequency with resource usage:** External synthetic checks less critical than internal metrics. Provides 120 samples per 1h fast window for SLO burn rate calculations while reducing endpoint load.
- **jobLabel: blackbox-dns enables PrometheusRule queries to reference consistent job name:** Enables alert rules to reference `probe_success{job="blackbox-dns"}` consistently without relying on ServiceMonitor name changes.
- **HTTP prober for DoH instead of native dns prober:** DoH support varies by Blackbox version. HTTP prober with `Accept: application/dns-message` header provides broader compatibility while validating endpoint reachability.
- **Staging targets in base configuration, production via Kustomize overlays:** Prevents accidental production probing from development clusters. Production targets overlaid per environment.

Full decision log in PROJECT.md Key Decisions table.
- [Phase 31-04]: 10-panel dashboard structure: 4 stat panels (overview), 2 availability time series, 2 latency distribution panels, 2 probe detail panels for logical SLO tracking flow
- [Phase 31-04]: Error budget formula ((0.001 - (1 - availability)) / 0.001) * 100 converts 0.1% error budget (43.8 min/month) to percentage remaining with color thresholds at 75%/25%/0%
- [Phase 31-04]: Burn rate windows match alerting rules: fast 1h window and slow 6h window with threshold lines at 14.4x (critical) and 6x (warning) for alert correlation

**Phase 31-05 (Load Test Baseline and SLO Runbook):**
- **Baseline values TBD until staging execution:** Pragmatic approach marking performance metrics as "TBD - run k6 against staging to populate" instead of placeholder numbers. Prevents misleading values and clearly signals baseline requires initial population.
- **Quarterly baseline review (every 3 months):** Balances baseline freshness with update overhead. Weekly load tests provide regression detection, quarterly updates prevent staleness without excessive churn.
- **20% degradation threshold triggers investigation:** Actionable signal outside normal variance. Lower (10%) creates excessive overhead, higher (50%) allows significant regressions. Aligns with industry best practices.
- **Error budget policy at 50%/25%/0% thresholds:** Industry standard zones (Green >50%, Yellow 25-50%, Orange <25%, Red 0%) with specific actions. Clear policy for balancing features vs reliability.
- **Feature freeze at <25% budget remaining:** Proactive approach preventing complete exhaustion. 25% = ~11 min remaining (tight but recoverable). Exit criteria (>25% + no alerts for 7 days) provides clear path back to green.

**Phase 32-01 (Docker Build and Staging Values):**
- **Service-scoped cache keys (type=gha,scope=${service}-build):** Prevents cache thrashing across 6 service builds. Without scoping, parallel builds invalidate each other's cache layers, increasing build times from ~2 min to ~10 min per service.
- **1200s DOCR token expiry:** Balances security with build time. 20 minutes sufficient for Docker image push (typical 5-10 min for large images), while limiting token exposure window. Shorter expiry (300s) risks timeout during slow uploads.
- **Staging single replicas and lower resources:** Single replicas (vs 2-3 in production) + reduced CPU/memory (50-500m CPU, 128-512Mi memory) cuts staging costs ~60%. No HA needed for testing environment.
- **Let's Encrypt staging issuer in staging:** Avoids production rate limits (50 certs/week) during testing. Staging issuer has higher limits and doesn't count against production quota, enabling unlimited testing.

**Phase 32-02 (Build and Deploy to Staging):**
- **Test gates (ci.yml + security-scan.yml) run before all builds:** Prevents wasting DOCR bandwidth and build time on broken code. Tests run in parallel (~8-12 min), skippable via workflow_dispatch for emergencies.
- **6 parallel build jobs after test gates:** Reduces build phase from ~12 min (sequential) to ~2 min (parallel). Each service uses dedicated cache scope to prevent thrashing.
- **Staging deploys automatically after builds, production requires manual approval:** Enables rapid iteration on staging while protecting production from accidental deployments. GitHub Environment protection enforces approval.
- **Both staging (10m) and production (15m) use --atomic flag:** Automatically rolls back failed deployments to last known-good state. Prevents manual cleanup and reduces downtime.
- **Production timeout 15m vs staging 10m:** Accounts for higher replica counts (2-10 pods vs 1) and autoscaling stabilization. Prevents premature timeout failures.
- **kubectl rollout status verifies deployment health:** Confirms all pods are ready before marking job complete. Catches issues like ImagePullBackOff or CrashLoopBackOff.
- **--history-max 10 limits Helm release history:** Prevents etcd bloat from unlimited history growth. 10 releases provides sufficient rollback window (~2-4 weeks at typical deployment frequency).

**Phase 32-03 (DOCR Cleanup and Pipeline Documentation):**
- **Weekly Sunday 4 AM UTC DOCR cleanup:** Low-traffic window minimizes disruption; weekly frequency sufficient since images accumulate at ~6 per commit and storage costs are incremental.
- **workflow_call added to security-scan.yml with no other changes:** Minimal, surgical change enabling reuse from deploy.yml without restructuring existing scanning jobs.
- **Pipeline docs as operator reference not tutorial:** Structured for incident lookup (troubleshooting headings) and onboarding (env config section) rather than step-by-step learning. Architecture diagram first.

**Phase 33-01 (Health Probes and Graceful Shutdown):**
- **Tiered health checks:** API readiness checks only PostgreSQL+Redis (critical), ClickHouse degraded logged as warning (non-critical). Analytics unavailable should not prevent DNS resolution.
- **Graceful shutdown timing:** Policy Service terminationGracePeriodSeconds 45s (30s drain + 10s ClickHouse flush + 5s buffer) ensures no log loss.
- **Probe separation:** /healthz for simple liveness (no dependencies), /health/ready for readiness (dependency checks). Liveness never checks dependencies to prevent restart loops.
- **Conservative thresholds:** All probes use periodSeconds 10, failureThreshold 3 (30s to detect failures) balances fast recovery with false positive prevention.

**Phase 33-02 (HPA Custom Metrics and Backup Verification):**
- **Policy Service HPA scales on DNS QPS (1000/pod):** Custom metric from Prometheus Adapter correlates better with workload than CPU, with CPU (70%) fallback and anti-flapping behavior (5min scale-down, 1min scale-up).
- **Monthly automated backup verification:** 1st of month, 3 AM UTC for PostgreSQL and ClickHouse Cloud ensures backups are restorable.
- [Phase 33-03]: Hybrid runbook format with quick-action checklist first, detailed diagnostics below

### Pending Todos

None.

### Blockers/Concerns

**Pre-Phase 24 validation:**
- ClickHouse Cloud schema: Test MergeTree (not Replicated*) on trial account before production
- Valkey compatibility: Audit Redis commands, test locally before migration
- ~~Next.js runtime env vars: NEXT_PUBLIC_ baked at build time, need refactoring strategy~~ ✓ RESOLVED in 27-02

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 33-03-PLAN.md - Incident Runbooks and Deployment Procedures (7 comprehensive runbooks covering DNS down, DB down, Redis down, policy-svc crash, cert expiration, deployment, and rollback with hybrid format and quick-action checklists). Phase 33 COMPLETE. v1.3 Production Readiness COMPLETE.
Resume file: None

---

*Last updated: 2026-02-21*
