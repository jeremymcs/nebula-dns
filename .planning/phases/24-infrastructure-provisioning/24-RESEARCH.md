# Phase 24: Infrastructure Provisioning - Research

// Nebula DNS Phase 24 Research
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Researched:** 2026-02-11
**Domain:** Cloud infrastructure provisioning, Kubernetes, managed databases
**Confidence:** HIGH

## Summary

Phase 24 establishes the production infrastructure foundation for Nebula DNS on DigitalOcean. This involves provisioning a DOKS (DigitalOcean Kubernetes) cluster, three managed databases (PostgreSQL, Valkey, ClickHouse Cloud), and essential Kubernetes operators (cert-manager, external-dns). The research reveals that DigitalOcean provides a mature, well-integrated platform with VPC-native networking, managed services with automatic backups, and strong Kubernetes integration.

Key findings show that Infrastructure as Code (IaC) tooling is essential, with Terraform being the most mature option for DigitalOcean (180+ providers). DigitalOcean's managed Valkey (replacing deprecated Redis) launched in 2025 and is Redis-compatible with minimal migration effort. ClickHouse Cloud requires schema adaptation (MergeTree instead of ReplicatedMergeTree) which is straightforward. The Next.js NEXT_PUBLIC_ variable limitation requires runtime configuration refactoring for the UI services.

**Primary recommendation:** Use Terraform for infrastructure provisioning with DigitalOcean provider, implement External Secrets Operator for credential management, provision VPC-native DOKS cluster, and leverage managed database services with built-in PITR backups.

## Standard Stack

### Core Infrastructure Tools

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| **Terraform** | 1.7+ | Infrastructure as Code | Market leader (32.8% share), 200+ providers, excellent DigitalOcean support, HCL is declarative and widely understood |
| **doctl** | 1.108+ | DigitalOcean CLI | Official CLI for DigitalOcean, automation-friendly, used for cluster access/kubeconfig setup |
| **kubectl** | 1.30+ | Kubernetes CLI | Standard Kubernetes management tool, required for cluster operations |
| **Helm** | 3.14+ | Kubernetes package manager | Industry standard for K8s deployments, supports hooks for migrations |

**Installation:**
```bash
# Terraform
brew install terraform  # macOS
# or download from https://developer.hashicorp.com/terraform/install

# doctl (DigitalOcean CLI)
brew install doctl  # macOS
# or: wget https://github.com/digitalocean/doctl/releases/download/v1.108.0/doctl-1.108.0-linux-amd64.tar.gz

# Authenticate doctl
doctl auth init

# kubectl (usually comes with Docker Desktop or:)
brew install kubectl

# Helm
brew install helm
```

### Kubernetes Operators

| Operator | Version | Purpose | When to Use |
|----------|---------|---------|-------------|
| **cert-manager** | v1.14+ | TLS certificate management | Automatic Let's Encrypt certificates, DNS-01 challenge for wildcard certs |
| **external-dns** | v0.14+ | DNS record synchronization | Sync LoadBalancer IPs to DigitalOcean DNS automatically |
| **External Secrets Operator** | v0.9+ | Secrets synchronization | Sync secrets from external stores (Vault, AWS Secrets Manager) to Kubernetes |

### Managed Services (DigitalOcean)

| Service | Type | Purpose | Configuration |
|---------|------|---------|---------------|
| **DOKS** | Kubernetes 1.30+ | Container orchestration | 3+ nodes, VPC-native, auto-upgrade enabled |
| **Managed PostgreSQL** | PostgreSQL 16 | Relational database | PgBouncer enabled, SSL required, 7-day PITR |
| **Managed Valkey** | Valkey 7.2+ | Cache/pub-sub | TLS enabled, password auth, Redis-compatible |
| **ClickHouse Cloud** | ClickHouse 24+ | Analytics database | MergeTree tables (not Replicated), HTTPS only |

