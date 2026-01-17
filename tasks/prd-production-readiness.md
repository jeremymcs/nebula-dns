# PRD: Nebula DNS Production Readiness

// Nebula DNS - Production Readiness PRD
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Introduction

This PRD defines the requirements to bring Nebula DNS from its current state (~85% complete) to full General Availability (GA) readiness. Nebula DNS is a multi-tenant, enterprise-grade DNS security and content filtering SaaS platform that blocks malware, phishing, and undesirable content at the DNS level.

**Current State Analysis (from 10-agent codebase scan):**
- API (NestJS): 37 modules, 85% complete
- UI (Next.js): 48 pages, 85-90% complete
- Policy Service (Go): 93% production-ready
- Testing Coverage: ~30-40% (target: 90%+)
- Security: Strong foundation with critical gaps
- Infrastructure: Docker, K8s, Helm ready with customization needed

**Target Users:** SMB, Enterprise, and MSP/Reseller customers
**Timeline:** 16-20 weeks to GA

---

## Goals

- Achieve 90%+ test coverage across API, UI, and Policy Service
- Implement session management with token revocation capabilities
- Complete SSO implementation (SAML + OIDC with PKCE)
- Reach SOC2 compliance readiness (audit logging, encryption, retention)
- Complete all incomplete modules and features
- Create comprehensive documentation (service READMEs, troubleshooting guides)
- Harden infrastructure for production deployment
- Achieve zero critical/high security vulnerabilities

---

## User Stories

### Phase 1: Security Hardening (Weeks 1-4)

#### US-001: Implement Session Management with Redis
**Description:** As a security administrator, I want to track and revoke user sessions so that I can respond to security incidents by terminating compromised sessions.

**Acceptance Criteria:**
- [ ] Create Redis-backed session store (`api/src/modules/auth/session.service.ts`)
- [ ] Store session data: user_id, token_jti, device_info, ip_address, created_at, last_activity
- [ ] Implement `getSessions(userId)` returning active sessions with device/location info
- [ ] Implement `revokeSession(userId, sessionId)` that blacklists token JTI
- [ ] Implement `revokeAllSessions(userId)` for password change/security events
- [ ] Add session limit per user (configurable, default: 10)
- [ ] JWT validation checks Redis blacklist before allowing requests
- [ ] Session cleanup job removes expired sessions (runs hourly)
- [ ] Unit tests for all session operations
- [ ] Integration tests with Redis
- [ ] Typecheck/lint passes

#### US-002: Add PKCE Support to OIDC Flow
**Description:** As an enterprise user, I want secure OAuth2 authentication so that authorization code interception attacks are prevented.

**Acceptance Criteria:**
- [ ] Generate code_verifier (43-128 chars, URL-safe random)
- [ ] Generate code_challenge using S256 method (SHA256 + base64url)
- [ ] Store code_verifier in session during auth initiation
- [ ] Include code_challenge and code_challenge_method in authorization request
- [ ] Send code_verifier in token exchange request
- [ ] Validate OIDC provider supports PKCE (check well-known config)
- [ ] Update SSO configuration entity with PKCE fields
- [ ] Update `sso.service.ts` OIDC methods
- [ ] Unit tests for PKCE generation and validation
- [ ] E2E test with mock OIDC provider
- [ ] Typecheck/lint passes

#### US-003: Enable SAML Request Signing
**Description:** As a security administrator, I want SAML authentication requests to be signed so that request tampering is prevented.

**Acceptance Criteria:**
- [ ] Generate tenant-specific signing key pair (RSA 2048+ or ECDSA P-256)
- [ ] Store private key encrypted in database (AES-256-GCM)
- [ ] Expose public key via metadata endpoint
- [ ] Sign AuthnRequest with XML-DSIG (RSA-SHA256 or ECDSA-SHA256)
- [ ] Sign LogoutRequest with XML-DSIG
- [ ] Update SSO entity with `signingCertificate` and `signingPrivateKey` fields
- [ ] Add key rotation capability
- [ ] Configuration toggle for requiring signed requests
- [ ] Update SSO configuration UI to show/download public certificate
- [ ] Unit tests for signing operations
- [ ] Typecheck/lint passes

