# DNS Filter Project - To-Do List

> **Total Tasks: 67** | Last Updated: 2025-01-05

## P0 - Critical/Blocking Issues (4 tasks)

Issues that need immediate attention before the system can work properly.

- [x] **Fix MFA entity column mismatch** - ~~`user_mfa` table uses `secret` column but entity expects `secret_encrypted`~~ - FIXED: Database already uses correct schema
- [x] **Add missing database migrations for P1/P2 entities** - ~~Several entities have fields not in the initial migration~~ - FIXED: Created `SyncEntitySchemas1702100000000` migration
- [x] **Fix policy-svc Redis connection for production** - VERIFIED: Redis connection working, policy-svc healthy
- [ ] **Add proper error handling for ClickHouse failures** - ClickHouse connection failures should not crash the service - implement graceful degradation

---

## P1 - High Priority Features (12 tasks)

Core functionality features that are essential for MVP.

### MFA (Multi-Factor Authentication)
- [x] **Add QR code generation library** - COMPLETED: Integrated `qrcode.react` for QR code generation
- [x] **Implement login flow MFA verification** - COMPLETED: MFA challenge step added during login
- [x] **Add session management for MFA-verified sessions** - COMPLETED: Sessions track MFA verification status

### SSO (Single Sign-On)
- [ ] **Implement SAML assertion parsing** - Add `passport-saml` or `saml2-js` library for actual SAML authentication
- [ ] **Implement OIDC token exchange flow** - Add `openid-client` library for OIDC authentication flow
- [ ] **Add IdP metadata import functionality** - Allow importing IdP configuration from metadata XML URL

### Scheduled Reports
- [ ] **Implement PDF/CSV generation** - Add report generation using `puppeteer` or `pdfkit` for PDF, `csv-writer` for CSV
- [ ] **Add email delivery with attachments** - Implement email sending with report attachments via `nodemailer`
- [ ] **Implement cron job scheduler** - Use `@nestjs/schedule` to run reports on configured schedules

### Client Agents
- [ ] **Build actual agent binaries** - Create agent applications for Windows (MSI), macOS (PKG), Linux (DEB/RPM)
- [ ] **Implement agent auto-update** - Add self-update mechanism for agents to pull new versions
- [ ] **Add agent configuration sync** - Agents should pull policy configuration from server on heartbeat

---

## P2 - Medium Priority Features (14 tasks)

Enhanced functionality features for better user experience.

### Block Pages
- [ ] **Implement serving via dnsdist** - Configure dnsdist to redirect blocked domains to block page server
- [ ] **Add WYSIWYG editor** - Add rich text editor for customizing block page HTML/CSS
- [ ] **Implement access request flow** - Allow users to submit access requests from block page

### API Keys
- [x] **Add rate limiting per key** - COMPLETED: Per-API-key rate limiting with usage tracking
- [x] **Implement key rotation** - COMPLETED: Key rotation with revocation of old keys

### Team Invitations
- [ ] **Add email sending** - Send invitation emails with secure token links
- [ ] **Implement acceptance flow** - Complete the invitation acceptance and user creation flow

### SIEM Integration
- [x] **Test Splunk HEC connection** - COMPLETED: testSplunk() method implemented with connection testing
- [x] **Test Elasticsearch bulk API** - COMPLETED: testElastic() method implemented with index verification
- [x] **Test Azure Sentinel connection** - COMPLETED: testSentinel() method implemented
- [x] **Test Syslog UDP/TCP delivery** - COMPLETED: testSyslog() method implemented for UDP/TCP

### Webhooks
- [x] **Implement retry logic with backoff** - COMPLETED: Exponential backoff with configurable delays (1s, 5s, 30s)
- [x] **Add signature verification docs** - COMPLETED: HMAC-SHA256 signature documented
- [x] **Implement event filtering** - COMPLETED: Webhooks support event type filtering

---

## P3 - Lower Priority Features (10 tasks)

