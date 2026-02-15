# Phase 32: CI/CD Pipeline - Research

**Researched:** 2026-02-14
**Domain:** GitHub Actions CI/CD with DigitalOcean Kubernetes
**Confidence:** HIGH

## Summary

Phase 32 implements a production-grade CI/CD pipeline for Nebula DNS using GitHub Actions to automate building, testing, and deploying a multi-service architecture to DigitalOcean Kubernetes (DOKS). The pipeline must handle 6 Docker images (API, UI, Admin UI, Policy Service, dnsdist, Unbound), coordinate multiple test suites (unit, integration, E2E, load tests), push images to DigitalOcean Container Registry (DOCR), and deploy to staging automatically while requiring manual approval for production.

The project already has robust test infrastructure (Phases 28-31) and existing workflows for CI, E2E tests, load testing, and security scanning. The challenge is orchestrating these into a cohesive deployment pipeline with proper gates, rollback capabilities, and environment separation.

**Primary recommendation:** Use GitHub Actions with environment protection rules for staging/production separation, doctl for DOCR authentication and Kubernetes access, Helm with `--atomic --wait` flags for safe deployments with automatic rollback, and reusable workflows to eliminate duplication across the 6 services.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| GitHub Actions | N/A | CI/CD orchestration | Native to GitHub, no external service needed, excellent Docker/Kubernetes integration |
| doctl | v2 | DigitalOcean CLI | Official DO tool, handles DOCR auth and DOKS access, GitHub Action available |
| docker/build-push-action | v5 | Build/push images | Official Docker action, supports buildx, multi-platform, advanced caching |
| docker/setup-buildx-action | v3 | Docker buildx setup | Required for cache backends, multi-stage optimization |
| helm | v3 | Kubernetes deployments | Already used in project (Phase 27), atomic upgrades with rollback |
| actions/checkout | v4 | Repository checkout | Standard first step in all workflows |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| digitalocean/action-doctl | v2 | DO authentication | Every workflow needing DOCR or DOKS access |
| actions/cache | v4 | Generic caching | npm/go dependencies, build artifacts |
| softprops/action-gh-release | v1 | GitHub releases | Tag-triggered releases (existing workflow) |
| codecov/codecov-action | v3 | Coverage upload | Already in use for test coverage reporting |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GitHub Actions | GitLab CI, CircleCI, Jenkins | GH Actions is free for public repos, native integration, no external service management |
| DOCR | GHCR, Docker Hub | DOCR integrates natively with DOKS, reduces data transfer costs within DO infrastructure |
| Helm | kubectl apply, Kustomize | Helm already established (Phase 27), provides rollback, release history |
| doctl | kubectl + manual DOCR auth | doctl handles both DOCR and DOKS in one tool, official DO support |

**Installation:**
```bash
# GitHub Actions (no installation - cloud service)
# doctl action configured in workflow:
- uses: digitalocean/action-doctl@v2
  with:
    token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
```

## Architecture Patterns

### Recommended Workflow Structure
```
.github/workflows/
├── _build-push-image.yml         # Reusable: Build/push single service
├── _run-tests.yml                # Reusable: Test gate (unit/integration/e2e)
├── deploy.yml                    # Main: Build → Test → Deploy
├── ci.yml                        # Existing: PR/branch testing
├── e2e-ci.yml                    # Existing: E2E test suite
├── load-test.yml                 # Existing: Performance testing
└── security-scan.yml             # Existing: Security gates
```

### Pattern 1: Reusable Workflow for Multi-Service Builds

