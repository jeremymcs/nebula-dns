# Codebase Concerns

**Analysis Date:** 2026-01-17

## Tech Debt

**Excessive Use of `any` Type:**
- Issue: Over 150+ instances of `any` type usage across the API codebase, undermining TypeScript's type safety
- Files: `api/src/modules/reports/reports.service.ts` (lines 142, 161, 174, 215, 279, 477, 504, 577), `api/src/modules/invitations/invitations.controller.ts` (lines 115, 152, 243), many service and controller files
- Impact: Runtime errors that could be caught at compile time, reduced IDE assistance, harder refactoring
- Fix approach: Create proper interfaces/types for ClickHouse results, user objects, and API responses; enable `strict: true` in tsconfig

**Large Service Files Needing Decomposition:**
- Issue: Several services exceed 800+ lines, violating single responsibility principle
- Files:
  - `api/src/modules/msp/msp-templates.service.ts` (1361 lines)
  - `api/src/modules/sso/sso.service.ts` (1221 lines)
  - `api/src/modules/reports/reports.service.ts` (1107 lines)
  - `api/src/modules/webhooks/webhooks.service.ts` (1081 lines)
  - `api/src/modules/clickhouse/clickhouse.service.ts` (990 lines)
- Impact: Difficult to test, understand, and maintain; high coupling
- Fix approach: Extract domain-specific logic into separate services (e.g., SamlService, OidcService from SsoService)

**Circular Dependencies via forwardRef:**
- Issue: Multiple modules use `forwardRef` to resolve circular dependencies
- Files:
  - `api/src/modules/reports/reports.module.ts` (5 forwardRef usages)
  - `api/src/modules/auth/auth.module.ts`
  - `api/src/modules/locations/locations.module.ts`
  - `api/src/modules/msp-clients/msp-clients.module.ts`
- Impact: Potential initialization issues, harder to reason about module loading order
- Fix approach: Refactor to use event-based communication or extract shared logic to common modules

**Deprecated Secrets Config Still Present:**
- Issue: Old secrets configuration module marked deprecated but still in codebase
- Files: `api/src/config/secrets.config.ts` (entire file marked @deprecated)
- Impact: Confusing for developers, potential for using wrong implementation
- Fix approach: Remove deprecated file after verifying all usages migrated to `@/modules/secrets`

**Mock Data Fallback in Production Code:**
- Issue: Reports service generates mock heatmap data when ClickHouse returns empty
- Files: `api/src/modules/reports/reports.service.ts` (line 190)
- Impact: Misleading data in reports when ClickHouse is unavailable
- Fix approach: Return empty data or explicit "no data" indicator instead of mock data

## Known Bugs

**Swagger Docs Endpoint Skipped in Tests:**
- Symptoms: Test explicitly skipped for `/api/docs` endpoint
- Files: `api/test/app.e2e-spec.ts` (line 91)
- Trigger: Running E2E test suite
- Workaround: Test manually

**Integration Tests Conditionally Skipped:**
- Symptoms: Many integration tests require external services and are conditionally skipped
- Files:
  - `api/src/modules/secrets/secrets.integration.spec.ts` (AWS and Vault tests with `it.skip`)
  - `api/src/modules/clickhouse/clickhouse.integration.spec.ts` (22+ tests skip when ClickHouse unavailable)
- Trigger: Running tests without Docker services
- Workaround: Ensure all services running via docker-compose

## Security Considerations

**Development Encryption Key Fallback:**
- Risk: Insecure test keys generated when encryption keys not configured in development
- Files: `api/src/config/encryption.config.ts` (lines 210-213)
- Current mitigation: Production mode throws error; development logs warning
- Recommendations: Never allow fallback keys; require explicit dev key configuration

**JWT Tokens Stored in localStorage:**
- Risk: XSS attacks could steal authentication tokens
- Files: `ui/src/contexts/AuthContext.tsx` (lines 99-100)
- Current mitigation: None apparent
- Recommendations: Use httpOnly cookies for token storage, implement token rotation

**Missing Database Indexes on Tenant Scoped Queries:**
- Risk: Slow queries as data grows, especially on tenant_id lookups
- Files: Multiple entity files - only 18 explicit indexes found across 44 entities
- Current mitigation: Some indexes exist on MSP-related entities
- Recommendations: Add composite indexes on (tenant_id, created_at) and (tenant_id, status) for commonly queried tables

**Hardcoded Test Credentials in Helpers:**
- Risk: Credentials visible in source control
- Files: `tests/e2e/dns/test-helpers.ts` (line 330 - default password 'nebula')
- Current mitigation: Only used in test environment
- Recommendations: Load test credentials from environment variables

**CORS Configured as Wildcard by Default:**
- Risk: Allows any origin to make requests in development
- Files: `api/src/config/configuration.ts` (line 262 - default '*')
- Current mitigation: Can be overridden via CORS_ORIGINS env var
- Recommendations: Remove wildcard default; require explicit origin configuration

## Performance Bottlenecks

**ClickHouse Reconnection Blocking:**
- Problem: Schema initialization blocks on module init if ClickHouse unavailable
- Files: `api/src/modules/clickhouse/clickhouse.service.ts` (lines 66-87)
- Cause: Synchronous connection attempt with 30-second retry backoff
- Improvement path: Initialize asynchronously, allow service to start without ClickHouse

**In-Memory Cache Without Size Limits:**
- Problem: Policy cache in Go service grows unbounded
- Files: `policy-svc/internal/cache/cache.go` (lines 29-42 - maps with no eviction)
- Cause: No LRU or size-based eviction implemented
- Improvement path: Implement bounded cache with LRU eviction or use Redis exclusively

