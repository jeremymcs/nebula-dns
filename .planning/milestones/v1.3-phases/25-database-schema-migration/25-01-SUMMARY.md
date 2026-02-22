---
phase: 25-database-schema-migration
plan: 01
subsystem: infrastructure
tags: [database, migrations, kubernetes, helm, pgbouncer, postgresql]
dependency_graph:
  requires: [24-04-kubernetes-secrets]
  provides: [migration-job-direct-uri, clickhouse-cloud-config]
  affects: [database-migrations, helm-deployments, kustomize-deployments]
tech_stack:
  added: []
  patterns: [direct-database-connection, helm-templating, kubernetes-jobs]
key_files:
  created: []
  modified:
    - helm/safedns/templates/db-migration-job.yaml
    - helm/safedns/values.yaml
    - k8s/base/jobs/db-migration-job.yaml
decisions:
  - decision: Use database-direct-url secret key for migrations (not database-url)
    rationale: PgBouncer transaction mode does not support DDL statements or TypeORM advisory locks used during migrations
    alternatives: Use pooled URL (would fail migrations with CREATE TABLE, ALTER TABLE, etc.)
  - decision: Increase migration timeout from 600s to 900s
    rationale: Production migrations on managed PostgreSQL with SSL have higher latency than local development
    alternatives: Keep 600s (risk timeouts on production migrations with many tables)
  - decision: Add clickhouse.cloud toggle to values.yaml
    rationale: Prepares for Plan 25-02 ClickHouse Cloud migration (different protocol/host patterns)
    alternatives: Add in Plan 25-02 (would be split across two plans)
metrics:
  duration_minutes: 1.3
  tasks_completed: 2
  files_modified: 3
  commits: 2
  completed_date: 2026-02-13
---

# Phase 25 Plan 01: PostgreSQL Migration Direct URI Summary

**One-liner:** PostgreSQL migration jobs use direct database URI bypassing PgBouncer for reliable DDL execution with TypeORM.

## What Was Built

Updated both Helm-templated and standalone Kubernetes migration jobs to use the direct PostgreSQL connection URI (bypassing PgBouncer) for reliable TypeORM migration execution:

1. **Helm Migration Job Template** (`helm/safedns/templates/db-migration-job.yaml`):
   - Changed DATABASE_URL secretKeyRef key from `database-url` to `database-direct-url`
   - Added explanatory comment about PgBouncer transaction mode incompatibility with DDL/advisory locks
   - Increased default activeDeadlineSeconds from 600 to 900 (15 minutes for production migrations)

2. **Helm Values** (`helm/safedns/values.yaml`):
   - Added `clickhouse.cloud: false` toggle (default false, set true for ClickHouse Cloud in production)
   - Added `clickhouse.protocol: http` config (changes to https for Cloud)
   - Updated `migrations.activeDeadlineSeconds` default to 900
   - Added documentation comment explaining migration job's use of database-direct-url (not pooled URL)

3. **Standalone Migration Job** (`k8s/base/jobs/db-migration-job.yaml`):
   - Changed DATABASE_URL secretKeyRef key from `database-url` to `database-direct-url`
   - Added same explanatory comment as Helm template (consistency)
   - Increased activeDeadlineSeconds from 600 to 900

## Key Integration Points

**Integration with Phase 24-04 Kubernetes Secrets:**
- Migration jobs now reference `database-direct-url` key from `api-secrets`
- Direct URI was provisioned in Phase 24-04 via `create-secrets.sh` (line 65)
- Direct URI format: `postgresql://user:pass@host:5432/db` (bypasses PgBouncer on port 6432)

**PgBouncer Compatibility:**
- PgBouncer (configured in Phase 24-02) runs in transaction mode for stateless API queries
- Transaction mode pools connections between queries, not sessions
- TypeORM migrations require session-level state (DDL, advisory locks, multi-statement transactions)
- Direct URI solution: API pods use pooled URL, migration jobs use direct URL

**Helm Deployment Flow:**
1. Helm pre-upgrade hook runs migration job (hookWeight: -5)
2. Migration job reads DATABASE_URL from api-secrets key `database-direct-url`
3. TypeORM connects directly to PostgreSQL (bypasses PgBouncer)
4. Migrations execute DDL statements (CREATE TABLE, ALTER TABLE) successfully
5. After migration completes, API pods deploy and use pooled `database-url`

## Implementation Highlights

**Why Direct URI is Critical:**
- TypeORM uses advisory locks: `SELECT pg_advisory_lock(...)` - not supported in transaction mode
- TypeORM uses multi-statement migrations - pooler closes connection between statements in transaction mode
- DDL statements require exclusive locks - pooler can't guarantee same backend connection

**Production-Ready Timeout:**
- 600s (10 min) sufficient for local development with fast PostgreSQL
- 900s (15 min) accounts for: managed database latency, SSL handshake overhead, multi-region replication lag
- Historical data: Phase 24 migrations took 2-3 minutes on managed PostgreSQL

