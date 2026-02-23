# Nebula DNS - Go-Live Plan
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Overview

All 4 milestones (v1.0-v1.3) are complete with 126 requirements shipped across 34 phases. The platform is ~95% production-ready. This plan covers the operational steps to go live.

**Estimated timeline:** 2-3 days of focused work
**Estimated monthly cost:** $386-536/month (DigitalOcean + ClickHouse Cloud)

---

## Phase 1: Prerequisites & Account Setup (1-2 hours)

### 1.1 Install Required Tools
```bash
# Terraform
brew install terraform

# DigitalOcean CLI
brew install doctl

# Kubernetes CLI
brew install kubectl

# Helm
brew install helm

# DNS testing
brew install drill

# Load testing
brew install k6
```

### 1.2 DigitalOcean Account Setup
1. Create API token (read+write): https://cloud.digitalocean.com/account/api/tokens
2. Create Spaces bucket for Terraform state:
   ```bash
   doctl auth init  # Enter your API token
   doctl spaces bucket create nebula-terraform-state --region nyc3
   ```
3. Generate Spaces access keys:
   ```bash
   doctl spaces access-keys create nebula-dns-terraform
   ```
   Save the access key ID and secret key.

### 1.3 ClickHouse Cloud Account Setup
1. Sign up at https://clickhouse.cloud
2. Go to Settings → Organization → copy your **Organization ID** (`org_...`)
3. Go to API Keys → create an admin key → save the **key** and **secret**

