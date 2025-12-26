# DNS Filter Project - To-Do List

> **Total Tasks: 67** | Last Updated: 2024-12-18

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
- [ ] **Add QR code generation library** - Currently shows placeholder - need to integrate `qrcode` library to generate actual QR codes from otpauth URL
- [ ] **Implement login flow MFA verification** - Add MFA challenge step during login when user has MFA enabled
- [ ] **Add session management for MFA-verified sessions** - Track which sessions have completed MFA verification

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
- [ ] **Add rate limiting per key** - Implement per-API-key rate limiting based on plan limits
- [ ] **Implement key rotation** - Allow rotating API keys while maintaining old key for grace period

### Team Invitations
- [ ] **Add email sending** - Send invitation emails with secure token links
- [ ] **Implement acceptance flow** - Complete the invitation acceptance and user creation flow

### SIEM Integration
- [ ] **Test Splunk HEC connection** - Verify actual Splunk HTTP Event Collector integration works
- [ ] **Test Elasticsearch bulk API** - Verify Elasticsearch bulk indexing works correctly
- [ ] **Test Azure Sentinel connection** - Verify Azure Log Analytics API integration
- [ ] **Test Syslog UDP/TCP delivery** - Verify syslog message delivery in CEF/LEEF formats

### Webhooks
- [ ] **Implement retry logic with backoff** - Add exponential backoff retry for failed webhook deliveries
- [ ] **Add signature verification docs** - Document how to verify webhook signatures on receiving end
- [ ] **Implement event filtering** - Allow filtering which events trigger specific webhooks

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

- [ ] **Add Kubernetes/Helm deployment manifests** - Create K8s manifests and Helm charts for production deployment
- [ ] **Implement horizontal scaling for policy-svc** - Enable multiple policy-svc replicas with shared Redis cache
- [ ] **Add Prometheus metrics endpoints** - Expose `/metrics` endpoints for all services
- [ ] **Implement Grafana dashboards** - Create dashboards for DNS queries, latency, errors, system health
- [ ] **Add health check endpoints for all services** - Implement `/health` and `/ready` endpoints for K8s probes
- [ ] **Implement log aggregation** - Set up ELK stack or Loki for centralized logging
- [ ] **Add CI/CD pipeline** - Create GitHub Actions workflows for testing, building, deploying
- [ ] **Implement database backup automation** - Set up automated PostgreSQL and ClickHouse backups

---

## Testing & Quality (7 tasks)

- [ ] **Add E2E tests for authentication flows** - Test login, logout, password reset, MFA flows end-to-end
- [ ] **Add E2E tests for policy evaluation** - Test DNS query blocking, allowing, rewriting through full stack
- [ ] **Add integration tests for SIEM connectors** - Test Splunk, Elastic, Sentinel, Syslog integrations with mocks
- [ ] **Add load testing for DNS queries** - Benchmark DNS query handling capacity with tools like `dnsperf`
- [ ] **Add unit tests for MFA service** - Test TOTP generation, verification, backup codes
- [ ] **Add unit tests for SSO service** - Test SAML/OIDC configuration and validation
- [ ] **Add API contract tests** - Ensure API responses match documented schemas

---

## Documentation (6 tasks)

- [ ] **Create API documentation (OpenAPI/Swagger)** - Generate and host interactive API documentation
- [ ] **Write deployment guide** - Document production deployment steps for various environments
- [ ] **Create user administration guide** - Document how to manage users, roles, permissions
- [ ] **Document policy configuration options** - Explain all policy settings, categories, and behaviors
- [ ] **Create agent installation guides** - Step-by-step guides for Windows, macOS, Linux, iOS, Android
- [ ] **Write SSO integration guides** - Guides for Okta, Azure AD, Google Workspace, OneLogin

---

## Security Hardening (6 tasks)

- [ ] **Implement CSRF protection** - Add CSRF tokens for state-changing requests
- [ ] **Add request signing for inter-service communication** - Sign requests between API, policy-svc, and other internal services
- [ ] **Implement secrets management** - Integrate HashiCorp Vault or AWS Secrets Manager
- [ ] **Add comprehensive security headers** - Implement CSP, HSTS, X-Frame-Options, etc.
- [ ] **Implement IP allowlisting for admin access** - Restrict admin panel access to specific IP ranges
- [ ] **Add brute force protection for login** - Implement progressive delays and account lockout

