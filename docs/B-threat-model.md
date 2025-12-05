# B. SafeDNS Threat Model & Mitigations

## Overview

This document identifies security threats to the SafeDNS platform and specifies mitigations. The platform handles sensitive DNS traffic for multiple tenants, making security critical.

## Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        UNTRUSTED: Internet                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BOUNDARY 1: Edge (dnsdist)                                             │
│  - TLS termination                                                      │
│  - Authentication                                                       │
│  - Rate limiting                                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  TRUSTED: Internal Network                                              │
│  - Policy Decision Service                                              │
│  - Unbound                                                              │
│  - Redis                                                                │
│  - ClickHouse                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BOUNDARY 2: Control Plane API                                          │
│  - JWT authentication                                                   │
│  - RBAC enforcement                                                     │
│  - Tenant isolation                                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  TRUSTED: Control Plane Internal                                        │
│  - PostgreSQL                                                           │
│  - Background Workers                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Threat Categories

### 1. Tenant Spoofing / Cross-Tenant Access

#### T1.1: Token Theft/Replay (DoH)
**Description**: Attacker steals a location token and uses it to query on behalf of another tenant.

**Impact**: HIGH - Attacker could exfiltrate DNS query patterns, bypass their own filtering

**Mitigations**:
- Tokens include HMAC signature with server-side secret
- Tokens include expiration timestamp (configurable, default 90 days)
- Token rotation mechanism in UI with overlap period
- Rate limiting per token (anomaly detection on volume)
- Audit log of token usage patterns (IP ranges)
- Tokens scoped to specific location, not entire tenant

#### T1.2: Certificate Theft/Misuse (DoT mTLS)
**Description**: Attacker obtains another location's client certificate.

**Impact**: HIGH - Same as token theft

**Mitigations**:
- Certificates issued with short validity (1 year)
- Certificate revocation via CRL/OCSP
- Private keys should be generated on-device (CSR flow)
- Certificate pinning recommended for high-security deployments
- Unique certificate per location (granular revocation)

#### T1.3: SNI Spoofing (DoT Fallback)
**Description**: Attacker guesses SNI pattern to impersonate another location.

**Impact**: MEDIUM - SNI is less secure than mTLS

**Mitigations**:
- SNI includes random component (not guessable)
- SNI validated against Redis lookup (not pattern-based)
- SNI-based auth disabled by default; mTLS preferred
- Rate limit on invalid SNI attempts

#### T1.4: Cross-Tenant Data Leakage (API)
**Description**: Authenticated user accesses data belonging to another tenant.

**Impact**: CRITICAL - Violates fundamental multi-tenancy guarantee

**Mitigations**:
- **Every database query includes `tenant_id` filter** (enforced by ORM middleware)
- Row-level security (RLS) in PostgreSQL as defense-in-depth
- `tenant_id` extracted from JWT, never from request body for lookups
- Integration tests that verify cross-tenant isolation
- API responses never include `tenant_id` in queryable fields

---

### 2. Denial of Service (DDoS)

#### T2.1: Query Flood
**Description**: Attacker sends massive query volume to exhaust resources.

**Impact**: HIGH - Service unavailable for legitimate users

**Mitigations**:
- **dnsdist rate limiting**: Per-IP, per-token/location limits
- Global rate limits with fair queuing across tenants
- Separate rate limit pools: authenticated vs. unauthenticated
- dnsdist connection limits and timeouts
- Anycast for geographic distribution
- Rate limit state in Redis with atomic operations

**Rate Limit Configuration**:
```
Per-Location Defaults:
  - 1,000 queries/second sustained
  - 5,000 queries/second burst (10-second window)
  
Per-IP (unauthenticated):
  - 10 queries/second
  - Automatic block after 1000 queries without valid auth

Global:
  - Circuit breaker if overall load exceeds capacity
```

#### T2.2: Slowloris / Connection Exhaustion
**Description**: Attacker opens many connections and holds them open.

**Impact**: MEDIUM - Connection table exhaustion

**Mitigations**:
- dnsdist connection timeouts (read: 5s, write: 5s, idle: 30s)
- Max connections per IP
- Connection rate limiting
- TCP keepalive with aggressive timeouts

#### T2.3: Amplification Abuse
**Description**: Attacker uses SafeDNS as amplifier for reflected DDoS.

**Impact**: MEDIUM - Reputation damage, resource consumption

**Mitigations**:
- No open resolver (authentication required)
- Response rate limiting (RRL) in dnsdist
- No recursion for unauthenticated queries
- Query/response size ratio monitoring

---

### 3. Cache Poisoning

#### T3.1: Upstream Cache Poisoning
**Description**: Attacker poisons Unbound cache via crafted responses.

**Impact**: HIGH - Clients receive malicious DNS responses

**Mitigations**:
- **DNSSEC validation mandatory** in Unbound
- Query ID randomization (default in Unbound)
- Source port randomization (default in Unbound)
- 0x20 encoding for additional entropy
- Unbound runs with minimal trust (no local zones from untrusted sources)

#### T3.2: Policy Cache Poisoning
**Description**: Attacker manipulates Redis to inject false policies.

**Impact**: CRITICAL - Bypass all filtering

**Mitigations**:
- Redis not exposed to internet (internal network only)
- Redis AUTH required
- Redis TLS for inter-service communication
- Policy data signed with HMAC before caching
- Policy version numbers (monotonic, detect rollback)
- Regular policy cache validation against source of truth

---

### 4. Data Leakage / Privacy

