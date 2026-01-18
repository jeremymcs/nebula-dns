# Codebase Concerns

**Analysis Date:** 2026-01-18

## Tech Debt

**Partner System Remnants in UI (NEW):**
- Issue: Legacy partner portal references remain after system removal
- Files:
  - `ui/src/app/mission-control/layout.tsx:39,58,64` - redirects to `/partner/dashboard`, "partner admin" text
  - `ui/src/components/layout/DashboardLayout.tsx:120,165,171` - same partner portal references
  - `ui/src/contexts/AuthContext.tsx:36` - `partnerId: string | null` in MspInfo interface
  - `ui/e2e/navigation.spec.ts:20-24` - tests for `/partners/login` route that no longer exists
- Impact: Confusing UX if impersonation mode tries to return to non-existent partner portal; broken tests
- Fix approach: Replace `/partner/dashboard` with `/dashboard` or admin portal URL; remove `partnerId` from MspInfo; update/remove partner E2E tests

**Partner Terminology in Block Pages (NEW):**
- Issue: Block pages service still references "partner branding" in code and tests
- Files:
  - `api/src/modules/block-pages/block-pages.service.ts:150-181` - `partnerBranding` parameter
  - `api/src/modules/block-pages/block-pages.service.spec.ts:379-403` - partner branding tests
- Impact: Confusing code; should use "MSP branding" or "tenant branding" terminology
- Fix approach: Rename `partnerBranding` to `mspBranding` or `customBranding`; update tests

**Legacy Partner Column in MSP Billing Entities (NEW):**
- Issue: MSP billing entities still use `partner_id` column name mapped to MSP tenants
- Files:
  - `api/src/modules/msp-billing/entities/msp-subscription.entity.ts:33-35`
  - `api/src/modules/msp-billing/entities/msp-purchase.entity.ts:31-32`
  - `api/src/modules/msp-billing/entities/msp-usage.entity.ts:29-30`
  - `api/src/modules/msp-billing/entities/msp-invoice.entity.ts:30-31`
  - `api/src/modules/msp/entities/msp-template.entity.ts:33-34`
- Impact: Semantic confusion; new developers may be confused about "partner" vs "MSP tenant"
- Fix approach: Database migration to rename `partner_id` to `msp_tenant_id`; update entity column mappings

**Demo/Placeholder Code in MSP Billing Controller (NEW - HIGH PRIORITY):**
- Issue: Production code uses hardcoded demo partner ID as fallback
- Files: `api/src/modules/msp-billing/msp-billing.controller.ts:186-189`
  ```typescript
  private getPartnerId(user: AuthUser): string {
    // For now, use a demo partner ID. In production, this would come from the user's JWT
    return user.partnerId || '550e8400-e29b-41d4-a716-446655440010';
  }
  ```
- Impact: Security risk - unauthorized access to demo MSP data; incorrect billing attribution
- Fix approach: Throw UnauthorizedException if partnerId is not available; require proper JWT claims

**Test Files Reference Non-Existent Partner System (NEW):**
- Issue: Multiple test files still use `partnerId: 'partner-123'` test data
- Files:
  - `api/src/modules/limits/limits.service.integration.spec.ts:316,346,358`
  - `api/src/modules/limits/limits.service.spec.ts:378,428,514`
  - `api/src/modules/msp-clients/msp-clients.service.integration.spec.ts` (20+ references)
  - `api/src/modules/auth/auth.controller.spec.ts:519,561`
- Impact: Tests pass but use deprecated terminology; confusing for future maintenance
- Fix approach: Update test data to use `mspTenantId` terminology

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
  - `api/src/modules/admin/admin.service.ts` (1155 lines) - NEW
  - `api/src/modules/reports/reports.service.ts` (1107 lines)
  - `api/src/modules/webhooks/webhooks.service.ts` (1081 lines)
  - `api/src/modules/clickhouse/clickhouse.service.ts` (990 lines)
- Impact: Difficult to test, understand, and maintain; high coupling
- Fix approach: Extract domain-specific logic into separate services (e.g., `AdminImpersonationService`, `AdminSearchService` from AdminService)