### Supporting Tools

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| **k9s** | 0.32+ | Kubernetes TUI | Interactive cluster management, debugging |
| **kubectx/kubens** | Latest | Context switching | Manage multiple clusters/namespaces |
| **stern** | 1.28+ | Multi-pod logging | Tail logs across multiple pods |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Terraform | Pulumi | Better for teams preferring TypeScript/Python over HCL, but less mature DigitalOcean provider |
| Terraform | doctl scripts | Simpler for single cluster, but doesn't scale to multi-environment or complex setups |
| External Secrets | Sealed Secrets | Simpler (no external service), but requires Git-based workflow and lacks dynamic rotation |
| DigitalOcean | AWS/GCP | More features, but significantly more complex and expensive for 1-10 tenant scale |

## Architecture Patterns

### Recommended Project Structure

```
infrastructure/
├── terraform/
│   ├── environments/
│   │   ├── staging/
│   │   │   ├── main.tf          # Staging environment config
│   │   │   ├── terraform.tfvars # Staging variables
│   │   │   └── backend.tf       # Remote state config
│   │   └── production/
│   │       ├── main.tf
│   │       ├── terraform.tfvars
│   │       └── backend.tf
│   ├── modules/
│   │   ├── doks-cluster/        # DOKS cluster module
│   │   ├── managed-databases/   # PostgreSQL, Valkey module
│   │   ├── vpc-network/         # VPC and firewall rules
│   │   └── dns-records/         # DigitalOcean DNS records
│   └── shared/
│       ├── providers.tf         # Provider configurations
│       └── versions.tf          # Required versions
├── kubernetes/
│   ├── operators/
│   │   ├── cert-manager.yaml    # cert-manager installation
│   │   ├── external-dns.yaml    # external-dns configuration
│   │   └── external-secrets.yaml # ESO installation
│   └── secrets/
│       ├── secret-store.yaml    # SecretStore/ClusterSecretStore
│       └── external-secrets.yaml # ExternalSecret resources
└── scripts/
    ├── provision-cluster.sh     # Orchestration script
    ├── verify-infrastructure.sh # Health checks
    └── rotate-credentials.sh    # Secret rotation runbook
```

### Pattern 1: Environment Isolation with Terraform Workspaces

**What:** Separate Terraform state and resources per environment (staging, production) using workspaces or separate directories.

**When to use:** When you need isolated environments with different configurations but shared module code.

**Example:**
```hcl
# terraform/environments/production/main.tf
terraform {
  backend "s3" {
    bucket = "nebula-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

module "doks_cluster" {
  source = "../../modules/doks-cluster"

  cluster_name    = "nebula-dns-prod"
  region          = "nyc3"
  node_count      = 5
  node_size       = "s-4vcpu-8gb"
  kubernetes_version = "1.30"
  auto_upgrade    = true
  vpc_uuid        = module.vpc.id
}

module "managed_databases" {
  source = "../../modules/managed-databases"

  cluster_name = "nebula-dns-prod"
  region       = "nyc3"

  # PostgreSQL
  postgres_node_count = 2
  postgres_node_size  = "db-s-4vcpu-8gb"

  # Valkey
  valkey_node_count   = 3
  valkey_node_size    = "db-s-2vcpu-4gb"

  vpc_uuid = module.vpc.id
}
```

### Pattern 2: VPC-Native DOKS Cluster

**What:** Create DOKS cluster within a VPC for private networking between cluster, databases, and other resources.

**When to use:** Always for production. Provides network isolation and eliminates public network traversal.

