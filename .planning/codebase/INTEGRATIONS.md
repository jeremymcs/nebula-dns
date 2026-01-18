# External Integrations

**Analysis Date:** 2026-01-18

## APIs & External Services

**Payments (Stripe):**
- Service: Stripe
- SDK: `stripe` 20.0.0
- Implementation: `api/src/modules/payments/payments.service.ts`
- Auth: `STRIPE_SECRET_KEY` env var
- Features:
  - Checkout sessions for subscriptions
  - Billing portal for customer management
  - Webhook handling for subscription events
  - 14-day trial support

**Admin Billing Operations (Stripe Extension):**
- Implementation: `api/src/modules/admin/admin-billing.service.ts`
- Admin-specific Stripe operations (separate from tenant self-service):
  - **Credit Application:** Creates negative balance transactions via `stripe.customers.createBalanceTransaction()`
    - Maximum credit: $10,000 per transaction
    - Warning threshold: $500 (logged, not blocked)
    - Audit logged with `billing_credit_applied` action
  - **Tier Changes:** Updates subscription price via `stripe.subscriptions.update()`
    - Supports immediate (with proration) or end-of-period timing
    - Price IDs from env: `STRIPE_PRICE_{HOME|ENTERPRISE|MSP}_{MONTHLY|YEARLY}`
    - Audit logged with `billing_tier_changed` action
  - **Trial Extension:** Extends trial via `stripe.subscriptions.update({ trial_end: ... })`
    - Requires active trial subscription in Stripe
    - Optional email notification to tenant
  - **Grace Period Extension:** Local DB operation (not Stripe API)
    - Uses `SubscriptionLapseService.extendGracePeriod()`
  - **Invoice Listing:** `stripe.invoices.list({ customer: ... })`
    - Paginated with cursor support
  - **Invoice PDF Streaming:** Fetches PDF via axios from `invoice.invoice_pdf` URL
    - Validates invoice ownership before streaming

- Webhook secret: `STRIPE_WEBHOOK_SECRET`
- Price IDs configured per plan: `STRIPE_PRICE_*_MONTHLY/YEARLY`

**Email (SendGrid):**
- Service: SendGrid
- SDK: `@sendgrid/mail` 8.1.6
- Implementation: `api/src/modules/email/email.service.ts`
- Auth: `SENDGRID_API_KEY` env var
- Templates: Inline HTML (welcome, password reset, invite, scheduled reports, grace period notifications)
- Fallback: Development mode logs emails to console

**Error Tracking (Sentry):**
- Service: Sentry
- SDK: `@sentry/node` 10.29.0
- Implementation: `api/src/common/sentry/sentry.module.ts`
- Auth: `SENTRY_DSN` env var
- Features:
  - Automatic error capture (5xx only)
  - Request breadcrumbs
  - User context attachment
  - Environment-based sampling (10% production, 100% dev)

**GeoIP (MaxMind):**
- Service: MaxMind GeoLite2
- SDK: `maxmind` 5.0.1
- Implementation: `api/src/modules/geoip/geoip.service.ts`
- Auth: Database file at `GEOIP_DB_PATH` (default: `/usr/share/GeoIP/GeoLite2-City.mmdb`)
- Fallback: Mock data when database unavailable

## Data Storage

**Databases:**

**PostgreSQL 16:**
- Purpose: Primary relational database (users, tenants, policies, configs)
- Connection: `DATABASE_URL` env var
- Client: TypeORM 0.3.19
- Migrations: `api/src/database/migrations/`
- Features: Multi-tenant with `tenant_id` on all tables

**Redis 7:**
- Purpose: Cache, session storage, pub/sub for real-time invalidation
- Connection: `REDIS_URL` env var
- Client: ioredis 5.3.2
- Implementation: `api/src/modules/redis/redis.service.ts`

**Redis Key Namespace Separation:**

| Namespace | Purpose | Implementation | TTL |
|-----------|---------|----------------|-----|
| **Tenant Sessions** | User session tracking | `api/src/modules/auth/session.service.ts` | 7 days |
| `session:{user_id}:{session_id}` | Individual session data (JSON) | SessionService | 7 days |
| `session:user:{user_id}` | Set of user's active session IDs | SessionService | 7 days |
| `session:blacklist:{jti}` | Revoked token JTIs | SessionService | 7 days |
| **Admin Sessions** | Admin authentication sessions | `api/src/modules/admin/admin-session.service.ts` | 8 hours |
| `admin:session:{admin_id}:{session_id}` | Individual admin session data | AdminSessionService | 8 hours |
| `admin:session:admin:{admin_id}` | Set of admin's active session IDs | AdminSessionService | 8 hours |
| `admin:session:blacklist:{jti}` | Revoked admin token JTIs | AdminSessionService | 8 hours |
| **Other Keys** | | | |
| `policy:{tenant_id}` | Cached policy data | PolicyService | - |
| `ratelimit:{tenant_id}:{location_id}` | Rate limit buckets | - | Window |
| `pkce:{state}` | OIDC PKCE code verifiers | SsoService | 5 min |
| `webhook_ratelimit:{tenant_id}:{webhook_id}` | Webhook rate limiting | WebhooksService | 60 sec |

