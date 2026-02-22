# Phase 34: ClickHouse Credential Wiring Fix - Research

**Researched:** 2026-02-21
**Domain:** Kubernetes Secrets, Terraform outputs, Bash scripting
**Confidence:** HIGH

## Summary

Phase 34 addresses a critical integration gap between Phase 24 (infrastructure provisioning) and Phase 26 (DNS stack deployment). The `create-secrets.sh` script creates a `policy-svc-secrets` Kubernetes secret with only 2 keys (`redis-url`, `clickhouse-url`), but the `policy-svc-deployment.yaml` expects 5 keys (adding `clickhouse-database`, `clickhouse-user`, `clickhouse-password`). Additionally, the script creates an orphaned `clickhouse-secrets` secret that is never referenced by any deployment.

This is a pure credential wiring fix requiring changes to a single Bash script (`create-secrets.sh`) and removing an orphaned secret creation block. The fix enables the Policy Service to connect to ClickHouse Cloud in production by providing all required environment variables.

**Primary recommendation:** Add the 3 missing keys to `policy-svc-secrets` by extracting values from Terraform outputs and user input, then remove the orphaned `clickhouse-secrets` block entirely.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Secret key alignment:**
- `policy-svc-secrets` must contain exactly 5 keys: `redis-url`, `clickhouse-url`, `clickhouse-database`, `clickhouse-user`, `clickhouse-password`
- Currently only 2 keys exist (`redis-url`, `clickhouse-url`)
- 3 keys must be added: `clickhouse-database`, `clickhouse-user`, `clickhouse-password`

**ClickHouse URL format:**
- Current `clickhouse-url` passes raw JSON from `terraform output -json clickhouse_endpoints` — this is wrong
- Must extract the actual HTTPS endpoint URL from the Terraform JSON output
- Format should be a proper HTTPS URL (e.g., `https://host:8443`) that the Go Policy Service can use directly

**Credential sourcing:**
- All ClickHouse credentials should come from Terraform outputs where possible
- ClickHouse Cloud credentials (user/password) may need manual entry from the ClickHouse Cloud console if not available as Terraform outputs
- Script should handle both automated (Terraform) and manual credential entry gracefully

**Orphaned secret cleanup:**
- Remove the `clickhouse-secrets` block (lines 88-97 of create-secrets.sh) entirely
- Remove the associated echo statement about manual updates
- No other files reference `clickhouse-secrets` — it's fully orphaned

### Claude's Discretion