#### US-004: Remove Hardcoded Encryption Key Defaults
**Description:** As a security engineer, I want all encryption keys to be required from environment so that production deployments cannot accidentally use default keys.

**Acceptance Criteria:**
- [ ] Remove default value from `MFA_ENCRYPTION_KEY`
- [ ] Remove default value from `SSO_ENCRYPTION_KEY`
- [ ] Remove default value from `SIEM_ENCRYPTION_KEY`
- [ ] Add startup validation that fails if keys are missing in production
- [ ] Add startup validation for minimum key length (32 bytes)
- [ ] Update `.env.example` with clear instructions
- [ ] Update deployment documentation
- [ ] Add health check that validates encryption configuration
- [ ] Typecheck/lint passes

#### US-005: Implement Audit Log Immutability
**Description:** As a compliance officer, I want audit logs to be immutable so that forensic investigations have trustworthy data.

**Acceptance Criteria:**
- [ ] Add database trigger preventing UPDATE/DELETE on audit_logs table
- [ ] Implement hash chain linking (each log includes hash of previous)
- [ ] Add `previous_hash` column to audit_logs table
- [ ] Create migration for trigger and column
- [ ] Implement periodic integrity verification job
- [ ] Alert on hash chain breaks
- [ ] Prevent admin API from modifying audit logs (return 403)
- [ ] Add audit log export with integrity verification
- [ ] Unit tests for hash chain generation
- [ ] Integration tests for immutability enforcement
- [ ] Typecheck/lint passes

#### US-006: Upgrade to Authenticated Encryption (AES-GCM)
**Description:** As a security engineer, I want sensitive data encrypted with authenticated encryption so that tampering is detected.

**Acceptance Criteria:**
- [ ] Replace AES-256-CBC with AES-256-GCM for MFA secrets
- [ ] Replace AES-256-CBC with AES-256-GCM for SSO secrets
- [ ] Replace AES-256-CBC with AES-256-GCM for SIEM credentials
- [ ] Use random 96-bit IV (not reused)
- [ ] Store IV + ciphertext + auth tag together
- [ ] Create migration utility to re-encrypt existing data
- [ ] Add decryption failure handling (log + alert)
- [ ] Unit tests for encryption/decryption
- [ ] Verify no data loss during migration
- [ ] Typecheck/lint passes

---

### Phase 2: Testing Infrastructure (Weeks 5-8)

#### US-007: Add Controller-Level Tests for Auth Module
**Description:** As a developer, I want comprehensive controller tests for authentication so that HTTP layer behavior is verified.

**Acceptance Criteria:**
- [ ] Create `auth.controller.spec.ts` with 90%+ coverage
- [ ] Test login endpoint with valid/invalid credentials
- [ ] Test MFA verification flow (valid/invalid/expired codes)
- [ ] Test token refresh with valid/invalid/expired tokens
- [ ] Test password change validation
- [ ] Test rate limiting (5 failed attempts = lockout)
- [ ] Test CORS headers
- [ ] Test response serialization (no password hash exposed)
- [ ] Mock dependencies (service, guards)
- [ ] Typecheck/lint passes

#### US-008: Add Controller-Level Tests for All API Modules
**Description:** As a developer, I want all 33 controllers to have unit tests so that HTTP layer is fully verified.

**Acceptance Criteria:**
- [ ] Create spec files for all controllers in `api/src/modules/*/`
- [ ] Each controller achieves 85%+ line coverage
- [ ] Test all HTTP methods (GET, POST, PATCH, DELETE)
- [ ] Test input validation (DTO validation pipes)
- [ ] Test authentication guards
- [ ] Test RBAC authorization (role-based access)
- [ ] Test error responses (400, 401, 403, 404, 409, 422)
- [ ] Test pagination on list endpoints
- [ ] Coverage report shows 90%+ overall
- [ ] Typecheck/lint passes