**Circular Dependencies via forwardRef:**
- Issue: Multiple modules use `forwardRef` to resolve circular dependencies
- Files:
  - `api/src/modules/reports/reports.module.ts` (5 forwardRef usages)
  - `api/src/modules/auth/auth.module.ts`
  - `api/src/modules/locations/locations.module.ts`
  - `api/src/modules/msp-clients/msp-clients.module.ts`
  - `api/src/modules/admin/strategies/admin-jwt.strategy.ts` (forwardRef for AdminService) - NEW
- Impact: Potential initialization issues, harder to reason about module loading order
- Fix approach: Refactor to use event-based communication or extract shared logic to common modules

**Mock Data Fallback in Production Code:**
- Issue: Reports service generates mock heatmap data when ClickHouse returns empty
- Files: `api/src/modules/reports/reports.service.ts` (line 190)
- Impact: Misleading data in reports when ClickHouse is unavailable
- Fix approach: Return empty data or explicit "no data" indicator instead of mock data

## Known Bugs

**Impersonation Exit Redirects to Deleted Partner Portal (NEW - HIGH PRIORITY):**
- Symptoms: Clicking "Return to Partner Portal" redirects to `/partner/dashboard` which does not exist
- Files:
  - `ui/src/app/mission-control/layout.tsx:39`
  - `ui/src/components/layout/DashboardLayout.tsx:120`
- Trigger: Admin ends impersonation session via UI
- Workaround: Manually navigate to admin portal or dashboard

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

**Admin Impersonation Token Generation (NEW):**
- Risk: Impersonation tokens are signed with tenant JWT_SECRET, allowing potential confusion with regular user tokens
- Files:
  - `api/src/modules/admin/admin.service.ts:897-903` - generates impersonation token
  - `api/src/modules/auth/jwt.strategy.ts:42-80` - validates tokens including impersonation
- Current mitigation:
  - Impersonation tokens include `impersonatingAdminId` claim to identify them
  - JwtStrategy checks for this claim and handles separately
  - 1-hour expiry (shorter than regular 8h admin tokens)
  - Full audit logging of start/end events
- Recommendations:
  - Consider separate issuer claim for impersonation tokens
  - Add rate limiting on impersonation starts per admin
  - Add monitoring alerts for unusually long impersonation sessions

**Admin MFA Not Enforced (NEW):**
- Risk: Admin accounts can authenticate without MFA if not set up
- Files: `api/src/modules/admin/admin.service.ts:117-163` - login flow
- Current mitigation: `mfaSetupComplete` tracked but not enforced
- Recommendations: Require MFA setup on first admin login; block admin operations until MFA enabled

**Impersonation Token Blacklist Shared with Regular Sessions (NEW):**
- Risk: Impersonation tokens use admin session blacklist in Redis
- Files:
  - `api/src/modules/admin/admin.service.ts:959` - uses `adminSessionService.blacklistToken`
  - `api/src/modules/auth/jwt.strategy.ts:47-51` - checks admin blacklist for impersonation tokens
- Current mitigation: Separate Redis key prefix `admin:session:blacklist:`
- Recommendations: Document this behavior clearly; consider separate namespace

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

**CORS Configured as Wildcard by Default:**
- Risk: Allows any origin to make requests in development
- Files: `api/src/config/configuration.ts` (line 262 - default '*')
- Current mitigation: Can be overridden via CORS_ORIGINS env var
- Recommendations: Remove wildcard default; require explicit origin configuration

## Performance Bottlenecks

**MSP Client Usage Queries Run Sequentially (NEW):**
- Problem: `getMspClients` fetches usage metrics for each client in parallel but still O(n) ClickHouse queries
- Files: `api/src/modules/admin/admin.service.ts:829-846`
- Cause: Each client triggers a separate ClickHouse query
- Improvement path: Batch query all client IDs in single ClickHouse query; use caching for repeated calls

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

## Fragile Areas

**Admin Module (NEW):**
- Files: `api/src/modules/admin/admin.service.ts`, `api/src/modules/admin/admin.module.ts`
- Why fragile: 1155 lines handling auth, impersonation, tenant search, MSP onboarding; imports many modules
- Safe modification: Add new admin features through separate sub-services; maintain separate JWT validation
- Test coverage: Good coverage (4 spec files) but some use `as any` type assertions extensively

**MSP Billing Controller Partner ID Extraction (NEW):**
- Files: `api/src/modules/msp-billing/msp-billing.controller.ts:186-189`
- Why fragile: Relies on `user.partnerId` from JWT which may not be populated correctly; fallback to demo ID
- Safe modification: Ensure JWT token generation includes proper MSP tenant ID; remove demo fallback
- Test coverage: Needs integration tests verifying JWT claim population

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

