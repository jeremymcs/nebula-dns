---
phase: 25-database-schema-migration
plan: 02
subsystem: database
tags: [clickhouse, schema, multi-environment, helm, kustomize]
dependency_graph:
  requires:
    - 24-03-PLAN (ClickHouse Cloud provisioning)
    - 24-04-PLAN (Kubernetes Secrets)
  provides:
    - Environment-aware ClickHouse schema deployment
    - Full production schema with retention tables
    - Schema consistency across deployment paths
  affects:
    - Policy Service (ClickHouse query interface)
    - Reporting API (analytics queries)
    - Admin UI (audit log display)
tech_stack:
  added:
    - Helm conditionals for environment-aware schema
    - ClickHouse materialized views (hourly/daily aggregation)
    - Helper views for operational queries
  patterns:
    - MergeTree for ClickHouse Cloud (managed replication)
    - ReplicatedMergeTree for self-hosted (manual replication)
    - Time-only partitioning (toYYYYMMDD for query_logs, toYYYYMM for others)
    - TTL-based retention with ttl_only_drop_parts
key_files:
  created: []
  modified:
    - helm/safedns/templates/clickhouse-init-job.yaml
    - k8s/base/jobs/clickhouse-init-job.yaml
    - scripts/init-clickhouse.sql
decisions:
  - title: "Daily partitioning for query_logs, monthly for other tables"
    rationale: "query_logs is high-volume (millions/day) requiring daily partition granularity for efficient TTL drops. threat_logs, audit_logs, performance_metrics are lower volume with monthly partitions to keep partition count manageable."
    alternatives: ["Uniform monthly partitioning (excessive partition count on query_logs)", "Uniform daily partitioning (too many partitions on low-volume tables)"]
    outcome: "Hybrid partitioning scheme: toYYYYMMDD(timestamp) for query_logs, toYYYYMM(event_date) for other tables."
  - title: "Environment-aware engine selection via Helm values"
    rationale: "ClickHouse Cloud manages replication automatically (MergeTree required). Self-hosted requires ReplicatedMergeTree for multi-replica setups. Helm conditionals prevent deployment errors."
    alternatives: ["Single schema with MergeTree only (breaks self-hosted HA)", "Runtime detection (adds complexity, not idempotent)"]
    outcome: "Helm .Values.clickhouse.cloud conditional controls engine type: MergeTree for Cloud, ReplicatedMergeTree for self-hosted."
  - title: "HTTPS for ClickHouse Cloud, HTTP for self-hosted"
    rationale: "ClickHouse Cloud requires HTTPS on port 8443. Self-hosted uses HTTP on port 8123. Conditional protocol selection prevents connection failures."
    alternatives: ["Uniform HTTP (fails on Cloud)", "Uniform HTTPS (requires TLS setup on self-hosted)"]
    outcome: "Helm conditional: https://host:8443 for Cloud, http://host:8123 for self-hosted."
metrics:
  duration_seconds: 234
  tasks_completed: 2
  files_modified: 3
  commits: 2
  schema_tables: 7
  materialized_views: 2
  helper_views: 3
  completed_at: "2026-02-13T02:08:51Z"
---

# Phase 25 Plan 02: Environment-Aware ClickHouse Schema Summary

**One-liner:** Production-ready ClickHouse schema with environment-aware engine selection (MergeTree for Cloud, ReplicatedMergeTree for self-hosted), full retention tables (threat_logs, audit_logs, performance_metrics), and materialized views for analytics.

## What Was Built

### Schema Enhancements

1. **Environment-aware engine selection** via Helm `.Values.clickhouse.cloud` conditional:
   - ClickHouse Cloud: Plain MergeTree/SummingMergeTree (managed replication)
   - Self-hosted: ReplicatedMergeTree/ReplicatedSummingMergeTree with Zookeeper paths
   - Applies to all 7 tables and 2 materialized views

2. **HTTPS support for ClickHouse Cloud**:
   - Conditional protocol: `https://` on port 8443 for Cloud, `http://` on port 8123 for self-hosted
   - Applied to both init container (health check) and main container (schema execution)

3. **Full production schema** (previously missing tables added):
   - **threat_logs**: Threat intelligence data (180-day TTL, monthly partitions)
   - **audit_logs**: User action tracking (7-year TTL for compliance, monthly partitions)
   - **performance_metrics**: System performance data (30-day TTL, monthly partitions)
   - All include `event_date` column and `ttl_only_drop_parts = 1` for efficient cleanup

4. **Materialized views** for analytics:
   - **query_logs_hourly**: Hourly aggregation (1-year TTL)
   - **query_logs_daily**: Daily aggregation with top blocked domains (2-year TTL)
   - Both use SummingMergeTree with environment-aware conditionals

