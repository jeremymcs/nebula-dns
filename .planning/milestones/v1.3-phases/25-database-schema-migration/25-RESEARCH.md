# Phase 25: Database Schema Migration - Research

// Nebula DNS Phase 25 Research
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Researched:** 2026-02-12
**Domain:** Database schema deployment, Helm hooks, TypeORM migrations, ClickHouse schema initialization
**Confidence:** HIGH

## Summary

Phase 25 focuses on deploying database schemas to production-compatible infrastructure provisioned in Phase 24. The research reveals that database migrations in Kubernetes are best handled through Helm pre-install/pre-upgrade hooks, which ensure schema changes are applied atomically before new application versions start. The key challenge is adapting ClickHouse schema for Cloud vs self-hosted environments, specifically using MergeTree (not ReplicatedMergeTree) for ClickHouse Cloud, and implementing time-only partitioning for optimal performance.

TypeORM provides a mature migrations framework with transaction control and metadata tracking, though idempotency requires careful coding patterns. ClickHouse Cloud handles replication automatically, making Replicated* engine prefixes optional (and potentially problematic). The existing Helm hooks in the codebase (weight -10 for ClickHouse, weight -5 for PostgreSQL) follow best practices for execution order and cleanup policies.

**Primary recommendation:** Use Helm hooks for migration automation, make ClickHouse schema environment-aware through configuration (not runtime detection), ensure TypeORM migrations are idempotent where possible, and implement comprehensive verification scripts to validate schema deployment success.

## Standard Stack

### Core Migration Tools

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| **TypeORM** | 0.3.19+ | PostgreSQL migrations | NestJS-native ORM, mature migrations system, transaction control, widely adopted in Node.js ecosystem |
| **Helm** | 3.14+ | Migration orchestration | Industry standard for K8s deployments, hook system designed for pre-install/pre-upgrade operations |
| **ClickHouse Client** | 24+ | ClickHouse schema execution | Official client for ClickHouse, supports batch SQL execution, built-in health checks |
| **kubectl** | 1.30+ | Migration job management | Standard Kubernetes CLI for job monitoring and log retrieval |

**Installation:**
```bash
# Already installed in Phase 24
helm version  # Should be 3.14+
kubectl version --client  # Should be 1.30+

# TypeORM migrations (via npm scripts)
cd api
npm run migration:show    # Check migration status
npm run migration:run     # Execute pending migrations
npm run migration:revert  # Rollback last migration
```

### Supporting Tools

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| **pg_dump/pg_restore** | 16+ | PostgreSQL backups | Pre-migration backups, disaster recovery |
| **psql** | 16+ | Manual PostgreSQL inspection | Verify schema changes, debug migration issues |
| **clickhouse-client** | 24+ | Manual ClickHouse inspection | Verify tables created, check partitions |
| **stern** | 1.28+ | Multi-pod log tailing | Monitor migration job logs in real-time |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Helm hooks | Init containers | Init containers run per pod (not once per deployment), harder to implement atomic migrations |
| TypeORM | Knex.js migrations | Knex is more flexible but requires manual migration writing, TypeORM auto-generates from entities |
| TypeORM | Flyway/Liquibase | Java-based tools, more mature but adds Java runtime dependency to Node.js stack |
| SQL scripts in ConfigMap | TypeORM migrations | ConfigMaps work for simple cases, but lack rollback support and transaction control |

## Architecture Patterns

### Recommended Migration Structure

```
api/src/database/
├── migrations/                    # TypeORM migration files
│   ├── 1701900000000-InitialSchema.ts
│   ├── 1702100000000-SyncEntitySchemas.ts
│   └── 1737500000000-CreateAlertConfig.ts
├── data-source.ts                 # TypeORM DataSource config
└── seeds/                         # Optional seed data

scripts/
├── init-postgres.sql              # Full PostgreSQL schema (dev/testing)
├── init-clickhouse.sql            # ClickHouse schema (dev/testing)
└── init-clickhouse-retention.sql  # TTL policies

helm/safedns/templates/
├── db-migration-job.yaml          # Helm hook for PostgreSQL
└── clickhouse-init-job.yaml       # Helm hook for ClickHouse

k8s/base/jobs/
├── db-migration-job.yaml          # Standalone migration job
└── clickhouse-init-job.yaml       # Standalone ClickHouse init
```

### Pattern 1: Helm Hook-Based Migration Lifecycle

**What:** Use Helm pre-install/pre-upgrade hooks to run database migrations before deploying new application versions.