#### T4.1: Query Log Exposure
**Description**: DNS query logs leaked, revealing user browsing patterns.

**Impact**: HIGH - Privacy violation, potential regulatory issues

**Mitigations**:
- ClickHouse not exposed to internet
- ClickHouse authentication required
- Role-based access to query logs (Analyst role minimum)
- Query log retention policy (configurable, default 90 days)
- API rate limits on log exports
- No PII in logs beyond what's necessary (qname, not full user identity)

#### T4.2: Credential Exposure
**Description**: Location tokens or certificates leaked in logs/responses.

**Impact**: HIGH - Token theft enables spoofing

**Mitigations**:
- Tokens never logged (redacted in structured logs)
- Tokens never included in API responses after creation (show once)
- Certificate private keys never leave client device
- Secrets stored encrypted at rest (PostgreSQL)
- No credentials in error messages

#### T4.3: TLS Interception (MITM)
**Description**: Attacker intercepts TLS traffic.

**Impact**: HIGH - Query content and tokens exposed

**Mitigations**:
- TLS 1.3 preferred, TLS 1.2 minimum
- Strong cipher suites only (no CBC, no RC4)
- HSTS for DoH endpoint
- Certificate transparency logging
- Regular certificate rotation

---

### 5. Authentication & Authorization Bypass

#### T5.1: Credential Stuffing
**Description**: Attacker uses leaked credentials from other breaches.

**Impact**: MEDIUM - Account takeover

**Mitigations**:
- Password strength requirements (12+ chars, complexity)
- Account lockout after 5 failed attempts (30-minute cooldown)
- Rate limiting on login endpoint
- Optional MFA (future enhancement)
- Breached password checking (HaveIBeenPwned API)

#### T5.2: JWT Token Attacks
**Description**: JWT forgery, replay, or algorithm confusion.

**Impact**: HIGH - Authentication bypass

**Mitigations**:
- Strong secret for JWT signing (256-bit minimum)
- Short expiration (15 minutes access, 7 days refresh)
- JWT algorithm explicitly set (RS256), no "none" allowed
- Refresh token rotation (each use generates new token)
- Token revocation list for logout/password change

#### T5.3: Privilege Escalation
**Description**: User with limited role gains higher privileges.

**Impact**: HIGH - Unauthorized actions

**Mitigations**:
- RBAC checks on every API endpoint
- Role hierarchy enforced in middleware (not just DB)
- Role changes require Owner permission
- Audit log of all role changes
- No role information in client-controlled data

---

### 6. Supply Chain & Infrastructure

#### T6.1: Threat Feed Poisoning
**Description**: Malicious entries injected into threat intelligence feeds.

**Impact**: MEDIUM - False positives (blocking legitimate) or false negatives (missing threats)

**Mitigations**:
- Multiple feed sources for cross-validation
- Feed source reputation tracking
- Manual review of significant feed changes
- Rollback capability for feed updates
- Rate limiting on feed-driven blocklist changes

#### T6.2: Dependency Vulnerabilities
**Description**: Vulnerabilities in third-party libraries.

**Impact**: Variable - Depends on vulnerability

**Mitigations**:
- Dependabot/Renovate for dependency updates
- Minimal dependency footprint
- Container scanning in CI pipeline
- Regular security audits
- SBOM generation and tracking

#### T6.3: Infrastructure Misconfiguration
**Description**: Cloud/container misconfiguration exposes services.

**Impact**: HIGH - Unauthorized access

**Mitigations**:
- Infrastructure as Code (Terraform/Pulumi)
- Security group/firewall rules reviewed in PR
- No public IPs on internal services
- Network segmentation (separate VPCs for data/control planes)
- Regular infrastructure audits

---

## Security Controls Matrix

| Control | Implementation | Owner |
|---------|----------------|-------|
| Authentication (API) | JWT with RS256 | API Service |
| Authentication (DNS) | Token/mTLS/SNI | dnsdist |
| Authorization | RBAC middleware | API Service |
| Rate Limiting (DNS) | Per-IP, per-location | dnsdist + Redis |
| Rate Limiting (API) | Per-user, per-endpoint | API Service |
| Encryption in Transit | TLS 1.3 | All services |
| Encryption at Rest | PostgreSQL encryption | PostgreSQL |
| Audit Logging | All admin actions | API Service → PostgreSQL |
| Query Logging | All DNS queries | Policy Service → ClickHouse |
| Input Validation | Schema validation | API Service |
| DNSSEC | Validation enabled | Unbound |
| Tenant Isolation | tenant_id scoping + RLS | API Service + PostgreSQL |
| Secret Management | Encrypted storage, rotation | API Service |
| Vulnerability Scanning | CI pipeline | GitHub Actions |

---

## Incident Response

### Detection
- Prometheus metrics for anomaly detection
- Rate limit trigger alerts
- Failed authentication spike alerts
- Cross-tenant access attempt alerts (should never happen)

### Response
- Automatic token revocation on suspected compromise
- Manual tenant isolation capability
- Feed rollback mechanism
- Incident communication channel

### Recovery
- Token rotation without service interruption
- Policy version rollback
- Audit log preservation for forensics

---

## Compliance Considerations

| Framework | Relevant Controls |
|-----------|-------------------|
| SOC 2 | Access control, encryption, audit logging |
| GDPR | Data minimization, retention policies, access controls |
| CCPA | Privacy controls, data access logging |
| HIPAA | Encryption, audit trails (if healthcare customers) |

*Note: Detailed compliance mapping to be completed during security audit phase.*