#### US-009: Add Service-Level Tests for Untested Services
**Description:** As a developer, I want the 26 untested services to have unit tests so that business logic is verified.

**Acceptance Criteria:**
- [ ] Create spec files for: api-keys, audit-logs, agents, redis, threat-detection, threat-feeds, clickhouse, health, metrics, lists, policy-templates, doh, geoip, payments, msp-billing, groups, block-pages, invitations, reports, scheduled-reports, email, realtime, partners, subscriptions, doh
- [ ] Each service achieves 85%+ line coverage
- [ ] Test happy paths and error cases
- [ ] Test edge cases (empty inputs, boundaries)
- [ ] Mock external dependencies (Redis, ClickHouse, Stripe)
- [ ] Coverage report shows 90%+ overall
- [ ] Typecheck/lint passes

#### US-010: Add Integration Tests for Redis Cache Operations
**Description:** As a developer, I want integration tests for Redis caching so that cache behavior is verified with real Redis.

**Acceptance Criteria:**
- [ ] Create `redis.integration.spec.ts`
- [ ] Test policy cache set/get/invalidate
- [ ] Test token cache with TTL expiration
- [ ] Test pub/sub cache invalidation messages
- [ ] Test concurrent access patterns
- [ ] Test connection failure handling
- [ ] Test reconnection behavior
- [ ] Use testcontainers or docker-compose for Redis
- [ ] Tests run in CI pipeline
- [ ] Typecheck/lint passes

#### US-011: Add Integration Tests for ClickHouse Analytics
**Description:** As a developer, I want integration tests for ClickHouse so that analytics queries are verified.

**Acceptance Criteria:**
- [ ] Create `clickhouse.integration.spec.ts`
- [ ] Test schema initialization
- [ ] Test query log insertion
- [ ] Test aggregation queries (summary stats, top blocked)
- [ ] Test time-range filtering
- [ ] Test tenant isolation
- [ ] Test batch insert performance
- [ ] Test circuit breaker behavior
- [ ] Use testcontainers or docker-compose for ClickHouse
- [ ] Tests run in CI pipeline
- [ ] Typecheck/lint passes

#### US-012: Add Policy Service Integration Tests
**Description:** As a developer, I want integration tests for the Go policy service so that real cache and policy evaluation is verified.

**Acceptance Criteria:**
- [ ] Create integration test suite in `policy-svc/tests/integration/`
- [ ] Test policy evaluation with populated Redis cache
- [ ] Test allowlist/blocklist matching (exact + wildcard)
- [ ] Test category blocking with schedules
- [ ] Test SafeSearch rewrites
- [ ] Test threat feed checking
- [ ] Test cache invalidation via pub/sub
- [ ] Test fail-open and fail-closed modes
- [ ] Use docker-compose for test dependencies
- [ ] Tests run in CI pipeline
- [ ] go test passes

#### US-013: Expand UI E2E Test Coverage
**Description:** As a developer, I want comprehensive Playwright tests for the UI so that user workflows are verified.

**Acceptance Criteria:**
- [ ] Create tests for dashboard pages (policies, locations, lists, reports)
- [ ] Create tests for settings pages (security, team, API keys, integrations)
- [ ] Create tests for MSP features (clients, templates)
- [ ] Create tests for onboarding flow
- [ ] Create tests for policy builder (create, edit, version, rollback)
- [ ] Create tests for report generation and export
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Test dark mode toggle
- [ ] Test error states and empty states
- [ ] Achieve 80%+ page coverage
- [ ] Tests run in CI pipeline
- [ ] Playwright passes

---

### Phase 3: Feature Completion (Weeks 9-12)

#### US-014: Add HTTP Endpoints to Threat Detection Module
**Description:** As a developer, I want REST endpoints for threat detection so that threat data can be managed via API.