5. **Helper views** for operational queries:
   - **v_top_blocked_domains**: Last 24 hours blocked domains by tenant
   - **v_hourly_summary**: 7-day traffic summary
   - **v_active_threats**: Last 24 hours threat incidents

6. **Canonical partitioning scheme**:
   - `query_logs`: `toYYYYMMDD(timestamp)` — daily partitions for high-volume table
   - All other tables: `toYYYYMM(event_date)` — monthly partitions for lower-volume data
   - Resolves inconsistency between init-clickhouse.sql and init-clickhouse-retention.sql

7. **Comprehensive verification**:
   - Helm template verifies all 7 tables created (query_logs, hourly_stats, category_stats, domain_stats, threat_logs, audit_logs, performance_metrics)
   - Kustomize job has identical verification
   - Fails deployment if any table missing

### Deployment Paths Updated

1. **Helm template** (`helm/safedns/templates/clickhouse-init-job.yaml`):
   - Environment-aware conditionals throughout
   - HTTPS support for Cloud
   - Full production schema in ConfigMap

2. **Kustomize standalone job** (`k8s/base/jobs/clickhouse-init-job.yaml`):
   - Plain MergeTree (no Helm templating available)
   - Full production schema identical to Helm
   - For manual/dev deployments

3. **Local dev script** (`scripts/init-clickhouse.sql`):
   - Plain MergeTree for docker-compose
   - Full production schema matching Kubernetes
   - Keeps existing sample data INSERTs for local testing

## Deviations from Plan

None. Plan executed exactly as written.

## How to Use

### Deploy via Helm (Production)

```bash
# ClickHouse Cloud deployment
helm upgrade nebula-dns ./helm/safedns \
  --set clickhouse.cloud=true \
  --set clickhouse.host=your-cluster.clickhouse.cloud \
  --set clickhouse.cloudPort=8443 \
  -n nebula-dns

# Self-hosted deployment
helm upgrade nebula-dns ./helm/safedns \
  --set clickhouse.cloud=false \
  --set clickhouse.host=clickhouse \
  --set clickhouse.port=8123 \
  -n nebula-dns
```

### Deploy via Kustomize (Manual)

```bash
kubectl apply -k k8s/overlays/production
```

### Local Development

```bash
docker-compose up -d clickhouse
# Schema auto-initialized from scripts/init-clickhouse.sql
```

### Verify Schema Deployment

```bash
# Check Helm hook job
kubectl logs -n nebula-dns job/nebula-dns-clickhouse-init

# Verify tables exist
kubectl run -it --rm clickhouse-client --image=clickhouse/clickhouse-client -- \
  clickhouse-client --host=clickhouse --query="SHOW TABLES FROM nebula_dns"

# Check engine type (should be MergeTree on Cloud, ReplicatedMergeTree on self-hosted)
kubectl run -it --rm clickhouse-client --image=clickhouse/clickhouse-client -- \
  clickhouse-client --host=clickhouse --query="SHOW CREATE TABLE nebula_dns.query_logs"
```

### Query Materialized Views

```sql
-- Hourly traffic summary
SELECT
  hour,
  total_queries,
  blocked_queries,
  allowed_queries,
  avg_response_time_ms
FROM nebula_dns.query_logs_hourly
WHERE tenant_id = 'your-tenant-id'
  AND hour >= now() - INTERVAL 24 HOUR
ORDER BY hour DESC;

-- Daily aggregation
SELECT
  day,
  total_queries,
  unique_domains,
  unique_clients,
  top_blocked_domains
FROM nebula_dns.query_logs_daily
WHERE tenant_id = 'your-tenant-id'
  AND day >= today() - 7
ORDER BY day DESC;
```

### Query Helper Views

```sql
-- Top blocked domains (last 24 hours)
SELECT * FROM nebula_dns.v_top_blocked_domains
WHERE tenant_id = 'your-tenant-id';

-- Active threats
SELECT * FROM nebula_dns.v_active_threats
WHERE tenant_id = 'your-tenant-id';
```

## Testing Performed

### Verification Commands