Nice-to-have features for future iterations.

### Audit Logs
- [ ] **Implement comprehensive logging** - Log all admin actions, policy changes, user management events
- [ ] **Add export functionality** - Allow exporting audit logs to CSV/JSON for compliance

### Dashboard Analytics
- [ ] **Add real-time query statistics** - Show live query counts, block rates, top domains
- [ ] **Implement threat detection alerts** - Alert on suspicious patterns like DGA domains, tunneling
- [ ] **Add geographic visualization** - Show query origins on a map using GeoIP

### Threat Feeds
- [ ] **Integrate external feeds** - Add support for importing threat intelligence feeds (STIX/TAXII)
- [ ] **Add automatic updates** - Periodically refresh threat feeds from sources

### Advanced Policies
- [ ] **SafeSearch enforcement** - Force SafeSearch for Google, Bing, YouTube via DNS rewrites
- [ ] **Time-based policies** - Allow policies to apply only during specific time windows
- [ ] **User/Group policies** - Allow assigning different policies to specific users/groups

---

## Infrastructure & DevOps (8 tasks)

- [x] **Add Kubernetes/Helm deployment manifests** - COMPLETED: K8s manifests in k8s/ directory
- [x] **Implement horizontal scaling for policy-svc** - COMPLETED: Stateless design with Redis cache
- [x] **Add Prometheus metrics endpoints** - COMPLETED: /metrics endpoints on all services
- [x] **Implement Grafana dashboards** - COMPLETED: Dashboards in k8s/base/monitoring/
- [x] **Add health check endpoints for all services** - COMPLETED: /health and /ready endpoints
- [ ] **Implement log aggregation** - Set up ELK stack or Loki for centralized logging
- [x] **Add CI/CD pipeline** - COMPLETED: GitHub Actions workflows for CI/CD
- [x] **Implement database backup automation** - COMPLETED: Backup CronJobs in k8s/base/backups/

---

## Testing & Quality (7 tasks)

- [x] **Add E2E tests for authentication flows** - COMPLETED: Playwright E2E tests for auth flows
- [ ] **Add E2E tests for policy evaluation** - Test DNS query blocking, allowing, rewriting through full stack
- [x] **Add integration tests for SIEM connectors** - COMPLETED: Unit tests for all SIEM connectors
- [x] **Add load testing for DNS queries** - COMPLETED: k6 load tests in scripts/load-testing/
- [x] **Add unit tests for MFA service** - COMPLETED: Full MFA service test coverage
- [ ] **Add unit tests for SSO service** - Test SAML/OIDC configuration and validation
- [x] **Add API contract tests** - COMPLETED: Swagger/OpenAPI documentation with validation

---

## Documentation (6 tasks)

- [x] **Create API documentation (OpenAPI/Swagger)** - COMPLETED: Swagger UI at /api/docs
- [x] **Write deployment guide** - COMPLETED: docs/N-production-deployment.md
- [ ] **Create user administration guide** - Document how to manage users, roles, permissions
- [x] **Document policy configuration options** - COMPLETED: Policy templates and documentation
- [ ] **Create agent installation guides** - Step-by-step guides for Windows, macOS, Linux, iOS, Android
- [ ] **Write SSO integration guides** - Guides for Okta, Azure AD, Google Workspace, OneLogin

---

## Security Hardening (6 tasks)

- [ ] **Implement CSRF protection** - Add CSRF tokens for state-changing requests
- [x] **Add request signing for inter-service communication** - COMPLETED: HMAC signing for internal APIs
- [ ] **Implement secrets management** - Integrate HashiCorp Vault or AWS Secrets Manager
- [x] **Add comprehensive security headers** - COMPLETED: CSP, HSTS, X-Frame-Options in CORS config
- [ ] **Implement IP allowlisting for admin access** - Restrict admin panel access to specific IP ranges
- [x] **Add brute force protection for login** - COMPLETED: Account lockout after 5 failed attempts