**When to use:** Production deployments where schema changes must be applied atomically before code changes.

**Example:**
```yaml
# helm/safedns/templates/db-migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "safedns.fullname" . }}-db-migration
  annotations:
    helm.sh/hook: pre-upgrade,pre-install
    helm.sh/hook-weight: "-5"
    helm.sh/hook-delete-policy: before-hook-creation
spec:
  backoffLimit: 3
  ttlSecondsAfterFinished: 300
  activeDeadlineSeconds: 600
  template:
    spec:
      initContainers:
        - name: wait-for-postgres
          image: busybox:1.36
          command: ['sh', '-c', 'until nc -z postgres 5432; do sleep 2; done']
      containers:
        - name: migration
          image: "{{ .Values.api.image.repository }}:{{ .Values.api.image.tag }}"
          command: ['npm', 'run', 'migration:run']
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: database-url
```

**Sources:**
- [How to Use Helm Hooks for Pre/Post Install and Upgrade Jobs](https://oneuptime.com/blog/post/2026-01-17-helm-hooks-pre-post-install-upgrade/view)
- [Database migrations on Kubernetes using Helm hooks](https://itnext.io/database-migrations-on-kubernetes-using-helm-hooks-fb80c0d97805)

### Pattern 2: Environment-Aware ClickHouse Schema

**What:** Use conditional SQL generation in Helm templates to create MergeTree or ReplicatedMergeTree based on environment configuration.

**When to use:** When deploying to both ClickHouse Cloud (managed) and self-hosted ClickHouse (requires replication).

**Example:**
```yaml
# helm/safedns/templates/clickhouse-init-job.yaml
data:
  init-clickhouse.sql: |
    CREATE TABLE IF NOT EXISTS {{ .Values.clickhouse.database }}.query_logs
    (
        timestamp DateTime64(3),
        tenant_id UUID,
        domain String,
        -- ... other columns
    )
    {{- if .Values.clickhouse.cloud }}
    ENGINE = MergeTree()  -- ClickHouse Cloud handles replication
    {{- else }}
    ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/query_logs', '{replica}')
    {{- end }}
    PARTITION BY toYYYYMMDD(timestamp)  -- Time-only partitioning
    ORDER BY (tenant_id, timestamp)
    TTL toDateTime(timestamp) + INTERVAL {{ .Values.clickhouse.retentionDays }} DAY;
```

**Why time-only partitioning (not tenant_id):**
- ClickHouse partitions must be manageable in size (100GB-1TB per partition)
- Tenant-based partitioning creates too many small partitions (1-10 tenants × daily partitions = excessive metadata)
- Time-based partitioning enables efficient TTL-based cleanup
- Tenant filtering in ORDER BY provides sufficient query performance

**Sources:**
- [Data Replication | ClickHouse Docs](https://docs-content.clickhouse.tech/docs/en/engines/table-engines/mergetree-family/replication)
- [ClickHouse MergeTree: Introduction to ReplicatedMergeTree](https://chistadata.com/replicated-mergetree-clickhouse/)

### Pattern 3: Idempotent TypeORM Migrations

**What:** Write migrations that can be run multiple times safely, crucial for Kubernetes retry logic.

**When to use:** Always, especially for production migrations that may be retried due to transient failures.

**Example:**
```typescript
// Migration: AddEmailVerification1234567890000.ts
export class AddEmailVerification1234567890000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check before adding column
    const hasColumn = await queryRunner.hasColumn('users', 'email_verified');
    if (!hasColumn) {
      await queryRunner.addColumn('users', new TableColumn({
        name: 'email_verified',
        type: 'boolean',
        default: false,
      }));
    }

    // Use CREATE IF NOT EXISTS
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email_verified
      ON users(email_verified)
      WHERE email_verified = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('users', 'email_verified');
    if (hasColumn) {
      await queryRunner.dropColumn('users', 'email_verified');
    }
  }
}
```

**Sources:**
- [TypeORM Migrations](https://orkhan.gitbook.io/typeorm/docs/migrations)
- [Migration strategies - TypeORM Guide](https://app.studyraid.com/en/read/10725/326747/migration-strategies)

### Pattern 4: Hook Weight and Deletion Policy

**What:** Control execution order and cleanup behavior of Helm hooks through annotations.

**When to use:** Multiple hooks need coordinated execution (e.g., ClickHouse before PostgreSQL before API).

**Example:**
```yaml
# ClickHouse init (runs first)
metadata:
  annotations:
    helm.sh/hook: pre-upgrade,pre-install
    helm.sh/hook-weight: "-10"
    helm.sh/hook-delete-policy: before-hook-creation

---
# PostgreSQL migration (runs second)
metadata:
  annotations:
    helm.sh/hook: pre-upgrade,pre-install
    helm.sh/hook-weight: "-5"
    helm.sh/hook-delete-policy: before-hook-creation

---
# API deployment (runs last, default weight: 0)
```

**Hook deletion policies:**
- `before-hook-creation`: Delete old job before creating new one (prevents "job already exists" errors)
- `hook-succeeded`: Keep job on failure for debugging, delete on success
- Combine both for production-ready pattern

**Sources:**
- [How to Build Helm Hooks Advanced](https://oneuptime.com/blog/post/2026-01-30-helm-hooks-advanced/view)
- [Deploying schema migrations to Kubernetes with Helm](https://atlasgo.io/guides/deploying/helm)

### Anti-Patterns to Avoid

- **Manual migrations in CI/CD:** Running migrations via kubectl exec in CI is error-prone; use Helm hooks for atomic deployment
- **Migrations in application startup:** Race conditions with multiple pod replicas, no transaction control
- **Tenant-based ClickHouse partitioning:** Creates excessive partition metadata, poor TTL performance for 1-10 tenant scale
- **Non-idempotent migrations in Kubernetes:** Retry logic will fail on duplicate key/constraint errors
- **Using ReplicatedMergeTree in ClickHouse Cloud:** Cloud handles replication automatically; Replicated* engines cause configuration errors

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration state tracking | Custom migration table and versioning | TypeORM migrations metadata table | TypeORM tracks applied migrations, handles transactions, prevents duplicate execution |
| Database connection waiting | Polling loops in migration script | Init containers with health checks | Kubernetes-native pattern, proper backoff, clear failure signals |
| Schema rollback logic | Custom undo SQL generation | TypeORM `down()` methods | Tested, transaction-wrapped, integrated with migration:revert command |
| ClickHouse schema detection | Runtime cloud vs self-hosted detection | Helm values configuration | Detection requires system table queries (complex), config-based is explicit and testable |
| Helm hook retry logic | Manual retry in migration script | Kubernetes Job backoffLimit | K8s handles exponential backoff, timeout management, failure reporting |

**Key insight:** Database migration tooling (TypeORM, Helm hooks, K8s Jobs) solves complex edge cases around concurrent execution, transaction isolation, state tracking, and failure recovery. Custom solutions inevitably rediscover these problems in production.

## Common Pitfalls

### Pitfall 1: Migration Job Timeout on Large Migrations

**What goes wrong:** Default 10-minute timeout (`activeDeadlineSeconds: 600`) is insufficient for migrations with large data backfills, causing job termination mid-transaction.

**Why it happens:** Helm hook timeout must account for worst-case migration duration, including data migration and index creation on large tables.

**How to avoid:**
- Set appropriate timeout in `values.yaml`:
  ```yaml
  migrations:
    activeDeadlineSeconds: 1200  # 20 minutes for production
    backoffLimit: 3              # Allow 3 retries
  ```
- Test migrations on production-sized data in staging
- Split large migrations into multiple smaller migrations
- Consider read-only mode for major schema changes

**Warning signs:**
- Migration job shows `DeadlineExceeded` status
- Logs indicate long-running ALTER TABLE operations
- Database shows incomplete schema changes after timeout

### Pitfall 2: ClickHouse Cloud Schema Incompatibility

**What goes wrong:** Using ReplicatedMergeTree in ClickHouse Cloud causes "Unknown engine" or "Replication not configured" errors, because Cloud manages replication automatically.

**Why it happens:** Self-hosted ClickHouse requires Replicated* engines for multi-replica setups; Cloud abstracts this away and doesn't expose ZooKeeper configuration.

**How to avoid:**
- Use environment-aware schema generation in Helm templates:
  ```yaml
  clickhouse:
    cloud: true  # Set to false for self-hosted
  ```
- Template engine selection:
  ```sql
  {{- if .Values.clickhouse.cloud }}
  ENGINE = MergeTree()
  {{- else }}
  ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/query_logs', '{replica}')
  {{- end }}
  ```
- Document environment-specific requirements in README

**Warning signs:**
- ClickHouse init job fails with "ENGINE ReplicatedMergeTree: code: 36"
- Error mentions "no such engine" or "zookeeper_path"
- Schema works in docker-compose but fails in Cloud

**Sources:**
- [ClickHouse Cloud vs Self-Hosted Analysis](https://oneuptime.com/blog/post/2026-01-21-clickhouse-cloud-vs-self-hosted/view)

### Pitfall 3: Non-Idempotent Migrations Breaking Kubernetes Retries

**What goes wrong:** Migration job fails partway through, Kubernetes retries it (backoffLimit), and retry fails on "duplicate key" or "column already exists" errors.

**Why it happens:** TypeORM doesn't enforce idempotency; developers write migrations assuming single execution, but K8s retry logic requires safe re-execution.

**How to avoid:**
- Check existence before operations:
  ```typescript
  if (!await queryRunner.hasTable('new_table')) {
    await queryRunner.createTable(new Table({ name: 'new_table', ... }));
  }

  const hasColumn = await queryRunner.hasColumn('users', 'new_column');
  if (!hasColumn) {
    await queryRunner.addColumn('users', ...);
  }
  ```
- Use PostgreSQL `IF NOT EXISTS` clauses:
  ```sql
  CREATE TABLE IF NOT EXISTS users (...);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
  ```
- Test migrations with manual rollback and re-run:
  ```bash
  npm run migration:run
  npm run migration:revert
  npm run migration:run  # Should succeed
  ```

**Warning signs:**
- Migration job shows 2-3 failed attempts before success
- Logs show "duplicate key value" or "relation already exists"
- Migration succeeded but Job status is `BackoffLimitExceeded`

**Sources:**
- [TypeORM Migrations Guide](https://www.tutorialspoint.com/typeorm/typeorm_migrations.htm)
- [Migrations best practices - Medium](https://medium.com/@buildbot.tech/migrations-guide-7d3a493dde5d)

### Pitfall 4: Incorrect Hook Weight Causing API Start Before Migration

**What goes wrong:** API pods start before PostgreSQL migration completes, causing "relation does not exist" errors in API logs.

**Why it happens:** Helm hooks with equal or higher weights run in parallel with application deployment; incorrect weight causes race condition.

**How to avoid:**
- Use negative weights for pre-deployment hooks:
  ```yaml
  # ClickHouse: -10 (runs first)
  helm.sh/hook-weight: "-10"

  # PostgreSQL: -5 (runs second)
  helm.sh/hook-weight: "-5"

  # API: 0 (default, runs last)
  ```
- Verify execution order in dry-run:
  ```bash
  helm upgrade nebula-dns ./helm/safedns --dry-run --debug | grep hook-weight
  ```
- Monitor hook completion with `--wait` flag:
  ```bash
  helm upgrade nebula-dns ./helm/safedns --wait --timeout 15m
  ```

**Warning signs:**
- API pods crash-loop immediately after deployment
- API logs show "relation 'users' does not exist"
- Migration job is still running when API starts

**Sources:**
- [Helm Hooks Advanced Usage](https://oneuptime.com/blog/post/2026-01-30-helm-hooks-advanced/view)

## Code Examples

Verified patterns from official sources and existing codebase:

### Example 1: Complete Migration Job with Init Container

```yaml
# Source: helm/safedns/templates/db-migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "safedns.fullname" . }}-db-migration
  annotations:
    helm.sh/hook: pre-upgrade,pre-install
    helm.sh/hook-weight: "-5"
    helm.sh/hook-delete-policy: before-hook-creation
spec:
  backoffLimit: 3
  ttlSecondsAfterFinished: 300
  activeDeadlineSeconds: 600

  template:
    metadata:
      labels:
        app.kubernetes.io/component: db-migration
    spec:
      restartPolicy: Never
      serviceAccountName: {{ include "safedns.fullname" . }}-db-migration

      initContainers:
        - name: wait-for-postgres
          image: busybox:1.36
          command:
            - 'sh'
            - '-c'
            - |
              echo "Waiting for PostgreSQL..."
              until nc -z {{ .Values.postgresql.host }} {{ .Values.postgresql.port }}; do
                echo "PostgreSQL unavailable - sleeping"
                sleep 2
              done
              echo "PostgreSQL ready"

      containers:
        - name: migration
          image: "{{ .Values.api.image.repository }}:{{ .Values.api.image.tag }}"
          command: ['npm', 'run', 'migration:run']
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: database-url
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

### Example 2: Environment-Aware ClickHouse Schema

```yaml
# Source: helm/safedns/templates/clickhouse-init-job.yaml
data:
  init-clickhouse.sql: |
    CREATE DATABASE IF NOT EXISTS {{ .Values.clickhouse.database }};

    CREATE TABLE IF NOT EXISTS {{ .Values.clickhouse.database }}.query_logs
    (
        timestamp DateTime64(3),
        tenant_id UUID,
        location_id UUID,
        domain String,
        query_type String,
        action Enum8('allow' = 1, 'block' = 2, 'rewrite' = 3),
        -- ... other columns
    )
    {{- if .Values.clickhouse.cloud }}
    ENGINE = MergeTree()
    {{- else }}
    ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/query_logs', '{replica}')
    {{- end }}
    PARTITION BY toYYYYMMDD(timestamp)
    ORDER BY (tenant_id, timestamp)
    TTL toDateTime(timestamp) + INTERVAL {{ .Values.clickhouse.retentionDays | default 90 }} DAY
    SETTINGS index_granularity = 8192;
```

### Example 3: Idempotent TypeORM Migration

```typescript
// Source: Verified pattern from TypeORM best practices
export class AddUserEmailVerification1234567890000 implements MigrationInterface {
  name = 'AddUserEmailVerification1234567890000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent column addition
    const hasColumn = await queryRunner.hasColumn('users', 'email_verified');
    if (!hasColumn) {
      await queryRunner.addColumn('users', new TableColumn({
        name: 'email_verified',
        type: 'boolean',
        default: false,
      }));
    }

    // Idempotent index creation (PostgreSQL 9.5+)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email_verified
      ON users(email_verified)
      WHERE email_verified = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('users', 'email_verified');
    if (hasColumn) {
      await queryRunner.dropColumn('users', 'email_verified');
    }
  }
}
```

### Example 4: Migration Verification Script

```bash
# Source: Best practice from Phase 24 infrastructure scripts
#!/bin/bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-nebula-dns}"

echo "=== Database Migration Verification ==="

# Check PostgreSQL migration status
echo "Checking PostgreSQL migrations..."
POD=$(kubectl get pods -n "$NAMESPACE" -l app=api -o jsonpath='{.items[0].metadata.name}')
if kubectl exec -n "$NAMESPACE" "$POD" -- npm run migration:show | grep -q "\[X\]"; then
  echo "✓ PostgreSQL migrations applied"
else
  echo "✗ No PostgreSQL migrations found"
  exit 1
fi

# Check ClickHouse tables
echo "Checking ClickHouse schema..."
TABLES=$(kubectl exec -n "$NAMESPACE" clickhouse-0 -- \
  clickhouse-client -q "SHOW TABLES FROM nebula_dns")

for table in query_logs hourly_stats category_stats domain_stats; do
  if echo "$TABLES" | grep -q "$table"; then
    echo "✓ Table $table exists"
  else
    echo "✗ Table $table missing"
    exit 1
  fi
done

# Verify ClickHouse partition strategy
echo "Verifying ClickHouse partitioning..."
PARTITION=$(kubectl exec -n "$NAMESPACE" clickhouse-0 -- \
  clickhouse-client -q "SELECT partition_key FROM system.tables WHERE database='nebula_dns' AND name='query_logs'")

if echo "$PARTITION" | grep -q "toYYYYMMDD"; then
  echo "✓ Time-based partitioning configured"
else
  echo "✗ Incorrect partitioning: $PARTITION"
  exit 1
fi

echo "=== All verifications passed ==="
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Migrations in app startup | Pre-upgrade Helm hooks | 2020-2021 | Prevents race conditions with multi-replica deployments |
| Manual kubectl exec | Automated Helm hooks | 2021-2022 | Atomic deployments, reduced human error |
| ReplicatedMergeTree everywhere | MergeTree for ClickHouse Cloud | 2023 (Cloud GA) | Simplified schema, Cloud manages replication |
| Tenant-based partitioning | Time-based partitioning | ClickHouse 20.3+ | Better TTL performance, manageable partition count |
| TypeORM 0.2.x migrations | TypeORM 0.3.x with DataSource API | 2022 | Improved transaction control, better TypeScript support |

**Deprecated/outdated:**
- **TypeORM Connection API:** Replaced with DataSource in 0.3.x (better connection pooling)
- **ClickHouse HTTP interface without batch inserts:** Use official @clickhouse/client for efficient bulk inserts
- **Manual migration state tracking:** TypeORM migrations table is standard
- **Hook deletion policy `hook-succeeded` only:** Combine with `before-hook-creation` for production robustness

## Open Questions

1. **ClickHouse Cloud automatic schema changes**
   - What we know: ClickHouse Cloud manages replication, requires MergeTree (not Replicated*)
   - What's unclear: Does Cloud support ALTER TABLE ADD COLUMN without downtime? How are schema changes applied to active services?
   - Recommendation: Test schema changes on ClickHouse Cloud trial account before production deployment; document downtime requirements if any

2. **PostgreSQL migration rollback strategy**
   - What we know: TypeORM supports `down()` methods for rollback, but not all schema changes are reversible
   - What's unclear: Production rollback procedure for data-destructive migrations (DROP COLUMN, etc.)
   - Recommendation: Implement pre-migration backup job in Helm hooks (weight -6), test backup/restore procedures in staging

3. **Next.js NEXT_PUBLIC_ variable refactoring**
   - What we know: NEXT_PUBLIC_ vars are baked at build time, not runtime
   - What's unclear: Does refactoring to runtime config affect this phase or defer to future deployment phase?
   - Recommendation: Document as Phase 25 blocker if runtime config is required for database URLs; otherwise defer to application deployment phase

4. **Migration job ServiceAccount RBAC permissions**
   - What we know: Migration job needs read access to api-secrets Secret
   - What's unclear: Should job have write permissions for backup creation? Read-only permissions sufficient?
   - Recommendation: Use minimal RBAC (read secrets only), implement backups via separate pre-hook Job if needed

## Sources

### Primary (HIGH confidence)
- [How to Use Helm Hooks for Pre/Post Install and Upgrade Jobs](https://oneuptime.com/blog/post/2026-01-17-helm-hooks-pre-post-install-upgrade/view) - 2026 best practices for Helm hooks
- [How to Build Helm Hooks Advanced](https://oneuptime.com/blog/post/2026-01-30-helm-hooks-advanced/view) - Advanced hook patterns and deletion policies
- [Database migrations on Kubernetes using Helm hooks](https://itnext.io/database-migrations-on-kubernetes-using-helm-hooks-fb80c0d97805) - Production-ready migration pattern
- [Deploying schema migrations to Kubernetes with Helm](https://atlasgo.io/guides/deploying/helm) - Schema migration deployment strategies
- [TypeORM Migrations](https://orkhan.gitbook.io/typeorm/docs/migrations) - Official TypeORM migration documentation
- [Data Replication | ClickHouse Docs](https://docs-content.clickhouse.tech/docs/en/engines/table-engines/mergetree-family/replication) - ClickHouse replication architecture
- [ClickHouse MergeTree: Introduction to ReplicatedMergeTree](https://chistadata.com/replicated-mergetree-clickhouse/) - Engine comparison

### Secondary (MEDIUM confidence)
- [ClickHouse Cloud vs Self-Hosted: Cost and Performance Analysis](https://oneuptime.com/blog/post/2026-01-21-clickhouse-cloud-vs-self-hosted/view) - Cloud vs self-hosted differences (2026)
- [ClickHouse schema migrations 2026](https://www.tinybird.co/blog/clickhouse-schema-migrations) - Safe schema change practices
- [Migration strategies - TypeORM Guide](https://app.studyraid.com/en/read/10725/326747/migration-strategies) - Migration design patterns
- [Migrations best practices - Medium](https://medium.com/@buildbot.tech/migrations-guide-7d3a493dde5d) - Team workflow guidance

### Tertiary (LOW confidence - existing codebase patterns)
- `/Users/jeremymcspadden/Github/nebula-dns/docs/DATABASE-MIGRATIONS.md` - Existing migration documentation (comprehensive)
- `/Users/jeremymcspadden/Github/nebula-dns/helm/safedns/templates/db-migration-job.yaml` - Current Helm hook implementation
- `/Users/jeremymcspadden/Github/nebula-dns/scripts/init-clickhouse.sql` - Current ClickHouse schema (uses MergeTree, not Replicated*)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - TypeORM, Helm, ClickHouse client are mature and verified in codebase
- Architecture patterns: HIGH - Helm hooks and migration patterns verified in multiple 2026 sources
- Pitfalls: HIGH - Common issues documented in existing codebase (DATABASE-MIGRATIONS.md), validated with research
- ClickHouse Cloud specifics: MEDIUM - Engine differences verified, but schema change procedures need testing on Cloud trial

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - stable domain, unlikely to change rapidly)
