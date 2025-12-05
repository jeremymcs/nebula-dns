# A. High-Level System Design

## Architecture Overview

SafeDNS is a multi-tenant DNS security SaaS with two main planes:

1. **Control Plane**: Multi-tenant SaaS API + Admin UI for policy management
2. **Data Plane**: Regional DNS resolvers that enforce policies at query time

```
┌─────────────────────────────────────────────────────────────┐
│                      CONTROL PLANE                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Next.js UI  │  │  NestJS API  │  │  Workers     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                 │
│         ┌──────────────────┴──────────────────┐             │
│         │         PostgreSQL                   │             │
│         │  (tenants/users/policies/metadata)   │             │
│         └─────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Policy snapshots, tokens
                            │
┌─────────────────────────────────────────────────────────────┐
│                      DATA PLANE                             │
│                                                              │
│  ┌──────────┐                                               │
│  │ dnsdist  │  (DoH/DoT termination, rate limiting)         │
│  └────┬─────┘                                               │
│       │                                                      │
│       ├──────────────────────────────────────┐              │
│       │                                      │              │
│  ┌────▼──────────┐                    ┌─────▼──────┐        │
│  │ Policy        │                    │ Unbound    │        │
│  │ Decision      │                    │ Pool       │        │
│  │ Service       │                    │ (recursion)│        │
│  └────┬──────────┘                    └────────────┘        │
│       │                                                      │
│       ├──────────────────────────────────────┐              │
│       │                                      │              │
│  ┌────▼──────┐                        ┌─────▼──────┐        │
│  │ Redis     │                        │ ClickHouse │        │
│  │ (caches)  │                        │ (logs)     │        │
│  └───────────┘                        └────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Control Plane Components

**Next.js Admin UI**
- Tenant admin dashboard
- Policy configuration interface
- Reports and analytics visualization
- User and role management

**NestJS API Service**
- RESTful API for all tenant operations
- Authentication and authorization (RBAC)
- Policy CRUD operations (creates immutable versions)
- Location management (token/cert generation)
- Report query endpoints

**Background Workers**
- Threat feed ingestion (malware/phishing/C2 lists)
- Domain-to-category mapping updates
- Policy snapshot compilation (for data plane)
- Report rollups and aggregations

**PostgreSQL**
- Tenant metadata
- User accounts and roles
- Policy definitions (immutable versions)
- Location configurations
- Allow/block lists
- Audit logs

### Data Plane Components

**dnsdist**
- Edge entry point for DNS queries
- DoH (DNS-over-HTTPS) termination on port 443
- DoT (DNS-over-TLS) termination on port 853
- Rate limiting per location/tenant
- Tenant identification (token/cert/SNI)
- Routes to Policy Decision Service

**Policy Decision Service (Go)**
- Accepts DNS query context from dnsdist
- Identifies tenant/location from credentials
- Evaluates policy (ALLOW/BLOCK/REWRITE)
- Returns decision with reason code
- O(1) average evaluation time via cached structures

**Unbound Pool**
- Recursive DNS resolution
- DNSSEC validation
- Only processes ALLOWed queries
- Returns upstream answers

**Redis**
- Hot cache for policy snapshots (per location)
- Allow/block list caches
- Rate limit state (sliding window counters)
- TTL-based invalidation

**ClickHouse**
- High-volume DNS query logs
- Time-series optimized storage
- Supports fast aggregations for reporting

## Request Flow: DoH (DNS-over-HTTPS)

```
Client Device
    │
    │ HTTPS POST /dns-query
    │ Authorization: Bearer <location_token>
    │
    ▼
┌─────────────────┐
│   dnsdist        │
│   - Validates    │
│     token        │
│   - Rate limits  │
│   - Extracts     │
│     qname/qtype  │
└────────┬─────────┘
         │
         │ HTTP POST to Policy Service
         │ { tenant_id, location_id, qname, qtype }
         │
         ▼
┌─────────────────┐
│ Policy Decision │
│ Service         │
│ - Loads policy  │
│   snapshot from │
│   Redis         │
│ - Evaluates:    │
│   - Blocklist   │
│   - Category    │
│   - Threat      │
│   - Schedule    │
│   - SafeSearch  │
└────────┬─────────┘
         │
         ├─── BLOCK ────┐
         │              │
         ├─── REWRITE ──┤
         │              │
         └─── ALLOW ────┤
                        │
         ┌──────────────┴──────────────┐
         │                             │
    ┌────▼────┐                  ┌─────▼─────┐
    │ Return  │                  │ Unbound   │
    │ NXDOMAIN│                  │ - Resolve │
    │ or      │                  │ - Validate│
    │ 0.0.0.0 │                  │ - Return  │
    └─────────┘                  └─────┬─────┘
                                        │
                                        │
         ┌──────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   ClickHouse    │
│   Log:          │
│   - timestamp   │
│   - tenant_id   │
│   - location_id │
│   - qname       │
│   - action      │
│   - reason      │
│   - latency_ms  │
└─────────────────┘
```

## Request Flow: DoT (DNS-over-TLS)

```
Client Device
    │
    │ TLS 1.3 connection
    │ Client cert (mTLS) OR SNI-based tenant ID
    │
    ▼
┌─────────────────┐
│   dnsdist        │
│   - Validates    │
│     cert/SNI     │
│   - Extracts     │
│     tenant_id    │
│   - Rate limits  │
│   - Extracts     │
│     qname/qtype  │
└────────┬─────────┘
         │
         │ (same flow as DoH)
         │
         ▼
┌─────────────────┐
│ Policy Decision │
│ Service         │
└────────┬─────────┘
         │
         │ (same evaluation as DoH)
         │
         ▼
┌─────────────────┐
│ Response path   │
│ (BLOCK/REWRITE/ │
│  ALLOW)         │
└─────────────────┘
```

## Key Design Decisions

1. **Stateless Data Plane**: Policy Decision Service is stateless; all state in Redis/ClickHouse
2. **Immutable Policies**: Policy edits create new versions; locations reference specific versions
3. **Hot Cache**: Policy snapshots pre-compiled and cached in Redis for O(1) lookup
4. **Tenant Isolation**: Every query must identify tenant/location; no default fallback
5. **Rate Limiting**: Applied at dnsdist edge per location to prevent abuse
6. **Logging**: Every query logged to ClickHouse for audit and reporting

## Data Flow: Policy Updates

```
Admin edits policy in UI
    │
    ▼
NestJS API creates new policy version
    │
    ▼
PostgreSQL stores new version (immutable)
    │
    ▼
Background worker compiles policy snapshot:
    - Merges category mappings
    - Merges threat feeds
    - Merges allow/block lists
    - Applies schedules
    │
    ▼
Redis updated with new snapshot
    │
    ▼
Policy Decision Service picks up new snapshot
    │
    ▼
New queries use updated policy
```

## Regional Deployment Model

Each region runs independent data plane:
- Own dnsdist instance
- Own Policy Decision Service
- Own Unbound pool
- Own Redis (policy cache)
- Own ClickHouse (logs)

Control plane is global:
- Single API instance (or multi-region with shared Postgres)
- Policy updates propagate to all regions via Redis replication or pub/sub