**Example:**
```hcl
# terraform/modules/doks-cluster/main.tf
resource "digitalocean_vpc" "main" {
  name     = "${var.cluster_name}-vpc"
  region   = var.region
  ip_range = "10.10.0.0/16"
}

resource "digitalocean_kubernetes_cluster" "main" {
  name    = var.cluster_name
  region  = var.region
  version = var.kubernetes_version

  # VPC-native cluster
  vpc_uuid = digitalocean_vpc.main.id

  # Auto-upgrade for security patches
  auto_upgrade = var.auto_upgrade
  surge_upgrade = true

  # Node pool
  node_pool {
    name       = "${var.cluster_name}-worker-pool"
    size       = var.node_size
    node_count = var.node_count

    # Auto-scaling
    auto_scale = true
    min_nodes  = var.min_nodes
    max_nodes  = var.max_nodes

    # Labels for workload placement
    labels = {
      environment = var.environment
      workload    = "general"
    }
  }
}

# Write kubeconfig to local file
resource "local_file" "kubeconfig" {
  content  = digitalocean_kubernetes_cluster.main.kube_config[0].raw_config
  filename = "${path.module}/kubeconfig"
}
```

### Pattern 3: Managed Database Provisioning with Connection Pooling

**What:** Provision managed PostgreSQL with PgBouncer connection pooling pre-configured.

**When to use:** Always for production. Connection pooling is essential for handling concurrent API connections.

**Example:**
```hcl
# terraform/modules/managed-databases/postgresql.tf
resource "digitalocean_database_cluster" "postgres" {
  name       = "${var.cluster_name}-postgres"
  engine     = "pg"
  version    = "16"
  size       = var.postgres_node_size
  region     = var.region
  node_count = var.postgres_node_count

  # Private networking
  private_network_uuid = var.vpc_uuid
}

# PgBouncer connection pool
resource "digitalocean_database_connection_pool" "pgbouncer" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "pgbouncer-pool"
  mode       = "transaction"  # or "session" depending on needs
  size       = 25
  db_name    = digitalocean_database_db.nebula.name
  user       = digitalocean_database_user.nebula.name
}

# Create database
resource "digitalocean_database_db" "nebula" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "nebula"
}

# Create user
resource "digitalocean_database_user" "nebula" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "nebula"
}

# Output connection string for Kubernetes secret
output "postgres_connection_string" {
  value     = "postgresql://${digitalocean_database_user.nebula.name}:${digitalocean_database_user.nebula.password}@${digitalocean_database_connection_pool.pgbouncer.host}:${digitalocean_database_connection_pool.pgbouncer.port}/${digitalocean_database_connection_pool.pgbouncer.db}?sslmode=require"
  sensitive = true
}
```

### Pattern 4: External Secrets Operator Integration

**What:** Use External Secrets Operator to sync credentials from external secret store to Kubernetes secrets.

**When to use:** When you need centralized secret management with rotation capabilities.

**Example:**
```yaml
# kubernetes/secrets/secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: digitalocean-vault
  namespace: nebula-dns
spec:
  provider:
    # Option 1: Use Vault
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "nebula-dns"
          serviceAccountRef:
            name: external-secrets-sa
---
# kubernetes/secrets/external-secrets.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: nebula-dns
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: digitalocean-vault
    kind: SecretStore
  target:
    name: api-secrets
    creationPolicy: Owner
  data:
    - secretKey: database-url
      remoteRef:
        key: nebula-dns/production/postgres
        property: connection_string
    - secretKey: redis-url
      remoteRef:
        key: nebula-dns/production/valkey
        property: connection_string
```

### Pattern 5: cert-manager with DNS-01 Challenge

**What:** Automate TLS certificate issuance using Let's Encrypt with DNS-01 challenge for wildcard certificates.

**When to use:** When you need wildcard certificates (*.example.com) or your services aren't publicly accessible via HTTP.

**Example:**
```yaml
# kubernetes/operators/cert-manager.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@nebuladns.io
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - dns01:
          digitalocean:
            tokenSecretRef:
              name: digitalocean-dns
              key: access-token
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-cert
  namespace: nebula-dns
spec:
  secretName: wildcard-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - "*.nebuladns.io"
    - "nebuladns.io"
```

### Anti-Patterns to Avoid

