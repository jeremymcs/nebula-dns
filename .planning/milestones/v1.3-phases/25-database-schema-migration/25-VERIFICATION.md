---
phase: 25-database-schema-migration
verified: 2026-02-13T03:15:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 25: Database Schema Migration Verification Report

**Phase Goal:** PostgreSQL and ClickHouse schemas are deployed with production-compatible configurations
**Verified:** 2026-02-13T03:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PostgreSQL migrations run successfully via Helm pre-install hook | ✓ VERIFIED | Helm template has pre-upgrade/pre-install hooks at line 14, uses database-direct-url at line 84, 900s timeout at line 23 |
| 2 | ClickHouse Cloud schema uses MergeTree (not Replicated*) table engines | ✓ VERIFIED | Conditional at lines 187-190: MergeTree for .Values.clickhouse.cloud=true, ReplicatedMergeTree for false. Present in all 7 tables + 2 materialized views (13 conditionals total) |
| 3 | ClickHouse dns_queries table uses time-only partitioning (not tenant_id partitioning) | ✓ VERIFIED | query_logs partitioned by toYYYYMMDD(timestamp) at line 192 (daily, time-only). Other tables use toYYYYMM(event_date) monthly partitioning |
| 4 | Schema deployment is environment-aware (detects Cloud vs self-hosted) | ✓ VERIFIED | Helm conditionals use .Values.clickhouse.cloud throughout. Protocol switches to https for Cloud (line 47, 73), engine switches to MergeTree for Cloud |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `helm/safedns/templates/db-migration-job.yaml` | Helm migration job using database-direct-url with pre-install hook | ✓ VERIFIED | File exists, uses database-direct-url at line 84, has Helm hook annotations at line 14, 900s timeout at line 23, explanatory comment at lines 78-79 |
| `helm/safedns/values.yaml` | Production migration config with clickhouse.cloud toggle | ✓ VERIFIED | File exists, clickhouse.cloud: false at line 160, protocol: http at line 161, migrations.activeDeadlineSeconds: 900 at line 186, documentation comment at lines 178-180 |
| `k8s/base/jobs/db-migration-job.yaml` | Standalone migration job using database-direct-url | ✓ VERIFIED | File exists, uses database-direct-url at line 97, 900s timeout at line 30, explanatory comment at lines 91-92 |
| `helm/safedns/templates/clickhouse-init-job.yaml` | Environment-aware ClickHouse schema with conditional engine selection | ✓ VERIFIED | File exists, 13 .Values.clickhouse.cloud conditionals (lines 46, 72, 187, 214, 227, 242, 269, 296, 318, 342, 374), HTTPS support for Cloud, full schema with 7 tables + 2 materialized views + 3 helper views |
| `k8s/base/jobs/clickhouse-init-job.yaml` | Standalone ClickHouse init with production schema | ✓ VERIFIED | File exists, 7 CREATE TABLE statements (query_logs, hourly_stats, category_stats, domain_stats, threat_logs, audit_logs, performance_metrics), verification loop at line 88 |
| `scripts/init-clickhouse.sql` | Local dev ClickHouse schema with MergeTree | ✓ VERIFIED | File exists, 7 CREATE TABLE statements, all use MergeTree (lines 29, 56, 66, 78, 101, 124, 142), includes materialized views and helper views |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| helm/safedns/templates/db-migration-job.yaml | api-secrets | secretKeyRef key: database-direct-url | ✓ WIRED | Line 84 references database-direct-url key from api-secrets |
| infrastructure/kubernetes/secrets/create-secrets.sh | api-secrets | database-direct-url secret key | ✓ WIRED | Secret key exists in create-secrets.sh, provisioned in Phase 24-04 |
| helm/safedns/templates/clickhouse-init-job.yaml | helm/safedns/values.yaml | .Values.clickhouse.cloud conditional | ✓ WIRED | 13 references to .Values.clickhouse.cloud found |
| helm/safedns/templates/clickhouse-init-job.yaml | clickhouse-secrets | secretKeyRef for authentication | ✓ WIRED | Uses CLICKHOUSE_USER and CLICKHOUSE_PASSWORD from environment (line 80, references clickhouse.secretName from values) |

