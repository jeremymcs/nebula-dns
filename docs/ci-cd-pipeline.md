# CI/CD Pipeline Documentation

// Nebula DNS - CI/CD Pipeline Documentation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Pipeline Architecture

```
┌─────────────┐
│ Push to main│
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                   Test Gates (Parallel)                 │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐       │
│  │  CI Tests │  │ Security │  │ Optional Tests │       │
│  │ (unit/int│  │  Scans   │  │ (E2E/Load)     │       │
│  │  /e2e)   │  │          │  │                │       │
│  └──────────┘  └──────────┘  └────────────────┘       │
└─────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│           Build & Push Images (Parallel)                │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │
│  │ API │ │ UI  │ │Admin│ │Policy│ │dnsdist│Unbound│   │
│  │     │ │     │ │ UI  │ │ Svc │ │      │       │     │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘     │
└─────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│              Deploy to Staging (Auto)                   │
│  • Helm deployment with staging values                  │
│  • Health checks and smoke tests                        │
│  • Rollback on failure (--atomic)                       │
└─────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│           Manual Approval Gate (GitHub UI)              │
│  • Production environment protection                     │
│  • Required reviewers approval                          │
└─────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│            Deploy to Production (Manual)                │
│  • Helm deployment with production values               │
│  • Health checks and smoke tests                        │
│  • Rollback on failure (--atomic)                       │
└─────────────────────────────────────────────────────────┘
```

## Workflow Files

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `deploy.yml` | Push to main, manual | Main deployment pipeline - runs tests, builds 6 service images, deploys to staging, awaits approval for production |
| `_build-push-image.yml` | Reusable (workflow_call) | Reusable workflow for building and pushing a single service image to DOCR with authentication and caching |
| `ci.yml` | Push, PR, scheduled | Test gate running unit, integration, and E2E tests for API, policy service, and UI |
| `e2e-ci.yml` | Scheduled (nightly), manual | Extended E2E test suite for comprehensive UI and integration testing |
| `security-scan.yml` | Push, PR, scheduled, workflow_call | Security scanning gate: SAST (CodeQL), secrets detection (Gitleaks), dependency scanning, container scanning (Trivy), SBOM generation |
| `load-test.yml` | Scheduled (weekly), manual | Performance testing using k6 to validate SLO compliance (p95 latency, error rate) |
| `docr-cleanup.yml` | Scheduled (weekly), manual | Image garbage collection to prevent unbounded DOCR storage accumulation |
| `release.yml` | Tag creation (v*.*.*) | GitHub release creation with changelog generation and asset uploads |

## Services Built

The pipeline builds and deploys 6 containerized services:

| Service | Dockerfile Path | DOCR Image | Build Context |
|---------|----------------|------------|---------------|
| API | `api/Dockerfile` | `registry.digitalocean.com/nebula-dns/api` | `./api` |
| UI | `ui/Dockerfile` (context: repo root) | `registry.digitalocean.com/nebula-dns/ui` | `.` |
| Admin UI | `admin-ui/Dockerfile` (context: repo root) | `registry.digitalocean.com/nebula-dns/admin-ui` | `.` |
| Policy Service | `policy-svc/Dockerfile` | `registry.digitalocean.com/nebula-dns/policy-svc` | `./policy-svc` |
| dnsdist | `config/dnsdist/Dockerfile` | `registry.digitalocean.com/nebula-dns/dnsdist` | `./config/dnsdist` |
| Unbound | `config/unbound/Dockerfile` | `registry.digitalocean.com/nebula-dns/unbound` | `./config/unbound` |

## Environment Configuration

### GitHub Environments

Two environments are required, configured in **Settings → Environments**:

1. **staging**
   - No protection rules required
   - Automatic deployment on push to main
   - Uses staging cluster credentials

2. **production**
   - **Required reviewers:** Add team members who can approve production deployments
   - **Deployment branches:** Restricted to `main` branch only
   - Manual approval required via GitHub Actions UI
   - Uses production cluster credentials

### GitHub Secrets

Required secrets, configured in **Settings → Secrets and variables → Actions**:

| Secret | Source | Purpose |
|--------|--------|---------|
| `DIGITALOCEAN_ACCESS_TOKEN` | DigitalOcean Dashboard → API → Tokens → Generate New Token (read/write) | DOCR authentication and doctl operations |
| `DOKS_CLUSTER_ID_STAGING` | DigitalOcean Dashboard → Kubernetes → Staging Cluster → Overview → Cluster ID | kubectl configuration for staging deployments |
| `DOKS_CLUSTER_ID_PRODUCTION` | DigitalOcean Dashboard → Kubernetes → Production Cluster → Overview → Cluster ID | kubectl configuration for production deployments |

### DOCR-DOKS Integration

Verify Kubernetes clusters can pull from DOCR without imagePullSecrets:

1. Go to **DigitalOcean Dashboard → Container Registry → Settings**
2. Under "DigitalOcean Kubernetes integration", verify both staging and production clusters are listed
3. If not listed, click **Edit** and add the clusters
4. This enables automatic image pulling without manual secret management

## Deployment Flow

### Automatic Staging Deployment

On every push to `main`:

1. Test gates execute (CI tests, security scans)
2. If tests pass, 6 service images build in parallel
3. Images pushed to DOCR with Git SHA tags
4. Staging deployment triggered automatically
5. Helm deploys to staging cluster with `values-staging.yaml`
6. Health checks validate deployment success
7. `--atomic` flag ensures automatic rollback on failure