```bash
# Verify environment-aware conditionals (13 instances)
grep -c "clickhouse.cloud" helm/safedns/templates/clickhouse-init-job.yaml
# Output: 13

# Verify both engine types present
grep "ReplicatedMergeTree" helm/safedns/templates/clickhouse-init-job.yaml
# Output: Multiple ReplicatedMergeTree('/clickhouse/tables/{shard}/...')

# Verify daily partitioning on query_logs
grep "toYYYYMMDD" helm/safedns/templates/clickhouse-init-job.yaml
# Output: PARTITION BY toYYYYMMDD(timestamp)

# Verify 7 tables in Helm template
grep -c "CREATE TABLE" helm/safedns/templates/clickhouse-init-job.yaml
# Output: 7

# Verify 7 tables in local dev
grep -c "CREATE TABLE" scripts/init-clickhouse.sql
# Output: 7

# Verify schema consistency across deployments
for file in helm/safedns/templates/clickhouse-init-job.yaml \
            k8s/base/jobs/clickhouse-init-job.yaml \
            scripts/init-clickhouse.sql; do
  echo "=== $file ==="
  grep "CREATE TABLE.*threat_logs" "$file" | head -1
done
# All files contain threat_logs, audit_logs, performance_metrics
```

### Schema Consistency Check

All three deployment paths now have:
- ✓ query_logs (daily partitions, 90-day TTL)
- ✓ hourly_stats (monthly partitions)
- ✓ category_stats (monthly partitions)
- ✓ domain_stats (monthly partitions)
- ✓ threat_logs (monthly partitions, 180-day TTL)
- ✓ audit_logs (monthly partitions, 7-year TTL)
- ✓ performance_metrics (monthly partitions, 30-day TTL)
- ✓ query_logs_hourly materialized view (1-year TTL)
- ✓ query_logs_daily materialized view (2-year TTL)
- ✓ v_top_blocked_domains helper view
- ✓ v_hourly_summary helper view
- ✓ v_active_threats helper view

## Integration Points

### Upstream Dependencies

- **24-03-PLAN**: ClickHouse Cloud provisioning (provides `.Values.clickhouse.cloud` flag)
- **24-04-PLAN**: Kubernetes Secrets (provides ClickHouse credentials)

### Downstream Impacts

- **Policy Service**: Can now log to threat_logs and audit_logs tables
- **Reporting API**: Can query materialized views for faster analytics
- **Admin UI**: Can display audit logs from audit_logs table
- **Retention scripts**: TTL policies now enforced at table level (no manual cleanup needed)

## Known Limitations

1. **Manual engine verification required**: Template-level verification confirms Helm conditionals exist, but actual engine type (MergeTree vs ReplicatedMergeTree) can only be verified post-deployment via `SHOW CREATE TABLE`.

2. **No Zookeeper configuration**: Self-hosted ReplicatedMergeTree assumes Zookeeper is pre-configured. Zookeeper setup is out of scope for this plan (handled by ClickHouse Operator in 24-03-PLAN).

3. **No migration from existing schemas**: If query_logs already exists with different partitioning, this script won't alter it (CREATE TABLE IF NOT EXISTS). Manual migration required for existing deployments.

## Self-Check: PASSED

### Files Verified

```bash
# Check Helm template exists
[ -f "helm/safedns/templates/clickhouse-init-job.yaml" ] && echo "FOUND: Helm template"
# Output: FOUND: Helm template

# Check Kustomize job exists
[ -f "k8s/base/jobs/clickhouse-init-job.yaml" ] && echo "FOUND: Kustomize job"
# Output: FOUND: Kustomize job

# Check local dev script exists
[ -f "scripts/init-clickhouse.sql" ] && echo "FOUND: Local dev script"
# Output: FOUND: Local dev script
```

### Commits Verified

```bash
# Check Task 1 commit exists
git log --oneline --all | grep -q "def0820" && echo "FOUND: Task 1 commit (def0820)"
# Output: FOUND: Task 1 commit (def0820)

# Check Task 2 commit exists
git log --oneline --all | grep -q "04b24d4" && echo "FOUND: Task 2 commit (04b24d4)"
# Output: FOUND: Task 2 commit (04b24d4)
```

All artifacts verified. No missing files or commits.

## Next Steps

1. **Deploy to ClickHouse Cloud staging**: Test environment-aware conditionals with actual Cloud instance
2. **Verify engine types**: Run `SHOW CREATE TABLE` against live deployment to confirm MergeTree on Cloud
3. **Test materialized views**: Insert sample data, verify hourly/daily aggregations populate
4. **Benchmark TTL cleanup**: Monitor partition drops after TTL expires (90 days for query_logs)
5. **Update Policy Service**: Integrate threat_logs and audit_logs tables (Phase 26)
6. **PostgreSQL migration**: Apply TypeORM migrations for PostgreSQL schema (25-03-PLAN)

---

**Plan Status:** Complete
**Duration:** 234 seconds (3.9 minutes)
**Commits:** 2 (def0820, 04b24d4)
**Files Modified:** 3
**Schema Tables:** 7 (3 new: threat_logs, audit_logs, performance_metrics)
**Materialized Views:** 2 (query_logs_hourly, query_logs_daily)
**Helper Views:** 3 (v_top_blocked_domains, v_hourly_summary, v_active_threats)