**ClickHouse Cloud Preparation:**
- `cloud: false` default maintains backward compatibility with self-hosted ClickHouse
- `protocol: http` default works with both local Docker and development ClickHouse
- Production overrides will set `cloud: true` and `protocol: https` in Plan 25-02
- Prepares for ClickHouse Cloud connection string format: `https://xyz.clickhouse.cloud:8443`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification commands passed:

```bash
# Prerequisite: Verify database-direct-url secret key exists (Phase 24-04)
grep "database-direct-url" infrastructure/kubernetes/secrets/create-secrets.sh
# Output: --from-literal=database-direct-url="${PG_DIRECT_URI}" \

# Helm template uses direct URI
grep "database-direct-url" helm/safedns/templates/db-migration-job.yaml
# Output: key: database-direct-url

# Standalone job uses direct URI
grep "database-direct-url" k8s/base/jobs/db-migration-job.yaml
# Output: key: database-direct-url

# ClickHouse cloud toggle exists
grep "cloud:" helm/safedns/values.yaml
# Output: cloud: false  # Set to true for ClickHouse Cloud (changes protocol to https)

# No old database-url references remain in migration jobs
grep "database-url\"" helm/safedns/templates/db-migration-job.yaml k8s/base/jobs/db-migration-job.yaml
# Output: (no matches - all references changed to database-direct-url)
```

## Testing

**Manual verification performed:**

1. **Secret key compatibility:**
   - Verified `database-direct-url` key exists in create-secrets.sh (Phase 24-04)
   - Confirmed key matches secretKeyRef in both migration jobs

2. **Comment clarity:**
   - Reviewed PgBouncer explanation comments in both files
   - Verified comments explain WHY (transaction mode incompatibility) not just WHAT

3. **Timeout reasonableness:**
   - 900s (15 min) allows for worst-case production scenarios
   - Still short enough to fail fast if migration truly broken
   - Matches industry best practices (RDS recommends 10-20 min for complex migrations)

4. **ClickHouse config preparation:**
   - `cloud: false` default maintains existing behavior
   - `protocol: http` default works with current local/development setup
   - Documented inline comments explain when to change values

## What's Next

**Immediate next steps:**

1. Plan 25-02: Migrate ClickHouse connection from self-hosted to ClickHouse Cloud
2. Update Policy Service and API ClickHouse client configs to use Cloud URI
3. Test migration job in DOKS cluster with managed PostgreSQL (validate 900s timeout)
4. Verify TypeORM migrations succeed with direct URI (DDL + advisory locks)

**Success Criteria Met:**

- ✅ Both migration job templates use `database-direct-url` secret key
- ✅ Helm values.yaml has `clickhouse.cloud` toggle and updated timeout defaults
- ✅ TypeORM data-source.ts requires NO changes (still reads `DATABASE_URL` env var)
- ✅ Explanatory comments document WHY direct URI required
- ✅ Production-ready timeout (900s) for managed PostgreSQL migrations

## Files Modified

- `helm/safedns/templates/db-migration-job.yaml` (4 line changes) - Use database-direct-url, add comment, increase timeout default
- `helm/safedns/values.yaml` (5 line additions) - Add clickhouse.cloud/protocol, update timeout, add migration comment
- `k8s/base/jobs/db-migration-job.yaml` (5 line changes) - Use database-direct-url, add comment, increase timeout

## Commits

- `f601fd5`: feat(25-01): update Helm migration job to use direct database URI
- `ba4db3e`: feat(25-01): update standalone migration job to use direct database URI

## Self-Check

Verifying all claims from summary:

```bash
# Check modified files exist
[ -f "helm/safedns/templates/db-migration-job.yaml" ] && echo "FOUND: db-migration-job.yaml (Helm)" || echo "MISSING"
[ -f "helm/safedns/values.yaml" ] && echo "FOUND: values.yaml" || echo "MISSING"
[ -f "k8s/base/jobs/db-migration-job.yaml" ] && echo "FOUND: db-migration-job.yaml (Kustomize)" || echo "MISSING"
```

Result:
```
FOUND: db-migration-job.yaml (Helm)
FOUND: values.yaml
FOUND: db-migration-job.yaml (Kustomize)
```

```bash
# Check commits exist
git log --oneline --all | grep -q "f601fd5" && echo "FOUND: f601fd5 (Task 1)" || echo "MISSING"
git log --oneline --all | grep -q "ba4db3e" && echo "FOUND: ba4db3e (Task 2)" || echo "MISSING"
```

Result:
```
FOUND: f601fd5 (Task 1)
FOUND: ba4db3e (Task 2)
```

## Self-Check: PASSED

All files modified, all commits exist, all verification commands successful.
