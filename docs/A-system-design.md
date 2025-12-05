# A. SafeDNS System Design

## Overview

SafeDNS is a multi-tenant DNS security and content filtering SaaS. It provides:
- **Control Plane**: Multi-tenant API + Admin UI for policy management
- **Data Plane**: Regional DNS infrastructure for policy enforcement

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CONTROL PLANE (SaaS)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐    │
│  │   Next.js    │────▶│   NestJS     │────▶│      PostgreSQL          │    │
│  │   Admin UI   │     │   API        │     │  (tenants, policies,     │    │
│  └──────────────┘     └──────┬───────┘     │   users, locations)      │    │
│                              │             └──────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│                    ┌──────────────────┐                                     │
│                    │ Background       │                                     │
│                    │ Workers          │                                     │
│                    │ - Feed ingestion │                                     │
│                    │ - List compile   │                                     │
│                    │ - Report rollups │                                     │
│                    └──────────────────┘                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Policy Sync (Redis Pub/Sub)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA PLANE (Regional, Stateless)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          dnsdist (Edge)                              │   │
│  │  - DoH termination (HTTPS :443)                                      │   │
│  │  - DoT termination (TLS :853)                                        │   │
│  │  - Rate limiting (per-location)                                      │   │
│  │  - Tenant/Location identification                                    │   │
│  │  - Request routing to Policy Decision Service                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   Policy Decision Service (Go)                       │   │
│  │  - Receives DNS query + tenant context                               │   │
│  │  - Evaluates policy (category, threat, allowlist, blocklist)         │   │
│  │  - Returns: ALLOW | BLOCK | REWRITE                                  │   │
│  │  - Logs decision to ClickHouse                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                    │                    │                       │
│           │ ALLOW              │ BLOCK              │ REWRITE               │
│           ▼                    ▼                    ▼                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │    Unbound      │  │   Return        │  │   Return        │             │
│  │    Pool         │  │   NXDOMAIN or   │  │   SafeSearch    │             │
│  │  (Recursion +   │  │   0.0.0.0/::    │  │   IPs/CNAMEs    │             │
│  │   DNSSEC)       │  │                 │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │   Response to   │                                                        │
│  │   Client        │                                                        │
│  └─────────────────┘                                                        │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         Shared Services                               │  │
│  │  ┌─────────────┐     ┌─────────────────────────────────────────────┐ │  │
│  │  │   Redis     │     │              ClickHouse                     │ │  │
│  │  │  - Policy   │     │  - Query logs (high-volume)                 │ │  │
│  │  │    cache    │     │  - Analytics/reporting                      │ │  │
│  │  │  - Rate     │     │                                             │ │  │
│  │  │    limits   │     │                                             │ │  │
│  │  └─────────────┘     └─────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Control Plane Components

#### 1.1 NestJS API Service
- **Purpose**: Multi-tenant REST API for all management operations
- **Key Responsibilities**:
  - Tenant, user, and role management
  - Policy CRUD with immutable versioning
  - Location management with credential rotation
  - Allow/block list management
  - Report generation
- **Authentication**: JWT-based with email/password
- **Authorization**: RBAC with tenant scoping

#### 1.2 Next.js Admin UI
- **Purpose**: Web-based administration interface
- **Features**:
  - Dashboard with key metrics
  - Policy editor with preview
  - Location management
  - Log viewer and reports
  - User/role management

#### 1.3 Background Workers
- **Feed Ingestion**: Pull threat intel feeds (malware, phishing, C2 domains)
- **List Compilation**: Build optimized lookup structures from raw lists
- **Report Rollups**: Pre-aggregate data for common report queries
- **Policy Sync**: Push policy updates to data plane Redis

### 2. Data Plane Components

#### 2.1 dnsdist (Edge Entry Point)
- **DoH Endpoint**: HTTPS on port 443, path `/dns-query`
- **DoT Endpoint**: TLS on port 853
- **Functions**:
  - TLS termination
  - Tenant/location identification (token, mTLS cert, SNI)
  - Per-location rate limiting
  - Request routing to Policy Decision Service
  - Response forwarding

#### 2.2 Policy Decision Service (Go)
- **Purpose**: Fast policy evaluation engine
- **Interface**: Internal HTTP API called by dnsdist
- **Features**:
  - In-memory policy cache (refreshed from Redis)
  - O(1) average lookup using hash maps + radix trees
  - Structured logging of all decisions
  - Prometheus metrics

