# C. SafeDNS Database Schema

## PostgreSQL Schema (Control Plane)

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│   tenants   │───┬──▶│    users    │       │  audit_logs     │
└─────────────┘   │   └─────────────┘       └─────────────────┘
       │          │          │                      ▲
       │          │          ▼                      │
       │          │   ┌─────────────┐              │
       │          │   │ user_roles  │──────────────┘
       │          │   └─────────────┘
       │          │
       ▼          │
┌─────────────┐   │   ┌─────────────────┐   ┌─────────────────┐
│  locations  │───┼──▶│ location_tokens │   │ location_certs  │
└─────────────┘   │   └─────────────────┘   └─────────────────┘
       │          │
       ▼          │
┌─────────────┐   │   ┌─────────────────┐
│  policies   │◀──┴───│ policy_versions │
└─────────────┘       └─────────────────┘
       │                      │
       ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│              policy_version_rules (JSONB)                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐       ┌─────────────────┐
│ categories  │◀──────│ domain_category │
└─────────────┘       └─────────────────┘

┌─────────────────┐   ┌─────────────────┐
│  threat_feeds   │──▶│  threat_domains │
└─────────────────┘   └─────────────────┘

┌─────────────────────────────────────────┐
│          custom_lists                   │
│  (tenant allowlists/blocklists)         │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│          custom_list_entries            │
└─────────────────────────────────────────┘
```

---

### Table Definitions

#### Core Tenant Tables

```sql
-- Tenants: Top-level organization/account
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(63) NOT NULL UNIQUE,  -- For SNI: <location>.<slug>.safedns.net
    status          VARCHAR(20) NOT NULL DEFAULT 'active' 
                    CHECK (status IN ('active', 'suspended', 'cancelled')),
    plan            VARCHAR(50) NOT NULL DEFAULT 'starter',
    settings        JSONB NOT NULL DEFAULT '{}',  -- Tenant-wide settings
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- Users: People who can log into the control plane
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,  -- bcrypt
    name            VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'locked', 'pending')),
    failed_logins   INT NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- User roles (many-to-many for flexibility)