**What:** Extract common build/push logic into reusable workflow to avoid duplication across 6 services
**When to use:** When building multiple Docker images with similar steps
**Example:**
```yaml
# .github/workflows/_build-push-image.yml
name: Build and Push Docker Image

on:
  workflow_call:
    inputs:
      service:
        required: true
        type: string
      context:
        required: true
        type: string
      registry:
        required: true
        type: string
      version:
        required: true
        type: string
    secrets:
      DIGITALOCEAN_ACCESS_TOKEN:
        required: true

jobs:
  build-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Login to DOCR
        run: doctl registry login --expiry-seconds 1200

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ${{ inputs.context }}
          push: true
          tags: |
            ${{ inputs.registry }}/${{ inputs.service }}:${{ inputs.version }}
            ${{ inputs.registry }}/${{ inputs.service }}:latest
          cache-from: type=gha,scope=${{ inputs.service }}
          cache-to: type=gha,mode=max,scope=${{ inputs.service }}

# Caller workflow
jobs:
  build-api:
    uses: ./.github/workflows/_build-push-image.yml
    with:
      service: nebula-dns-api
      context: ./api
      registry: registry.digitalocean.com/nebula-dns
      version: ${{ github.sha }}
    secrets:
      DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
```
**Source:** [GitHub Actions Reusable Workflows Guide](https://docs.github.com/en/actions/concepts/workflows-and-actions/reusing-workflow-configurations)

### Pattern 2: Environment-Based Deployment with Manual Gates

**What:** Use GitHub Environments to separate staging/production with protection rules
**When to use:** When automatic staging deployment is desired but production requires approval
**Example:**
```yaml
# .github/workflows/deploy.yml
jobs:
  deploy-staging:
    environment: staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Update kubeconfig
        run: doctl kubernetes cluster kubeconfig save ${{ secrets.DOKS_CLUSTER_ID_STAGING }}

      - name: Deploy with Helm
        run: |
          helm upgrade nebula-dns ./helm/safedns \
            --install \
            --namespace nebula-dns-staging \
            --create-namespace \
            --atomic \
            --wait \
            --timeout 10m \
            --set api.image.tag=${{ github.sha }} \
            --set ui.image.tag=${{ github.sha }} \
            --set policySvc.image.tag=${{ github.sha }} \
            -f ./helm/safedns/values-staging.yaml

  deploy-production:
    needs: deploy-staging
    environment: production  # Configured with required reviewers in repo settings
    runs-on: ubuntu-latest
    steps:
      - uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Update kubeconfig
        run: doctl kubernetes cluster kubeconfig save ${{ secrets.DOKS_CLUSTER_ID_PRODUCTION }}

      - name: Deploy with Helm
        run: |
          helm upgrade nebula-dns ./helm/safedns \
            --install \
            --namespace nebula-dns \
            --atomic \
            --wait \
            --timeout 15m \
            --set api.image.tag=${{ github.sha }} \
            --set ui.image.tag=${{ github.sha }} \
            --set policySvc.image.tag=${{ github.sha }} \
            -f ./helm/safedns/values-production.yaml
```
**Source:** [GitHub Actions Deployment Strategies with Environments](https://docs.github.com/actions/deployment/about-deployments/deploying-with-github-actions)

### Pattern 3: Atomic Deployment with Automatic Rollback

**What:** Use Helm's `--atomic` and `--wait` flags to automatically rollback failed deployments
**When to use:** Production deployments where failed upgrades must not leave cluster in broken state
**Example:**
```yaml
# Helm deployment with automatic rollback
- name: Deploy to production with automatic rollback
  run: |
    helm upgrade nebula-dns ./helm/safedns \
      --install \
      --namespace nebula-dns \
      --atomic \
      --wait \
      --timeout 15m \
      --history-max 10 \
      --set api.image.tag=${{ github.sha }} \
      -f ./helm/safedns/values-production.yaml
  # If deployment fails (pods don't become ready within timeout),
  # Helm automatically rolls back to previous release

- name: Verify deployment health
  if: success()
  run: |
    # Additional health checks after Helm reports success
    kubectl rollout status deployment/api -n nebula-dns --timeout=5m
    kubectl rollout status deployment/ui -n nebula-dns --timeout=5m
    kubectl rollout status deployment/policy-svc -n nebula-dns --timeout=5m
```
**Source:** [How to Upgrade and Rollback Helm Releases Safely](https://oneuptime.com/blog/post/2026-01-17-helm-upgrade-rollback-releases/view)

### Pattern 4: DOCR Authentication with Short-Lived Tokens

**What:** Use `doctl registry login --expiry-seconds` for time-limited DOCR credentials
**When to use:** Every workflow that pushes to DOCR
**Example:**
```yaml
- name: Install doctl
  uses: digitalocean/action-doctl@v2
  with:
    token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

- name: Login to DOCR with short-lived token
  run: doctl registry login --expiry-seconds 1200
  # Token expires after 20 minutes (1200 seconds)
  # Reduces security risk vs long-lived credentials

- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: ./api
    push: true
    tags: registry.digitalocean.com/nebula-dns/api:${{ github.sha }}
```
**Source:** [DigitalOcean Container Registry Documentation](https://docs.digitalocean.com/products/container-registry/how-to/use-registry-docker-kubernetes/)

### Pattern 5: BuildKit Cache with GHA Backend

**What:** Use GitHub Actions cache backend for Docker layer caching across builds
**When to use:** All multi-stage Docker builds to speed up CI
**Example:**
```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3
  # Buildx required for advanced cache backends

- name: Build and push with cache
  uses: docker/build-push-action@v5
  with:
    context: ./api
    push: true
    tags: registry.digitalocean.com/nebula-dns/api:${{ github.sha }}
    cache-from: type=gha,scope=api-build
    cache-to: type=gha,mode=max,scope=api-build
    # mode=max caches all intermediate layers (important for multi-stage)
    # scope isolates caches per service to prevent overwriting
```
**Source:** [GitHub Actions cache | Docker Docs](https://docs.docker.com/build/cache/backends/gha/)

### Pattern 6: Test Gates with Job Dependencies

**What:** Run tests in parallel, block deployment until all pass
**When to use:** Every deployment workflow
**Example:**
```yaml
jobs:
  # Run all tests in parallel
  unit-tests:
    runs-on: ubuntu-latest
    steps: [...]

  integration-tests:
    runs-on: ubuntu-latest
    steps: [...]

  e2e-tests:
    runs-on: ubuntu-latest
    steps: [...]

  load-tests:
    runs-on: ubuntu-latest
    steps: [...]

  security-scan:
    runs-on: ubuntu-latest
    steps: [...]

  # Build only after all tests pass
  build-images:
    needs: [unit-tests, integration-tests, e2e-tests, load-tests, security-scan]
    runs-on: ubuntu-latest
    steps: [...]

  # Deploy only after successful builds
  deploy-staging:
    needs: build-images
    environment: staging
    steps: [...]
```
**Source:** [GitHub Actions CI/CD: The Complete Guide for 2026](https://devtoolbox.dedyn.io/blog/github-actions-cicd-complete-guide)

### Anti-Patterns to Avoid

- **Using `latest` tag for production deployments:** Always use immutable tags (git SHA, semver) for traceability and rollback capability
- **Skipping `--atomic` flag in production:** Leads to half-deployed states when rollout fails mid-way
- **Pushing images before tests pass:** Wastes registry storage and creates confusion about image readiness
- **Hardcoding credentials in workflows:** Use GitHub Secrets for all sensitive values (DIGITALOCEAN_ACCESS_TOKEN, database URLs)
- **No cache scoping for multiple services:** Without `scope` parameter, building service B overwrites service A's cache
- **Manual `kubectl` deployments:** Bypasses Helm's release history and rollback capabilities established in Phase 27
- **Not using `--wait` flag:** Helm reports success before pods are actually ready, causing false positives

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Docker registry authentication | Custom token refresh logic | `doctl registry login --expiry-seconds` | Official DO tool, handles token lifecycle, integrates with Docker |
| Kubernetes deployments | Custom kubectl scripts | Helm with `--atomic --wait` | Already established in project, atomic rollback, release history |
| Build caching | Manual layer extraction/restoration | `cache-from: type=gha` in build-push-action | GitHub-native, no storage management, works with BuildKit |
| Manual approval gates | Custom webhook/API | GitHub Environments with required reviewers | Native to platform, audit trail, RBAC integration |
| Multi-service builds | Copy-paste 6 workflow files | Reusable workflows with `workflow_call` | DRY principle, single source of truth, easier maintenance |
| Deployment health checks | Custom polling scripts | `kubectl rollout status` + Helm `--wait` | Uses Kubernetes native readiness/liveness probes |
| Secret management | Encrypted files in repo | GitHub Secrets + Environment secrets | Encryption at rest, access control, audit logging |

**Key insight:** GitHub Actions, Docker buildx, Helm, and doctl collectively solve all common CI/CD problems for Kubernetes deployments. Building custom solutions duplicates well-tested functionality and increases maintenance burden.

## Common Pitfalls

### Pitfall 1: DOCR Authentication Failures Mid-Push

**What goes wrong:** "unauthorized" errors when pushing large images, especially in parallel builds
**Why it happens:** GitHub Actions runner tokens occasionally expire mid-push or rate limits hit during concurrent uploads
**How to avoid:** Use `doctl registry login --expiry-seconds 1200` immediately before each push, set reasonable expiry (20 min sufficient for most builds)
**Warning signs:** Intermittent push failures, "401 Unauthorized" errors after successful authentication
**Source:** [DigitalOcean Community: Pushing images to DO from GitHub Actions](https://www.digitalocean.com/community/questions/pushing-images-to-digitalocean-from-github-actions-sometimes-super-slow-and-then-fail-due-to-auth-issues)

### Pitfall 2: Cache Thrashing in Multi-Service Builds

**What goes wrong:** Building service B wipes out service A's cache, leading to full rebuilds every time
**Why it happens:** Default GHA cache behavior uses single scope, each build overwrites previous
**How to avoid:** Use unique `scope` parameter per service: `cache-from: type=gha,scope=api-build`
**Warning signs:** Build times not improving after first run, cache miss messages in logs
**Source:** [Docker buildx cache strategies discussion](https://github.com/docker/buildx/discussions/1382)

### Pitfall 3: Helm Deployments Appearing Successful When Pods Fail

**What goes wrong:** Helm reports upgrade success but pods are crash-looping
**Why it happens:** Without `--wait`, Helm returns after applying manifests, not waiting for readiness
**How to avoid:** Always use `--atomic --wait --timeout 10m` for production deployments
**Warning signs:** Deployment succeeds in CI but service is unavailable, manual rollback required
**Source:** [Helm upgrade documentation](https://helm.sh/docs/helm/helm_upgrade/)

### Pitfall 4: Forgotten Image Tag Updates in Helm Values

**What goes wrong:** Staging deploys new code but production still uses old images
**Why it happens:** Image tags in values files are static, not updated during deployment
**How to avoid:** Use `--set` flags to override tags: `--set api.image.tag=${{ github.sha }}`
**Warning signs:** CI reports successful production deploy but application version hasn't changed
**Source:** [DigitalOcean DOKS deployment guide](https://docs.digitalocean.com/products/kubernetes/how-to/deploy-using-github-actions/)

### Pitfall 5: Manual Approval Not Configured for Production Environment

**What goes wrong:** Production deploys automatically without human gate
**Why it happens:** GitHub Environment created but "required reviewers" not set in Settings → Environments
**How to avoid:** Configure protection rules: Settings → Environments → production → Required reviewers (add 1-2 team members)
**Warning signs:** No approval prompt when workflow reaches production deploy job
**Source:** [GitHub Actions deployment gates](https://oneuptime.com/blog/post/2025-12-20-deployment-gates-github-actions/view)

### Pitfall 6: Database Migrations Running Before Image Availability

**What goes wrong:** Migration job starts before new images are pushed to DOCR, pulls old version
**Why it happens:** Job dependencies not properly configured
**How to avoid:** Ensure migration job depends on all build jobs: `needs: [build-api, build-ui, ...]`
**Warning signs:** Migrations run but reference old schema, version mismatches
**Source:** Project context from existing migration job in helm/safedns/templates/db-migration-job.yaml

### Pitfall 7: No Rollback Strategy When Staging Fails

**What goes wrong:** Staging deployment fails, leaves environment in broken state, blocks future deploys
**Why it happens:** Not using `--atomic` flag, manual cleanup required
**How to avoid:** Use `--atomic` in staging too (not just production), enables automatic rollback
**Warning signs:** Need to manually `helm rollback` after failed staging deploys
**Source:** [Helm rollback best practices](https://komodor.com/learn/helm-rollback-the-basics-and-a-quick-tutorial/)

## Code Examples

Verified patterns from official sources:

### Complete Main Deployment Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to DOKS

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  DOCR_REGISTRY: registry.digitalocean.com/nebula-dns
  DOKS_CLUSTER_STAGING: nebula-dns-staging
  DOKS_CLUSTER_PROD: nebula-dns-production

jobs:
  # Run existing test workflows (reuse established tests)
  run-tests:
    uses: ./.github/workflows/ci.yml

  run-e2e-tests:
    uses: ./.github/workflows/e2e-ci.yml

  run-security-scan:
    uses: ./.github/workflows/security-scan.yml

  # Build all service images in parallel
  build-api:
    needs: [run-tests, run-e2e-tests, run-security-scan]
    uses: ./.github/workflows/_build-push-image.yml
    with:
      service: api
      context: ./api
      registry: registry.digitalocean.com/nebula-dns
      image_name: nebula-dns-api
    secrets:
      DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

  build-ui:
    needs: [run-tests, run-e2e-tests, run-security-scan]
    uses: ./.github/workflows/_build-push-image.yml
    with:
      service: ui
      context: ./ui
      registry: registry.digitalocean.com/nebula-dns
      image_name: nebula-dns-ui
    secrets:
      DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

  build-admin-ui:
    needs: [run-tests, run-e2e-tests, run-security-scan]
    uses: ./.github/workflows/_build-push-image.yml
    with:
      service: admin-ui
      context: ./admin-ui
      registry: registry.digitalocean.com/nebula-dns
      image_name: nebula-dns-admin-ui
    secrets:
      DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

  build-policy-svc:
    needs: [run-tests, run-e2e-tests, run-security-scan]
    uses: ./.github/workflows/_build-push-image.yml
    with:
      service: policy-svc
      context: ./policy-svc
      registry: registry.digitalocean.com/nebula-dns
      image_name: nebula-dns-policy-svc
    secrets:
      DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

  build-dnsdist:
    needs: [run-tests, run-e2e-tests, run-security-scan]
    uses: ./.github/workflows/_build-push-image.yml
    with:
      service: dnsdist
      context: ./dnsdist
      registry: registry.digitalocean.com/nebula-dns
      image_name: nebula-dns-dnsdist
    secrets:
      DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

  build-unbound:
    needs: [run-tests, run-e2e-tests, run-security-scan]
    uses: ./.github/workflows/_build-push-image.yml
    with:
      service: unbound
      context: ./config/unbound
      registry: registry.digitalocean.com/nebula-dns
      image_name: nebula-dns-unbound
    secrets:
      DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

  # Deploy to staging automatically
  deploy-staging:
    needs: [build-api, build-ui, build-admin-ui, build-policy-svc, build-dnsdist, build-unbound]
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Configure kubectl for staging cluster
        run: doctl kubernetes cluster kubeconfig save ${{ env.DOKS_CLUSTER_STAGING }}

      - name: Deploy with Helm
        run: |
          helm upgrade nebula-dns ./helm/safedns \
            --install \
            --namespace nebula-dns-staging \
            --create-namespace \
            --atomic \
            --wait \
            --timeout 10m \
            --history-max 10 \
            --set global.imageRegistry=${{ env.DOCR_REGISTRY }} \
            --set api.image.tag=${{ github.sha }} \
            --set ui.image.tag=${{ github.sha }} \
            --set adminUi.image.tag=${{ github.sha }} \
            --set policySvc.image.tag=${{ github.sha }} \
            --set dnsdist.image.tag=${{ github.sha }} \
            -f ./helm/safedns/values-staging.yaml

      - name: Verify deployment
        run: |
          kubectl rollout status deployment/api -n nebula-dns-staging --timeout=5m
          kubectl rollout status deployment/ui -n nebula-dns-staging --timeout=5m
          kubectl rollout status deployment/admin-ui -n nebula-dns-staging --timeout=5m
          kubectl rollout status deployment/policy-svc -n nebula-dns-staging --timeout=5m

  # Deploy to production with manual approval
  deploy-production:
    needs: deploy-staging
    environment: production  # Requires manual approval (configured in Settings)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Configure kubectl for production cluster
        run: doctl kubernetes cluster kubeconfig save ${{ env.DOKS_CLUSTER_PROD }}

      - name: Deploy with Helm
        run: |
          helm upgrade nebula-dns ./helm/safedns \
            --install \
            --namespace nebula-dns \
            --atomic \
            --wait \
            --timeout 15m \
            --history-max 10 \
            --set global.imageRegistry=${{ env.DOCR_REGISTRY }} \
            --set api.image.tag=${{ github.sha }} \
            --set ui.image.tag=${{ github.sha }} \
            --set adminUi.image.tag=${{ github.sha }} \
            --set policySvc.image.tag=${{ github.sha }} \
            --set dnsdist.image.tag=${{ github.sha }} \
            -f ./helm/safedns/values-production.yaml

      - name: Verify deployment
        run: |
          kubectl rollout status deployment/api -n nebula-dns --timeout=5m
          kubectl rollout status deployment/ui -n nebula-dns --timeout=5m
          kubectl rollout status deployment/admin-ui -n nebula-dns --timeout=5m
          kubectl rollout status deployment/policy-svc -n nebula-dns --timeout=5m

      - name: Run smoke tests
        run: |
          # Hit health endpoints
          kubectl run curl-test --image=curlimages/curl:latest --rm -it --restart=Never -- \
            curl -f http://api.nebula-dns.svc.cluster.local/health
```
**Source:** [DigitalOcean sample-push-to-deploy-doks](https://github.com/digitalocean/sample-push-to-deploy-doks/blob/main/.github/workflows/workflow.yml)

### Reusable Build-Push Workflow

```yaml
# .github/workflows/_build-push-image.yml
name: Reusable Build and Push

on:
  workflow_call:
    inputs:
      service:
        required: true
        type: string
        description: 'Service name for caching scope'
      context:
        required: true
        type: string
        description: 'Docker build context path'
      registry:
        required: true
        type: string
        description: 'Container registry URL'
      image_name:
        required: true
        type: string
        description: 'Full image name'
    secrets:
      DIGITALOCEAN_ACCESS_TOKEN:
        required: true

jobs:
  build-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Login to DOCR
        run: doctl registry login --expiry-seconds 1200

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ inputs.registry }}/${{ inputs.image_name }}
          tags: |
            type=sha,prefix=,format=long
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: ${{ inputs.context }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha,scope=${{ inputs.service }}-build
          cache-to: type=gha,mode=max,scope=${{ inputs.service }}-build
          build-args: |
            BUILDKIT_INLINE_CACHE=1
```
**Source:** [GitHub Actions reusable workflows documentation](https://docs.github.com/en/actions/concepts/workflows-and-actions/reusing-workflow-configurations)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `docker login` in workflows | `doctl registry login --expiry-seconds` | 2023 | Short-lived tokens reduce credential exposure risk |
| `cache-from: type=local` with `actions/cache` | `cache-from: type=gha` | 2021 (Docker buildx 0.4+) | Native GHA cache backend, no manual tar extraction |
| Static Kubernetes manifests | Helm with `--atomic --wait` | 2020 (Helm 3+) | Atomic deployments with automatic rollback |
| CircleCI/TravisCI | GitHub Actions | 2019-2021 | Free for public repos, native GitHub integration |
| Long-lived registry tokens | OIDC/short-lived credentials | 2023-2024 | Zero-trust security model, ephemeral credentials |
| Manual approval via Slack/external tool | GitHub Environments with required reviewers | 2021 | Native platform feature, audit trail |

**Deprecated/outdated:**
- **Docker Hub free tier for CI/CD:** Introduced pull rate limits (2020), DOCR better for DOKS integration
- **`docker/build-push-action@v1`:** Replaced by v2+ with buildx support (2020)
- **Helm 2:** End of life (2020), Helm 3 removed Tiller, improved security
- **`actions/cache` for Docker layers:** Still works but `type=gha` is more efficient and maintained

## Open Questions

1. **ClickHouse initialization in deployment pipeline**
   - What we know: Project has ClickHouse init job in k8s/base/jobs/, needs to run before API starts
   - What's unclear: Should init job run in CI pipeline or as Helm pre-install hook?
   - Recommendation: Use Helm pre-install hook (already using hooks for migrations), ensures ClickHouse ready before API pods start

2. **Load test integration in pipeline**
   - What we know: Phase 31 established load tests with k6, run via workflow_dispatch or schedule
   - What's unclear: Should load tests run before staging deploy or after? Could delay deployments significantly
   - Recommendation: Run load tests post-deployment against staging environment, don't gate deployment on them (use schedule or manual trigger)

3. **Handling dnsdist/Unbound configuration updates**
   - What we know: dnsdist.conf and unbound.conf are copied into images during build
   - What's unclear: Config changes require image rebuild, may need ConfigMap approach for hot-reload
   - Recommendation: Keep current approach for Phase 32 (config in image), consider ConfigMaps in future if hot-reload becomes requirement

4. **Multiple environment staging clusters or namespaces**
   - What we know: Helm values-staging.yaml and values-production.yaml exist
   - What's unclear: Are staging/production separate DOKS clusters or same cluster different namespaces?
   - Recommendation: Assume separate clusters for better isolation, namespace-based staging cheaper but riskier

5. **Image garbage collection strategy**
   - What we know: Every commit creates new image tagged with SHA, can accumulate quickly
   - What's unclear: DOCR retention policy for old images, need cleanup automation?
   - Recommendation: Configure DOCR garbage collection to retain last 30 images or 90 days, whichever is more

## Sources

### Primary (HIGH confidence)

- [DigitalOcean: How to Enable Push-to-Deploy on DOKS Using GitHub Actions](https://docs.digitalocean.com/products/kubernetes/how-to/deploy-using-github-actions/)
- [DigitalOcean: sample-push-to-deploy-doks repository](https://github.com/digitalocean/sample-push-to-deploy-doks)
- [DigitalOcean: action-doctl GitHub Action](https://github.com/digitalocean/action-doctl)
- [Docker: GitHub Actions cache backend](https://docs.docker.com/build/cache/backends/gha/)
- [GitHub: Deploying with GitHub Actions](https://docs.github.com/actions/deployment/about-deployments/deploying-with-github-actions)
- [GitHub: Reusing workflow configurations](https://docs.github.com/en/actions/concepts/workflows-and-actions/reusing-workflow-configurations)
- [Helm: helm upgrade documentation](https://helm.sh/docs/helm/helm_upgrade/)
- [Helm: helm rollback documentation](https://helm.sh/docs/helm/helm_rollback/)

### Secondary (MEDIUM confidence)

- [How to Upgrade and Rollback Helm Releases Safely (OneUpTime, Jan 2026)](https://oneuptime.com/blog/post/2026-01-17-helm-upgrade-rollback-releases/view)
- [How to Set Up Deployment Gates in GitHub Actions (OneUpTime, Dec 2025)](https://oneuptime.com/blog/post/2025-12-20-deployment-gates-github-actions/view)
- [GitHub Actions CI/CD: The Complete Guide for 2026 (DevToolbox)](https://devtoolbox.dedyn.io/blog/github-actions-cicd-complete-guide)
- [CI/CD Pipelines for Kubernetes: Best Practices and Tools (Komodor)](https://komodor.com/blog/ci-cd-pipelines-for-kubernetes-best-practices-and-tools/)
- [Cache is King: Docker layer caching in GitHub Actions (Blacksmith)](https://www.blacksmith.sh/blog/cache-is-king-a-guide-for-docker-layer-caching-in-github-actions)

### Tertiary (LOW confidence - from project inspection)

- Existing workflow files in .github/workflows/ (ci.yml, e2e-ci.yml, load-test.yml, security-scan.yml, release.yml)
- Helm chart configuration in helm/safedns/ (values.yaml, values-production.yaml, templates/)
- Dockerfiles for all services (api/, ui/, admin-ui/, policy-svc/, dnsdist/, config/unbound/)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools are official, widely documented, proven in production
- Architecture: HIGH - GitHub Actions + DOKS deployment is well-established pattern with official examples
- Pitfalls: MEDIUM-HIGH - Documented from official sources and community experience, some project-specific assumptions

**Research date:** 2026-02-14
**Valid until:** 2026-04-14 (60 days - GitHub Actions and Helm are stable, DO infrastructure evolves slowly)

**Services requiring Docker images:**
1. API (NestJS) - api/Dockerfile
2. UI (Next.js) - ui/Dockerfile
3. Admin UI (Next.js) - admin-ui/Dockerfile
4. Policy Service (Go) - policy-svc/Dockerfile
5. dnsdist (DNS proxy) - dnsdist/Dockerfile
6. Unbound (DNS resolver) - config/unbound/Dockerfile

**Existing test infrastructure to integrate:**
- Unit tests: npm run test (API), go test (Policy Service)
- Integration tests: Testcontainers-based (Phase 29)
- E2E tests: Playwright (Phase 30)
- Load tests: k6 (Phase 31)
- Security scans: Trivy, CodeQL, Snyk, Gitleaks (security-scan.yml)

**GitHub Secrets required:**
- `DIGITALOCEAN_ACCESS_TOKEN` - DO API token for doctl/DOCR/DOKS access
- `DOKS_CLUSTER_ID_STAGING` - Staging cluster ID
- `DOKS_CLUSTER_ID_PRODUCTION` - Production cluster ID
- Existing secrets from Helm values: database URLs, JWT secret, Stripe keys, etc. (managed via Kubernetes Secrets)

**GitHub Environments to configure:**
- `staging` - No protection rules (auto-deploy on main branch)
- `production` - Required reviewers: 1-2 team members, deployment branch: main only