#### 2.3 Unbound Pool
- **Purpose**: Recursive DNS resolution for ALLOWED queries
- **Configuration**:
  - DNSSEC validation enabled
  - Response caching
  - No direct external access

#### 2.4 Redis
- **Policy Cache**: Per-tenant policy snapshots
- **Allow/Block Lists**: Hash sets for O(1) lookups
- **Rate Limit State**: Sliding window counters
- **Pub/Sub**: Policy update notifications

#### 2.5 ClickHouse
- **Query Logs**: High-volume DNS query storage
- **Schema**: Partitioned by date, indexed by tenant_id + location_id
- **Retention**: Configurable per-tenant

---

## Request Flow: DoH Query

```
┌──────────┐      ┌──────────┐      ┌──────────────┐      ┌──────────┐
│  Client  │      │ dnsdist  │      │ Policy Svc   │      │ Unbound  │
└────┬─────┘      └────┬─────┘      └──────┬───────┘      └────┬─────┘
     │                 │                   │                   │
     │ POST /dns-query │                   │                   │
     │ Authorization:  │                   │                   │
     │   Bearer <token>│                   │                   │
     │────────────────▶│                   │                   │
     │                 │                   │                   │
     │                 │ 1. Parse DNS wire │                   │
     │                 │    format         │                   │
     │                 │                   │                   │
     │                 │ 2. Extract token  │                   │
     │                 │    from header    │                   │
     │                 │                   │                   │
     │                 │ 3. Validate token │                   │
     │                 │    get tenant_id  │                   │
     │                 │    + location_id  │                   │
     │                 │                   │                   │
     │                 │ 4. Rate limit     │                   │
     │                 │    check          │                   │
     │                 │                   │                   │
     │                 │ POST /decide      │                   │
     │                 │ {qname, qtype,    │                   │
     │                 │  tenant_id,       │                   │
     │                 │  location_id}     │                   │
     │                 │──────────────────▶│                   │
     │                 │                   │                   │
     │                 │                   │ 5. Load policy    │
     │                 │                   │    from cache     │
     │                 │                   │                   │
     │                 │                   │ 6. Evaluate:      │
     │                 │                   │    - Allowlist    │
     │                 │                   │    - Blocklist    │
     │                 │                   │    - Categories   │
     │                 │                   │    - Threats      │
     │                 │                   │    - SafeSearch   │
     │                 │                   │                   │
     │                 │                   │ 7. Log to         │
     │                 │                   │    ClickHouse     │
     │                 │                   │                   │
     │                 │ {action: ALLOW,   │                   │
     │                 │  reason: ...}     │                   │
     │                 │◀──────────────────│                   │
     │                 │                   │                   │
     │                 │ (if ALLOW)        │                   │
     │                 │ Forward query     │                   │
     │                 │───────────────────┼──────────────────▶│
     │                 │                   │                   │
     │                 │                   │                   │ 8. Recursive
     │                 │                   │                   │    resolution
     │                 │                   │                   │    + DNSSEC
     │                 │ DNS response      │                   │
     │                 │◀──────────────────┼───────────────────│
     │                 │                   │                   │
     │ HTTP 200        │                   │                   │
     │ DNS wire format │                   │                   │
     │◀────────────────│                   │                   │
     │                 │                   │                   │
```

### DoH Flow Steps:

1. **Client Request**: Client sends HTTPS POST to `/dns-query` with:
   - `Authorization: Bearer <location_token>` header
   - DNS query in wire format (RFC 8484)

2. **Token Extraction**: dnsdist extracts Bearer token from Authorization header

3. **Token Validation**: dnsdist looks up token in Redis to get:
   - `tenant_id`
   - `location_id`
   - Rate limit settings

4. **Rate Limit Check**: dnsdist checks per-location rate limit in Redis
   - If exceeded: return SERVFAIL with REFUSED rcode

5. **Policy Decision**: dnsdist calls Policy Decision Service with context

6. **Policy Evaluation**: Policy Service evaluates in order:
   - Check allowlist (bypass all other checks if matched)
   - Check blocklist (immediate block if matched)
   - Check threat feeds (malware, phishing, C2)
   - Check category filters (based on schedule)
   - Check SafeSearch rewrite rules

7. **Action Execution**:
   - `ALLOW`: Forward to Unbound, return response
   - `BLOCK`: Return NXDOMAIN or null-route (0.0.0.0/::)
   - `REWRITE`: Return pre-configured SafeSearch IPs

8. **Logging**: All queries logged to ClickHouse with decision details