- **Storing secrets in Terraform state:** Never put database passwords or API keys in Terraform resources. Use `random_password` resource and external secret stores.
- **Manual kubeconfig management:** Use `doctl kubernetes cluster kubeconfig save <cluster-id>` instead of copying kubeconfig manually.
- **Skipping VPC networking:** Don't create clusters without VPC. Public-only networking exposes databases unnecessarily.
- **Single-node databases:** Never use single-node databases in production. Always configure 2+ nodes for HA.
- **Hardcoded regions:** Use variables for regions to enable multi-region deployments later.
- **Terraform state in version control:** Always use remote state (S3, Terraform Cloud) with locking.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Secret rotation** | Cron jobs that update Kubernetes secrets | External Secrets Operator | Handles sync, watches for changes, supports multiple providers, includes retry logic |
| **TLS certificate management** | Shell scripts with certbot | cert-manager | Handles renewal automatically, supports multiple ACME challenges, Kubernetes-native CRDs |
| **DNS record updates** | Scripts that call DigitalOcean API | external-dns | Watches Service/Ingress resources, handles sync automatically, supports multiple providers |
| **Database backups** | Custom backup scripts | Managed database PITR | DigitalOcean handles backups automatically, 7-day PITR, tested restore procedures |
| **Kubernetes cluster provisioning** | Manual doctl commands | Terraform with DigitalOcean provider | Reproducible, version-controlled, handles dependencies, supports multiple environments |
| **Connection pooling** | Application-level pooling only | PgBouncer (managed by DigitalOcean) | Handles connection limits, transaction pooling, protects database from connection storms |

**Key insight:** Cloud-native tools integrate deeply with Kubernetes primitives (CRDs, watches, controllers). Custom scripts don't handle edge cases (API rate limits, transient failures, partial updates, reconciliation) that production operators solve.

## Common Pitfalls

### Pitfall 1: Next.js NEXT_PUBLIC_ Variables Baked at Build Time

**What goes wrong:** Building Next.js UI with `NEXT_PUBLIC_API_URL` pointing to localhost, deploying the same image to staging/production, and discovering the app still calls localhost.

**Why it happens:** `NEXT_PUBLIC_*` environment variables are inlined into the JavaScript bundle during `next build`. Changing environment variables after build has no effect on client-side code.

**How to avoid:**
- Option A: Build separate images per environment (staging, production) with environment-specific values
- Option B: Refactor to use server-side environment variables and expose via API endpoint (`/api/config`)
- Option C: Use runtime configuration with window.__ENV__ pattern injected via server-rendered HTML

**Warning signs:** API calls from browser go to wrong domain, console shows "Failed to fetch" errors with localhost URLs.

**Recommended solution:**
```typescript
// ui/src/app/api/config/route.ts
export async function GET() {
  return Response.json({
    apiUrl: process.env.API_URL, // Server-side only
    adminUiUrl: process.env.ADMIN_UI_URL,
  });
}

// ui/src/lib/config.ts
let config: { apiUrl: string; adminUiUrl: string } | null = null;

export async function getConfig() {
  if (!config) {
    const res = await fetch('/api/config');
    config = await res.json();
  }
  return config;
}
```

### Pitfall 2: ClickHouse Cloud Schema Using Replicated* Engines

**What goes wrong:** Using existing self-hosted ClickHouse schema with `ReplicatedMergeTree` tables on ClickHouse Cloud causes "Unknown table engine Replicated*" errors.

**Why it happens:** ClickHouse Cloud uses SharedMergeTree (cloud-native) instead of ReplicatedMergeTree (self-hosted replication). SharedMergeTree is enabled automatically and replication is handled by the cloud platform.

**How to avoid:**
- Detect environment (cloud vs self-hosted) at schema creation time
- Use `MergeTree` for ClickHouse Cloud
- Use `ReplicatedMergeTree` only for self-hosted multi-node deployments

**Warning signs:** Migration fails with "Unknown table engine ReplicatedMergeTree", queries fail with table not found errors.