**Acceptance Criteria:**
- [ ] Create `threat-detection.controller.ts`
- [ ] GET `/threat-detection/status` - current threat detection status
- [ ] GET `/threat-detection/recent` - recent detected threats (paginated)
- [ ] GET `/threat-detection/stats` - threat statistics by category/severity
- [ ] POST `/threat-detection/analyze` - analyze specific domain
- [ ] Swagger documentation for all endpoints
- [ ] Unit tests for controller
- [ ] Integration with existing threat-detection.service.ts
- [ ] Typecheck/lint passes

#### US-015: Add HTTP Endpoints to GeoIP Module
**Description:** As a developer, I want REST endpoints for GeoIP so that location data can be queried and updated.

**Acceptance Criteria:**
- [ ] Create `geoip.controller.ts`
- [ ] GET `/geoip/lookup/:ip` - lookup IP location
- [ ] GET `/geoip/status` - database status and last update
- [ ] POST `/geoip/refresh` - trigger database refresh (admin only)
- [ ] Swagger documentation for all endpoints
- [ ] Unit tests for controller
- [ ] Rate limiting on lookup endpoint
- [ ] Typecheck/lint passes

#### US-016: Complete Family Module Implementation
**Description:** As a parent user, I want to manage family members and their DNS policies so that I can protect my children online.

**Acceptance Criteria:**
- [ ] Complete CRUD for family members
- [ ] Add device assignment to family members
- [ ] Add schedule configuration (bedtime, homework time)
- [ ] Add per-member policy overrides
- [ ] Add activity summary per member
- [ ] Add parental PIN for settings access
- [ ] UI pages for family management
- [ ] Unit tests for family.service.ts
- [ ] Controller tests for family.controller.ts
- [ ] E2E tests for family workflow
- [ ] Typecheck/lint passes

#### US-017: Add UI Error Boundaries and Form Validation
**Description:** As a user, I want clear error messages and input validation so that I understand what went wrong and how to fix it.

**Acceptance Criteria:**
- [ ] Create global ErrorBoundary component wrapping app
- [ ] Add error boundary to each major page section
- [ ] Integrate Zod for form validation schemas
- [ ] Add React Hook Form for form state management
- [ ] Update all forms to use validation (login, signup, policy create, etc.)
- [ ] Display inline validation errors
- [ ] Add toast notifications for API errors
- [ ] Add retry buttons for failed requests
- [ ] Unit tests for validation schemas
- [ ] E2E tests verify error states
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-018: Implement Distributed Rate Limiting with Redis
**Description:** As a platform operator, I want rate limits to be consistent across multiple dnsdist instances so that limits are enforced accurately.

**Acceptance Criteria:**
- [ ] Store rate limit counters in Redis (not in-memory)
- [ ] Key format: `ratelimit:{type}:{identifier}:{window}`
- [ ] Use Redis INCR with EXPIRE for sliding window
- [ ] Types: per-client-IP, per-location, per-tenant
- [ ] Sync rate limit config from API to policy-svc via pub/sub
- [ ] Add rate limit headers to DNS responses (where applicable)
- [ ] dnsdist queries Redis for limit checks
- [ ] Graceful degradation if Redis unavailable (allow traffic)
- [ ] Metrics for rate limit hits
- [ ] Unit tests for rate limiting logic
- [ ] Integration tests with Redis
- [ ] Load tests verify distributed behavior

#### US-019: Fix Database Schema Inconsistencies
**Description:** As a developer, I want database schema to match entity definitions so that ORM operations work correctly.

**Acceptance Criteria:**
- [ ] Audit all entities against migrations
- [ ] Create migration for Location: add `dyndns`, `rate_limit` columns
- [ ] Create migration for Location: change `ip_ranges` to match entity type
- [ ] Create migration for Policy: add `visualFlow` JSONB column
- [ ] Fix Subscription.planId type (UUID vs varchar)
- [ ] Align ClickHouse schemas (init-clickhouse.sql vs retention script)
- [ ] Add missing indexes: audit_logs.created_at, subscriptions.tenant_id
- [ ] Run migrations successfully
- [ ] Verify no data loss
- [ ] Typecheck/lint passes

---

### Phase 4: Documentation & Operations (Weeks 13-16)

