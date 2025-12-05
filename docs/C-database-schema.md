# C. Database Schema

## PostgreSQL Schema (Control Plane)

### Core Tables

#### `tenants`
Multi-tenant root table. Every other table references `tenant_id`.

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE, -- e.g., "acme-corp"
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, suspended, deleted
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- soft delete
    CONSTRAINT status_check CHECK (status IN ('active', 'suspended', 'deleted'))
);

CREATE INDEX idx_tenants_domain ON tenants(domain) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_status ON tenants(status) WHERE deleted_at IS NULL;
```

#### `users`
User accounts within tenants. Supports email/password auth.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt/argon2
    role VARCHAR(50) NOT NULL, -- owner, admin, analyst, read_only
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, locked, suspended
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT role_check CHECK (role IN ('owner', 'admin', 'analyst', 'read_only')),
    CONSTRAINT status_check CHECK (status IN ('active', 'locked', 'suspended')),
    CONSTRAINT unique_tenant_email UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status) WHERE status = 'active';
```

#### `locations`
Represents a customer network/site. Each location gets credentials for data plane.

```sql
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    doh_token_hash VARCHAR(255) NOT NULL, -- bcrypt hash of token
    doh_token_issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dot_cert_serial_number VARCHAR(255), -- for mTLS cert tracking
    dot_cert_issued_at TIMESTAMPTZ,
    dot_cert_expires_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, suspended, deleted
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT status_check CHECK (status IN ('active', 'suspended', 'deleted'))
);

CREATE INDEX idx_locations_tenant_id ON locations(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_status ON locations(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_doh_token_hash ON locations(doh_token_hash) WHERE deleted_at IS NULL;
```

#### `policies`
Immutable policy definitions. Each edit creates a new version.

```sql
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version INT NOT NULL, -- incrementing version number
    description TEXT,
    config JSONB NOT NULL, -- policy configuration (see below)
    is_active BOOLEAN NOT NULL DEFAULT false, -- only one active per tenant
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tenant_version UNIQUE (tenant_id, version)
);

CREATE INDEX idx_policies_tenant_id ON policies(tenant_id);
CREATE INDEX idx_policies_tenant_active ON policies(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_policies_version ON policies(tenant_id, version DESC);
```

**Policy config JSONB structure**:
```json
{
  "block_categories": ["malware", "phishing", "adult", "gambling"],
  "block_threats": true,
  "safe_search_enabled": true,
  "schedule": {
    "timezone": "America/New_York",
    "windows": [
      {
        "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "start": "09:00",
        "end": "17:00",
        "policy_override": "strict" // optional: stricter policy during hours
      }
    ]
  },
  "allowlist_enabled": true,
  "blocklist_enabled": true
}
```

#### `policy_locations`
Links policies to locations. A location uses one active policy.

```sql
CREATE TABLE policy_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE RESTRICT,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_by UUID REFERENCES users(id),
    CONSTRAINT unique_location_active UNIQUE (location_id) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_policy_locations_location_id ON policy_locations(location_id);
CREATE INDEX idx_policy_locations_policy_id ON policy_locations(policy_id);
```

#### `categories`
Taxonomy of content categories for filtering.

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE, -- e.g., "malware", "phishing", "adult"
    description TEXT,
    parent_id UUID REFERENCES categories(id), -- for hierarchical categories
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
```

#### `domain_categories`
Mapping of domains to categories. Populated by threat feeds and manual curation.

```sql
CREATE TABLE domain_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) NOT NULL, -- e.g., "example.com" or "*.example.com"
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    source VARCHAR(100) NOT NULL, -- "feed", "manual", "ml"
    confidence DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_domain_category UNIQUE (domain, category_id),
    CONSTRAINT confidence_check CHECK (confidence >= 0.0 AND confidence <= 1.0)
);

CREATE INDEX idx_domain_categories_domain ON domain_categories(domain);
CREATE INDEX idx_domain_categories_category_id ON domain_categories(category_id);
CREATE INDEX idx_domain_categories_source ON domain_categories(source);
```

#### `threat_feeds`
External threat intelligence feeds (malware, phishing, C2).

```sql
CREATE TABLE threat_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    url VARCHAR(500) NOT NULL,
    format VARCHAR(50) NOT NULL, -- "csv", "json", "txt"
    update_frequency INTERVAL NOT NULL DEFAULT '1 hour',
    last_fetched_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, paused, error
    checksum VARCHAR(64), -- SHA-256 of last successful fetch
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_threat_feeds_status ON threat_feeds(status) WHERE status = 'active';
```

#### `threat_domains`
Domains from threat feeds. Populated by background workers.

```sql
CREATE TABLE threat_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) NOT NULL,
    feed_id UUID NOT NULL REFERENCES threat_feeds(id) ON DELETE CASCADE,
    threat_type VARCHAR(50) NOT NULL, -- malware, phishing, c2, botnet
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_domain_feed UNIQUE (domain, feed_id)
);

CREATE INDEX idx_threat_domains_domain ON threat_domains(domain);
CREATE INDEX idx_threat_domains_feed_id ON threat_domains(feed_id);
CREATE INDEX idx_threat_domains_threat_type ON threat_domains(threat_type);
CREATE INDEX idx_threat_domains_last_seen ON threat_domains(last_seen_at DESC);
```

#### `allowlists` and `blocklists`
Per-tenant domain overrides (exact + wildcard).

```sql
CREATE TABLE allowlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL, -- exact or wildcard (e.g., "*.example.com")
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tenant_domain UNIQUE (tenant_id, domain)
);