### Manual Production Approval

After successful staging deployment:

1. Navigate to **Actions** tab → Select the workflow run
2. Locate the "Deploy to Production" job (will show "Waiting")
3. Click **Review deployments** button
4. Select **production** environment
5. Add optional comment (e.g., "Approved after staging validation")
6. Click **Approve and deploy**
7. Production deployment proceeds with same images used in staging

### Emergency Deployment

To skip tests and deploy immediately (use with extreme caution):

```bash
gh workflow run deploy.yml \
  --field skip_tests=true \
  --field environment=staging  # or production (requires approval)
```

This bypasses CI/E2E tests and security scans. Only use for critical hotfixes.

## Rollback Procedures

### Automatic Rollback

Helm's `--atomic` flag (enabled in deploy.yml) automatically rolls back on deployment failure:

- Deployment timeout (default 15 minutes)
- Health check failures
- Resource creation errors

No manual intervention required. Check logs for failure reason.

### Manual Rollback

If a deployment succeeds but runtime issues appear:

```bash
# List recent releases
helm history nebula-dns -n nebula-dns

# Rollback to previous revision
helm rollback nebula-dns <revision-number> -n nebula-dns

# Example: rollback to revision 5
helm rollback nebula-dns 5 -n nebula-dns --wait
```

### Emergency Pod Rollback

For immediate service-specific rollback without Helm:

```bash
# Rollback specific deployment to previous revision
kubectl rollout undo deployment/nebula-dns-safedns-api -n nebula-dns

# Check rollback status
kubectl rollout status deployment/nebula-dns-safedns-api -n nebula-dns

# View rollout history
kubectl rollout history deployment/nebula-dns-safedns-api -n nebula-dns
```

This restores the previous pod spec (image, env vars, resources) without changing ConfigMaps or Secrets.

## Troubleshooting

### DOCR Authentication Failures

**Symptom:** `Error response from daemon: unauthorized: authentication required`

**Causes:**
- `DIGITALOCEAN_ACCESS_TOKEN` expired or invalid
- Token lacks `write` scope (needs read/write, not read-only)
- DOCR registry not created (must exist before push)

**Resolution:**
1. Generate new token: DigitalOcean Dashboard → API → Tokens → Generate New Token
2. Ensure **Read** and **Write** scopes selected
3. Update GitHub Secret: Settings → Secrets → `DIGITALOCEAN_ACCESS_TOKEN`
4. Retry workflow

### Helm Deployment Timeout

**Symptom:** `Error: timed out waiting for the condition`

**Causes:**
- Image pull taking longer than 15 minutes (large images, slow network)
- Pods stuck in `CrashLoopBackOff` (misconfigurations)
- Insufficient cluster resources (CPU/memory limits)

**Resolution:**
1. Check pod status: `kubectl get pods -n nebula-dns`
2. View pod events: `kubectl describe pod <pod-name> -n nebula-dns`
3. Check logs: `kubectl logs <pod-name> -n nebula-dns --previous`
4. For slow pulls, increase timeout in `deploy.yml`: `--timeout 30m`
5. For resource issues, check node capacity: `kubectl top nodes`

### GitHub Actions Cache Issues

**Symptom:** Build times increase unexpectedly, cache hits show 0%

**Causes:**
- Cache size limit exceeded (10GB per repo)
- Cache keys changed (branch name, file hashes)
- Cache evicted (7-day inactivity)

**Resolution:**
1. Check cache usage: Settings → Actions → Caches
2. Clear stale caches manually if needed
3. Verify cache keys in `_build-push-image.yml` match pattern
4. For persistent issues, rebuild without cache once to reset

### Image Pull Errors in Cluster

**Symptom:** Pods stuck in `ImagePullBackOff` or `ErrImagePull`

**Causes:**
- DOCR integration not configured for DOKS cluster
- Image doesn't exist in DOCR (build failed silently)
- Network connectivity issues between cluster and DOCR

**Resolution:**
1. Verify DOCR integration: DigitalOcean Dashboard → Container Registry → Settings → Kubernetes Integration
2. Add missing clusters if needed
3. Verify image exists: `doctl registry repository list-v2`
4. Check image tags: `doctl registry repository list-tags <repository-name>`
5. Test manual pull from cluster node: `crictl pull registry.digitalocean.com/nebula-dns/api:latest`

### Production Approval Not Appearing

**Symptom:** Production deployment doesn't show "Review deployments" button

**Causes:**
- Production environment not configured with required reviewers
- User not listed as required reviewer
- Deployment branch restriction not set to `main`

**Resolution:**
1. Go to Settings → Environments → production
2. Enable "Required reviewers" and add yourself/team
3. Under "Deployment branches", select "Selected branches" → Add `main`
4. Re-run workflow after configuration update

## Weekly Maintenance

The following automated jobs run weekly to maintain pipeline health:

- **DOCR Cleanup** (Sunday 4 AM UTC): Removes untagged manifests to prevent storage bloat
- **Load Testing** (Weekly, configurable): Validates SLO compliance (p95 latency <200ms, error rate <0.1%)
- **Security Scans** (Daily 6 AM UTC): Continuous vulnerability monitoring

Review GitHub Actions summary for these workflows to ensure no critical findings.