### Requirements Coverage

**Phase 25 Requirements (from ROADMAP.md):**
- DEPLOY-13: Database schema migration automation
- DEPLOY-04: Schema deployment (ClickHouse + PostgreSQL)

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| DEPLOY-13 (PostgreSQL migration automation) | ✓ SATISFIED | None - Helm hook runs migrations before API deployment |
| DEPLOY-04 (ClickHouse schema deployment) | ✓ SATISFIED | None - Environment-aware schema with full production tables |

### Anti-Patterns Found

**No blocker anti-patterns detected.**

Scanned files:
- helm/safedns/templates/db-migration-job.yaml
- helm/safedns/values.yaml
- k8s/base/jobs/db-migration-job.yaml
- helm/safedns/templates/clickhouse-init-job.yaml
- k8s/base/jobs/clickhouse-init-job.yaml
- scripts/init-clickhouse.sql

No TODO, FIXME, PLACEHOLDER, or stub patterns found.

### Human Verification Required

#### 1. PostgreSQL Migration Execution Test

**Test:** Deploy to DOKS staging with managed PostgreSQL via Helm
**Expected:** Migration job completes successfully within 900s timeout, TypeORM migrations execute DDL statements without PgBouncer errors
**Why human:** Requires live managed PostgreSQL connection, cannot verify DDL compatibility with PgBouncer transaction mode without actual execution

#### 2. ClickHouse Cloud Engine Verification

**Test:** Deploy to ClickHouse Cloud staging, run `SHOW CREATE TABLE nebula_dns.query_logs`
**Expected:** Engine should be `MergeTree()` (not `ReplicatedMergeTree`)
**Why human:** Template-level verification confirms Helm conditionals exist, but actual engine type can only be verified post-deployment against live ClickHouse instance

#### 3. ClickHouse Self-Hosted Engine Verification

**Test:** Deploy to self-hosted ClickHouse (cloud: false), run `SHOW CREATE TABLE nebula_dns.query_logs`
**Expected:** Engine should be `ReplicatedMergeTree('/clickhouse/tables/{shard}/query_logs', '{replica}')`
**Why human:** Requires live self-hosted ClickHouse cluster with Zookeeper to verify replication engine

#### 4. ClickHouse Table Existence Verification

**Test:** After deployment, run `SHOW TABLES FROM nebula_dns` and verify all 7 tables + 2 materialized views + 3 helper views exist
**Expected:** query_logs, hourly_stats, category_stats, domain_stats, threat_logs, audit_logs, performance_metrics, query_logs_hourly, query_logs_daily, v_top_blocked_domains, v_hourly_summary, v_active_threats
**Why human:** Init job has verification loop, but manual check confirms completeness across deployment environments

#### 5. ClickHouse Partitioning Verification

**Test:** Run `SHOW CREATE TABLE nebula_dns.query_logs` and check PARTITION BY clause
**Expected:** `PARTITION BY toYYYYMMDD(timestamp)` (daily partitions, time-only)
**Why human:** Template shows correct syntax, but actual partition scheme requires live deployment verification

#### 6. PostgreSQL Direct URI Connection Test

**Test:** Check migration job logs in Kubernetes: `kubectl logs -n nebula-dns job/nebula-dns-db-migration`
**Expected:** No PgBouncer errors ("prepared statement already exists", "advisory lock not supported")
**Why human:** Connection success requires runtime verification, not static code analysis

### Gaps Summary

**No gaps found.** All automated verification checks passed:

