# B. Threat Model + Mitigations

## Threat Categories

### 1. Tenant Spoofing / Cross-Tenant Data Leakage

**Threat**: Attacker attempts to query DNS using another tenant's credentials or bypass tenant identification.

**Attack Vectors**:
- Token theft/reuse from compromised location
- Certificate theft/reuse for mTLS
- SNI manipulation to impersonate tenant
- Missing tenant validation leading to default tenant fallback

**Mitigations**:
- **Token-based auth (DoH)**: 
  - Tokens are location-scoped, cryptographically random (256-bit)
  - Tokens stored hashed in PostgreSQL (bcrypt/argon2)
  - Token rotation capability (invalidate old, issue new)
  - Rate limiting per token to detect abuse
- **mTLS (DoT)**:
  - Client certificates issued per location with tenant_id in SAN
  - Certificate revocation list (CRL) or OCSP checking
  - Certificate rotation workflow
- **SNI fallback**:
  - SNI must match tenant domain pattern (e.g., `tenant-123.safedns.io`)
  - SNI-to-tenant mapping cached in Redis (TTL 5min)
  - Audit log all SNI-based authentications
- **No default tenant**: Every query MUST have valid tenant_id; reject otherwise
- **Tenant isolation in queries**: All database queries filtered by tenant_id; no cross-tenant reads

**Detection**:
- Log all authentication failures
- Alert on token reuse from multiple IPs simultaneously
- Monitor for queries with invalid/missing tenant_id

---

### 2. DDoS / Resource Exhaustion

**Threat**: Attacker floods DNS resolvers or policy service to cause denial of service.

**Attack Vectors**:
- High-volume DNS queries from compromised location
- Amplification attacks (small query, large response)
- Policy evaluation CPU exhaustion
- Redis/ClickHouse connection exhaustion

**Mitigations**:
- **Rate limiting at dnsdist edge**:
  - Per-location rate limits (e.g., 1000 QPS per location)
  - Per-tenant aggregate limits (e.g., 10000 QPS per tenant)
  - Sliding window counters in Redis
  - Automatic backoff on violation
- **Query size limits**:
  - Maximum DNS query size (512 bytes UDP, 4096 bytes TCP/DoH/DoT)
  - Reject oversized queries immediately
- **Policy evaluation optimization**:
  - O(1) average lookup via pre-compiled structures
  - Timeout on policy evaluation (50ms max)
  - Circuit breaker on Redis failures (fail open to ALLOW with audit)
- **Connection limits**:
  - Max concurrent connections per location
  - Max connections to Unbound pool
  - Connection timeouts (30s)
- **Resource quotas**:
  - Per-tenant policy size limits (max domains in lists)
  - Per-tenant log retention limits

**Detection**:
- Monitor QPS per location/tenant
- Alert on rate limit violations
- Track policy evaluation latency (p95/p99)

---

### 3. DNS Cache Poisoning / Response Manipulation

**Threat**: Attacker attempts to inject malicious DNS responses or poison caches.

**Attack Vectors**:
- Spoofed DNS responses from upstream
- Cache poisoning in Unbound
- Policy service returning incorrect responses
- Man-in-the-middle on DoH/DoT connections

**Mitigations**:
- **DNSSEC validation**:
  - Unbound validates DNSSEC on all recursive queries
  - Reject responses without valid DNSSEC signatures (when available)
  - Fail secure: if DNSSEC validation fails, return SERVFAIL
- **TLS security (DoH/DoT)**:
  - TLS 1.3 only for DoH/DoT
  - Certificate pinning for DoH endpoints
  - mTLS for DoT (mutual authentication)
  - No TLS downgrade allowed
- **Response validation**:
  - Policy service never generates DNS responses directly (only decisions)
  - dnsdist validates all responses from Unbound
  - No caching of BLOCK/REWRITE responses (always re-evaluate)
- **Upstream security**:
  - Use trusted recursive resolvers (e.g., Cloudflare, Google, Quad9)
  - Validate upstream certificates
  - Monitor upstream response patterns

**Detection**:
- Log DNSSEC validation failures
- Alert on suspicious response patterns
- Monitor upstream resolver health

---

### 4. Policy Bypass / Evasion

**Threat**: Attacker attempts to bypass DNS filtering by using alternative resolution methods.

**Attack Vectors**:
- Direct IP access (bypassing DNS)
- DoH/DoT to external resolvers
- DNS tunneling through allowed domains
- Subdomain enumeration to find allowed domains

**Mitigations**:
- **Network-level enforcement** (customer responsibility):
  - Customers must route all DNS through SafeDNS (firewall rules)
  - Block outbound DNS to external resolvers (port 53, 853, 443)
  - This is documented but not enforced by SafeDNS itself