**Recommended solution:**
```sql
-- scripts/init-clickhouse.sql
-- Environment-aware table creation

-- Check if running on ClickHouse Cloud (SharedMergeTree available)
-- Use MergeTree for Cloud, ReplicatedMergeTree for self-hosted

CREATE TABLE IF NOT EXISTS nebula_dns.dns_queries (
  -- columns...
)
ENGINE = MergeTree()  -- Use this for ClickHouse Cloud
-- ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/dns_queries', '{replica}')  -- Use this for self-hosted
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, timestamp);
```

### Pitfall 3: Valkey Migration Assumptions

**What goes wrong:** Assuming Valkey is a drop-in replacement for Redis without testing commands, discovering that specific Redis modules (RedisJSON, RedisSearch) aren't available.

**Why it happens:** Valkey is Redis-compatible for core commands but doesn't support all Redis Stack modules. DigitalOcean's managed Valkey is focused on caching/pub-sub use cases.

**How to avoid:**
- Audit Redis commands used in codebase before migration
- Test locally with Valkey container before provisioning managed service
- Document any command incompatibilities found
- Plan migration strategy (blue-green deployment recommended)

**Warning signs:** Redis commands return "ERR unknown command", application errors after Valkey migration, pub/sub messages not delivered.

**Recommended verification:**
```bash
# Test Valkey compatibility locally
docker run -d --name valkey-test -p 6379:6379 valkey/valkey:7.2

# Run application test suite against Valkey
REDIS_URL=redis://localhost:6379 npm test

# Check for deprecated commands
grep -r "REDIS_COMMAND" api/src | grep -E "(SCAN|JSON\.|FT\.)"
```

### Pitfall 4: Terraform State Conflicts in Team Environment

**What goes wrong:** Multiple team members run `terraform apply` simultaneously, causing state corruption or conflicting updates.

**Why it happens:** Terraform state is not locked when using local state files. Concurrent operations can overwrite each other.

**How to avoid:**
- Use remote state backend with locking (S3 + DynamoDB, Terraform Cloud)
- Configure state locking in backend configuration
- Use CI/CD for terraform apply (single executor)
- Never commit terraform.tfstate to version control

**Warning signs:** "Error acquiring the state lock", state file conflicts in Git, resources created twice.

**Recommended solution:**
```hcl
# terraform/environments/production/backend.tf
terraform {
  backend "s3" {
    bucket         = "nebula-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

### Pitfall 5: Insufficient Database Connection Pool Size

**What goes wrong:** API pods restart under load with "remaining connection slots are reserved" errors from PostgreSQL.

**Why it happens:** PostgreSQL has connection limits based on RAM (25 connections per 1GB). PgBouncer pools help but must be sized correctly. Default pool size (25) may be too small for multiple API replicas.

**How to avoid:**
- Calculate pool size: `(max_api_replicas * connections_per_pod) + buffer`
- Monitor connection usage with `pg_stat_activity`
- Configure PgBouncer pool size in Terraform
- Use transaction mode for stateless queries

**Warning signs:** "sorry, too many clients already" errors, API pods crash under load, database connection spikes.

**Recommended solution:**
```hcl
# terraform/modules/managed-databases/postgresql.tf
resource "digitalocean_database_connection_pool" "pgbouncer" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "pgbouncer-pool"
  mode       = "transaction"
  size       = 50  # 10 API pods * 4 connections + 10 buffer
  db_name    = digitalocean_database_db.nebula.name
  user       = digitalocean_database_user.nebula.name
}
```

### Pitfall 6: Kubernetes Resource Limits Too Low for DNS Services

**What goes wrong:** Policy service pods restart frequently with OOMKilled status under normal load.

**Why it happens:** DNS query volume is bursty. Default memory limits (256Mi) may be too low for policy cache + ClickHouse buffering.

**How to avoid:**
- Load test DNS services before production
- Set requests (guaranteed) and limits (maximum) separately
- Monitor actual memory usage with `kubectl top pods`
- Use VPA (Vertical Pod Autoscaler) to recommend sizes

**Warning signs:** Pods show OOMKilled in events, DNS queries timeout, policy cache is constantly rebuilding.

**Recommended solution:**
```yaml
# k8s/base/policy-svc-deployment.yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi
```

## Code Examples

Verified patterns from official sources:

### Creating DOKS Cluster with doctl

```bash
# Source: https://docs.digitalocean.com/reference/doctl/reference/kubernetes/cluster/create/