### 1.4 External Service API Keys
Gather these credentials (you'll need them in Phase 4):

| Service | Where to Get | Keys Needed |
|---------|-------------|-------------|
| **Stripe** | https://dashboard.stripe.com/apikeys | ✅ Have pub + secret key — need webhook secret (`whsec_...`) after deploying |
| **SendGrid** | https://app.sendgrid.com/settings/api_keys | ✅ Have API key |
| **Sentry** | https://sentry.io → Project Settings → Client Keys | ✅ Have DSN |

### 1.5 Domain Configuration
DNS remains at **Cloudflare** — do NOT transfer nameservers to DigitalOcean.

1. Ensure `nebuladns.io` is registered and Cloudflare is the authoritative DNS
2. All DNS records (`app`, `api`, `admin`, `dns1`, `dns2`, `www`) will be created manually in Cloudflare (see Phase 12)
3. **Do not** run `doctl compute domain create` — DigitalOcean DNS is not used
4. **Do not** install `external-dns` with DigitalOcean provider — it will not manage these records

---

## Phase 2: Provision Infrastructure with Terraform (30-45 minutes)

### 2.1 Set Environment Variables
```bash
export AWS_ACCESS_KEY_ID="DO8012ZT4RCR7J9EAAW9"
export AWS_SECRET_ACCESS_KEY="0hbw7jkbJYREoU7o8joiQGcrlcGF5Rhcti3anMVT7dY"
export DIGITALOCEAN_TOKEN="dop_v1_86491adb384f2a5c2cae2d12fb09c6a6c2963139ee6b6a9dd96ef4a237661e08"
```

### 2.2 Configure Terraform Variables
```bash
cd infrastructure/terraform/environments/production
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your actual values:
```hcl
# DigitalOcean
do_token = "dop_v1_86491adb384f2a5c2cae2d12fb09c6a6c2963139ee6b6a9dd96ef4a237661e08"

# Region
region = "nyc3"

# Environment
environment = "production"

# ClickHouse Cloud
clickhouse_org_id       = "a8f51311-c348-49d3-8d63-f83c7b18b2d8"
clickhouse_token_key    = "yCeUVLN0iDKYas0IzVun"
clickhouse_token_secret = "4b1d3e9GZLQtxJg32s43mF5f3DSlNojjjlkwSZXNoU"
```

### 2.3 Initialize and Apply
```bash
# Initialize (connects to Spaces backend)
terraform init

# Preview what will be created
terraform plan

# Apply (takes 10-15 minutes)
terraform apply
```

### 2.4 What Gets Created

| Resource | Configuration | Monthly Cost |
|----------|---------------|-------------|
| VPC | 10.10.0.0/16 in nyc3 | $0 |
| DOKS Cluster | 3x s-4vcpu-8gb nodes, auto-scale to 10 | $144 |
| PostgreSQL | 2-node HA, PgBouncer (50 connections) | $120 |
| Valkey (Redis) | 2-node HA, TLS enabled | $60 |
| ClickHouse Cloud | Dev tier, 24-48GB auto-scaling | $50-200 |
| Load Balancer | Created by DOKS | $12 |

### 2.5 Save Outputs
```bash
terraform output > outputs.txt
terraform output -raw cluster_kubeconfig > kubeconfig.yaml
```

### 2.6 Configure kubectl
```bash
doctl kubernetes cluster kubeconfig save nebula-dns-production
kubectl cluster-info
kubectl get nodes  # Should show 3 nodes in Ready state
```

---

## Phase 3: Install Kubernetes Operators (15-20 minutes)

### 3.1 Install cert-manager
```bash
cd infrastructure/kubernetes/operators
./install-operators.sh
```

This installs:
- **cert-manager** - Automates TLS certificate issuance via Let's Encrypt (DNS-01 challenge via Cloudflare)
- **ClusterIssuers** - `letsencrypt-staging` and `letsencrypt-prod`

> **Note:** `external-dns` is NOT installed. DNS is managed in Cloudflare manually (see Phase 12).

### 3.2 Configure cert-manager for Cloudflare DNS-01
cert-manager needs a Cloudflare API token to complete DNS-01 challenges:

```bash
# Create Cloudflare API token secret for cert-manager
kubectl -n cert-manager create secret generic cloudflare-api-token \
  --from-literal=api-token='-2178wr3dfOe8kjL1s10J4T2sj9PGwPyzP20bcEC'
```

Ensure the ClusterIssuer references Cloudflare (not DigitalOcean):
```yaml
# In your ClusterIssuer spec:
solvers:
  - dns01:
      cloudflare:
        apiTokenSecretRef:
          name: cloudflare-api-token
          key: api-token
```

### 3.3 Verify Operators
```bash
# cert-manager pods running
kubectl get pods -n cert-manager

# ClusterIssuers ready
kubectl get clusterissuer
```

---

## Phase 4: Create Kubernetes Secrets (15-20 minutes)

### 4.1 Auto-generate Secrets from Terraform Outputs
```bash
cd infrastructure/kubernetes/secrets

# Preview what will be created
./create-secrets.sh --dry-run

# Create secrets
./create-secrets.sh
```

This auto-generates:
- **`api-secrets`** in `nebula-dns` namespace:
  - `database-url` - Pooled PostgreSQL connection (via PgBouncer)
  - `database-direct-url` - Direct PostgreSQL connection (for migrations)
  - `redis-url` - Valkey connection string
  - `jwt-secret` - 48-byte random secret
  - `jwt-refresh-secret` - 48-byte random secret
  - `admin-jwt-secret` - 48-byte random secret
  - `mfa-encryption-key` - 32-byte hex key
  - `sso-encryption-key` - 32-byte hex key
  - `siem-encryption-key` - 32-byte hex key

- **`policy-svc-secrets`** in `nebula-dns` namespace:
  - `redis-url` - Valkey connection string
  - `clickhouse-url` - ClickHouse HTTPS endpoint
  - `clickhouse-database` - Database name
  - `clickhouse-user` - Username
  - `clickhouse-password` - Password

### 4.2 Create External Service Secrets (Manual)
```bash
# Stripe
kubectl -n nebula-dns create secret generic stripe-secrets \
  --from-literal=public-key='pk_live_40QzKbfVdgeSngVVnCI1dBtUs6JMVxUgYOL4OS3NRFzI9XesnUGeueSVG49NvB9fzN5jKPm5pjBanv2PAGnVeZIyp00g0euAqu5' \
  --from-literal=secret-key='sk_zutGTkiNRy62M9sxRIVIUnIk0M2HZ' \
  --from-literal=webhook-secret='whsec_...'

# SendGrid
kubectl -n nebula-dns create secret generic sendgrid-secrets \
  --from-literal=api-key='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'

# Sentry
kubectl -n nebula-dns create secret generic sentry-secrets \
  --from-literal=dsn='https://67cbeb22d2bb88b33fe4537fe556339f@o4510930329600000.ingest.us.sentry.io/4510932037926912'
```

### 4.3 Create Cloudflare API Token (for cert-manager DNS-01)
```bash
kubectl -n cert-manager create secret generic cloudflare-api-token \
  --from-literal=api-token='-2178wr3dfOe8kjL1s10J4T2sj9PGwPyzP20bcEC'
```

---

## Phase 5: Verify Infrastructure (10 minutes)

```bash
cd infrastructure/scripts
./verify-infrastructure.sh
```

This checks:
- DOKS cluster connectivity and node health (3+ nodes ready)
- Kubernetes version 1.30+
- cert-manager pods running and webhook ready
- external-dns running
- All required secrets exist
- Database connection string formats valid

---

## Phase 6: Fix ClickHouse Error Handling - P0 (2-4 hours)

Before going live, implement graceful degradation for ClickHouse failures. DNS resolution should continue even if analytics logging fails.

**What needs to happen:**
- Add circuit breaker pattern in Policy Service for ClickHouse connections
- Implement fallback behavior (queue logs locally, retry on reconnect)
- Health check endpoint should report ClickHouse status separately
- Log errors but don't block DNS resolution

**Files to modify:**
- `policy-svc/internal/clickhouse/client.go` - Add circuit breaker
- `policy-svc/internal/handlers/log_query.go` - Add error handling
- `policy-svc/internal/handlers/health.go` - Report ClickHouse status

---

## Phase 7: Fix TLS Secret Name Mismatch (5 minutes)

The certificate creates `nebula-dns-web-tls` but Ingress references `nebula-dns-tls`. Align them:

**File:** `k8s/base/cert-manager/certificates.yaml`
- Ensure the web certificate `secretName` matches what the Ingress expects

Or update the Helm Ingress template to reference `nebula-dns-web-tls`.

---

## Phase 8: Set Up GitHub CI/CD (30 minutes)

### 8.1 Configure GitHub Secrets
Go to your repo → Settings → Secrets and variables → Actions:

| Secret Name | Value |
|-------------|-------|
| `DIGITALOCEAN_ACCESS_TOKEN` | Your DO API token |
| `DOKS_CLUSTER_ID_STAGING` | Staging cluster ID (from DO dashboard) |
| `DOKS_CLUSTER_ID_PRODUCTION` | Production cluster ID (from `terraform output`) |

### 8.2 Configure GitHub Environments
Go to Settings → Environments:

**staging:**
- No protection rules

**production:**
- Required reviewers: add yourself
- Deployment branch: `main` only

### 8.3 Enable DOCR Integration
DigitalOcean Dashboard → Container Registry → Settings → Kubernetes Integration:
- Add your production DOKS cluster (so it can pull images from DOCR)

---

## Phase 9: Deploy to Staging First (30-45 minutes)

### 9.1 Trigger Deployment
```bash
# Push to main triggers CI/CD pipeline
git push origin main
```

The pipeline will:
1. Run unit, integration, and E2E tests (parallel)
2. Run security scans - CodeQL, Gitleaks, Trivy (parallel)
3. Build and push 6 Docker images to DOCR (parallel)
4. Deploy to staging with Helm (`--atomic` for auto-rollback on failure)

### 9.2 Monitor Staging Deployment
```bash
# Watch GitHub Actions progress
gh run list --limit 1

# After staging deploys, verify pods
kubectl get pods -n nebula-dns-staging

# Check health endpoints
kubectl exec -n nebula-dns-staging deploy/api -- curl -s localhost:3000/health

# Test DNS resolution
drill @$(kubectl get svc -n nebula-dns-staging dnsdist-dns1 -o jsonpath='{.status.loadBalancer.ingress[0].ip}') google.com
```

### 9.3 Verify TLS Certificates
```bash
# Check certificate status
kubectl get certificates -n nebula-dns-staging

# Both should show READY = True:
# - nebula-dns-web-tls (for app/api/admin)
# - dnsdist-tls (for DoT/DoH)
```

---

## Phase 10: Run Load Tests on Staging (1-2 hours)

### 10.1 Execute Load Tests
```bash
# API load test
k6 run scripts/load-testing/api-load-test.js

# DNS load test
k6 run scripts/load-testing/dns-load-test.js
```

### 10.2 Populate Baseline Document
Update `docs/load-test-baseline.md` with actual values (currently has 32 TBD placeholders):
- p50, p95, p99 latencies
- Error rates
- Queries per second (QPS)
- Resource utilization under load

### 10.3 SLO Targets to Verify

| SLO | Target | How to Check |
|-----|--------|-------------|
| DNS Availability | 99.9% | DNS probe success rate |
| API Availability | 99.9% | HTTP probe success rate |
| API Latency | p95 < 200ms | k6 results |
| Policy Eval Latency | p95 < 50ms | Policy service metrics |

---

## Phase 11: Deploy to Production (15-30 minutes)

### 11.1 Approve Production Deployment
In GitHub Actions, the staging deployment succeeded. Now:
1. Go to the workflow run in GitHub
2. Click "Review deployments"
3. Select "production" environment
4. Click "Approve and deploy"

### 11.2 What Happens Automatically
```
Helm Upgrade:
  1. ClickHouse Init Job (hook weight: -10) → Creates schema if needed
  2. PostgreSQL Migration Job (hook weight: -5) → Runs TypeORM migrations
  3. Application Deployments → Rolls out new pods
  4. Health checks → Validates all pods healthy
  5. If anything fails → Automatic rollback (--atomic flag)
```

### 11.3 Verify Production
```bash
# Check all pods are Running
kubectl get pods -n nebula-dns

# Verify migration completed
kubectl logs -n nebula-dns job/db-migration --tail=50

# Check API health
curl -s https://api.nebuladns.io/health | jq .

# Test DNS resolution
drill @dns1.nebuladns.io google.com

# Test DoT
kdig +tls @dns1.nebuladns.io google.com

# Test DoH
curl -s 'https://dns1.nebuladns.io/dns-query?name=google.com&type=A' \
  -H 'Accept: application/dns-json'
```

---

## Phase 12: DNS Records in Cloudflare (10 minutes)

DNS is managed in **Cloudflare** — records must be created manually in the Cloudflare dashboard or via the Cloudflare API. `external-dns` is not used.

### 12.1 Get IPs from Kubernetes
```bash
INGRESS_IP=$(kubectl get svc -n nebula-dns nginx-ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
DNS1_IP=$(kubectl get svc -n nebula-dns dnsdist-dns1 -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
DNS2_IP=$(kubectl get svc -n nebula-dns dnsdist-dns2 -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Ingress: $INGRESS_IP"
echo "DNS1:    $DNS1_IP"
echo "DNS2:    $DNS2_IP"
```

### 12.2 Create Records in Cloudflare

Go to **Cloudflare Dashboard → nebuladns.io → DNS → Records** and add:

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| A | `app` | `$INGRESS_IP` | DNS only (grey cloud) |
| A | `api` | `$INGRESS_IP` | DNS only (grey cloud) |
| A | `admin` | `$INGRESS_IP` | DNS only (grey cloud) |
| A | `dns1` | `$DNS1_IP` | DNS only (grey cloud) — **must be unproxied** |
| A | `dns2` | `$DNS2_IP` | DNS only (grey cloud) — **must be unproxied** |
| CNAME | `www` | `nebula-dns-www.vercel.app` | Proxied or DNS only |

> **Important:** `dns1` and `dns2` must be **DNS only** (not proxied). Cloudflare cannot proxy raw DNS (UDP/TCP port 53), DoT (853), or DoH in passthrough mode.

### 12.3 Verify Records Resolve
```bash
dig app.nebuladns.io
dig api.nebuladns.io
dig dns1.nebuladns.io
```

---

## Phase 13: Post-Launch Monitoring (First 24-48 hours)

### 13.1 Grafana Dashboards to Watch
Access Grafana via port-forward:
```bash
kubectl port-forward -n monitoring svc/grafana 3000:3000
```

Key dashboards:
- **SLO Dashboard** - Error budget burn rate
- **DNS Overview** - Query volume, block rates, latency
- **API Performance** - Request rates, error rates, latency percentiles
- **Node Health** - CPU, memory, disk across all nodes

### 13.2 Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| DNS probe success | 100% | < 99.9% |
| API 5xx rate | 0% | > 0.1% |
| DNS p95 latency | < 100ms | > 200ms |
| API p95 latency | < 200ms | > 500ms |
| Pod restarts | 0 | > 0 |
| Memory usage | < 70% | > 85% |
| Cache hit rate (Redis) | > 90% | < 80% |
| Cache hit rate (Unbound) | > 80% | < 60% |

### 13.3 Check Alerts
```bash
# Check Prometheus alerts
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Navigate to http://localhost:9090/alerts
```

---

## Phase 14: ClickHouse IP Restriction (Post-Launch)

After deployment, get your DOKS cluster's egress IPs and restrict ClickHouse access:

```bash
# Get node external IPs
kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="ExternalIP")].address}'
```

Then in ClickHouse Cloud console:
1. Go to your service → Settings → IP Access
2. Remove `0.0.0.0/0` (open access)
3. Add your DOKS node IPs

---

## Rollback Procedures

### Helm Rollback
```bash
# List release history
helm history nebula-dns -n nebula-dns

# Rollback to previous version
helm rollback nebula-dns -n nebula-dns

# Rollback to specific revision
helm rollback nebula-dns <revision> -n nebula-dns --wait
```

### Emergency Pod Rollback (without Helm)
```bash
kubectl rollout undo deployment/nebula-dns-safedns-api -n nebula-dns
kubectl rollout status deployment/nebula-dns-safedns-api -n nebula-dns
```

### Database Migration Rollback
```bash
./scripts/rollback-migration.sh
```

---

## Post-Launch Hardening (Next 2-4 weeks)

These are recommended but not blocking for launch:

| Item | Priority | Effort |
|------|----------|--------|
| CSRF protection | High | 6-8 hours |
| IP allowlisting for admin panel | High | 4-6 hours |
| Secrets rotation automation | Medium | 16-24 hours |
| Multi-region synthetic monitoring | Medium | 8-12 hours |
| Centralized log aggregation (Loki/ELK) | Medium | 12-16 hours |
| ErrorBoundary integration with Sentry | Low | 2-4 hours |

---

## Quick Reference Commands

```bash
# Check everything is healthy
kubectl get pods -n nebula-dns
kubectl top pods -n nebula-dns
kubectl get certificates -n nebula-dns

# View logs
kubectl logs -n nebula-dns deploy/api --tail=100
kubectl logs -n nebula-dns deploy/policy-svc --tail=100
kubectl logs -n nebula-dns deploy/dnsdist --tail=100

# Restart a deployment
kubectl rollout restart deployment/nebula-dns-safedns-api -n nebula-dns

# Scale up
kubectl scale deployment/nebula-dns-safedns-api -n nebula-dns --replicas=4

# Check Helm release
helm status nebula-dns -n nebula-dns
helm get values nebula-dns -n nebula-dns
```
