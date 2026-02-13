# Nebula DNS Infrastructure Provisioning

Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Overview

This directory contains Terraform configurations and operational scripts to provision and manage Nebula DNS infrastructure on DigitalOcean.

**What Gets Provisioned:**

- **Compute:** DOKS (DigitalOcean Kubernetes Service) cluster with auto-scaling (3-10 nodes)
- **Databases:** Managed PostgreSQL (with PgBouncer), Valkey (Redis-compatible cache)
- **Analytics:** ClickHouse Cloud for DNS query logging and analytics
- **Networking:** VPC with private networking, firewall rules
- **Operators:** cert-manager (TLS certificates), external-dns (DNS automation)

All resources are deployed in a private VPC for security and cost optimization.

## Provisioned Resources

| Resource | Provider | Purpose | Configuration |
|----------|----------|---------|---------------|
| VPC | DigitalOcean | Private networking | 10.10.0.0/16 (65,536 IPs) |
| DOKS Cluster | DigitalOcean | Kubernetes control plane | HA enabled, 3-10 nodes (s-4vcpu-8gb) |
| PostgreSQL | DigitalOcean | Relational database | 2-node HA, PgBouncer 50-connection pool |
| Valkey | DigitalOcean | Redis-compatible cache | 2-node HA, TLS enabled |
| ClickHouse | ClickHouse Cloud | Analytics database | Development tier, 24-48GB auto-scaling |
| cert-manager | Kubernetes Operator | TLS certificate automation | DNS-01 challenge solver |
| external-dns | Kubernetes Operator | DNS record automation | DigitalOcean DNS integration |

## Kubernetes Secrets

| Secret Name | Namespace | Keys | Source |
|-------------|-----------|------|--------|
| `api-secrets` | nebula-dns | database-url, database-direct-url, redis-url, jwt-secret, jwt-refresh-secret, admin-jwt-secret, mfa-encryption-key, sso-encryption-key, siem-encryption-key | Terraform outputs + generated |
| `policy-svc-secrets` | nebula-dns | redis-url, clickhouse-url | Terraform outputs |
| `clickhouse-secrets` | nebula-dns | username, password, host, port | ClickHouse Cloud console |
| `stripe-secrets` | nebula-dns | secret-key, webhook-secret | Stripe Dashboard (manual) |
| `sendgrid-secrets` | nebula-dns | api-key | SendGrid Dashboard (manual) |
| `sentry-secrets` | nebula-dns | dsn | Sentry Dashboard (manual) |
| `digitalocean-dns` | cert-manager | access-token | DO API token (manual) |
| `digitalocean-credentials` | kube-system | access-token | DO API token (manual) |

## Prerequisites

Install required tools:

```bash
# Terraform (infrastructure provisioning)
brew install terraform

# doctl (DigitalOcean CLI)
brew install doctl

# kubectl (Kubernetes CLI)
brew install kubectl

# Helm (Kubernetes package manager)
brew install helm

# jq (JSON processing - for credential rotation)
brew install jq
```

## Step 1: Configure DigitalOcean API Access

1. Create a DigitalOcean API token:
   - Go to https://cloud.digitalocean.com/account/api/tokens
   - Generate New Token with **read** and **write** scopes
   - Save the token securely

2. Authenticate doctl:
   ```bash
   doctl auth init
   # Paste your API token when prompted
   ```

3. Export token for Terraform:
   ```bash
   export DIGITALOCEAN_TOKEN="your_token_here"
   ```

## Step 2: Create Spaces Bucket for Terraform State

Terraform state must be stored remotely for team collaboration and state locking.

```bash
# Create Spaces bucket (S3-compatible object storage)
doctl spaces bucket create nebula-dns-terraform-state --region nyc3

# Generate Spaces access keys
doctl spaces access-keys create nebula-dns-terraform

# Save the output:
# Access Key ID: XXXXXXXXXXXXXXXXXXXX
# Secret Access Key: YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
```

