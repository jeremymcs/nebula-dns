# Phase 34: ClickHouse Credential Wiring Fix - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the secret creation script (`create-secrets.sh`) so `policy-svc-secrets` contains all 5 keys that `policy-svc-deployment.yaml` expects. Remove orphaned `clickhouse-secrets` block. This is a credential wiring reconciliation between Phase 24 (infrastructure) and Phase 26 (DNS stack deployment).

</domain>

<decisions>
## Implementation Decisions

### Secret key alignment
- `policy-svc-secrets` must contain exactly 5 keys: `redis-url`, `clickhouse-url`, `clickhouse-database`, `clickhouse-user`, `clickhouse-password`
- Currently only 2 keys exist (`redis-url`, `clickhouse-url`)
- 3 keys must be added: `clickhouse-database`, `clickhouse-user`, `clickhouse-password`

### ClickHouse URL format
- Current `clickhouse-url` passes raw JSON from `terraform output -json clickhouse_endpoints` — this is wrong
- Must extract the actual HTTPS endpoint URL from the Terraform JSON output
- Format should be a proper HTTPS URL (e.g., `https://host:8443`) that the Go Policy Service can use directly

### Credential sourcing
- All ClickHouse credentials should come from Terraform outputs where possible
- ClickHouse Cloud credentials (user/password) may need manual entry from the ClickHouse Cloud console if not available as Terraform outputs
- Script should handle both automated (Terraform) and manual credential entry gracefully

### Orphaned secret cleanup
- Remove the `clickhouse-secrets` block (lines 88-97 of create-secrets.sh) entirely
- Remove the associated echo statement about manual updates
- No other files reference `clickhouse-secrets` — it's fully orphaned

### Claude's Discretion
- Exact Terraform output parsing (jq queries vs bash string manipulation)
- Validation/error messaging for missing ClickHouse credentials
- Whether to add a verification step that tests the ClickHouse connection after secret creation

</decisions>

<specifics>
## Specific Ideas

- The root cause is a Phase 24 → Phase 26 integration gap: deployment template was expanded to need individual credentials, but the secret creation script was never updated to match
- Pods will be stuck in `CreateContainerConfigError` until this is fixed — it's a hard blocker for production deployment

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 34-clickhouse-credential-wiring-fix*
*Context gathered: 2026-02-21*
