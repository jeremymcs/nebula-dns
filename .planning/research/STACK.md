# Technology Stack

**Project:** Nebula DNS - Testing & DigitalOcean Deployment
**Researched:** 2026-02-11

## Recommended Stack

### Testing Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Jest | 29.7.0+ (current in project) | Unit testing for NestJS | Default NestJS testing framework, built-in support, excellent TypeScript integration |
| @nestjs/testing | 11.1.12 | NestJS test utilities | Official NestJS testing module with DI support for mocking services |
| Supertest | 6.3.4+ (current in project) | HTTP API integration testing | De facto standard for testing Express/NestJS endpoints, works seamlessly with Jest |
| Testcontainers | 11.11.0 (current in project) | Integration test isolation | Provides real PostgreSQL/Redis/ClickHouse containers for deterministic integration tests |
| Playwright | 1.58.2 | Next.js E2E testing | Superior cross-browser support, parallel execution, TypeScript support, 2x-6x faster than Cypress with lower flakiness (1.8% vs 6.5%) |
| Go stdlib testing | Built-in (Go 1.23) | Go unit/integration tests | Table-driven tests with t.Run, no external dependencies needed |
| go-test-coverage | Latest | Coverage enforcement | vladopajic/go-test-coverage for CI/CD coverage thresholds |

### DigitalOcean Managed Services

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| DOKS (Kubernetes) | 1.30+ | Container orchestration | Managed control plane, autoscaling to 1000 nodes, scale-to-zero node pools, integrated with DO ecosystem |
| Managed PostgreSQL | 16+ | Relational database | PgBouncer built-in (25 conn/GB RAM), automated backups, connection pooling, high availability with standby nodes |
| Managed Valkey | 7.2 equivalent | Caching/pub-sub | Redis-compatible (Valkey required as Managed Redis discontinued June 2025), RDMA support, higher throughput |
| ClickHouse Cloud | Latest | Analytics database | Official @clickhouse/client (1.17.0) with streaming support, managed service, no self-hosting overhead |

### Kubernetes Deployment Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Helm | 3.14+ | Package management | Industry standard (75% adoption), release history/rollback, values-based environment config (existing helm/safedns chart in project) |
| Kustomize | kubectl built-in | Declarative customization | Bundled with kubectl, environment overlays for secrets/configs (existing k8s/overlays in project) |
| doctl | Latest | DigitalOcean CLI | Official DO CLI for DOKS cluster creation, kubeconfig management, node pool operations |
| External Secrets Operator | Latest (ESO) | Secrets management | Syncs DO/Vault/AWS secrets to K8s, GitOps-compatible, prevents plain-text secrets in repos |

### ClickHouse Integration

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @clickhouse/client | 1.17.0 | Official Node.js client | For NestJS API analytics queries, streaming inserts, ClickHouse Cloud compatibility |

### Deployment Configuration

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Secrets Management | External Secrets Operator | Plain K8s Secrets | ESO prevents secrets in Git, syncs from external vaults, supports DO/Vault/AWS |
| Deployment Method | Helm + Kustomize hybrid | Helm only | Existing project has both, Helm for releases/rollbacks, Kustomize for environment-specific overlays |
| Connection Pooling | DO Managed PostgreSQL PgBouncer | Application-level (pg-pool) | DO provides 21 PgBouncer pools with 1000 connections max, reduces app complexity |
| Redis Alternative | Managed Valkey | Self-hosted Redis | Managed Redis discontinued June 2025, Valkey is Redis-compatible with RDMA |
| CI Test Environment | Testcontainers | Docker Compose | Testcontainers provides test isolation, automatic cleanup, deterministic environments |

## Installation

### NestJS Testing (Existing)
```bash
# Already in package.json devDependencies
npm install --save-dev @nestjs/testing@^11.1.12 supertest@^6.3.4 testcontainers@^11.11.0
```

### Next.js Testing (Upgrade Playwright)
```bash
cd ui
npm install --save-dev @playwright/test@^1.58.2
```

### Go Testing (No new dependencies)
```bash
# Standard library only for table-driven tests
# Optional: Coverage enforcement
go install github.com/vladopajic/go-test-coverage/v2@latest
```

### DigitalOcean CLI
```bash
# macOS
brew install doctl

# Linux
cd ~
wget https://github.com/digitalocean/doctl/releases/download/v1.118.0/doctl-1.118.0-linux-amd64.tar.gz
tar xf ~/doctl-1.118.0-linux-amd64.tar.gz
sudo mv ~/doctl /usr/local/bin

# Authenticate
doctl auth init
```

### Helm (if not installed)
```bash
# macOS
brew install helm

# Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### External Secrets Operator
```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
   external-secrets/external-secrets \
    -n external-secrets-system \
    --create-namespace