- Exact Terraform output parsing (jq queries vs bash string manipulation)
- Validation/error messaging for missing ClickHouse credentials
- Whether to add a verification step that tests the ClickHouse connection after secret creation

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPLOY-06 | Policy Service deployed as Deployment connecting to managed Valkey and ClickHouse Cloud | Research identifies the credential gap preventing ClickHouse connectivity. Fixing secret creation enables DEPLOY-06 completion by providing all 5 required environment variables (`REDIS_URL`, `CLICKHOUSE_URL`, `CLICKHOUSE_DATABASE`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`) that policy-svc code expects. |

</phase_requirements>

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Bash | 4.0+ | Shell scripting for K8s secret creation | Universal on Unix systems, sufficient for Terraform output parsing and kubectl commands |
| kubectl | 1.30+ | Kubernetes secret management | Official Kubernetes CLI, already used in Phase 24-04 script |
| Terraform | 1.9+ | Infrastructure state queries | Used to extract database/ClickHouse endpoints from Phase 24 provisioning |
| jq | 1.6+ | JSON parsing | De facto standard for JSON processing in shell scripts |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| openssl | 1.1.1+ | Random secret generation | Already used in create-secrets.sh for JWT/encryption keys |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jq | Python/Node script | Bash+jq is simpler for single-file parsing, no new dependencies |
| kubectl create secret | Helm templates | Script targets production setup before Helm values are configured |

**Installation:**

```bash
# jq (if not already installed)
# macOS
brew install jq

# Ubuntu/Debian
apt-get install jq

# Alpine (Docker)
apk add jq
```

## Architecture Patterns

### Recommended Script Structure

The `create-secrets.sh` script follows a standard pattern:

```
infrastructure/kubernetes/secrets/
├── create-secrets.sh          # Main secret creation script
├── rotate-secrets.sh          # JWT/encryption key rotation (existing)
├── verify-secrets.sh          # Secret validation (existing)
└── secret-template.yaml       # Manual fallback template (existing)
```

### Pattern 1: Terraform Output Extraction

**What:** Extract structured data from Terraform outputs and transform into Kubernetes secret values

**When to use:** When infrastructure provisioned by Terraform must be consumed by Kubernetes resources

**Example:**

```bash
# ClickHouse endpoints output structure (v3.0.0+ map format)
# Source: https://github.com/ClickHouse/terraform-provider-clickhouse
CH_ENDPOINTS=$(terraform output -json clickhouse_endpoints 2>/dev/null || echo "{}")

# Extract HTTPS endpoint from map structure
# endpoints["https"].host and endpoints["https"].port
CH_HOST=$(echo "${CH_ENDPOINTS}" | jq -r '.https.host // empty')
CH_PORT=$(echo "${CH_ENDPOINTS}" | jq -r '.https.port // "8443"')

# Construct full URL
if [[ -n "${CH_HOST}" ]]; then
  CH_URL="https://${CH_HOST}:${CH_PORT}"
else
  CH_URL=""
  echo "WARNING: ClickHouse host not found in Terraform outputs"
fi
```

**Why this structure:** ClickHouse Terraform provider v3.0.0+ changed `endpoints` from list to map. The HTTPS endpoint is accessed via `endpoints["https"]` not `endpoints[0]`.

### Pattern 2: Credential Prompting with Validation

**What:** Prompt for manual credentials when Terraform outputs are unavailable, with validation

**When to use:** For credentials that cannot be sourced from Terraform (e.g., ClickHouse Cloud user/password)

**Example:**

```bash
# ClickHouse database (may be in Terraform output or use default)
CH_DATABASE=$(terraform output -raw clickhouse_database 2>/dev/null || echo "")
if [[ -z "${CH_DATABASE}" ]]; then
  echo "ClickHouse database not found in Terraform outputs."
  read -p "Enter ClickHouse database name [default: nebula]: " CH_DATABASE_INPUT
  CH_DATABASE="${CH_DATABASE_INPUT:-nebula}"
fi

# ClickHouse credentials (likely require manual entry from Cloud console)
CH_USER=$(terraform output -raw clickhouse_user 2>/dev/null || echo "")
if [[ -z "${CH_USER}" ]]; then
  echo "ClickHouse user not found in Terraform outputs."
  read -p "Enter ClickHouse username [default: default]: " CH_USER_INPUT
  CH_USER="${CH_USER_INPUT:-default}"
fi

CH_PASSWORD=$(terraform output -raw clickhouse_password 2>/dev/null || echo "")
if [[ -z "${CH_PASSWORD}" ]]; then
  echo "ClickHouse password not found in Terraform outputs."
  read -s -p "Enter ClickHouse password: " CH_PASSWORD
  echo ""
fi

# Validation
if [[ -z "${CH_PASSWORD}" ]]; then
  echo "ERROR: ClickHouse password is required"
  exit 1
fi
```

### Pattern 3: Secret Creation with kubectl

**What:** Use `kubectl create secret` with piped output to `kubectl apply` for idempotency

**When to use:** All Kubernetes secret creation from scripts

**Example:**

```bash
# Existing pattern from create-secrets.sh (already correct)
kubectl create secret generic policy-svc-secrets \
  --namespace "${NAMESPACE}" \
  --from-literal=redis-url="${VALKEY_URI}" \
  --from-literal=clickhouse-url="${CH_URL}" \
  --from-literal=clickhouse-database="${CH_DATABASE}" \
  --from-literal=clickhouse-user="${CH_USER}" \
  --from-literal=clickhouse-password="${CH_PASSWORD}" \
  ${DRY_RUN} -o yaml | ${APPLY_CMD} ${DRY_RUN} -f -
```

**Why this pattern:** `kubectl create ... -o yaml | kubectl apply -f -` provides idempotency (can re-run script without errors) while maintaining declarative behavior.

### Anti-Patterns to Avoid

- **Passing raw JSON as URL:** Don't use `clickhouse-url="${CH_ENDPOINTS}"` (raw JSON object). Policy Service expects a URL string like `https://host:8443`.
- **Creating unused secrets:** Don't create `clickhouse-secrets` when nothing references it. Orphaned secrets create confusion and security audit overhead.
- **Hardcoding credentials:** Don't use `--from-literal=username="default"` with empty password placeholders. Either source from Terraform or prompt user.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON parsing in Bash | String manipulation with grep/sed/awk | jq | Edge cases (nested objects, escaping, null values) are complex. jq handles all JSON corner cases correctly. |
| Terraform state queries | Direct `.tfstate` file parsing | `terraform output` command | Terraform state format can change between versions. `terraform output` is the stable API. |
| Secret encryption | Custom encryption logic | Kubernetes Secrets (base64 + etcd encryption at rest) | K8s secrets integrate with RBAC and audit logging. Custom encryption requires key management infrastructure. |

**Key insight:** ClickHouse Terraform provider endpoint structure is versioned (v3.0.0 changed from list to map). Using jq to parse official output format is safer than assuming structure in bash string manipulation.

## Common Pitfalls

### Pitfall 1: ClickHouse Endpoint Structure Mismatch

**What goes wrong:** Assuming `endpoints` is a list (old v2 format) when it's now a map (v3.0.0+)

**Why it happens:** Documentation examples may show older provider versions

**How to avoid:** Use map access syntax: `jq -r '.https.host'` not `jq -r '.[0].host'`

**Warning signs:**
- `terraform output -json clickhouse_endpoints` returns `{"https": {...}, "mysql": {...}}` structure
- Error: `jq: error (at <stdin>:1): Cannot index array with string "https"`

### Pitfall 2: Missing jq on Production Servers

**What goes wrong:** Script works locally (macOS with Homebrew jq) but fails in CI/CD or on minimal Docker images

**Why it happens:** jq is not included in all base Linux distributions

**How to avoid:** Add jq installation check at script start:

```bash
command -v jq >/dev/null 2>&1 || { echo "jq required but not installed"; exit 1; }
```

**Warning signs:**
- Error: `create-secrets.sh: line 47: jq: command not found`
- Works on developer laptop but fails in GitHub Actions or minimal container

### Pitfall 3: Credentials Logged in Dry-Run Mode

**What goes wrong:** `--dry-run` mode still prints full YAML including passwords to stdout

**Why it happens:** `kubectl create secret ... -o yaml` outputs the complete secret manifest

**How to avoid:** This is expected behavior (dry-run shows what would be created). For production, ensure script output is not logged to publicly accessible CI/CD logs. Consider adding warning:

```bash
if [[ "${1:-}" == "--dry-run" ]]; then
  echo "DRY RUN MODE - secret values will be printed to stdout"
fi
```

**Warning signs:**
- Passwords visible in CI/CD logs
- Secret values accidentally committed to git if output redirected to file

### Pitfall 4: Empty Terraform Outputs After State Refresh

**What goes wrong:** `terraform output` returns empty values after infrastructure changes or state corruption

**Why it happens:** Terraform state may be out of sync with actual infrastructure

**How to avoid:** Check for empty required values and provide clear error messages:

```bash
if [[ -z "${PG_URI}" ]]; then
  echo "ERROR: postgres_connection_uri is empty"
  echo "Try running: cd ${TF_DIR} && terraform refresh && terraform output"
  exit 1
fi
```

**Warning signs:**
- Secrets created but all values are empty strings
- Pods fail with "invalid connection string" errors

## Code Examples

Verified patterns from project codebase and official sources:

### Extract ClickHouse HTTPS Endpoint from Terraform

```bash
# Source: ClickHouse Terraform provider v3.0.0+ documentation
# https://github.com/ClickHouse/terraform-provider-clickhouse
cd "${TF_DIR}"

# Get endpoints as JSON map
CH_ENDPOINTS=$(terraform output -json clickhouse_endpoints 2>/dev/null || echo "{}")

# Extract HTTPS endpoint (ClickHouse Cloud default)
CH_HOST=$(echo "${CH_ENDPOINTS}" | jq -r '.https.host // empty')
CH_PORT=$(echo "${CH_ENDPOINTS}" | jq -r '.https.port // "8443"')

# Construct URL
if [[ -n "${CH_HOST}" ]]; then
  CLICKHOUSE_URL="https://${CH_HOST}:${CH_PORT}"
else
  CLICKHOUSE_URL=""
  echo "WARNING: ClickHouse HTTPS endpoint not found in Terraform outputs"
  echo "You may need to configure ClickHouse Cloud manually"
fi

cd "${SCRIPT_DIR}"
```

### Create policy-svc-secrets with All 5 Keys

```bash
# Source: Existing create-secrets.sh pattern + Phase 26 deployment requirements
# File: infrastructure/kubernetes/secrets/create-secrets.sh

echo "Creating policy-svc-secrets..."
kubectl create secret generic policy-svc-secrets \
  --namespace "${NAMESPACE}" \
  --from-literal=redis-url="${VALKEY_URI}" \
  --from-literal=clickhouse-url="${CLICKHOUSE_URL}" \
  --from-literal=clickhouse-database="${CLICKHOUSE_DATABASE}" \
  --from-literal=clickhouse-user="${CLICKHOUSE_USER}" \
  --from-literal=clickhouse-password="${CLICKHOUSE_PASSWORD}" \
  ${DRY_RUN} -o yaml | ${APPLY_CMD} ${DRY_RUN} -f -

echo "policy-svc-secrets created with all 5 keys"
```

### Graceful Credential Prompting

```bash
# Prompt for credentials not available in Terraform outputs
# Provides defaults and clear instructions

echo ""
echo "=== ClickHouse Credentials ==="
echo "ClickHouse credentials are not available from Terraform outputs."
echo "Obtain these from ClickHouse Cloud console: https://clickhouse.cloud"
echo ""

read -p "Enter ClickHouse database name [default: nebula]: " CH_DB_INPUT
CLICKHOUSE_DATABASE="${CH_DB_INPUT:-nebula}"

read -p "Enter ClickHouse username [default: default]: " CH_USER_INPUT
CLICKHOUSE_USER="${CH_USER_INPUT:-default}"

read -s -p "Enter ClickHouse password: " CLICKHOUSE_PASSWORD
echo ""

# Validation
if [[ -z "${CLICKHOUSE_PASSWORD}" ]]; then
  echo "ERROR: ClickHouse password cannot be empty"
  exit 1
fi

echo "ClickHouse credentials configured for database '${CLICKHOUSE_DATABASE}' user '${CLICKHOUSE_USER}'"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ClickHouse provider endpoints as list | endpoints as map with protocol keys | v3.0.0 (2024) | Must use `.https.host` not `.[0].host` for JSON parsing |
| Separate clickhouse-secrets | All credentials in policy-svc-secrets | Phase 26 (2026) | Single secret simplifies RBAC and reduces deployment complexity |
| Manual secret creation | Script-based with Terraform integration | Phase 24-04 (2026) | Reduces manual errors, enables automation |

**Deprecated/outdated:**
- **List-based endpoints access:** `endpoints[0].protocol` was ClickHouse provider <v3.0. Now use `endpoints["https"]`
- **Multiple secrets per service:** Creating `clickhouse-secrets` separate from `policy-svc-secrets` adds RBAC complexity. Consolidate into service-scoped secret.

## Open Questions

1. **Are ClickHouse credentials available as Terraform outputs?**
   - What we know: Current `outputs.tf` exposes `clickhouse_endpoints` (connection URLs) but not `clickhouse_user` or `clickhouse_password`
   - What's unclear: Whether ClickHouse Cloud provider supports credential outputs or if they must be retrieved from Cloud console
   - Recommendation: Check if `clickhouse_service` resource exposes default user credentials. If not, prompt user with clear instructions to retrieve from ClickHouse Cloud console.

2. **Should script validate ClickHouse connectivity before creating secret?**
   - What we know: Current script has warning-level database connectivity checks (lines 50-56) that may fail in CI/CD without VPC access
   - What's unclear: Whether ClickHouse connectivity test adds value given it may fail in valid scenarios (firewall rules not yet configured)
   - Recommendation: Skip connectivity test. ClickHouse connection will be validated by Policy Service health probes after deployment (Phase 33-01 added readiness probes).

## Sources

### Primary (HIGH confidence)

- `/Users/jeremymcspadden/Github/nebula-dns/infrastructure/kubernetes/secrets/create-secrets.sh` - Current script structure (Phase 24-04)
- `/Users/jeremymcspadden/Github/nebula-dns/k8s/base/policy-svc-deployment.yaml` - Required environment variables (Phase 26-01)
- `/Users/jeremymcspadden/Github/nebula-dns/policy-svc/cmd/main.go` - Go code reading `CLICKHOUSE_URL`, `CLICKHOUSE_DATABASE`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD` env vars
- `/Users/jeremymcspadden/Github/nebula-dns/infrastructure/terraform/modules/clickhouse-cloud/outputs.tf` - Available Terraform outputs
- [ClickHouse Terraform Provider GitHub](https://github.com/ClickHouse/terraform-provider-clickhouse) - Official provider documentation for endpoints structure (v3.0.0+ map format)

### Secondary (MEDIUM confidence)

- [Terraform Registry - clickhouse_service resource](https://registry.terraform.io/providers/ClickHouse/clickhouse/latest/docs/resources/service) - Resource schema and attributes (WebSearch verified with official source)

### Tertiary (LOW confidence)

None - all findings verified with codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools already in use in Phase 24-04 script, jq is standard for JSON parsing
- Architecture: HIGH - Current script structure analyzed directly from codebase
- Pitfalls: HIGH - ClickHouse provider version change documented in official GitHub, other pitfalls based on similar Bash+Terraform patterns

**Research date:** 2026-02-21
**Valid until:** 60 days (stable infrastructure tooling, slow-moving versions)

---

*Phase: 34-clickhouse-credential-wiring-fix*
*Researched: 2026-02-21*