# Create VPC-native DOKS cluster
doctl kubernetes cluster create nebula-dns-prod \
  --region nyc3 \
  --version 1.30.0-do.0 \
  --node-pool "name=worker-pool;size=s-4vcpu-8gb;count=3;auto-scale=true;min-nodes=3;max-nodes=10" \
  --vpc-uuid <vpc-uuid> \
  --surge-upgrade \
  --auto-upgrade \
  --tag production,nebula-dns

# Save kubeconfig
doctl kubernetes cluster kubeconfig save nebula-dns-prod

# Verify cluster
kubectl get nodes
```

### Provisioning Managed PostgreSQL with Terraform

```hcl
# Source: https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs/resources/database_cluster

resource "digitalocean_database_cluster" "postgres" {
  name       = "nebula-dns-prod-postgres"
  engine     = "pg"
  version    = "16"
  size       = "db-s-4vcpu-8gb"
  region     = "nyc3"
  node_count = 2

  private_network_uuid = digitalocean_vpc.main.id

  # Enable maintenance window
  maintenance_window {
    day  = "sunday"
    hour = "02:00:00"
  }
}

# Create database
resource "digitalocean_database_db" "nebula" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "nebula"
}

# Create user
resource "digitalocean_database_user" "nebula" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "nebula"
}

# Create connection pool with PgBouncer
resource "digitalocean_database_connection_pool" "pgbouncer" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "pgbouncer-pool"
  mode       = "transaction"
  size       = 50
  db_name    = digitalocean_database_db.nebula.name
  user       = digitalocean_database_user.nebula.name
}

# Output connection details
output "postgres_host" {
  value     = digitalocean_database_cluster.postgres.host
  sensitive = true
}

output "postgres_port" {
  value = digitalocean_database_cluster.postgres.port
}

output "postgres_connection_pool_uri" {
  value     = digitalocean_database_connection_pool.pgbouncer.uri
  sensitive = true
}
```

### Installing cert-manager and Creating Certificate

```bash
# Source: https://cert-manager.io/docs/installation/

# Install cert-manager with Helm
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.14.0 \
  --set installCRDs=true \
  --set global.leaderElection.namespace=cert-manager

# Create DigitalOcean API token secret
kubectl create secret generic digitalocean-dns \
  --namespace cert-manager \
  --from-literal=access-token=<your-do-token>

# Apply ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@nebuladns.io
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - dns01:
          digitalocean:
            tokenSecretRef:
              name: digitalocean-dns
              key: access-token
EOF
```

### Installing external-dns for DigitalOcean

```bash
# Source: https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/digitalocean.md

# Create DigitalOcean API token secret
kubectl create secret generic external-dns \
  --namespace kube-system \
  --from-literal=token=<your-do-token>

# Install external-dns with Helm
helm repo add external-dns https://kubernetes-sigs.github.io/external-dns/
helm repo update

helm install external-dns external-dns/external-dns \
  --namespace kube-system \
  --set provider=digitalocean \
  --set digitalocean.apiToken=<your-do-token> \
  --set txtOwnerId=nebula-dns-prod \
  --set policy=sync \
  --set sources[0]=service \
  --set sources[1]=ingress
```

### Creating Kubernetes Secret from Terraform Output

```bash
# Source: https://docs.digitalocean.com/products/kubernetes/how-to/integrate-with-docr/

# Get database connection string from Terraform
DB_URL=$(terraform output -raw postgres_connection_pool_uri)

# Create Kubernetes secret
kubectl create secret generic api-secrets \
  --namespace nebula-dns \
  --from-literal=database-url="$DB_URL" \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Helm Pre-Install Hook for Database Migration