```

### ClickHouse Cloud Client (Upgrade)
```bash
cd api
npm install @clickhouse/client@^1.17.0
```

## What NOT to Add

### Avoid Over-Engineering for Moderate Scale (100K-999K queries/day)

| Anti-Pattern | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Terraform for everything | Complexity overhead for 1-10 tenants initially | Use doctl + Helm, add Terraform only when managing 10+ clusters |
| Service mesh (Istio/Linkerd) | High operational cost, overkill for scale | Use native K8s NetworkPolicies (already in k8s/base/network-policies) |
| Separate test frameworks (Mocha/AVA) | Fragmentation, NestJS defaults to Jest | Stick with Jest for consistency across API testing |
| Cypress for Next.js | Slower (90min vs 14min), higher flakiness (6.5% vs 1.8%), limited parallel | Use Playwright (already in ui/package.json) |
| Application-level connection pooling | DO provides PgBouncer, duplicate effort | Use DO Managed PostgreSQL built-in pooling |
| Self-hosted ClickHouse | Ops complexity, scaling challenges | Use ClickHouse Cloud with @clickhouse/client |
| Multiple secret management tools | Complexity, vendor lock-in | External Secrets Operator supports DO/Vault/AWS with one config |
| Custom K8s operators | Development overhead | Use established operators (External Secrets, Cert Manager) |

## Integration Patterns

### NestJS + Testcontainers Integration Testing

```typescript
// api/test/integration/database.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PostgreSqlContainer } from 'testcontainers';
import { DataSource } from 'typeorm';

describe('Database Integration Tests', () => {
  let container: PostgreSqlContainer;
  let dataSource: DataSource;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16')
      .withDatabase('nebula_test')
      .start();

    const module: TestingModule = await Test.createTestingModule({
      // Module configuration with container connection
    }).compile();

    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await container.stop();
  });

  // Tests run against real PostgreSQL in container
});
```

### DigitalOcean DOKS + Managed Services Connection

```yaml
# k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

# Use External Secrets to sync from DO managed database credentials
patches:
  - target:
      kind: Deployment
      name: api
    patch: |-
      - op: replace
        path: /spec/template/spec/containers/0/env
        value:
          - name: DATABASE_HOST
            valueFrom:
              secretKeyRef:
                name: do-postgres-credentials
                key: host
          - name: DATABASE_PORT
            valueFrom:
              secretKeyRef:
                name: do-postgres-credentials
                key: port
```

### Helm + Kustomize Hybrid Deployment

```bash
# Helm for base deployment with version control
helm upgrade nebula-dns ./helm/safedns \
  -n nebula-dns \
  --set image.tag=v1.0.0 \
  --values values-production.yaml

# Kustomize for environment-specific overlays
kubectl apply -k k8s/overlays/production
```

### ClickHouse Cloud Connection

```typescript
// api/src/modules/analytics/clickhouse.service.ts
import { createClient } from '@clickhouse/client';

@Injectable()
export class ClickHouseService {
  private client = createClient({
    url: process.env.CLICKHOUSE_URL, // From ClickHouse Cloud console
    password: process.env.CLICKHOUSE_PASSWORD,
    database: 'nebula_dns',
    compression: {
      request: true,
      response: true,
    },
  });

  async insertQueryLogs(logs: QueryLog[]) {
    await this.client.insert({
      table: 'dns_queries',
      values: logs,
      format: 'JSONEachRow',
    });
  }