**Admin Session Configuration:**
```typescript
// api/src/modules/admin/admin-session.service.ts
ADMIN_MAX_SESSIONS = 5           // Max concurrent sessions per admin
ADMIN_SESSION_TTL_SECONDS = 28800 // 8 hours (workday)
ADMIN_BLACKLIST_TTL_SECONDS = 28800 // Match session TTL
```

- Channels:
  - `nebula:invalidate` - Policy cache invalidation
  - `webhook_events` - Webhook delivery events

**ClickHouse 24.1:**
- Purpose: Analytics and DNS query logging (append-only, high volume)
- Connection: `CLICKHOUSE_HOST`, `CLICKHOUSE_PORT`, `CLICKHOUSE_DATABASE`
- Client: `@clickhouse/client` 0.2.6
- Implementation: `api/src/modules/clickhouse/clickhouse.service.ts`
- Tables: `dns_queries` with materialized views for aggregations
- Retention: Configurable (default 90 days in Helm values)

**ClickHouse Admin Usage Metrics:**
- Implementation: `api/src/modules/admin/admin-health.service.ts`
- Aggregates query volume across all tenants for admin dashboards
- Queries:
  - **Error Rates:** Counts errors in 1h/24h windows
    ```sql
    -- Planned query (currently returns connection status proxy)
    SELECT count() as total,
           countIf(reason LIKE '%error%' OR reason = 'policy_error') as errors
    FROM nebula_dns.query_logs
    WHERE timestamp >= now() - INTERVAL {period}
    ```
  - **Query Volume:** Total/blocked/allowed counts
    ```sql
    -- Planned query
    SELECT count() as total,
           countIf(action = 'block') as blocked,
           countIf(action = 'allow') as allowed
    FROM nebula_dns.query_logs
    WHERE timestamp >= now() - INTERVAL {period}
    ```
  - **Recent Errors:** Last N error entries for troubleshooting
    ```sql
    -- Planned query
    SELECT timestamp, domain, reason, client_ip, tenant_id
    FROM nebula_dns.query_logs
    WHERE reason LIKE '%error%' OR reason = 'policy_error'
    ORDER BY timestamp DESC LIMIT {limit}
    ```
- Fallback: Mock data when ClickHouse unavailable (marked with `isMockData: true`)

**File Storage:**
- Local filesystem only (no S3/GCS integration)
- GeoIP database: `/usr/share/GeoIP/GeoLite2-City.mmdb`

**Caching:**
- Redis for all caching needs
- Policy cache with pub/sub invalidation
- Session storage (tenant and admin namespaces)

## Authentication & Identity

**Primary Auth:**
- Custom JWT-based authentication
- Implementation: `api/src/modules/auth/`
- Access tokens: `JWT_SECRET`, expires in `JWT_EXPIRES_IN` (default 15m)
- Refresh tokens: `JWT_REFRESH_SECRET`, expires in `JWT_REFRESH_EXPIRES_IN` (default 7d)
- Session management via Redis

**Admin Auth:**
- Separate admin JWT namespace
- Implementation: `api/src/modules/admin/`
- Session TTL: 8 hours (vs 7 days for tenant users)
- Max sessions: 5 per admin (vs 10 for tenant users)
- Uses separate Redis key prefix (`admin:session:*`)
- Guard: `AdminAuthGuard` (distinct from `JwtAuthGuard`)

**MFA:**
- TOTP-based (Google Authenticator compatible)
- Implementation: `api/src/modules/mfa/mfa.service.ts`
- Custom TOTP implementation (no external library)
- QR code URL format: `otpauth://totp/{issuer}:{email}?secret={secret}&issuer={issuer}`
- Encryption: AES-256-GCM for TOTP secrets
- Backup codes: 10 codes, bcrypt hashed

**SSO Providers:**
- SAML 2.0 support
  - SDK: `@node-saml/node-saml` 5.1.0
  - Implementation: `api/src/modules/sso/sso.service.ts`
  - Features: SP-initiated login, key rotation, signed assertions
- OIDC support
  - Features: Authorization code flow with PKCE
  - State stored in Redis (5 min TTL)
- Encryption: AES-256-GCM for client secrets and SAML certificates

## Monitoring & Observability

**Error Tracking:**
- Sentry (see above)

**Metrics:**
- Prometheus client: `@prometheus/client_golang` 1.23.2 (Policy Service)
- Exposed at `/metrics` endpoint
- ServiceMonitor for Kubernetes Prometheus Operator