CREATE TABLE user_roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL 
                    CHECK (role IN ('owner', 'admin', 'analyst', 'readonly')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Audit log of admin actions
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,  -- e.g., 'policy.create', 'location.token.rotate'
    resource_type   VARCHAR(50),            -- e.g., 'policy', 'location', 'user'
    resource_id     UUID,
    details         JSONB,                  -- Action-specific details
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Enable row-level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

#### Location Tables

```sql
-- Locations: Network sites/deployments that send DNS queries
CREATE TABLE locations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'disabled')),
    policy_id       UUID,  -- References policies(id), added after policies table
    settings        JSONB NOT NULL DEFAULT '{}',  -- Location-specific overrides
    timezone        VARCHAR(50) NOT NULL DEFAULT 'UTC',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_tenant_id ON locations(tenant_id);
CREATE INDEX idx_locations_status ON locations(status);

-- Location tokens (for DoH authentication)
CREATE TABLE location_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id     UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64) NOT NULL,   -- SHA-256 of the token
    token_prefix    VARCHAR(16) NOT NULL,   -- First 16 chars for identification
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'revoked')),
    expires_at      TIMESTAMPTZ,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_location_tokens_token_hash ON location_tokens(token_hash);
CREATE INDEX idx_location_tokens_location_id ON location_tokens(location_id);
CREATE INDEX idx_location_tokens_status ON location_tokens(status);

-- Location certificates (for DoT mTLS)
CREATE TABLE location_certs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id     UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    serial_number   VARCHAR(64) NOT NULL UNIQUE,
    fingerprint     VARCHAR(64) NOT NULL,   -- SHA-256 of cert
    subject_cn      VARCHAR(255) NOT NULL,
    not_before      TIMESTAMPTZ NOT NULL,
    not_after       TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'revoked')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_location_certs_fingerprint ON location_certs(fingerprint);
CREATE INDEX idx_location_certs_serial ON location_certs(serial_number);
CREATE INDEX idx_location_certs_location_id ON location_certs(location_id);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_certs ENABLE ROW LEVEL SECURITY;
```

#### Policy Tables

```sql
-- Policies: Named policy configurations
CREATE TABLE policies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    current_version INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_policies_tenant_id ON policies(tenant_id);

-- Add foreign key from locations to policies
ALTER TABLE locations 
    ADD CONSTRAINT fk_locations_policy 
    FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE SET NULL;

-- Policy versions: Immutable snapshots of policy configuration
CREATE TABLE policy_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id       UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    version         INT NOT NULL,
    
    -- Full policy configuration as JSONB
    config          JSONB NOT NULL,
    /*
    config structure:
    {
        "block_response": "nxdomain" | "null_route",
        "categories": {
            "blocked": ["adult", "gambling", "malware"],
            "warned": []
        },
        "threat_protection": {
            "malware": true,
            "phishing": true,
            "c2": true
        },
        "safesearch": {
            "google": true,
            "bing": true,
            "youtube": "moderate" | "strict" | false
        },
        "schedules": [
            {
                "name": "School Hours",
                "days": ["mon", "tue", "wed", "thu", "fri"],
                "start": "08:00",
                "end": "15:00",
                "timezone": "America/New_York",
                "categories_override": {
                    "blocked": ["social_media", "gaming"]
                }
            }
        ],
        "allowlist_id": "uuid",
        "blocklist_id": "uuid"
    }
    */
    
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(policy_id, version)
);

CREATE INDEX idx_policy_versions_policy_id ON policy_versions(policy_id);
CREATE INDEX idx_policy_versions_tenant_id ON policy_versions(tenant_id);

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_versions ENABLE ROW LEVEL SECURITY;
```

#### Category & Threat Tables

```sql
-- Categories: Domain category taxonomy (global, not per-tenant)
CREATE TABLE categories (
    id              VARCHAR(50) PRIMARY KEY,  -- e.g., 'adult', 'malware', 'social_media'
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    parent_id       VARCHAR(50) REFERENCES categories(id),
    is_threat       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Domain to category mapping (global, maintained by SafeDNS)
CREATE TABLE domain_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain          VARCHAR(255) NOT NULL,   -- Can be exact or wildcard (*.example.com)
    category_id     VARCHAR(50) NOT NULL REFERENCES categories(id),
    source          VARCHAR(50) NOT NULL DEFAULT 'manual',
    confidence      DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(domain, category_id)
);

CREATE INDEX idx_domain_categories_domain ON domain_categories(domain);
CREATE INDEX idx_domain_categories_category ON domain_categories(category_id);

-- Threat feeds: Sources of threat intelligence
CREATE TABLE threat_feeds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    url             TEXT,
    feed_type       VARCHAR(20) NOT NULL 
                    CHECK (feed_type IN ('malware', 'phishing', 'c2', 'mixed')),
    update_interval INT NOT NULL DEFAULT 3600,  -- seconds
    last_updated_at TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'disabled', 'error')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Threat domains from feeds
CREATE TABLE threat_domains (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain          VARCHAR(255) NOT NULL,
    threat_type     VARCHAR(20) NOT NULL 
                    CHECK (threat_type IN ('malware', 'phishing', 'c2')),
    feed_id         UUID REFERENCES threat_feeds(id) ON DELETE CASCADE,
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(domain, threat_type)
);

CREATE INDEX idx_threat_domains_domain ON threat_domains(domain);
CREATE INDEX idx_threat_domains_type ON threat_domains(threat_type);
```

#### Custom Lists (Tenant Allow/Block Lists)

```sql
-- Custom lists: Tenant-specific allow/block lists
CREATE TABLE custom_lists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    list_type       VARCHAR(20) NOT NULL 
                    CHECK (list_type IN ('allowlist', 'blocklist')),
    description     TEXT,
    entry_count     INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name, list_type)
);

CREATE INDEX idx_custom_lists_tenant_id ON custom_lists(tenant_id);

-- Custom list entries
CREATE TABLE custom_list_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id         UUID NOT NULL REFERENCES custom_lists(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pattern         VARCHAR(255) NOT NULL,   -- exact domain or wildcard (*.example.com)
    pattern_type    VARCHAR(20) NOT NULL DEFAULT 'exact'
                    CHECK (pattern_type IN ('exact', 'wildcard', 'regex')),
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(list_id, pattern)
);

CREATE INDEX idx_custom_list_entries_list_id ON custom_list_entries(list_id);
CREATE INDEX idx_custom_list_entries_pattern ON custom_list_entries(pattern);
CREATE INDEX idx_custom_list_entries_tenant_id ON custom_list_entries(tenant_id);

ALTER TABLE custom_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_list_entries ENABLE ROW LEVEL SECURITY;
```

#### SafeSearch Rewrite Rules

```sql
-- SafeSearch DNS rewrite rules (global)
CREATE TABLE safesearch_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service         VARCHAR(50) NOT NULL,    -- 'google', 'bing', 'youtube', etc.
    mode            VARCHAR(20) NOT NULL DEFAULT 'moderate'
                    CHECK (mode IN ('moderate', 'strict')),
    match_domain    VARCHAR(255) NOT NULL,   -- Domain to match
    rewrite_type    VARCHAR(10) NOT NULL 
                    CHECK (rewrite_type IN ('cname', 'a', 'aaaa')),
    rewrite_value   VARCHAR(255) NOT NULL,   -- CNAME target or IP address
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_safesearch_rules_domain ON safesearch_rules(match_domain);
CREATE INDEX idx_safesearch_rules_service ON safesearch_rules(service);
```

---

## ClickHouse Schema (Query Logs)

```sql
-- DNS query log table
-- Partitioned by date, ordered by tenant for efficient tenant-scoped queries
CREATE TABLE dns_query_log (
    -- Identifiers
    tenant_id       UUID,
    location_id     UUID,
    client_id       String DEFAULT '',       -- Optional client identifier
    
    -- Query details
    qname           String,                  -- Query name (domain)
    qtype           UInt16,                  -- Query type (A=1, AAAA=28, etc.)
    qtype_name      String,                  -- Human-readable type
    
    -- Decision
    action          Enum8('allow' = 1, 'block' = 2, 'rewrite' = 3),
    reason          String,                  -- e.g., 'category:adult', 'threat:malware', 'allowlist'
    reason_detail   String DEFAULT '',       -- Additional context
    
    -- Categorization
    category        String DEFAULT '',       -- Matched category if any
    threat_type     String DEFAULT '',       -- Matched threat type if any
    
    -- Policy context
    policy_id       UUID,
    policy_version  UInt32,
    
    -- Response details
    rcode           UInt8,                   -- DNS response code
    rcode_name      String,                  -- Human-readable rcode
    response_ip     String DEFAULT '',       -- IP in response (for A/AAAA)
    
    -- Timing
    timestamp       DateTime64(3),           -- Millisecond precision
    latency_ms      Float32,                 -- Total processing time
    upstream_ms     Float32 DEFAULT 0,       -- Upstream resolution time (if allowed)
    
    -- Metadata
    client_ip       String DEFAULT '',       -- Client IP (if available)
    protocol        Enum8('doh' = 1, 'dot' = 2, 'udp' = 3, 'tcp' = 4),
    dnssec_status   Enum8('unknown' = 0, 'secure' = 1, 'insecure' = 2, 'bogus' = 3) DEFAULT 'unknown'
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, location_id, timestamp)
TTL timestamp + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

-- Create indices for common query patterns
ALTER TABLE dns_query_log ADD INDEX idx_qname qname TYPE bloom_filter(0.01) GRANULARITY 4;
ALTER TABLE dns_query_log ADD INDEX idx_action action TYPE set(3) GRANULARITY 4;
ALTER TABLE dns_query_log ADD INDEX idx_category category TYPE bloom_filter(0.01) GRANULARITY 4;

-- Materialized view for hourly aggregations (reporting)
CREATE MATERIALIZED VIEW dns_query_hourly_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (tenant_id, location_id, hour, action, category)
AS SELECT
    tenant_id,
    location_id,
    toStartOfHour(timestamp) AS hour,
    action,
    category,
    count() AS query_count,
    countIf(action = 'block') AS block_count,
    avg(latency_ms) AS avg_latency_ms
FROM dns_query_log
GROUP BY tenant_id, location_id, hour, action, category;

-- Top blocked domains per tenant (for dashboard)
CREATE MATERIALIZED VIEW dns_top_blocked_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, day, qname)
AS SELECT
    tenant_id,
    toStartOfDay(timestamp) AS day,
    qname,
    reason,
    count() AS block_count
FROM dns_query_log
WHERE action = 'block'
GROUP BY tenant_id, day, qname, reason;

-- Threat trend view
CREATE MATERIALIZED VIEW dns_threat_trend_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (tenant_id, hour, threat_type)
AS SELECT
    tenant_id,
    toStartOfHour(timestamp) AS hour,
    threat_type,
    count() AS threat_count
FROM dns_query_log
WHERE threat_type != ''
GROUP BY tenant_id, hour, threat_type;
```

---

## Redis Data Structures

```
# Location token lookup (for fast auth in dnsdist)
# Key: token_hash (SHA-256)
# Value: JSON
SET token:<token_hash> {
    "tenant_id": "uuid",
    "location_id": "uuid",
    "status": "active",
    "expires_at": "2024-12-31T23:59:59Z",
    "rate_limit": {
        "qps": 1000,
        "burst": 5000
    }
}
EXPIRE token:<token_hash> 86400  # Refresh daily from PostgreSQL

# Location certificate lookup (by fingerprint)
SET cert:<fingerprint> {
    "tenant_id": "uuid",
    "location_id": "uuid",
    "status": "active"
}

# SNI to location mapping
SET sni:<location_slug>.<tenant_slug> {
    "tenant_id": "uuid",
    "location_id": "uuid"
}

# Policy cache (per location, immutable by version)
SET policy:v1:<location_id> {
    "version": 42,
    "policy_id": "uuid",
    "config": { ... full policy config ... },
    "allowlist": ["example.com", "*.allowed.org"],
    "blocklist": ["blocked.com"],
    "cached_at": "2024-01-15T10:00:00Z"
}
EXPIRE policy:v1:<location_id> 300  # 5 minute TTL, refreshed proactively

# Global threat list (hash set for O(1) lookup)
SADD threats:malware "malware-domain1.com" "malware-domain2.com" ...
SADD threats:phishing "phish1.com" "phish2.com" ...
SADD threats:c2 "c2-domain.com" ...

# Domain category cache (for common domains)
SET domain:category:<domain> {
    "categories": ["social_media", "news"],
    "cached_at": "2024-01-15T10:00:00Z"
}
EXPIRE domain:category:<domain> 3600  # 1 hour TTL

# Rate limit counters (sliding window)
# Using Redis sorted sets with timestamp scores
ZADD ratelimit:loc:<location_id> <timestamp_ms> <query_id>
ZREMRANGEBYSCORE ratelimit:loc:<location_id> 0 <timestamp_ms - window>

# Global SafeSearch rules cache
HSET safesearch:google www.google.com CNAME forcesafesearch.google.com
HSET safesearch:youtube www.youtube.com CNAME restrict.youtube.com
```

---

## Index Strategy Summary

### PostgreSQL Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `tenants` | `slug` | SNI lookup |
| `users` | `tenant_id`, `email` | User lookup, auth |
| `locations` | `tenant_id` | Tenant-scoped queries |
| `location_tokens` | `token_hash` | Token validation |
| `location_certs` | `fingerprint`, `serial` | Cert validation |
| `policies` | `tenant_id` | Tenant-scoped queries |
| `policy_versions` | `policy_id`, `tenant_id` | Version lookup |
| `domain_categories` | `domain` | Category lookup |
| `threat_domains` | `domain`, `threat_type` | Threat lookup |
| `custom_list_entries` | `list_id`, `pattern` | List lookup |
| `audit_logs` | `tenant_id`, `created_at`, `action` | Audit queries |

### ClickHouse Indexes

| Table | Index/Order | Purpose |
|-------|-------------|---------|
| `dns_query_log` | ORDER BY `(tenant_id, location_id, timestamp)` | Efficient tenant-scoped time queries |
| `dns_query_log` | Bloom filter on `qname` | Domain search |
| `dns_query_log` | Set index on `action` | Action filtering |
| Materialized views | Pre-aggregated by hour/day | Fast dashboard queries |