- **Wildcard blocking**:
  - Support wildcard patterns in blocklists (e.g., `*.malware.com`)
  - Pre-compile wildcard matchers for O(1) lookup
- **DNS tunneling detection** (future):
  - Monitor for unusual query patterns (long subdomains, high entropy)
  - Rate limit per domain to prevent tunneling abuse
- **SafeSearch enforcement**:
  - Rewrite search engine domains to safe variants
  - Prevent subdomain bypass by rewriting at root domain level

**Note**: SafeDNS is designed for admin-controlled networks. Bypass prevention requires network-level controls that customers must implement.

---

### 5. Data Leakage / Privacy Violations

**Threat**: Unauthorized access to DNS query logs or tenant policy data.

**Attack Vectors**:
- SQL injection in API queries
- ClickHouse query injection
- Unauthorized API access
- Log exposure in backups/storage

**Mitigations**:
- **Input validation**:
  - Parameterized queries (no SQL injection)
  - Input sanitization for all API endpoints
  - Rate limiting on API endpoints
- **Access control**:
  - RBAC enforced at API layer
  - Read-only roles cannot access sensitive logs
  - Audit logs for all data access
- **Encryption**:
  - Encrypt ClickHouse logs at rest (AES-256)
  - Encrypt PostgreSQL backups
  - TLS for all API communications
- **Data retention**:
  - Configurable retention per tenant
  - Automatic purging of expired logs
  - No cross-tenant log access (tenant_id filtering)
- **Least privilege**:
  - API service uses read-only DB user for queries
  - Separate write user for mutations
  - ClickHouse queries scoped by tenant_id

**Detection**:
- Log all API access attempts
- Alert on unusual query patterns
- Monitor for cross-tenant data access attempts

---

### 6. Supply Chain / Dependency Risks

**Threat**: Compromised dependencies or upstream services.

**Attack Vectors**:
- Malicious npm/Go package updates
- Compromised threat feed sources
- Upstream DNS resolver compromise

**Mitigations**:
- **Dependency management**:
  - Lock file versions (package-lock.json, go.sum)
  - Regular security audits (npm audit, go mod verify)
  - Minimal dependencies (prefer standard library)
- **Threat feed validation**:
  - Validate feed format before ingestion
  - Checksum verification for feed files
  - Rate limit feed ingestion
  - Manual approval for new feed sources
- **Upstream diversity**:
  - Use multiple upstream DNS resolvers
  - Health checks and failover
  - Monitor upstream response consistency

**Detection**:
- Automated dependency scanning in CI
- Alert on upstream resolver failures
- Monitor threat feed ingestion errors

---

### 7. Insider Threats

**Threat**: Malicious or compromised admin users.

**Attack Vectors**:
- Admin creates policy that allows malicious domains
- Admin exports tenant data
- Admin deletes audit logs

**Mitigations**:
- **Audit logging**:
  - Immutable audit log (append-only)
  - Log all policy changes, user actions, data exports
  - Separate audit log storage (not deletable by admins)
- **RBAC**:
  - Owner role required for sensitive operations
  - Read-only roles cannot modify policies
  - Analyst role can view logs but not modify policies
- **Policy versioning**:
  - All policy changes create new versions (immutable)
  - Previous versions retained for rollback
  - Cannot delete active policy versions
- **Data export controls**:
  - Log all data export requests
  - Require Owner role for bulk exports
  - Rate limit exports

**Detection**:
- Alert on policy changes that allow known malicious domains
- Monitor for bulk data exports
- Review audit logs regularly

---

## Security Controls Summary

| Control | Implementation | Location |
|---------|---------------|----------|
| Tenant isolation | tenant_id filtering in all queries | API, Policy Service, ClickHouse |
| Authentication | Token (DoH), mTLS cert (DoT) | dnsdist, Policy Service |
| Rate limiting | Per-location/tenant limits | dnsdist, Redis |
| DNSSEC validation | Unbound validation | Unbound |
| TLS security | TLS 1.3, mTLS | dnsdist |
| Input validation | Parameterized queries, sanitization | API |
| Audit logging | Immutable logs | PostgreSQL, ClickHouse |
| RBAC | Role-based access control | API |
| Encryption at rest | AES-256 | ClickHouse, PostgreSQL backups |
| Policy versioning | Immutable versions | PostgreSQL |

## Incident Response

1. **Detection**: Automated alerts + manual review
2. **Containment**: Rate limit violations, revoke compromised tokens/certs
3. **Investigation**: Query audit logs, policy versions
4. **Remediation**: Policy rollback, token rotation, upstream change
5. **Post-mortem**: Document and improve controls