#### US-020: Create Service-Specific README Files
**Description:** As a new developer, I want README files for each service so that I can understand and run them independently.

**Acceptance Criteria:**
- [ ] Create `api/README.md` with setup, running, testing, architecture
- [ ] Create `ui/README.md` with setup, running, testing, component structure
- [ ] Create `policy-svc/README.md` with setup, running, testing, algorithm docs
- [ ] Create `report-svc/README.md` with setup, running, testing
- [ ] Each README includes environment variables table
- [ ] Each README includes common commands
- [ ] Each README includes troubleshooting section
- [ ] Each README includes architecture diagram
- [ ] Reviewed by at least one other developer

#### US-021: Create Troubleshooting Guide
**Description:** As an operator, I want a troubleshooting guide so that I can resolve common issues quickly.

**Acceptance Criteria:**
- [ ] Create `docs/troubleshooting.md`
- [ ] Section: Docker Compose issues (ports, volumes, networking)
- [ ] Section: Database connection problems
- [ ] Section: Redis connection and cache issues
- [ ] Section: ClickHouse query performance
- [ ] Section: Policy service debugging
- [ ] Section: DNS resolution failures
- [ ] Section: Authentication/SSO problems
- [ ] Section: Performance diagnostics
- [ ] Each section includes symptoms, causes, solutions
- [ ] Include relevant log locations and commands
- [ ] Include health check endpoints

#### US-022: Create Administration Guide
**Description:** As an administrator, I want a guide for managing the platform so that I can perform common tasks correctly.

**Acceptance Criteria:**
- [ ] Create `docs/administration-guide.md`
- [ ] Section: User management (create, roles, suspend, delete)
- [ ] Section: Policy best practices
- [ ] Section: List management (blocklists, allowlists)
- [ ] Section: Location configuration
- [ ] Section: Webhook setup
- [ ] Section: SIEM integration
- [ ] Section: SSO configuration
- [ ] Section: Backup and restore procedures
- [ ] Section: Scaling guidelines
- [ ] Include screenshots where helpful

#### US-023: Complete API Documentation
**Description:** As an API consumer, I want complete API documentation so that I can integrate with the platform.

**Acceptance Criteria:**
- [ ] Audit all 33 controllers for Swagger decorators
- [ ] Add missing @ApiOperation decorators
- [ ] Add missing @ApiResponse decorators (200, 400, 401, 403, 404)
- [ ] Add @ApiProperty decorators to all DTOs
- [ ] Add example values to DTOs
- [ ] Document authentication requirements
- [ ] Document rate limits
- [ ] Generate OpenAPI 3.0 spec file
- [ ] Publish to `docs/api-spec.yaml`
- [ ] Verify Swagger UI renders correctly at /api/docs

#### US-024: Add Kubernetes Pod Disruption Budgets
**Description:** As a platform operator, I want PDBs configured so that services remain available during cluster maintenance.

**Acceptance Criteria:**
- [ ] Create PDB for API (minAvailable: 1 or 50%)
- [ ] Create PDB for Policy Service (minAvailable: 2 or 50%)
- [ ] Create PDB for dnsdist (minAvailable: 1 or 50%)
- [ ] Create PDB for UI (minAvailable: 1)
- [ ] Add to k8s/base/pdbs/ directory
- [ ] Update kustomization.yaml to include PDBs
- [ ] Test with kubectl drain
- [ ] Document in deployment guide

#### US-025: Add Kubernetes Network Policies
**Description:** As a security engineer, I want network policies so that pod-to-pod communication is restricted.

**Acceptance Criteria:**
- [ ] Create NetworkPolicy for API (allow ingress from ingress controller only)
- [ ] Create NetworkPolicy for Policy Service (allow from dnsdist, API only)
- [ ] Create NetworkPolicy for dnsdist (allow from internet, egress to policy-svc/unbound)
- [ ] Create NetworkPolicy for databases (allow from API, policy-svc only)
- [ ] Add to k8s/base/network-policies/ directory
- [ ] Update kustomization.yaml
- [ ] Test connectivity after applying
- [ ] Document in security guide

