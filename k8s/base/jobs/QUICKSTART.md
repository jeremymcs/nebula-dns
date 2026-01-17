# Database Migrations - Quick Start Guide

**Nebula DNS - Quick Migration Guide**
Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## TL;DR

```bash
# Deploy with automatic migrations (recommended)
helm upgrade nebula-dns ./helm/safedns --namespace nebula-dns --wait

# Check migration status
kubectl logs -n nebula-dns job/db-migration

# Rollback if needed
./scripts/rollback-migration.sh
```

## Common Tasks

### 1. Deploy with Automatic Migrations

Migrations run automatically during Helm upgrades:

```bash
helm upgrade nebula-dns ./helm/safedns \
  --namespace nebula-dns \
  --wait \
  --timeout 10m
```

### 2. Check Migration Status

```bash
# View job status
kubectl get jobs -n nebula-dns

# View migration logs
kubectl logs -n nebula-dns job/db-migration

# Check from API pod
POD=$(kubectl get pods -n nebula-dns -l app=api -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n nebula-dns $POD -- npm run migration:show
```

### 3. Run Migrations Manually

```bash
# Apply migration job
kubectl apply -f k8s/base/jobs/db-migration-job.yaml

# Wait for completion
kubectl wait --for=condition=complete --timeout=600s \
  -n nebula-dns job/db-migration

# View results
kubectl logs -n nebula-dns job/db-migration
```

### 4. Rollback Migration

```bash
# Automated rollback
./scripts/rollback-migration.sh

# Or manually
kubectl run db-rollback -n nebula-dns \
  --image=ghcr.io/nebuladns/api:latest \
  --restart=Never \
  --command -- npm run migration:revert
```

### 5. Backup Database

```bash
# Create backup
kubectl exec -n nebula-dns postgres-0 -- \
  pg_dump -U nebula nebula > backup-$(date +%Y%m%d).sql

# Verify
ls -lh backup-*.sql
```

### 6. Initialize ClickHouse

```bash
# Run ClickHouse init job
kubectl apply -f k8s/base/jobs/clickhouse-init-job.yaml

# Check status
kubectl logs -n nebula-dns job/clickhouse-init

# Verify tables
kubectl exec -n nebula-dns clickhouse-0 -- \
  clickhouse-client -q "SHOW TABLES FROM nebula_dns"
```

### 7. Interactive Helper

Use the interactive migration helper for common tasks:

```bash
./scripts/migration-helper.sh
```

This provides a menu with options for:
- Showing migration status
- Running migrations
- Rollback
- Database backup
- Verification
- Cleanup

## Configuration

Enable/disable migrations in `helm/safedns/values.yaml`:

```yaml
migrations:
  enabled: true  # Set to false to disable automatic migrations
```

## Troubleshooting

### Migration Failed

```bash
# Check why it failed
kubectl describe job -n nebula-dns db-migration
kubectl logs -n nebula-dns job/db-migration

# Retry manually
kubectl delete job -n nebula-dns db-migration
kubectl apply -f k8s/base/jobs/db-migration-job.yaml
```

### PostgreSQL Not Ready

```bash
# Check PostgreSQL status
kubectl get pods -n nebula-dns -l app=postgres

# Test connectivity
kubectl run pg-test -n nebula-dns --rm -i --restart=Never \
  --image=postgres:16-alpine -- \
  pg_isready -h postgres -p 5432
```

### Rollback Issues

```bash
# Check migration history
POD=$(kubectl get pods -n nebula-dns -l app=api -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n nebula-dns $POD -- npm run migration:show

# Restore from backup if needed
kubectl cp backup-20260116.sql nebula-dns/postgres-0:/tmp/restore.sql
kubectl exec -n nebula-dns postgres-0 -- \
  psql -U nebula nebula < /tmp/restore.sql
```

## Development Workflow

### Local Development

```bash
cd api

# Show status
npm run migration:show

# Create new migration
npm run migration:generate -- src/database/migrations/AddNewFeature

# Test migration
npm run migration:run

# Test rollback
npm run migration:revert

# Commit migration file
git add src/database/migrations/
git commit -m "Add migration: AddNewFeature"
```

### Deploy to Kubernetes

```bash
# Build and push new API image
docker build -t ghcr.io/nebuladns/api:v1.2.3 ./api
docker push ghcr.io/nebuladns/api:v1.2.3

# Update Helm values
vim helm/safedns/values.yaml
# Change: api.image.tag: v1.2.3

# Deploy (migrations run automatically)
helm upgrade nebula-dns ./helm/safedns \
  --namespace nebula-dns \
  --wait
```

## Best Practices

1. **Always backup before production migrations**
2. **Test migrations in staging first**
3. **Keep migrations small and focused**
4. **Write reversible migrations when possible**
5. **Monitor migration job logs during deployment**
6. **Verify application health after migration**

## Quick Reference

| Task | Command |
|------|---------|
| Deploy with migrations | `helm upgrade nebula-dns ./helm/safedns -n nebula-dns` |
| Check status | `kubectl logs -n nebula-dns job/db-migration` |
| Run manually | `kubectl apply -f k8s/base/jobs/db-migration-job.yaml` |
| Rollback | `./scripts/rollback-migration.sh` |
| Backup | `kubectl exec postgres-0 -- pg_dump ... > backup.sql` |
| Interactive helper | `./scripts/migration-helper.sh` |

## Full Documentation

For comprehensive migration documentation, see:
- [Database Migrations Guide](../../../docs/DATABASE-MIGRATIONS.md)
- [Jobs README](./README.md)
