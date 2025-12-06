-- P2 Features Schema
-- Custom Block Pages, SIEM Integration, API Keys, Team Invitations, Webhooks

-- ============================================
-- CUSTOM BLOCK PAGES
-- ============================================

CREATE TABLE block_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Branding
    logo_url TEXT,
    background_color VARCHAR(7) DEFAULT '#f3f4f6',
    primary_color VARCHAR(7) DEFAULT '#4f46e5',
    text_color VARCHAR(7) DEFAULT '#1f2937',
    
    -- Content
    title VARCHAR(255) DEFAULT 'Access Blocked',
    message TEXT DEFAULT 'This website has been blocked by your organization''s security policy.',
    show_category BOOLEAN DEFAULT TRUE,
    show_domain BOOLEAN DEFAULT TRUE,
    show_timestamp BOOLEAN DEFAULT TRUE,
    show_request_access BOOLEAN DEFAULT TRUE,
    custom_css TEXT,
    custom_html TEXT,
    
    -- Footer
    footer_text VARCHAR(255),
    support_email VARCHAR(255),
    support_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_block_pages_tenant ON block_pages(tenant_id);
CREATE UNIQUE INDEX idx_block_pages_default ON block_pages(tenant_id) WHERE is_default = TRUE;

-- Access requests from block pages
CREATE TABLE access_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    domain VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    reason TEXT,
    requester_ip INET,
    requester_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_note TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_access_requests_tenant ON access_requests(tenant_id);
CREATE INDEX idx_access_requests_status ON access_requests(status);
CREATE INDEX idx_access_requests_domain ON access_requests(domain);

-- ============================================
-- API KEYS
-- ============================================

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(12) NOT NULL,  -- First 12 chars for identification
    scopes JSONB NOT NULL DEFAULT '["read"]',  -- Array of scopes: read, write, admin
    rate_limit INTEGER DEFAULT 1000,  -- Requests per minute
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_used_ip INET,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

CREATE TABLE api_key_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_key_usage_key ON api_key_usage(api_key_id);
CREATE INDEX idx_api_key_usage_created ON api_key_usage(created_at);

-- ============================================
-- TEAM INVITATIONS
-- ============================================

CREATE TABLE team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'analyst', 'readonly')),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    message TEXT,  -- Optional personal message
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_team_invitations_tenant ON team_invitations(tenant_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(token_hash);

-- ============================================
-- SIEM INTEGRATIONS
-- ============================================

CREATE TABLE siem_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    integration_type VARCHAR(20) NOT NULL CHECK (integration_type IN ('splunk', 'elastic', 'sentinel', 'syslog', 'webhook')),
    is_enabled BOOLEAN DEFAULT TRUE,
    
    -- Connection settings (encrypted)
    config_encrypted JSONB NOT NULL DEFAULT '{}',
    /*
    config structure varies by type:
    - splunk: { hec_url, hec_token, index, source_type }
    - elastic: { url, api_key, index_pattern }
    - sentinel: { workspace_id, shared_key, log_type }
    - syslog: { host, port, protocol, format }
    - webhook: { url, headers, method }
    */
    
    -- Filtering
    log_types JSONB DEFAULT '["blocked", "threats"]',  -- What to send: all, blocked, allowed, threats
    include_allowed BOOLEAN DEFAULT FALSE,
    min_severity VARCHAR(20) DEFAULT 'low',
    
    -- Status
    last_sent_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_siem_integrations_tenant ON siem_integrations(tenant_id);

-- ============================================
-- WEBHOOKS
-- ============================================

CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    secret_hash VARCHAR(255),  -- For HMAC signature verification
    events JSONB NOT NULL DEFAULT '[]',  -- Array of event types
    /*
    Event types:
    - policy.created, policy.updated, policy.deleted
    - location.created, location.updated, location.deleted
    - user.created, user.invited, user.deleted
    - threat.detected
    - report.generated
    */
    is_enabled BOOLEAN DEFAULT TRUE,
    headers JSONB DEFAULT '{}',  -- Custom headers to include
    
    -- Status
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    last_status_code INTEGER,
    last_error TEXT,
    failure_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhooks_tenant ON webhooks(tenant_id);

CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status_code INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries(created_at);

-- Add block_page_id to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS block_page_id UUID REFERENCES block_pages(id) ON DELETE SET NULL;