CREATE TABLE blocklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL, -- exact or wildcard
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tenant_domain UNIQUE (tenant_id, domain)
);

CREATE INDEX idx_allowlists_tenant_id ON allowlists(tenant_id);
CREATE INDEX idx_blocklists_tenant_id ON blocklists(tenant_id);
CREATE INDEX idx_allowlists_domain ON allowlists(domain);
CREATE INDEX idx_blocklists_domain ON blocklists(domain);
```

#### `audit_logs`
Immutable audit trail of all admin actions.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g., "policy.created", "location.token_rotated"
    resource_type VARCHAR(50) NOT NULL, -- "policy", "location", "user"
    resource_id UUID,
    details JSONB, -- additional context
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

### Views and Functions

#### Policy snapshot compilation function
```sql
CREATE OR REPLACE FUNCTION compile_policy_snapshot(p_policy_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_policy policies%ROWTYPE;
    v_snapshot JSONB;
BEGIN
    SELECT * INTO v_policy FROM policies WHERE id = p_policy_id;
    
    -- Compile snapshot with all relevant data
    v_snapshot := jsonb_build_object(
        'policy_id', v_policy.id,
        'version', v_policy.version,
        'config', v_policy.config,
        'block_categories', (
            SELECT jsonb_agg(DISTINCT c.name)
            FROM categories c
            WHERE c.name = ANY(
                SELECT jsonb_array_elements_text(v_policy.config->'block_categories')
            )
        ),
        'allowlist', (
            SELECT jsonb_agg(domain)
            FROM allowlists
            WHERE tenant_id = v_policy.tenant_id
        ),
        'blocklist', (
            SELECT jsonb_agg(domain)
            FROM blocklists
            WHERE tenant_id = v_policy.tenant_id
        )
    );
    
    RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql;
```

---

## ClickHouse Schema (Data Plane Logs)

High-volume DNS query logs optimized for time-series queries.

```sql
CREATE TABLE dns_queries
(
    timestamp DateTime64(3) NOT NULL,
    tenant_id UUID NOT NULL,
    location_id UUID NOT NULL,
    client_id String, -- optional: client identifier (IP hash or device ID)
    qname String NOT NULL, -- query name
    qtype UInt16 NOT NULL, -- DNS record type (1=A, 28=AAAA, etc.)
    action Enum8('ALLOW' = 1, 'BLOCK' = 2, 'REWRITE' = 3) NOT NULL,
    reason String NOT NULL, -- e.g., "blocklist", "category:malware", "threat:phishing"
    category String, -- category name if applicable
    policy_version Int32 NOT NULL,
    rcode UInt8 NOT NULL, -- DNS response code (0=NOERROR, 3=NXDOMAIN, etc.)
    latency_ms UInt32 NOT NULL, -- milliseconds
    upstream_resolver String -- upstream resolver used (if ALLOW)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, timestamp, qname)
TTL timestamp + INTERVAL 90 DAY -- configurable per tenant
SETTINGS index_granularity = 8192;

-- Indexes for common queries
CREATE INDEX idx_dns_queries_action ON dns_queries(action);
CREATE INDEX idx_dns_queries_reason ON dns_queries(reason);
CREATE INDEX idx_dns_queries_category ON dns_queries(category);
CREATE INDEX idx_dns_queries_qname ON dns_queries(qname);
```

### ClickHouse Materialized Views for Aggregations

Pre-aggregate common report queries:

```sql
-- Top blocked domains (hourly)
CREATE MATERIALIZED VIEW dns_queries_blocked_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, location_id, toStartOfHour(timestamp), qname)
AS SELECT
    tenant_id,
    location_id,
    toStartOfHour(timestamp) AS timestamp,
    qname,
    count() AS block_count
FROM dns_queries
WHERE action = 'BLOCK'
GROUP BY tenant_id, location_id, timestamp, qname;

-- Blocks by category (hourly)
CREATE MATERIALIZED VIEW dns_queries_category_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, location_id, toStartOfHour(timestamp), category)
AS SELECT
    tenant_id,
    location_id,
    toStartOfHour(timestamp) AS timestamp,
    category,
    count() AS block_count
FROM dns_queries
WHERE action = 'BLOCK' AND category != ''
GROUP BY tenant_id, location_id, timestamp, category;
```

---

## Redis Data Structures

### Policy Snapshots
- Key: `policy:snapshot:{location_id}`
- Value: JSON string (compiled policy snapshot)
- TTL: None (explicitly invalidated on policy update)

### Rate Limit Counters
- Key: `ratelimit:{location_id}:{window_start}`
- Value: Integer (query count)
- TTL: Window duration (e.g., 60s for per-minute limits)

### Domain Caches
- Key: `domain:category:{domain}`
- Value: JSON array of category names
- TTL: 1 hour

- Key: `domain:threat:{domain}`
- Value: JSON object with threat type and feed info
- TTL: 1 hour

### Tenant/Location Lookups
- Key: `location:token:{token_hash}`
- Value: JSON `{tenant_id, location_id}`
- TTL: None (explicitly invalidated on token rotation)

- Key: `location:cert:{cert_serial}`
- Value: JSON `{tenant_id, location_id}`
- TTL: None (explicitly invalidated on cert rotation)