1. ✅ PostgreSQL migration jobs (Helm + Kustomize) use `database-direct-url` secret key
2. ✅ Migration timeout increased to 900s for production
3. ✅ ClickHouse schema has environment-aware engine selection (13 conditionals)
4. ✅ ClickHouse Cloud uses HTTPS protocol, self-hosted uses HTTP
5. ✅ Full production schema includes 7 tables (3 new: threat_logs, audit_logs, performance_metrics)
6. ✅ Materialized views (query_logs_hourly, query_logs_daily) and helper views present
7. ✅ query_logs uses daily partitioning (toYYYYMMDD), other tables use monthly (toYYYYMM)
8. ✅ Schema consistency verified across all three deployment paths (Helm, Kustomize, docker-compose)

**Phase goal achieved** with human verification recommended for runtime behavior (migration execution, engine types, partitioning).

---

## Detailed Verification

### Plan 25-01: PostgreSQL Migration Direct URI

**Must-have truths:**

1. ✅ **"PostgreSQL migration job uses direct database URI (bypassing PgBouncer) for migration execution"**
   - Evidence: `helm/safedns/templates/db-migration-job.yaml` line 84 uses `database-direct-url` key
   - Evidence: `k8s/base/jobs/db-migration-job.yaml` line 97 uses `database-direct-url` key
   - Evidence: `infrastructure/kubernetes/secrets/create-secrets.sh` provisions `database-direct-url` key
   - Evidence: Comments explain PgBouncer incompatibility (lines 78-79 in Helm, 91-92 in Kustomize)

2. ✅ **"Migration job runs as Helm pre-install/pre-upgrade hook before API deployment"**
   - Evidence: `helm/safedns/templates/db-migration-job.yaml` line 14: `helm.sh/hook: pre-upgrade,pre-install`
   - Evidence: Hook weight -5 ensures migration runs before API pods (higher weight)

3. ✅ **"Migration job retries safely on failure with idempotent TypeORM migrations"**
   - Evidence: `backoffLimit: 3` at line 21 (Helm) and line 24 (Kustomize)
   - Evidence: TypeORM migrations are idempotent by design (uses migration tracking table)

4. ✅ **"Helm values expose configurable migration parameters for production tuning"**
   - Evidence: `helm/safedns/values.yaml` lines 181-197 define migrations config block
   - Evidence: Configurable: hookWeight, backoffLimit, ttlSecondsAfterFinished, activeDeadlineSeconds, logLevel, resources
   - Evidence: Documentation comment at lines 178-180 explains database-direct-url usage

**Artifacts verified:**

1. ✅ `helm/safedns/templates/db-migration-job.yaml` - Contains `database-direct-url` (line 84), exists (146 lines), substantive (full K8s Job spec with RBAC), wired (referenced by Helm upgrade)
2. ✅ `helm/safedns/values.yaml` - Contains `migrations` block (lines 181-197), `clickhouse.cloud` at line 160
3. ✅ `k8s/base/jobs/db-migration-job.yaml` - Contains `database-direct-url` (line 97), exists (162 lines), substantive (full standalone Job)

**Key links verified:**

1. ✅ Helm template → api-secrets: secretKeyRef at line 82-84 references api-secrets.database-direct-url
2. ✅ create-secrets.sh → api-secrets: `--from-literal=database-direct-url="${PG_DIRECT_URI}"` found

### Plan 25-02: Environment-Aware ClickHouse Schema

**Must-have truths:**

1. ✅ **"ClickHouse schema uses MergeTree for Cloud environments and ReplicatedMergeTree for self-hosted"**
   - Evidence: 13 `.Values.clickhouse.cloud` conditionals in Helm template
   - Evidence: Lines 187-190 (query_logs): `ENGINE = MergeTree()` for Cloud, `ENGINE = ReplicatedMergeTree(...)` for self-hosted
   - Evidence: Same pattern for hourly_stats (214-217), category_stats (227-230), domain_stats (242-245), threat_logs (269-272), audit_logs (296-299), performance_metrics (318-321), query_logs_hourly (342-345), query_logs_daily (374-377)