#### US-026: Create Database Migration Job for Kubernetes
**Description:** As a DevOps engineer, I want database migrations to run automatically before deployments so that schema is always current.

**Acceptance Criteria:**
- [ ] Create Kubernetes Job for running migrations
- [ ] Job runs `npm run migration:run` in API container
- [ ] Job has init container waiting for database
- [ ] Job has backoff limit (3 retries)
- [ ] Job completes before deployment updates
- [ ] Add to k8s/base/jobs/ directory
- [ ] Integrate with Helm hooks (pre-upgrade)
- [ ] Document rollback procedure

---

### Phase 5: Production Hardening (Weeks 17-20)

#### US-027: Add Webhook Secret Rotation
**Description:** As a security administrator, I want to rotate webhook secrets so that compromised secrets can be replaced.

**Acceptance Criteria:**
- [ ] Add `rotateSecret` endpoint to webhooks controller
- [ ] Generate new secret while keeping old valid (grace period)
- [ ] Configurable grace period (default: 24 hours)
- [ ] Send both old and new signatures during grace period
- [ ] Expire old secret after grace period
- [ ] Audit log secret rotation events
- [ ] Unit tests for rotation logic
- [ ] E2E test for rotation flow
- [ ] Typecheck/lint passes

#### US-028: Add API Key IP Allowlisting
**Description:** As a security administrator, I want to restrict API keys to specific IPs so that stolen keys are less useful.

**Acceptance Criteria:**
- [ ] Add `allowedIps` field to api_keys table (text array)
- [ ] Add `allowedCidrs` field for CIDR ranges
- [ ] Validate client IP against allowlist on every request
- [ ] Return 403 if IP not in allowlist
- [ ] Update API key create/update DTOs
- [ ] Update API key management UI
- [ ] Audit log IP violations
- [ ] Unit tests for IP matching (IPv4, IPv6, CIDR)
- [ ] E2E tests for IP restriction
- [ ] Typecheck/lint passes

#### US-029: Add Idempotency Support for Webhooks
**Description:** As an integration developer, I want webhooks to be idempotent so that duplicate deliveries don't cause issues.

**Acceptance Criteria:**
- [ ] Generate unique `idempotency_key` for each webhook event
- [ ] Include `X-Idempotency-Key` header in webhook deliveries
- [ ] Store delivered idempotency keys (7-day retention)
- [ ] Skip delivery if key already delivered successfully
- [ ] Document idempotency in API docs
- [ ] Unit tests for idempotency logic
- [ ] Integration tests for duplicate prevention
- [ ] Typecheck/lint passes

#### US-030: Implement Secrets Manager Integration
**Description:** As a DevOps engineer, I want secrets loaded from a secrets manager so that sensitive data isn't in environment variables.

**Acceptance Criteria:**
- [ ] Complete AWS Secrets Manager integration
- [ ] Complete HashiCorp Vault integration
- [ ] Add startup validation for secrets availability
- [ ] Implement secret caching with configurable TTL
- [ ] Implement secret refresh without restart
- [ ] Add health check for secrets connectivity
- [ ] Document setup for each provider
- [ ] Integration tests with localstack/vault dev mode
- [ ] Typecheck/lint passes

#### US-031: Add Security Scanning to CI Pipeline
**Description:** As a security engineer, I want automated security scanning so that vulnerabilities are caught before deployment.

**Acceptance Criteria:**
- [ ] Add SAST scanning (CodeQL or Semgrep)
- [ ] Add dependency vulnerability scanning (npm audit, go mod audit)
- [ ] Add container image scanning (Trivy)
- [ ] Add secrets scanning (gitleaks or trufflehog)
- [ ] Fail pipeline on HIGH/CRITICAL findings
- [ ] Generate SBOM (Software Bill of Materials)
- [ ] Sign container images
- [ ] Document security scanning in CI docs
- [ ] All scans pass on current codebase