```yaml
# Source: https://helm.sh/docs/topics/charts_hooks/

apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  namespace: nebula-dns
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "0"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: ghcr.io/nebuladns/api:{{ .Values.image.tag }}
          command: ["npm", "run", "migration:run"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: database-url
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DigitalOcean Managed Redis | DigitalOcean Managed Valkey | June 2025 EOL | Redis licensing change forced migration to Valkey (open-source fork) |
| Self-hosted ClickHouse with ReplicatedMergeTree | ClickHouse Cloud with SharedMergeTree | 2024+ | Cloud-native storage layer eliminates need for manual replication setup |
| NEXT_PUBLIC_ env vars for all config | Server-side runtime config | Next.js 13+ | Enables single Docker image across environments, removes build-time coupling |
| Manual kubectl secrets | External Secrets Operator | 2023+ | Centralizes secret management, enables rotation, audit trails |
| cert-manager HTTP-01 challenges | cert-manager DNS-01 challenges | Always available | Required for wildcard certs, works for non-public services |
| Manual DNS record updates | external-dns automation | 2020+ | Syncs LoadBalancer IPs automatically, eliminates manual DNS updates |
| Separate Terraform per resource | Terraform modules per logical unit | Terraform 0.13+ | Modules enable reusable, testable infrastructure components |

**Deprecated/outdated:**
- **Redis Sentinel for HA:** DigitalOcean's managed Valkey handles HA automatically with multi-node clusters
- **Manual PgBouncer installation:** DigitalOcean includes PgBouncer as managed connection pooling option
- **Kubernetes in-tree cloud provider:** DigitalOcean CCM (Cloud Controller Manager) is now external, installed automatically on DOKS
- **Static kubeconfig files:** Use `doctl kubernetes cluster kubeconfig save` to refresh dynamically

## Open Questions

### 1. ClickHouse Cloud Trial Account Verification

**What we know:** ClickHouse Cloud uses SharedMergeTree instead of ReplicatedMergeTree for single-node deployments.

**What's unclear:** Does ClickHouse Cloud trial account have API rate limits that would impact our testing? What's the minimum paid tier that matches our 100K-999K queries/day requirement?

**Recommendation:** Create ClickHouse Cloud trial account during Phase 24 to verify schema compatibility, test MergeTree table creation, and document API limits before Phase 25 (schema migration).

### 2. Valkey Command Compatibility Audit

**What we know:** Valkey is Redis-compatible for core commands. DigitalOcean's managed Valkey replaced managed Redis in 2025.

**What's unclear:** Do we use any Redis Stack commands (JSON, Search) that aren't available in Valkey? What's our migration path if we discover incompatibilities?

**Recommendation:** Audit codebase for Redis commands (grep for redis-cli, ioredis calls) and test against local Valkey container. Document any breaking changes found.

### 3. DigitalOcean Managed Database Connection Limits

**What we know:** PostgreSQL provides 25 connections per 1GB RAM. PgBouncer pools help but have size limits.

**What's unclear:** What's the actual max pool size for our chosen database tier? Will 50 connections be sufficient for 10 API replicas under peak load?

**Recommendation:** Calculate expected connection usage: `(max_api_replicas * connections_per_pod) + buffer`. Test with load testing in Phase 31 and adjust pool size if needed.

### 4. Terraform State Storage Location

**What we know:** Terraform state should use remote backend with locking. Options include S3+DynamoDB, Terraform Cloud, DigitalOcean Spaces.

**What's unclear:** Do we use AWS S3 (most common), Terraform Cloud (managed), or DigitalOcean Spaces (stays in ecosystem)?

**Recommendation:** Use DigitalOcean Spaces (S3-compatible) for state storage to keep infrastructure in single provider. Configure DynamoDB alternative (etcd or Consul) for locking if needed. Terraform Cloud is viable alternative if team prefers managed state.

### 5. Multi-Region vs Single-Region Strategy

**What we know:** Phase 24 is single-region deployment. Out of scope mentions multi-region is premature for 1-10 tenants.

**What's unclear:** Should we architect Terraform modules to support multi-region expansion later, or keep single-region simplicity now?

**Recommendation:** Design for single-region now but use variables for region selection (no hardcoded `nyc3`). Multi-region can be added in v2+ if needed.

## Sources

### Primary (HIGH confidence)

- [DigitalOcean Kubernetes Documentation](https://docs.digitalocean.com/products/kubernetes/) - Official DOKS documentation
- [DigitalOcean Kubernetes Best Practices](https://docs.digitalocean.com/products/kubernetes/concepts/best-practices/) - Infrastructure planning and HA guidelines
- [DigitalOcean PostgreSQL with PgBouncer](https://docs.digitalocean.com/products/databases/postgresql/how-to/manage-connection-pools/) - Managed PostgreSQL connection pooling
- [DigitalOcean Managed Valkey Announcement](https://www.digitalocean.com/blog/introducing-managed-valkey) - Valkey as Redis replacement, launched 2025
- [DigitalOcean Valkey Documentation](https://docs.digitalocean.com/products/databases/valkey/) - Managed Valkey features and configuration
- [cert-manager DigitalOcean Provider](https://cert-manager.io/docs/configuration/acme/dns01/digitalocean/) - DNS-01 challenge configuration
- [doctl Kubernetes Cluster Commands](https://docs.digitalocean.com/reference/doctl/reference/kubernetes/cluster/) - CLI reference for cluster provisioning
- [Terraform DigitalOcean Provider](https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs) - Official Terraform provider documentation
- [DigitalOcean Container Registry Integration](https://docs.digitalocean.com/products/kubernetes/how-to/integrate-with-docr/) - DOCR-DOKS integration
- [DigitalOcean VPC-Native Clusters](https://www.digitalocean.com/blog/vpc-native-clusters) - VPC networking for DOKS
- [Helm Hooks Documentation](https://helm.sh/docs/topics/charts_hooks/) - Pre-install hook patterns for migrations

### Secondary (MEDIUM confidence)

- [ClickHouse Cloud SharedMergeTree](https://github.com/ClickHouse/clickhouse-docs/blob/main/docs/cloud/reference/shared-merge-tree.md) - Cloud-native table engine details
- [Kubernetes Secrets Rotation Best Practices 2026](https://medium.com/@quicksilversel/kubernetes-secrets-management-how-we-rotate-secrets-without-breaking-production-6c6ed6fcb115) - Rotation strategies and patterns
- [External Secrets Operator Overview](https://external-secrets.io/latest/introduction/overview/) - ESO architecture and concepts
- [DigitalOcean Managed Database PITR](https://docs.digitalocean.com/products/databases/postgresql/details/limits/) - 7-day PITR capabilities
- [Next.js Environment Variables Guide](https://nextjs.org/docs/pages/guides/environment-variables) - NEXT_PUBLIC_ behavior documentation
- [Terraform vs Pulumi Comparison 2026](https://dasroot.net/posts/2026/01/infrastructure-as-code-terraform-opentofu-pulumi-comparison-2026/) - IaC tooling comparison
- [DigitalOcean Spaces S3 Compatibility](https://www.digitalocean.com/products/spaces) - Object storage for backups

### Tertiary (LOW confidence)

- [DigitalOcean DOKS 1K Nodes Announcement](https://www.digitalocean.com/blog/introducing-doks-1k-nodes) - Scalability improvements (mentions future features)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools are industry standards with official DigitalOcean support
- Architecture patterns: HIGH - Patterns verified with official documentation and Terraform provider docs
- Pitfalls: HIGH - Based on official docs, community issues, and documented migration guides
- Valkey migration: MEDIUM - Service launched 2025, less production experience than Redis
- ClickHouse Cloud schema: MEDIUM - Cloud service is newer than self-hosted, requires verification

**Research date:** 2026-02-11
**Valid until:** 2026-04-11 (60 days - stable infrastructure tooling, quarterly cloud service updates)
