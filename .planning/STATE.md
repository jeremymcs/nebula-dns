# Project State

// Nebula DNS - Project State
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Provide reliable, scalable DNS security filtering that blocks threats in real-time — backed by an ops dashboard for MSP management
**Current focus:** v1.3 Production Readiness — Phase 30 UI Test Suite (in progress)

## Current Position

Phase: 30 of 33 (UI Test Suite)
Plan: 3 of 4 in current phase
Status: In progress
Last activity: 2026-02-14 — Completed 30-03: Security & Advanced Features E2E tests (108 tests)

Progress: [██████████░] 30/33 phases (91% — v1-v1.2 shipped, v1.3 in progress)

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
- Completed: 21 plans (24-01: Terraform foundation, 24-02: Managed databases, 24-03: ClickHouse Cloud and operators, 24-04: Kubernetes Secrets and operational scripts, 25-01: PostgreSQL migration direct URI, 25-02: Environment-aware ClickHouse schema, 26-01: Managed Service Connections, 26-02: Unbound StatefulSet, 26-03: dnsdist Deployment with DigitalOcean LoadBalancers, 27-01: API Helm deployment with production hardening, 27-02: Runtime environment configuration for UIs, 27-03: UI and Admin UI Helm deployments, 27-04: Ingress, DNS automation, and production configuration, 29-01: API unit tests expansion, 29-02: Integration tests with Testcontainers, 29-03: E2E test expansion for admin, billing, MSP, 29-04: Table-driven unit tests for policy evaluation, 29-05: Policy service integration tests for Redis cache and ClickHouse, 29-06: CI pipeline configuration with all test types, 30-01: Admin + MSP E2E workflows, 30-03: Security & Advanced Features E2E tests)

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

Full decision log in PROJECT.md Key Decisions table.

### Pending Todos

None.

### Blockers/Concerns

**Pre-Phase 24 validation:**
- ClickHouse Cloud schema: Test MergeTree (not Replicated*) on trial account before production
- Valkey compatibility: Audit Redis commands, test locally before migration
- ~~Next.js runtime env vars: NEXT_PUBLIC_ baked at build time, need refactoring strategy~~ ✓ RESOLVED in 27-02

## Session Continuity

Last session: 2026-02-14
Stopped at: Completed 30-03-PLAN.md - Security & Advanced Features E2E tests (108 tests covering MFA, API keys, sessions, password reset, SIEM, webhooks, scheduled reports)
Resume file: None

---

*Last updated: 2026-02-14*