#### US-032: Add Production Monitoring Dashboards
**Description:** As a platform operator, I want Grafana dashboards so that I can monitor system health.

**Acceptance Criteria:**
- [ ] Create API performance dashboard (latency, error rate, throughput)
- [ ] Create Policy Service dashboard (evaluation latency, cache hit rate)
- [ ] Create DNS dashboard (query rate, block rate, response codes)
- [ ] Create Database dashboard (connections, query time, replication lag)
- [ ] Create Business metrics dashboard (active users, queries by tenant)
- [ ] Add dashboard to monitoring/grafana/dashboards/
- [ ] Import dashboards in Grafana provisioning
- [ ] Document dashboard usage

#### US-033: Load Testing and Performance Baseline
**Description:** As a platform operator, I want load testing results so that I know system capacity.

**Acceptance Criteria:**
- [ ] Run API load test at 1000 RPS
- [ ] Run DNS load test at 50,000 QPS
- [ ] Document P50, P95, P99 latencies
- [ ] Document error rate at peak load
- [ ] Document resource utilization at peak
- [ ] Identify bottlenecks and document
- [ ] Create capacity planning guide
- [ ] Set performance baselines for regression testing
- [ ] All tests pass threshold requirements

---

## Functional Requirements

### Security
- FR-1: The system must store active sessions in Redis with user_id, token_jti, device info, and timestamps
- FR-2: The system must check token JTI against Redis blacklist before authorizing requests
- FR-3: The system must support PKCE with S256 method for all OIDC authentication flows
- FR-4: The system must sign SAML AuthnRequest and LogoutRequest using RSA-SHA256
- FR-5: The system must fail startup if encryption keys are missing in production environment
- FR-6: The system must prevent modification of audit log records via database triggers
- FR-7: The system must use AES-256-GCM for all sensitive data encryption
- FR-8: The system must validate webhook signatures using HMAC-SHA256
- FR-9: The system must enforce API key IP allowlisting when configured

### Testing
- FR-10: The system must achieve 90%+ test coverage across all modules
- FR-11: All controllers must have unit tests covering all HTTP methods
- FR-12: All services must have unit tests covering business logic
- FR-13: Integration tests must verify Redis cache operations
- FR-14: Integration tests must verify ClickHouse analytics queries
- FR-15: E2E tests must cover all critical user workflows

### Features
- FR-16: The threat-detection module must expose REST endpoints for threat analysis
- FR-17: The geoip module must expose REST endpoints for IP location lookup
- FR-18: The family module must support member management, schedules, and per-member policies
- FR-19: All forms must validate input using Zod schemas before submission
- FR-20: Rate limiting must use Redis for distributed counter storage

### Infrastructure
- FR-21: Kubernetes deployments must have Pod Disruption Budgets
- FR-22: Kubernetes deployments must have Network Policies restricting traffic
- FR-23: Database migrations must run via Kubernetes Job before deployment updates
- FR-24: CI pipeline must include SAST, dependency scanning, and container scanning
- FR-25: All container images must be signed and include SBOM

### Documentation
- FR-26: Each service must have a README with setup, running, and testing instructions
- FR-27: A troubleshooting guide must document common issues and solutions
- FR-28: An administration guide must document operational procedures
- FR-29: API documentation must be complete with all endpoints and examples

---

## Non-Goals (Out of Scope)

- WebAuthn/FIDO2 security key support (future enhancement)
- GraphQL API alternative (REST is sufficient)
- Mobile native applications (web-responsive is sufficient)
- On-premise deployment support (SaaS only for GA)
- Multi-region deployment (single region for GA)
- Real-time collaboration features
- Custom DNS record types beyond A/AAAA/CNAME
- DNSSEC signing (validation only)
- Zone transfer (AXFR/IXFR) support
- DNS-over-QUIC (DoQ) protocol

---

## Technical Considerations

### Dependencies
- Redis 7.x for session management and distributed rate limiting
- ClickHouse 23.x for analytics
- PostgreSQL 16.x for relational data
- Node.js 20.x LTS for API and UI
- Go 1.23.x for Policy Service
- Kubernetes 1.28+ for production deployment

