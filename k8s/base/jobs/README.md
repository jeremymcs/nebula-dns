# Nebula DNS - Kubernetes Jobs

**Database Migration and Initialization Jobs**
Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

This directory contains Kubernetes Job definitions for database migrations and initialization.

## Jobs

### 1. Database Migration Job (`db-migration-job.yaml`)

Runs TypeORM migrations for PostgreSQL before API deployment.

**Features:**
- Pre-upgrade Helm hook (weight: -5)
- Waits for PostgreSQL to be ready
- Runs `npm run migration:run`
- Automatic retry (up to 3 attempts)
- Auto-cleanup after 5 minutes
- Security: runs as non-root with minimal RBAC

**Usage:**

```bash
# Automatic (via Helm)
helm upgrade nebula-dns ./helm/safedns --namespace nebula-dns

# Manual
kubectl apply -f db-migration-job.yaml

# Check status
kubectl get jobs -n nebula-dns db-migration

# View logs
kubectl logs -n nebula-dns job/db-migration
```

### 2. ClickHouse Initialization Job (`clickhouse-init-job.yaml`)

Initializes ClickHouse schema for DNS query logging.

**Features:**
- Pre-upgrade Helm hook (weight: -10, runs before PostgreSQL)
- Creates database and tables
- Adds indexes for performance
- Idempotent (safe to run multiple times)
- Includes schema in ConfigMap

**Usage:**

```bash
# Automatic (via Helm)
helm upgrade nebula-dns ./helm/safedns --namespace nebula-dns

# Manual
kubectl apply -f clickhouse-init-job.yaml

# Check status
kubectl get jobs -n nebula-dns clickhouse-init

# View logs
kubectl logs -n nebula-dns job/clickhouse-init

# Verify tables
kubectl exec -n nebula-dns clickhouse-0 -- \
  clickhouse-client -q "SHOW TABLES FROM nebula_dns"
```

## Execution Order

When deployed via Helm, jobs run in this order:

1. **ClickHouse Init** (weight: -10) - Creates analytics schema
2. **DB Migration** (weight: -5) - Updates PostgreSQL schema
3. **API Deployment** (weight: 0) - Starts API with updated schema

This ensures zero-downtime deployments with automatic schema updates.

## Configuration

Jobs are configured via Helm values (`helm/safedns/values.yaml`):

```yaml
# PostgreSQL Migrations
migrations:
  enabled: true
  hookWeight: "-5"
  backoffLimit: 3
  ttlSecondsAfterFinished: 300
  activeDeadlineSeconds: 600
  logLevel: info
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

# ClickHouse Initialization
clickhouse:
  enabled: true
  host: clickhouse
  port: 8123
  database: nebula_dns
  retentionDays: 90
```

## Troubleshooting

### Migration Job Failed

```bash
# Check job status
kubectl describe job -n nebula-dns db-migration

# View detailed logs
kubectl logs -n nebula-dns job/db-migration

# Common issues:
# - PostgreSQL not ready: Check postgres pod
# - Secret not found: Verify api-secrets exists
# - Migration error: Check migration files
```

### ClickHouse Init Failed

```bash
# Check job status
kubectl describe job -n nebula-dns clickhouse-init

# View logs
kubectl logs -n nebula-dns job/clickhouse-init

# Test ClickHouse connectivity
kubectl exec -n nebula-dns clickhouse-0 -- \
  clickhouse-client --query "SELECT 1"
```

### Job Stuck Pending

```bash
# Check if PostgreSQL/ClickHouse is ready
kubectl get pods -n nebula-dns

# Check init container logs
kubectl logs -n nebula-dns job/db-migration -c wait-for-postgres

# Check resource availability
kubectl describe job -n nebula-dns db-migration
```

## Rollback

See [Database Migrations Guide](../../../docs/DATABASE-MIGRATIONS.md) for detailed rollback procedures.

Quick rollback:

```bash
# Automated rollback
./scripts/rollback-migration.sh -n nebula-dns

# Manual rollback
kubectl run db-rollback -n nebula-dns \
  --image=ghcr.io/nebuladns/api:latest \
  --restart=Never \
  --command -- npm run migration:revert
```

## Security

All jobs follow security best practices:

- **Non-root**: Runs as user 1000
- **Read-only root**: Filesystem is read-only
- **No capabilities**: All Linux capabilities dropped
- **Minimal RBAC**: Only access to required secrets
- **No service mesh**: Istio sidecar disabled

## Monitoring

Monitor job execution:

```bash
# Watch jobs
kubectl get jobs -n nebula-dns --watch

# Follow migration logs
kubectl logs -n nebula-dns job/db-migration --follow

# Check job events
kubectl get events -n nebula-dns --field-selector involvedObject.kind=Job
```

## Related Documentation

- [Database Migrations Guide](../../../docs/DATABASE-MIGRATIONS.md) - Comprehensive migration docs
- [Helm Chart Values](../../../helm/safedns/values.yaml) - Configuration options
- [API Deployment](../api-deployment.yaml) - API deployment that depends on migrations

## Helper Scripts

- `scripts/migration-helper.sh` - Interactive migration management
- `scripts/rollback-migration.sh` - Automated rollback