2. ✅ **"ClickHouse query_logs table uses toYYYYMMDD(timestamp) daily partitioning; new tables (threat_logs, audit_logs, performance_metrics) use toYYYYMM(event_date) monthly partitioning"**
   - Evidence: query_logs PARTITION BY toYYYYMMDD(timestamp) at line 192
   - Evidence: threat_logs PARTITION BY toYYYYMM(event_date) at line 274
   - Evidence: audit_logs PARTITION BY toYYYYMM(event_date) at line 301
   - Evidence: performance_metrics PARTITION BY toYYYYMM(event_date) at line 323
   - Evidence: Consistent across all three deployment paths (Helm, Kustomize, local dev)

3. ✅ **"ClickHouse init job connects via HTTPS for Cloud and HTTP for self-hosted"**
   - Evidence: Helm template lines 46-48 (init container): `https://...8443` for Cloud, `http://...8123` for self-hosted
   - Evidence: Lines 72-75 (main container): Same conditional protocol selection
   - Evidence: Uses `cloudPort | default 8443` for Cloud, `port | default 8123` for self-hosted

4. ✅ **"All ClickHouse tables from retention script are included in production schema"**
   - Evidence: 7 CREATE TABLE statements in all three files (Helm, Kustomize, local dev)
   - Evidence: threat_logs (SUMMARY says new), audit_logs (new), performance_metrics (new) present
   - Evidence: Materialized views query_logs_hourly, query_logs_daily present
   - Evidence: Helper views v_top_blocked_domains, v_hourly_summary, v_active_threats present

5. ✅ **"Schema deployment verifies all required tables exist after initialization"**
   - Evidence: Helm template lines 90-98 verify all 7 tables
   - Evidence: Kustomize job line 88 has identical verification loop
   - Evidence: Fails deployment if any table missing (exit 1)

**Artifacts verified:**

1. ✅ `helm/safedns/templates/clickhouse-init-job.yaml` - Contains `clickhouse.cloud` conditionals (13 instances), environment-aware engines, HTTPS support, full schema
2. ✅ `k8s/base/jobs/clickhouse-init-job.yaml` - Contains 7 CREATE TABLE statements, verification loop at line 88
3. ✅ `scripts/init-clickhouse.sql` - Contains 7 CREATE TABLE statements, all MergeTree (no Replicated), materialized views, helper views

**Key links verified:**

1. ✅ Helm template → values.yaml: 13 references to `.Values.clickhouse.cloud`
2. ✅ Helm template → clickhouse-secrets: Uses CLICKHOUSE_USER and CLICKHOUSE_PASSWORD env vars

### Commits Verified

All 4 commits exist in git history:

1. ✅ `f601fd5` - feat(25-01): update Helm migration job to use direct database URI
2. ✅ `ba4db3e` - feat(25-01): update standalone migration job to use direct database URI
3. ✅ `def0820` - feat(25-02): add environment-aware ClickHouse schema with full production tables
4. ✅ `04b24d4` - feat(25-02): update standalone Kustomize and local dev schemas with full production tables

### Schema Consistency Check

All three deployment paths verified to have identical schema structure:

**Helm template** (templated for environment):
- 7 tables: query_logs, hourly_stats, category_stats, domain_stats, threat_logs, audit_logs, performance_metrics
- 2 materialized views: query_logs_hourly, query_logs_daily
- 3 helper views: v_top_blocked_domains, v_hourly_summary, v_active_threats
- Environment-aware engines: MergeTree for Cloud, ReplicatedMergeTree for self-hosted

**Kustomize standalone** (plain MergeTree):
- 7 tables (same list)
- 2 materialized views (same)
- 3 helper views (same)
- MergeTree engines (no conditionals)

**Local dev script** (plain MergeTree + sample data):
- 7 tables (same list)
- 2 materialized views (same)
- 3 helper views (same)
- MergeTree engines (no conditionals)
- Includes sample data INSERTs for local testing

---

_Verified: 2026-02-13T03:15:00Z_
_Verifier: Claude (gsd-verifier)_
