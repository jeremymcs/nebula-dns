# Database Migrations Guide

**Nebula DNS - Database Migration Process**
Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

This guide covers database migration management in Kubernetes, including automated migrations during deployments, manual execution, rollback procedures, and troubleshooting.

## Table of Contents

1. [Overview](#overview)
2. [Automated Migrations](#automated-migrations)
3. [Manual Migration Execution](#manual-migration-execution)
4. [Rollback Procedures](#rollback-procedures)
5. [ClickHouse Initialization](#clickhouse-initialization)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Overview

Nebula DNS uses two database systems requiring initialization and migration:

- **PostgreSQL**: Relational data (policies, users, tenants) managed by TypeORM migrations
- **ClickHouse**: Analytics data (DNS query logs) with schema-only initialization

### Migration Architecture

```
Helm Upgrade → Pre-Upgrade Hooks
                ├── ClickHouse Init Job (weight: -10)
                └── PostgreSQL Migration Job (weight: -5)
                    └── API Deployment (weight: 0)
```

All database changes are applied **before** the new API version starts, ensuring zero-downtime deployments.

---

## Automated Migrations

### How It Works

Migrations run automatically during Helm upgrades via pre-upgrade hooks:

1. **ClickHouse Init** (runs first, weight -10)
   - Creates database and tables if they don't exist
   - Adds indexes
   - Idempotent (safe to run multiple times)

2. **PostgreSQL Migration** (runs second, weight -5)
   - Executes pending TypeORM migrations
   - Updates schema to match entity definitions
   - Atomic (all or nothing)

3. **API Deployment** (runs last, weight 0)
   - Starts new API version after migrations succeed

### Helm Upgrade with Migrations

```bash
# Standard upgrade (migrations run automatically)
helm upgrade nebula-dns ./helm/safedns \
  --namespace nebula-dns \
  --wait \
  --timeout 10m

# Dry run to see what would happen
helm upgrade nebula-dns ./helm/safedns \
  --namespace nebula-dns \
  --dry-run \
  --debug

# Disable migrations (not recommended)
helm upgrade nebula-dns ./helm/safedns \
  --namespace nebula-dns \
  --set migrations.enabled=false
```

### Configuration

Edit `helm/safedns/values.yaml`:

```yaml
migrations:
  enabled: true                    # Enable/disable migrations
  hookWeight: "-5"                 # Hook execution order
  backoffLimit: 3                  # Retry attempts
  ttlSecondsAfterFinished: 300     # Job cleanup time
  activeDeadlineSeconds: 600       # Timeout (10 minutes)
  logLevel: info                   # Log verbosity
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
```

---

## Manual Migration Execution

### Run Migration Job Manually

```bash
# Apply migration job directly
kubectl apply -f k8s/base/jobs/db-migration-job.yaml

# Check job status
kubectl get jobs -n nebula-dns

# View migration logs
kubectl logs -n nebula-dns job/db-migration

# Delete job after completion
kubectl delete job -n nebula-dns db-migration
```

### Run Migration in API Pod

```bash
# Get API pod name
POD=$(kubectl get pods -n nebula-dns -l app=api -o jsonpath='{.items[0].metadata.name}')

# Show pending migrations
kubectl exec -n nebula-dns $POD -- npm run migration:show

# Run pending migrations
kubectl exec -n nebula-dns $POD -- npm run migration:run

# Verify migration status
kubectl exec -n nebula-dns $POD -- npm run migration:show
```

### Local Development

```bash
cd api

# Show migration status
npm run migration:show

# Run migrations
npm run migration:run

# Generate new migration
npm run migration:generate -- src/database/migrations/AddFeatureName

# Revert last migration
npm run migration:revert
```

---

## Rollback Procedures

### Automated Rollback Script

Use the provided rollback script for safe migration rollback:

```bash
# Rollback in Kubernetes
./scripts/rollback-migration.sh

# Rollback in specific namespace
./scripts/rollback-migration.sh -n production

# Rollback locally
DATABASE_URL=postgresql://user:pass@localhost:5432/nebula \
  ./scripts/rollback-migration.sh --local

# Show help
./scripts/rollback-migration.sh --help
```

### Manual Rollback

```bash
# Create rollback job
kubectl run db-rollback -n nebula-dns \
  --image=ghcr.io/nebuladns/api:latest \
  --restart=Never \
  --env="NODE_ENV=production" \
  --env="DATABASE_URL=..." \
  --command -- npm run migration:revert

# Wait for completion
kubectl wait --for=condition=complete --timeout=300s \
  -n nebula-dns pod/db-rollback

# Check logs
kubectl logs -n nebula-dns db-rollback

# Clean up
kubectl delete pod -n nebula-dns db-rollback
```

### Database Backup & Restore

**Always backup before migrations in production!**

#### Create Backup

```bash
# Backup from PostgreSQL pod
kubectl exec -n nebula-dns postgres-0 -- \
  pg_dump -U nebula nebula > backup.sql

# Copy backup locally
kubectl cp nebula-dns/postgres-0:backup.sql \
  ./db-backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup
ls -lh db-backup-*.sql
```

#### Restore from Backup

```bash
# Copy backup to pod
kubectl cp ./db-backup-20260116-120000.sql \
  nebula-dns/postgres-0:/tmp/restore.sql

# Restore database
kubectl exec -n nebula-dns postgres-0 -- \
  psql -U nebula nebula < /tmp/restore.sql

# Verify restoration
kubectl exec -n nebula-dns postgres-0 -- \
  psql -U nebula nebula -c "\dt"
```

---

## ClickHouse Initialization

ClickHouse uses schema-only initialization (no migrations).

### Manual Initialization

```bash
# Apply ClickHouse init job
kubectl apply -f k8s/base/jobs/clickhouse-init-job.yaml

# Check job status
kubectl get jobs -n nebula-dns clickhouse-init

# View logs
kubectl logs -n nebula-dns job/clickhouse-init

# Verify tables created
kubectl exec -n nebula-dns clickhouse-0 -- \
  clickhouse-client -q "SHOW TABLES FROM nebula_dns"
```

### ClickHouse Schema Update

To update ClickHouse schema, edit the ConfigMap:

```bash
# Edit ConfigMap
kubectl edit configmap -n nebula-dns clickhouse-init-scripts

# Re-run initialization job
kubectl delete job -n nebula-dns clickhouse-init
kubectl apply -f k8s/base/jobs/clickhouse-init-job.yaml
```

### Manual Schema Execution

```bash
# Execute SQL directly
kubectl exec -n nebula-dns clickhouse-0 -- \
  clickhouse-client --query "$(cat scripts/init-clickhouse.sql)"

# Verify
kubectl exec -n nebula-dns clickhouse-0 -- \
  clickhouse-client -q "SELECT count() FROM nebula_dns.query_logs"
```

---

## Verification

### Verify PostgreSQL Migrations

```bash
# Check migration status
POD=$(kubectl get pods -n nebula-dns -l app=api -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n nebula-dns $POD -- npm run migration:show

# Expected output:
# [X] InitialSchema (1701900000000)
# [X] SyncEntitySchemas (1702100000000)
# [X] AddPartnerHierarchy (1703500000000)
# ...
```

### Verify ClickHouse Schema

```bash
# Show all tables
kubectl exec -n nebula-dns clickhouse-0 -- \
  clickhouse-client -q "SHOW TABLES FROM nebula_dns"

# Expected tables:
# - query_logs
# - hourly_stats
# - category_stats
# - domain_stats

# Check table schema
kubectl exec -n nebula-dns clickhouse-0 -- \
  clickhouse-client -q "DESCRIBE nebula_dns.query_logs"

# Verify indexes
kubectl exec -n nebula-dns clickhouse-0 -- \
  clickhouse-client -q "SELECT name, type FROM system.data_skipping_indices WHERE database='nebula_dns'"
```

### API Health Check

```bash
# Check API is healthy after migrations
kubectl get pods -n nebula-dns -l app=api

# Check API logs
kubectl logs -n nebula-dns -l app=api --tail=50

# Test API endpoint
kubectl exec -n nebula-dns $(kubectl get pods -n nebula-dns -l app=api -o jsonpath='{.items[0].metadata.name}') -- \
  curl -s http://localhost:3000/health
```

---

## Troubleshooting

### Migration Job Failed

```bash
# Check job status
kubectl describe job -n nebula-dns db-migration

# View logs
kubectl logs -n nebula-dns job/db-migration

# Common issues:
# 1. PostgreSQL not ready → Check postgres pod
# 2. Secret not found → Verify api-secrets exists
# 3. Syntax error → Check migration file
```

### PostgreSQL Not Ready

```bash
# Check PostgreSQL pod
kubectl get pods -n nebula-dns -l app=postgres

# Check PostgreSQL logs
kubectl logs -n nebula-dns postgres-0

# Test connectivity
kubectl run -it --rm debug -n nebula-dns \
  --image=postgres:16-alpine -- \
  psql -h postgres -U nebula -d nebula
```

### Migration Timeout

```bash
# Increase timeout in values.yaml
migrations:
  activeDeadlineSeconds: 1200  # 20 minutes

# Or run migration manually in pod
kubectl exec -n nebula-dns $POD -- npm run migration:run
```

### Rollback Failed

```bash
# Check if migration is revertible
# Not all migrations can be automatically reverted

# Manual rollback via SQL
kubectl exec -n nebula-dns postgres-0 -- psql -U nebula nebula

# List migrations table
SELECT * FROM migrations ORDER BY id DESC;

# Delete migration entry
DELETE FROM migrations WHERE timestamp = 1234567890000;

# Manually revert schema changes
DROP TABLE IF EXISTS new_table;
ALTER TABLE existing_table DROP COLUMN new_column;
```

### ClickHouse Initialization Failed

```bash
# Check ClickHouse pod
kubectl get pods -n nebula-dns -l app=clickhouse

# View init job logs
kubectl logs -n nebula-dns job/clickhouse-init

# Test ClickHouse connectivity
kubectl exec -n nebula-dns clickhouse-0 -- \
  clickhouse-client --query "SELECT 1"

# Check for existing tables
kubectl exec -n nebula-dns clickhouse-0 -- \
  clickhouse-client -q "SHOW DATABASES"
```

---

## Best Practices

### Development

1. **Always test migrations locally first**
   ```bash
   cd api
   npm run migration:generate -- src/database/migrations/TestMigration
   npm run migration:run
   npm run migration:revert
   ```

2. **Use descriptive migration names**
   - Good: `AddUserEmailVerification`
   - Bad: `UpdateUsers`

3. **Keep migrations small and focused**
   - One logical change per migration
   - Easier to debug and rollback

### Staging

1. **Run migrations in staging before production**
   ```bash
   helm upgrade nebula-dns ./helm/safedns \
     --namespace nebula-dns-staging \
     --wait
   ```

2. **Verify data integrity after migration**
   ```bash
   kubectl exec -n nebula-dns-staging $POD -- npm run test:e2e
   ```

3. **Test rollback procedure**
   ```bash
   ./scripts/rollback-migration.sh -n nebula-dns-staging
   ```

### Production

1. **Always backup before migrations**
   ```bash
   kubectl exec -n nebula-dns postgres-0 -- \
     pg_dump -U nebula nebula > prod-backup-$(date +%Y%m%d-%H%M%S).sql
   ```

2. **Use maintenance window for major migrations**
   - Notify users in advance
   - Consider read-only mode during migration

3. **Monitor migration progress**
   ```bash
   kubectl logs -n nebula-dns job/db-migration --follow
   ```

4. **Verify after deployment**
   ```bash
   # Check migration status
   kubectl exec -n nebula-dns $POD -- npm run migration:show

   # Check API health
   curl https://api.nebuladns.io/health

   # Check metrics
   kubectl port-forward -n nebula-dns svc/api 3000:80
   curl http://localhost:3000/metrics
   ```

### Migration Writing

1. **Make migrations idempotent when possible**
   ```typescript
   // Good
   await queryRunner.query(`
     CREATE TABLE IF NOT EXISTS users (...)
   `);

   // Good
   const hasColumn = await queryRunner.hasColumn('users', 'email');
   if (!hasColumn) {
     await queryRunner.addColumn('users', new TableColumn({...}));
   }
   ```

2. **Handle data carefully**
   ```typescript
   // Provide defaults for new NOT NULL columns
   await queryRunner.addColumn('users', new TableColumn({
     name: 'verified',
     type: 'boolean',
     default: false
   }));
   ```

3. **Write revert logic**
   ```typescript
   public async down(queryRunner: QueryRunner): Promise<void> {
     // Implement proper rollback
     await queryRunner.dropColumn('users', 'verified');
   }
   ```

### Helm Integration

1. **Use hook weights appropriately**
   - ClickHouse: -10 (runs first)
   - PostgreSQL: -5 (runs second)
   - API: 0 (runs last)

2. **Set appropriate timeouts**
   ```yaml
   migrations:
     activeDeadlineSeconds: 600  # 10 minutes
     ttlSecondsAfterFinished: 300  # 5 minute cleanup
   ```

3. **Use hook deletion policies**
   - `before-hook-creation`: Replace old migration jobs
   - `hook-succeeded`: Keep failed jobs for debugging

---

## Related Documentation

- [System Design](./A-system-design.md) - Architecture overview
- [Database Schema](./C-database-schema.md) - Schema details
- [API Specification](./D-api-spec.md) - API documentation
- [Deployment Guide](./DEPLOYMENT.md) - Full deployment process

---

## Support

For migration issues:

1. Check logs: `kubectl logs -n nebula-dns job/db-migration`
2. Review migration files: `api/src/database/migrations/`
3. Test locally: `npm run migration:show` in `api/` directory
4. Consult [Troubleshooting](#troubleshooting) section above

For emergencies:
- Rollback immediately: `./scripts/rollback-migration.sh`
- Restore from backup (see [Database Backup & Restore](#database-backup--restore))