**Subscription Lapse Workflow:**
- Files: `api/src/modules/subscription-lapse/subscription-lapse.service.ts`
- Why fragile: 578 lines handling grace periods, suspension, notifications; affects DNS resolution via policy service
- Safe modification: Use feature flags; implement comprehensive logging
- Test coverage: `subscription-lapse.service.integration.spec.ts` exists - verify all state transitions

## Scaling Limits

**ClickHouse Aggregation for MSP Usage (NEW):**
- Current capacity: Works for MSPs with <100 clients
- Limit: O(n) queries where n = number of clients
- Scaling path: Pre-aggregate daily usage in scheduled job; use materialized views

**Redis Connection Pooling:**
- Current capacity: Default connection settings
- Limit: Unknown - no explicit pool configuration found
- Scaling path: Add connection pool configuration in Redis module; monitor connection counts

**Webhook Delivery Queue:**
- Current capacity: In-memory retry with delays
- Limit: Webhook failures during high volume could exhaust memory
- Scaling path: Move to Redis-backed queue with Bull/BullMQ; add circuit breaker

## Dependencies at Risk

**Partner Migration Scripts Still Present (NEW):**
- Risk: Migration scripts reference deprecated partner tables that may be dropped
- Files:
  - `api/src/scripts/migrations/migrate-partners-to-msp.ts`
  - `api/src/scripts/migrations/migrate-partner-users.ts`
  - `api/src/scripts/backup-partner-data.ts`
  - `api/src/database/migrations/1711000000000-DropPartnerTables.ts`
- Impact: Scripts may fail if run after partner tables are dropped
- Migration plan: Mark scripts as deprecated; add pre-run checks for table existence

**SendGrid Integration:**
- Risk: Single email provider dependency
- Impact: Email failures affect invitations, password resets, notifications
- Migration plan: Abstract email service interface; add fallback provider (SES, Mailgun)

**Stripe Payment Processing:**
- Risk: Tight coupling to Stripe SDK
- Impact: Payment processing entirely dependent on Stripe availability
- Migration plan: Already abstracted through PaymentsService; document Stripe-specific features used

## Missing Critical Features

**Admin Session Service Missing Dedicated Spec File (NEW):**
- Problem: `admin-session.service.ts` (16KB) has no dedicated spec file
- Files: `api/src/modules/admin/admin-session.service.ts`
- Blocks: Confident refactoring of session management code
- Note: Session logic may be tested indirectly through `admin.service.spec.ts`

**No Admin MFA Enforcement (NEW):**
- Problem: Admin users can operate without MFA
- Blocks: Compliance requirements (SOC2, etc.)

**Rate Limiting on Policy Service:**
- Problem: Go policy service has no built-in rate limiting
- Blocks: DoS protection for DNS evaluation endpoint
- Files: `policy-svc/internal/handlers/handlers.go`

**Audit Log Retention Policy:**
- Problem: No automatic pruning of old audit logs
- Blocks: Compliance requirements; database growth management
- Files: `api/src/modules/audit-logs/audit-logs.service.ts`

## Test Coverage Gaps

**Admin Module Type Safety (NEW):**
- What's not tested: Type assertions (`as any`) in spec files mask potential runtime errors
- Files: `api/src/modules/admin/admin-billing.service.spec.ts` (40+ `as any` casts)
- Risk: Type mismatches won't be caught at test time
- Priority: Medium

**UI Partner Portal Removal (NEW - HIGH PRIORITY):**
- What's not tested: E2E tests reference deleted `/partners/login` route
- Files: `ui/e2e/navigation.spec.ts:20-24`
- Risk: Test suite includes tests for non-existent features; tests will fail
- Priority: High

**Impersonation End-to-End Flow (NEW):**
- What's not tested: Full admin impersonation flow from login to exit
- Files: Admin controller tests exist but no E2E covering full flow
- Risk: Integration issues between admin and tenant auth systems
- Priority: Medium

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

**Policy Service Go Tests:**
- What's not tested: Limited test coverage in policy-svc
- Files: `policy-svc/internal/` - sparse test files
- Risk: Policy evaluation logic changes may introduce bugs
- Priority: High - this is critical path for DNS resolution

---

*Concerns audit: 2026-01-18*