### Performance Requirements
- API response time: P95 < 500ms, P99 < 1000ms
- Policy evaluation: P95 < 50ms
- DNS resolution: P95 < 100ms
- Cache hit rate: > 80%
- System uptime: 99.9%

### Security Requirements
- TLS 1.2+ for all connections
- AES-256-GCM for encryption at rest
- bcrypt (cost 12) for password hashing
- JWT tokens with 15-minute expiration
- Rate limiting at multiple levels
- Audit logging for all sensitive operations

### Compliance Requirements (SOC2)
- Immutable audit logs with 7-year retention
- Encrypted credentials at rest
- Session management with revocation
- Access control with RBAC
- Vulnerability scanning in CI/CD

---

## Success Metrics

- Test coverage reaches 90%+ (up from current ~35%)
- Zero critical or high security vulnerabilities in scans
- API P95 latency < 500ms under 1000 RPS load
- DNS P95 latency < 100ms under 50,000 QPS load
- All 33 user stories completed and accepted
- Documentation complete for all services
- Successful SOC2 Type 1 audit preparation
- Zero production incidents in first 30 days post-GA

---

## Open Questions

1. **Secrets Manager Choice:** Should we prioritize AWS Secrets Manager or HashiCorp Vault for GA? (Recommend: Start with AWS for faster deployment)

2. **Session Limit:** What should be the default maximum sessions per user? (Recommend: 10)

3. **Grace Period:** What should be the default grace period for API key and webhook secret rotation? (Recommend: 24 hours)

4. **Test Environment:** Should we use testcontainers or dedicated docker-compose for integration tests? (Recommend: testcontainers for portability)

5. **SAML Key Size:** RSA 2048 or 4096 for SAML signing? (Recommend: 4096 for long-term security)

6. **Audit Log Retention:** Is 7 years sufficient for all compliance needs? (Recommend: Confirm with legal/compliance team)

7. **Load Test Targets:** Are 1000 RPS (API) and 50,000 QPS (DNS) appropriate targets? (Recommend: Validate with expected customer load)

---

## Timeline Summary

| Phase | Weeks | Focus | User Stories |
|-------|-------|-------|--------------|
| 1 | 1-4 | Security Hardening | US-001 to US-006 |
| 2 | 5-8 | Testing Infrastructure | US-007 to US-013 |
| 3 | 9-12 | Feature Completion | US-014 to US-019 |
| 4 | 13-16 | Documentation & Operations | US-020 to US-026 |
| 5 | 17-20 | Production Hardening | US-027 to US-033 |

**Total: 33 User Stories across 5 Phases over 20 weeks**

---

## Appendix: Current State Analysis

### API Module Coverage (37 modules)
- **With Tests (12):** auth, users, policies, locations, webhooks, mfa, family, onboarding, playbooks, siem, sso, msp-templates
- **Without Tests (25):** api-keys, audit-logs, agents, redis, threat-detection, threat-feeds, clickhouse, health, metrics, lists, policy-templates, doh, geoip, payments, msp-billing, groups, block-pages, invitations, reports, scheduled-reports, email, realtime, partners, subscriptions, tenants

### UI Test Coverage
- **E2E Tests:** 2 files (auth.spec.ts, navigation.spec.ts)
- **Component Tests:** None
- **Pages Covered:** ~5%

### Go Service Test Coverage
- **Policy Service:** 3 test files (handlers, service, models)
- **Report Service:** 7 test files
- **Agent:** 4 test files

### Security Gaps Identified
1. Session management not implemented
2. PKCE missing from OIDC
3. SAML request signing disabled
4. Default encryption keys in code
5. Audit logs mutable
6. AES-CBC instead of AES-GCM

### Infrastructure Gaps Identified
1. No Pod Disruption Budgets
2. No Network Policies
3. No database migration job
4. Hardcoded image tags in production overlay
5. No secrets manager integration
6. Report service not in CI/CD pipeline