**Logs:**
- Structured JSON logging
- NestJS Logger (API)
- Zap 1.26.0 (Policy Service, Report Service)
- Log level: `LOG_LEVEL` env var

**Health Checks:**
- API: `GET /health`
- Policy Service: `GET /health`
- Admin System Health: `GET /api/admin/system/health`
  - Checks: policy-svc, dnsdist, unbound
  - Storage: ClickHouse, Redis
  - Error rates and query volume

## CI/CD & Deployment

**Hosting:**
- Kubernetes (primary)
- Docker Compose (development)

**Kubernetes Resources:**
- Kustomize: `k8s/base/`, `k8s/overlays/production/`
- Helm: `helm/safedns/`
- Namespace: `nebula-dns`
- Ingress: nginx ingress controller
- TLS: cert-manager with Let's Encrypt

**CI Pipeline:**
- Not explicitly defined in repo
- Dockerfile multi-stage builds ready for CI

**Container Registry:**
- Images: `nebuladns/api`, `nebuladns/ui`, `nebuladns/policy-svc`, `nebuladns/dnsdist`

## Environment Configuration

**Required env vars (production):**
```
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Authentication
JWT_SECRET=<64 bytes base64>
JWT_REFRESH_SECRET=<64 bytes base64>

# Encryption (32 bytes each)
MFA_ENCRYPTION_KEY=<base64 or hex>
SSO_ENCRYPTION_KEY=<base64 or hex>
SIEM_ENCRYPTION_KEY=<base64 or hex>
INTERNAL_SERVICE_KEY=<any string>

# External Services
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENDGRID_API_KEY=SG....
SENTRY_DSN=https://...@sentry.io/...

# Stripe Price IDs (admin tier changes)
STRIPE_PRICE_HOME_MONTHLY=price_...
STRIPE_PRICE_HOME_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...
STRIPE_PRICE_MSP_MONTHLY=price_...
STRIPE_PRICE_MSP_YEARLY=price_...

# ClickHouse
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=nebula_dns
CLICKHOUSE_USER=nebula
CLICKHOUSE_PASSWORD=<password>

# Admin Sessions (optional)
ADMIN_MAX_SESSIONS=5
ADMIN_SESSION_TTL_SECONDS=28800
ADMIN_BLACKLIST_TTL_SECONDS=28800

# DNS Health Checks
POLICY_SVC_URL=http://policy-svc:8080
DNSDIST_URL=http://dnsdist:8083
UNBOUND_HOST=unbound
UNBOUND_PORT=5354
```

**Secrets location:**
- Development: `.env` files (gitignored)
- Production: External Secrets Operator
  - AWS Secrets Manager (primary)
  - HashiCorp Vault (alternative)
  - GCP Secret Manager (alternative)
- Config: `k8s/base/external-secrets/`

## Webhooks & Callbacks

**Incoming:**
- `POST /api/v1/payments/webhook` - Stripe webhook events
  - Signature verification via `STRIPE_WEBHOOK_SECRET`
  - Events: subscription.created, updated, deleted, invoice.paid, payment_failed

**Outgoing:**
- Custom webhook system for tenant notifications
- Implementation: `api/src/modules/webhooks/webhooks.service.ts`
- Features:
  - HMAC-SHA256 signature verification
  - Idempotency keys (X-Idempotency-Key header)
  - Retry logic: 3 attempts with backoff (1s, 5s, 30s)
  - Rate limiting per tenant (Redis key: `webhook_ratelimit:{tenant_id}:{webhook_id}`)
  - Secret rotation with grace period (both old and new secrets valid)
  - Events: policy.created, policy.updated, threat.detected, etc.

## SIEM Integrations

**Supported Platforms:**
- Splunk (HEC endpoint)
- Elastic (direct HTTP)
- Microsoft Sentinel
- Syslog (UDP/TCP)

**Implementation:** `api/src/modules/siem/siem.service.ts`

**Credential Storage:**
- AES-256-GCM encrypted in PostgreSQL
- Encryption key: `SIEM_ENCRYPTION_KEY`
- Legacy CBC support with opportunistic migration to GCM

## DNS Infrastructure

**dnsdist:**
- Purpose: DNS load balancer, DoT/DoH termination, tenant ID extraction
- Config: `config/dnsdist/dnsdist.conf`
- Ports: 853 (DoT), 443 (DoH)
- Health check: HTTP endpoint at port 8083

**Unbound:**
- Purpose: Recursive DNS resolver
- Config: `config/unbound/unbound.conf`
- Port: 5354 (internal), 53 (external)
- Health check: DNS resolution test (google.com)

**Policy Service (Go):**
- Purpose: O(1) policy evaluation, query logging
- Implementation: `policy-svc/`
- Redis pub/sub for cache invalidation
- ClickHouse for query logging
- Fail-open mode: `FAIL_MODE` env var
- Health check: HTTP endpoint at port 8080

---

*Integration audit: 2026-01-18*