Update `infrastructure/terraform/environments/production/backend.tf` with your Spaces credentials:

```hcl
terraform {
  backend "s3" {
    endpoint                    = "nyc3.digitaloceanspaces.com"
    region                      = "us-east-1"  # Dummy region (required by S3 API)
    bucket                      = "nebula-dns-terraform-state"
    key                         = "production/terraform.tfstate"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    access_key                  = "YOUR_SPACES_ACCESS_KEY"
    secret_key                  = "YOUR_SPACES_SECRET_KEY"
  }
}
```

## Step 3: Initialize and Apply Terraform

Provision all infrastructure:

```bash
cd infrastructure/terraform/environments/production

# Initialize Terraform (download providers, configure backend)
terraform init

# Preview changes
terraform plan

# Apply configuration
terraform apply

# Save outputs for later use
terraform output > outputs.txt
```

**Terraform will create:**
- VPC with 10.10.0.0/16 CIDR
- DOKS cluster (3 nodes initially, auto-scales to 10)
- PostgreSQL cluster (2 nodes, PgBouncer enabled)
- Valkey cluster (2 nodes, TLS enabled)
- ClickHouse Cloud service (development tier)
- Firewall rules restricting database access to DOKS cluster

**Expected duration:** 10-15 minutes

**Important outputs to save:**
- `kubeconfig_path` - Path to kubectl config
- `postgres_connection_uri` - PostgreSQL connection string (pooled)
- `postgres_direct_uri` - PostgreSQL connection string (direct for migrations)
- `valkey_connection_uri` - Valkey connection string
- `clickhouse_endpoints` - ClickHouse Cloud endpoints

## Step 4: Configure kubectl Context

Connect kubectl to your DOKS cluster:

```bash
# Save kubeconfig to ~/.kube/config
doctl kubernetes cluster kubeconfig save <cluster-name>

# Verify connectivity
kubectl cluster-info
kubectl get nodes

# You should see 3 nodes in Ready state
```

## Step 5: Install Kubernetes Operators

Install cert-manager and external-dns:

```bash
cd infrastructure/kubernetes/operators

# Make script executable
chmod +x install-operators.sh

# Install operators
./install-operators.sh

# Verify installation
kubectl get pods -n cert-manager
kubectl get pods -n kube-system -l app.kubernetes.io/name=external-dns
```

