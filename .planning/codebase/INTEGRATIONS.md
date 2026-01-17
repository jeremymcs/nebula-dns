# External Integrations

**Analysis Date:** 2026-01-17

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
- Channels:
  - `nebula:invalidate` - Policy cache invalidation
  - `webhook_events` - Webhook delivery events
- Key patterns:
  - `policy:{tenant_id}` - Cached policy data
  - `ratelimit:{tenant_id}:{location_id}` - Rate limit buckets
  - `pkce:{state}` - OIDC PKCE code verifiers (5 min TTL)
  - `session:{session_id}` - User sessions

**ClickHouse 24.1:**
- Purpose: Analytics and DNS query logging (append-only, high volume)
- Connection: `CLICKHOUSE_HOST`, `CLICKHOUSE_PORT`, `CLICKHOUSE_DATABASE`
- Client: `@clickhouse/client` 0.2.6
- Implementation: `api/src/modules/reports/reports.service.ts`
- Tables: `dns_queries` with materialized views for aggregations
- Retention: Configurable (default 90 days in Helm values)

**File Storage:**
- Local filesystem only (no S3/GCS integration)
- GeoIP database: `/usr/share/GeoIP/GeoLite2-City.mmdb`

**Caching:**
- Redis for all caching needs
- Policy cache with pub/sub invalidation
- Session storage

## Authentication & Identity

**Primary Auth:**
- Custom JWT-based authentication
- Implementation: `api/src/modules/auth/`
- Access tokens: `JWT_SECRET`, expires in `JWT_EXPIRES_IN` (default 15m)
- Refresh tokens: `JWT_REFRESH_SECRET`, expires in `JWT_REFRESH_EXPIRES_IN` (default 7d)
- Session management via Redis

**MFA:**
- TOTP-based (Google Authenticator compatible)
- Implementation: `api/src/modules/mfa/`
- SDK: `otplib` 12.0.1
- QR code generation: `qrcode` 1.5.3
- Encryption: AES-256-GCM for TOTP secrets

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
- Report Service: `GET /health`

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

# ClickHouse
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=nebula_dns
CLICKHOUSE_USER=nebula
CLICKHOUSE_PASSWORD=<password>
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
  - Rate limiting per tenant
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

## DNS Infrastructure

**dnsdist:**
- Purpose: DNS load balancer, DoT/DoH termination, tenant ID extraction
- Config: `config/dnsdist/dnsdist.conf`
- Ports: 853 (DoT), 443 (DoH)

**Unbound:**
- Purpose: Recursive DNS resolver
- Config: `config/unbound/unbound.conf`
- Port: 53

**Policy Service (Go):**
- Purpose: O(1) policy evaluation, query logging
- Redis pub/sub for cache invalidation
- ClickHouse for query logging
- Fail-open mode: `FAIL_MODE` env var

---

*Integration audit: 2026-01-17*