**setInterval Without Cleanup:**
- Problem: Multiple services create intervals that may not be properly cleaned up
- Files:
  - `api/src/modules/doh/doh.service.ts` (line 148 - cache cleanup every 60s)
  - `api/src/modules/realtime/realtime.gateway.ts` (line 136 - stats interval)
  - `api/src/modules/secrets/secrets.service.ts` (line 449 - refresh timer)
  - `api/src/common/middleware/rate-limit.middleware.ts` (line 45)
- Cause: Intervals created but onModuleDestroy cleanup may be incomplete
- Improvement path: Track all intervals and clear in lifecycle hooks

**Multiple Console.log Statements in Production Code:**
- Problem: Console statements in scripts and some integration tests add overhead
- Files: `api/src/scripts/backup-partner-data.ts` (30+ console.log calls), migration scripts
- Cause: Scripts written for manual execution
- Improvement path: Use proper Logger service; replace console calls in production code

## Fragile Areas

**MSP Templates Service:**
- Files: `api/src/modules/msp/msp-templates.service.ts`
- Why fragile: 1361 lines handling template creation, versioning, rollback, and deployment; complex state management across multiple entities
- Safe modification: Add comprehensive tests before changes; use transactions for multi-step operations
- Test coverage: Only `msp-templates.service.spec.ts` exists - needs more edge case coverage

**Policy Cache Synchronization:**
- Files: `policy-svc/internal/cache/cache.go`
- Why fragile: Multiple mutex-protected maps (policies, tokens, ipRanges, threatDomains, categories, subscriptionStatus) that must stay synchronized
- Safe modification: Use read-lock for reads, write-lock for writes; consider atomic operations
- Test coverage: Limited - needs concurrency testing

**Authentication Flow with MFA:**
- Files: `api/src/modules/auth/auth.service.ts`, `api/src/modules/mfa/mfa.service.ts`
- Why fragile: Complex state machine with temp tokens, session creation, and MFA verification; forwardRef dependency
- Safe modification: Add state machine tests; document all possible auth states
- Test coverage: `auth.service.spec.ts` exists but MFA integration paths need more coverage

**Subscription Lapse Workflow:**
- Files: `api/src/modules/subscription-lapse/subscription-lapse.service.ts`
- Why fragile: 578 lines handling grace periods, suspension, notifications; affects DNS resolution via policy service
- Safe modification: Use feature flags; implement comprehensive logging
- Test coverage: `subscription-lapse.service.integration.spec.ts` exists - verify all state transitions

## Scaling Limits

**Redis Connection Pooling:**
- Current capacity: Default connection settings
- Limit: Unknown - no explicit pool configuration found
- Scaling path: Add connection pool configuration in Redis module; monitor connection counts

**ClickHouse Query Pagination:**
- Current capacity: Cursor-based pagination implemented
- Limit: Large result sets may timeout
- Scaling path: Add query timeout configuration; implement streaming for large exports

**Webhook Delivery Queue:**
- Current capacity: In-memory retry with delays
- Limit: Webhook failures during high volume could exhaust memory
- Scaling path: Move to Redis-backed queue with Bull/BullMQ; add circuit breaker

## Dependencies at Risk

**SendGrid Integration:**
- Risk: Single email provider dependency
- Impact: Email failures affect invitations, password resets, notifications
- Migration plan: Abstract email service interface; add fallback provider (SES, Mailgun)

**Stripe Payment Processing:**
- Risk: Tight coupling to Stripe SDK
- Impact: Payment processing entirely dependent on Stripe availability
- Migration plan: Already abstracted through PaymentsService; document Stripe-specific features used

## Missing Critical Features

**Rate Limiting on Policy Service:**
- Problem: Go policy service has no built-in rate limiting
- Blocks: DoS protection for DNS evaluation endpoint
- Files: `policy-svc/internal/handlers/handlers.go`

**Audit Log Retention Policy:**
- Problem: No automatic pruning of old audit logs
- Blocks: Compliance requirements; database growth management
- Files: `api/src/modules/audit-logs/audit-logs.service.ts`

**API Versioning Strategy:**
- Problem: All endpoints under `/api/v1/` but no v2 migration path documented
- Blocks: Breaking changes in future releases

## Test Coverage Gaps

**UI E2E Tests Heavily Skipped:**
- What's not tested: 50+ tests using `test.skip()` across UI E2E suite
- Files:
  - `ui/e2e/reports.spec.ts` (14 skipped tests)
  - `ui/e2e/settings.spec.ts` (13 skipped tests)
  - `ui/e2e/locations.spec.ts` (9 skipped tests)
  - `ui/e2e/lists.spec.ts` (10 skipped tests)
  - `ui/e2e/policies.spec.ts` (8 skipped tests)
- Risk: UI regressions go undetected; new features may break existing flows
- Priority: High

**Missing Service Tests:**
- What's not tested: Several services lack comprehensive unit tests
- Files: Check coverage for `email.service.ts`, `doh.service.ts`, `threat-feeds.service.ts`
- Risk: Email template changes, DoH resolution, threat feed parsing untested
- Priority: Medium

**No Load Testing in CI:**
- What's not tested: Performance regression detection
- Files: `scripts/load-testing/*.js` exist but not integrated into CI
- Risk: Performance degradation goes unnoticed until production
- Priority: Medium

**Policy Service Go Tests:**
- What's not tested: Limited test coverage in policy-svc
- Files: `policy-svc/internal/` - sparse test files
- Risk: Policy evaluation logic changes may introduce bugs
- Priority: High - this is critical path for DNS resolution

---

*Concerns audit: 2026-01-17*