**What this installs:**
- cert-manager (TLS certificate automation via Let's Encrypt)
- ClusterIssuer for production certificates (DNS-01 challenge)
- external-dns (automatic DNS record management)

**Manual step:** Update `install-operators.sh` with your DigitalOcean API token and domain name before running.

## Step 6: Create Kubernetes Secrets

Generate secrets from Terraform outputs:

```bash
cd infrastructure/kubernetes/secrets

# Make script executable
chmod +x create-secrets.sh

# Dry-run to preview (no changes applied)
./create-secrets.sh --dry-run

# Create secrets
./create-secrets.sh
```

**What this creates:**
- `api-secrets` - Database URIs, JWT secrets (auto-generated), encryption keys (auto-generated)
- `policy-svc-secrets` - Redis and ClickHouse connection details
- `clickhouse-secrets` - ClickHouse credentials (update manually from ClickHouse Cloud console)

**Manual secrets required:**

```bash
# Stripe (get from Stripe Dashboard)
kubectl -n nebula-dns create secret generic stripe-secrets \
  --from-literal=secret-key='sk_live_...' \
  --from-literal=webhook-secret='whsec_...'

# SendGrid (get from SendGrid Dashboard)
kubectl -n nebula-dns create secret generic sendgrid-secrets \
  --from-literal=api-key='SG.xxx'

# Sentry (get from Sentry Dashboard)
kubectl -n nebula-dns create secret generic sentry-secrets \
  --from-literal=dsn='https://xxx@sentry.io/xxx'
```

## Step 7: Verify Infrastructure

Run comprehensive health checks:

```bash
cd infrastructure/scripts

# Make script executable
chmod +x verify-infrastructure.sh

# Run verification
./verify-infrastructure.sh
```

**What this checks:**
- DOKS cluster connectivity and node health
- Kubernetes version compatibility
- cert-manager installation and webhook readiness
- external-dns installation
- Kubernetes Secrets existence
- Database connection string formats

**Expected output:**

```
=== Nebula DNS Infrastructure Verification ===

--- DOKS Cluster ---
Checking kubectl connectivity...              PASS
Checking nodes ready (3+)...                  PASS
Checking K8s version 1.30+...                 PASS
Checking nebula-dns namespace...              PASS

--- Operators ---
Checking cert-manager pods running...         PASS
Checking cert-manager webhook ready...        PASS
Checking ClusterIssuer letsencrypt-prod...    PASS
Checking external-dns running...              PASS

--- Secrets ---
Checking api-secrets exists...                PASS
Checking policy-svc-secrets exists...         PASS
Checking clickhouse-secrets exists...         PASS

=== Summary ===
  PASS: 15
  FAIL: 0
  WARN: 2

RESULT: PASSED with warnings
```

## Credential Rotation

Rotate credentials for security best practices:

```bash
cd infrastructure/scripts

# Make script executable
chmod +x rotate-credentials.sh

# Rotate specific credential type
./rotate-credentials.sh jwt          # JWT signing secrets
./rotate-credentials.sh encryption   # Encryption keys (requires migration)
./rotate-credentials.sh postgres     # PostgreSQL password
./rotate-credentials.sh valkey       # Valkey password
./rotate-credentials.sh clickhouse   # ClickHouse Cloud password
./rotate-credentials.sh do-token     # DigitalOcean API token
./rotate-credentials.sh all-app      # All application-level secrets
```

**Each rotation includes:**
- Impact assessment (what breaks, how long)
- Step-by-step procedure
- Verification commands

**Recommended rotation schedule:**
- JWT secrets: Every 90 days
- Encryption keys: Every 180 days (requires data re-encryption)
- Database passwords: Every 90 days (during maintenance window)
- API tokens: When compromised or every 90 days

## Teardown Procedure

**WARNING:** This will destroy all infrastructure and data. Only run in non-production environments or when decommissioning.

```bash
cd infrastructure/terraform/environments/production

# Delete Kubernetes resources first (prevents orphaned resources)
kubectl delete namespace nebula-dns --wait=true
kubectl delete clusterissuer letsencrypt-prod
helm uninstall cert-manager -n cert-manager
helm uninstall external-dns -n kube-system

# Destroy Terraform-managed resources
terraform destroy

# Confirm deletion of:
# - DOKS cluster
# - PostgreSQL cluster
# - Valkey cluster
# - ClickHouse Cloud service
# - VPC
# - Firewall rules

# Delete Terraform state bucket (optional)
doctl spaces bucket delete nebula-dns-terraform-state --force
```

**Data loss warning:** PostgreSQL and ClickHouse data will be permanently deleted. Ensure backups exist before proceeding.

## Troubleshooting

### Issue: `terraform apply` fails with "Error creating Kubernetes cluster"`

**Cause:** Insufficient DigitalOcean quota or invalid node size.

**Solution:**
- Check quota: `doctl account get`
- Verify node size availability: `doctl kubernetes options sizes`
- Request quota increase in DigitalOcean Support

### Issue: `kubectl` cannot connect to cluster

**Cause:** Kubeconfig not configured or cluster not ready.

**Solution:**
```bash
# Re-fetch kubeconfig
doctl kubernetes cluster kubeconfig save <cluster-name>

# Check cluster status
doctl kubernetes cluster get <cluster-name>

# Wait for cluster to be ready (can take 5-10 minutes)
```

### Issue: `create-secrets.sh` shows "postgres_connection_uri is empty"

**Cause:** Terraform outputs not available (apply not run or failed).

**Solution:**
```bash
cd infrastructure/terraform/environments/production
terraform output postgres_connection_uri

# If empty, re-run:
terraform apply
```

### Issue: cert-manager pods stuck in `Pending` state

**Cause:** Insufficient cluster resources or scheduler issues.

**Solution:**
```bash
# Check node resources
kubectl describe nodes

# Check pod events
kubectl describe pod -n cert-manager <pod-name>

# Scale cluster if needed
doctl kubernetes cluster node-pool update <cluster-id> <pool-id> --count 4
```

### Issue: external-dns not creating DNS records

**Cause:** Missing DigitalOcean API token or incorrect secret.

**Solution:**
```bash
# Verify secret exists
kubectl get secret digitalocean-credentials -n kube-system

# Check external-dns logs
kubectl logs -n kube-system -l app.kubernetes.io/name=external-dns

# Re-create secret with correct token
kubectl -n kube-system create secret generic digitalocean-credentials \
  --from-literal=access-token='YOUR_TOKEN' \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Issue: Database connection refused from pods

**Cause:** Firewall rules blocking DOKS cluster or incorrect connection string.

**Solution:**
```bash
# Verify firewall rules allow DOKS VPC
doctl databases firewalls list <database-id>

# Should show trusted source: k8s:<cluster-id>

# Test connectivity from pod
kubectl run -it --rm debug --image=postgres:16-alpine --restart=Never -- \
  psql "$(kubectl get secret api-secrets -n nebula-dns -o jsonpath='{.data.database-url}' | base64 -d)"
```

### Issue: ClickHouse connection timeout

**Cause:** ClickHouse Cloud service in idle state or incorrect host.

**Solution:**
```bash
# Check ClickHouse Cloud console for service status
# Service auto-pauses after 5 minutes of inactivity (development tier)

# Wake service by querying:
curl -u default:PASSWORD https://HOST:8443/?query=SELECT%201

# Verify secret has correct host
kubectl get secret clickhouse-secrets -n nebula-dns -o jsonpath='{.data.host}' | base64 -d
```

## Cost Estimation

**Monthly costs (DigitalOcean + ClickHouse Cloud):**

| Resource | Configuration | Monthly Cost (USD) |
|----------|---------------|-------------------|
| DOKS Cluster | 3x s-4vcpu-8gb nodes | $144 ($48/node) |
| PostgreSQL | 2-node HA (db-s-2vcpu-4gb) | $120 |
| Valkey | 2-node HA (db-s-1vcpu-2gb) | $60 |
| ClickHouse Cloud | Development tier (auto-scaling) | $50-200 (usage-based) |
| Load Balancer | DOKS ingress | $12 |
| VPC | Included | $0 |
| **Total** | | **$386-536/month** |

**Notes:**
- Auto-scaling can increase costs during traffic spikes
- ClickHouse development tier pauses after 5 minutes idle (cost savings)
- Production tier ClickHouse recommended for 24/7 uptime ($300-600/month)

## Next Steps

After provisioning infrastructure:

1. Deploy Nebula DNS workloads:
   ```bash
   kubectl apply -k k8s/overlays/production
   ```

2. Initialize ClickHouse schema:
   ```bash
   kubectl apply -f k8s/base/jobs/clickhouse-init-job.yaml
   ```

3. Run database migrations:
   ```bash
   kubectl apply -f k8s/base/jobs/db-migration-job.yaml
   ```

4. Configure DNS records (see `docs/N-production-deployment.md`)

5. Set up monitoring and alerting (Prometheus, Grafana)

## Support

For issues or questions:
- File an issue: https://github.com/yourorg/nebula-dns/issues
- Contact: jeremy@fluxlabs.net
- Documentation: `docs/`

## License

Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