---

## Request Flow: DoT Query

```
┌──────────┐      ┌──────────┐      ┌──────────────┐      ┌──────────┐
│  Client  │      │ dnsdist  │      │ Policy Svc   │      │ Unbound  │
└────┬─────┘      └────┬─────┘      └──────┬───────┘      └────┬─────┘
     │                 │                   │                   │
     │ TLS Handshake   │                   │                   │
     │ Client Cert or  │                   │                   │
     │ SNI: loc123.t42 │                   │                   │
     │ .safedns.net    │                   │                   │
     │────────────────▶│                   │                   │
     │                 │                   │                   │
     │                 │ 1. Extract client │                   │
     │                 │    cert CN or     │                   │
     │                 │    parse SNI      │                   │
     │                 │                   │                   │
     │                 │ 2. Validate cert  │                   │
     │                 │    or lookup SNI  │                   │
     │                 │    → tenant_id,   │                   │
     │                 │      location_id  │                   │
     │                 │                   │                   │
     │ DNS Query       │                   │                   │
     │ (TCP stream)    │                   │                   │
     │────────────────▶│                   │                   │
     │                 │                   │                   │
     │                 │ 3. Rate limit     │                   │
     │                 │    check          │                   │
     │                 │                   │                   │
     │                 │ POST /decide      │                   │
     │                 │──────────────────▶│                   │
     │                 │                   │                   │
     │                 │                   │ 4. Policy         │
     │                 │                   │    evaluation     │
     │                 │                   │    (same as DoH)  │
     │                 │                   │                   │
     │                 │ {action: BLOCK,   │                   │
     │                 │  reason: malware} │                   │
     │                 │◀──────────────────│                   │
     │                 │                   │                   │
     │                 │ 5. (if BLOCK)     │                   │
     │                 │    Synthesize     │                   │
     │                 │    NXDOMAIN       │                   │
     │                 │                   │                   │
     │ DNS Response    │                   │                   │
     │ (NXDOMAIN)      │                   │                   │
     │◀────────────────│                   │                   │
     │                 │                   │                   │
```

### DoT Flow Steps:

1. **TLS Handshake**: Client connects to port 853 with either:
   - **mTLS** (preferred): Client presents certificate with CN=`<location_id>`
   - **SNI Fallback**: Client uses SNI `<location_id>.<tenant_slug>.safedns.net`

2. **Identity Extraction**:
   - mTLS: Extract location_id from client cert CN, validate against CA
   - SNI: Parse SNI to extract location_id and tenant_slug, lookup in Redis

3. **Rate Limit Check**: Same as DoH

4. **Policy Decision**: Same as DoH

5. **Action Execution**: Same as DoH

6. **Logging**: Same as DoH

---

## Tenant Identification Methods

| Method | Protocol | Mechanism | Security Level |
|--------|----------|-----------|----------------|
| Bearer Token | DoH | HTTP header | High (rotatable) |
| mTLS Cert | DoT | Client certificate | Highest (PKI) |
| SNI | DoT | TLS SNI extension | Medium (fallback only) |

### Token Format (DoH)
```
safedns_loc_<base64url(location_id + tenant_id + timestamp + hmac)>
```
- Rotatable without service interruption
- Verifiable without database lookup (HMAC)
- Includes expiration timestamp

### Certificate Format (DoT mTLS)
```
Subject CN: <location_uuid>
Subject O: <tenant_uuid>
Issuer: SafeDNS Location CA
Extensions:
  - Key Usage: Digital Signature, Key Encipherment
  - Extended Key Usage: TLS Web Client Authentication
```

---

## Scalability Considerations

### Data Plane Scaling
- **dnsdist**: Horizontal scaling with anycast or load balancer
- **Policy Service**: Stateless, scale horizontally
- **Unbound**: Pool of instances with consistent hashing
- **Redis**: Cluster mode for high availability
- **ClickHouse**: Sharded by tenant_id for write scaling

### Performance Targets (MVP)
- Query latency (p99): < 50ms for cached, < 200ms for uncached
- Throughput: 10,000 queries/second per region
- Policy evaluation: O(1) average, < 1ms

### Caching Strategy
1. **Policy Cache** (Policy Service memory): TTL 60s, refresh on Pub/Sub
2. **Token Cache** (dnsdist): TTL 300s, refresh on miss
3. **DNS Response Cache** (Unbound): Standard DNS TTLs
4. **Rate Limit State** (Redis): Sliding window, 1-minute granularity