  async getQueryStats(tenantId: string) {
    const resultSet = await this.client.query({
      query: 'SELECT * FROM dns_queries WHERE tenant_id = {tenantId:String}',
      query_params: { tenantId },
      format: 'JSONEachRow',
    });
    return await resultSet.json();
  }
}
```

## Version Compatibility Matrix

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| Node.js | 20.10.6 | 20.x LTS | Current in api/package.json |
| NestJS | 10.3.0 | 10.x | Current in project |
| Next.js | 15.0.0 | 16.1.1 | Current in ui/package.json (16.1.1) |
| Go | 1.23.0 | 1.23.x | Current in policy-svc/go.mod |
| Kubernetes | 1.28 | 1.30+ | DOKS supports 1.30+ |
| Helm | 3.12 | 3.14+ | For External Secrets Operator compatibility |
| PostgreSQL | 14 | 16+ | DO Managed PostgreSQL latest |
| Redis/Valkey | 7.2 | 7.2 | DO Managed Valkey (Redis EOL Feb 2026) |
| ClickHouse | 23.x | Latest | ClickHouse Cloud auto-updates |

## Critical Configuration Notes

### DigitalOcean Managed PostgreSQL

- **Connection Pooling**: Built-in PgBouncer provides 21 pools, up to 1000 connections
- **Limits**: 25 connections per 1GB RAM, 3 reserved for maintenance
- **Pooling Modes**: Transaction mode (recommended for NestJS), Session mode (for prepared statements), Statement mode (most restrictive)
- **High Availability**: Use standby nodes for automatic failover

### DigitalOcean Managed Valkey (formerly Redis)

- **Migration Required**: Managed Redis discontinued June 30, 2025
- **Compatibility**: Valkey is Redis-compatible (drop-in replacement)
- **Auto-conversion**: Existing Managed Caching clusters auto-convert to Valkey by June 30, 2025
- **Limits**: 1-2 nodes (1 primary + optional standby), 10K concurrent connections OR 4 connections/MB RAM (whichever greater), 200 new connections/second per CPU

### ClickHouse Cloud Integration

- **Client**: Use official @clickhouse/client 1.17.0+ (not community forks)
- **Authentication**: Get CLICKHOUSE_URL and CLICKHOUSE_PASSWORD from ClickHouse Cloud console
- **Streaming**: Client supports streaming for both SELECT and INSERT (critical for high-volume DNS logs)
- **Compression**: Enable request/response compression for bandwidth savings

### External Secrets Operator

- **Encryption**: Secrets encrypted at rest in etcd (enable encryption provider)
- **RBAC**: Restrict ExternalSecret CRD access with Role-Based Access Control
- **Rotation**: ESO watches external secret stores and syncs changes automatically
- **Providers**: Supports DigitalOcean Spaces + Vault, AWS Secrets Manager, Google Secrets Manager, Azure Key Vault

### DOKS Best Practices

- **High Availability**: Deploy 3+ replicas across availability zones
- **Resource Limits**: Define requests/limits in all Deployment specs (prevents scheduling on overloaded nodes)
- **VPC Networking**: Use VPC for private cluster networking (security best practice)
- **Autoscaling**: Enable Cluster Autoscaler for 1-1000 nodes, use nodepool scale-to-zero for cost savings
- **PodDisruptionBudgets**: Already in k8s/base/pdbs/ (maintain during node upgrades)
- **NetworkPolicies**: Already in k8s/base/network-policies/ (default-deny-all with explicit allow rules)

## Sources

### Testing Frameworks
- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Testing NestJS Apps: Best Practices & Common Pitfalls | Amplication](https://amplication.com/blog/best-practices-and-common-pitfalls-when-testing-my-nestjs-app)
- [Next.js Testing Guide](https://nextjs.org/docs/app/guides/testing)
- [Playwright vs Cypress: The 2026 Enterprise Testing Guide](https://devin-rosario.medium.com/playwright-vs-cypress-the-2026-enterprise-testing-guide-ade8b56d3478)
- [Cypress vs Playwright in 2026](https://bugbug.io/blog/test-automation-tools/cypress-vs-playwright/)
- [Go Testing Excellence: Table-Driven Tests and Mocking](https://dasroot.net/posts/2026/01/go-testing-excellence-table-driven-tests-mocking/)
- [Testcontainers for Node.js](https://node.testcontainers.org/)
- [@nestjs/testing npm](https://www.npmjs.com/package/@nestjs/testing)
- [Playwright Release Notes](https://playwright.dev/docs/release-notes)
- [Testcontainers npm](https://www.npmjs.com/package/testcontainers)

### DigitalOcean DOKS
- [DigitalOcean Kubernetes Documentation](https://docs.digitalocean.com/products/kubernetes/)
- [Kubernetes Best Practices | DigitalOcean](https://docs.digitalocean.com/products/kubernetes/concepts/best-practices/)
- [How ISVs and startups scale on DigitalOcean Kubernetes](https://www.digitalocean.com/blog/how-isvs-startups-scale-digitalocean-kubernetes-best-practices)
- [doctl kubernetes CLI Reference](https://docs.digitalocean.com/reference/doctl/reference/kubernetes/)

### DigitalOcean Managed Databases
- [How to Manage Connection Pools for PostgreSQL](https://docs.digitalocean.com/products/databases/postgresql/how-to/manage-connection-pools/)
- [Managed Databases Connection Pools and PostgreSQL Benchmarking](https://www.digitalocean.com/community/tutorials/managed-databases-connection-pools-and-postgresql-benchmarking-using-pgbench)
- [How To Keep Running Redis On DigitalOcean After Redis Licensing Changes](https://scalegrid.io/blog/how-to-keep-running-redis-on-digitalocean-after-redis-licensing-changes/)
- [DigitalOcean's Managed Database for Redis is now Managed Caching](https://www.digitalocean.com/blog/digitalocean-managed-caching)

### ClickHouse Cloud
- [clickhouse-client for NodeJS](https://clickhouse.js.org/)
- [Official ClickHouse JS Client GitHub](https://github.com/ClickHouse/clickhouse-js)
- [@clickhouse/client npm](https://www.npmjs.com/package/@clickhouse/client)

### Kubernetes Tooling
- [Helm Charts in Kubernetes – 2026 Guide](https://atmosly.com/knowledge/helm-charts-in-kubernetes-definitive-guide-for-2025)
- [Helm Best Practices](https://helm.sh/docs/chart_best_practices/)
- [Kustomize vs. Helm Comparison](https://spacelift.io/blog/kustomize-vs-helm)
- [Helm vs. Kustomize: Which Is Better for K8s Config?](https://www.plural.sh/blog/helm-vs-kustomize/)

### Secrets Management
- [Good practices for Kubernetes Secrets](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)
- [Kubernetes Secrets Management: Limitations & Best Practices](https://www.groundcover.com/blog/kubernetes-secret-management)
- [External Secrets Operator Documentation](https://external-secrets.io/latest/)
- [External Secrets Operator GitHub](https://github.com/external-secrets/external-secrets)
