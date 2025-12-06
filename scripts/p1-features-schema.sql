-- P1 Features Schema
-- Multi-Factor Authentication, Scheduled Reports, SSO/SAML

-- ============================================
-- MFA (Multi-Factor Authentication)
-- ============================================

CREATE TABLE user_mfa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    secret_encrypted VARCHAR(255) NOT NULL,  -- TOTP secret (encrypted)
    is_enabled BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_mfa_user ON user_mfa(user_id);

CREATE TABLE mfa_backup_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,  -- Hashed backup code
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mfa_backup_codes_user ON mfa_backup_codes(user_id);

CREATE TABLE mfa_trusted_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token_hash VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mfa_trusted_devices_user ON mfa_trusted_devices(user_id);
CREATE INDEX idx_mfa_trusted_devices_token ON mfa_trusted_devices(device_token_hash);

-- ============================================
-- SCHEDULED REPORTS
-- ============================================

CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('summary', 'threats', 'top_blocked', 'activity', 'compliance')),
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
    schedule_day INTEGER,  -- 0-6 for weekly (Sunday=0), 1-31 for monthly
    schedule_time TIME NOT NULL DEFAULT '08:00',
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    recipients JSONB NOT NULL DEFAULT '[]',  -- Array of email addresses
    filters JSONB DEFAULT '{}',  -- Location IDs, date range, etc.
    format VARCHAR(10) NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'csv', 'html')),
    is_enabled BOOLEAN DEFAULT TRUE,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scheduled_reports_tenant ON scheduled_reports(tenant_id);
CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_enabled = TRUE;

CREATE TABLE report_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheduled_report_id UUID NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'sent', 'failed')),
    recipients_sent JSONB DEFAULT '[]',
    file_url TEXT,
    file_size_bytes INTEGER,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_report_history_report ON report_history(scheduled_report_id);
CREATE INDEX idx_report_history_tenant ON report_history(tenant_id);

-- ============================================
-- SSO / SAML CONFIGURATION
-- ============================================

CREATE TABLE sso_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('saml', 'oidc')),
    is_enabled BOOLEAN DEFAULT FALSE,
    
    -- SAML Settings
    saml_entity_id VARCHAR(500),
    saml_sso_url VARCHAR(500),
    saml_slo_url VARCHAR(500),
    saml_certificate TEXT,  -- IdP public certificate
    saml_signing_cert TEXT,  -- SP signing certificate (optional)
    saml_signing_key_encrypted TEXT,  -- SP signing key (encrypted)
    
    -- OIDC Settings
    oidc_issuer VARCHAR(500),
    oidc_client_id VARCHAR(255),
    oidc_client_secret_encrypted VARCHAR(500),
    oidc_authorization_url VARCHAR(500),
    oidc_token_url VARCHAR(500),
    oidc_userinfo_url VARCHAR(500),
    oidc_scopes VARCHAR(255) DEFAULT 'openid profile email',
    
    -- Common Settings
    auto_provision_users BOOLEAN DEFAULT TRUE,
    default_role VARCHAR(20) DEFAULT 'readonly' CHECK (default_role IN ('owner', 'admin', 'analyst', 'readonly')),
    domain_restriction VARCHAR(255),  -- e.g., "@company.com"
    attribute_mapping JSONB DEFAULT '{"email": "email", "name": "name", "role": "role"}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sso_tenant ON sso_configurations(tenant_id);

CREATE TABLE sso_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sso_config_id UUID NOT NULL REFERENCES sso_configurations(id) ON DELETE CASCADE,
    session_index VARCHAR(255),  -- SAML session index for SLO
    name_id VARCHAR(255),  -- SAML NameID
    idp_session_id VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sso_sessions_user ON sso_sessions(user_id);

-- ============================================
-- CLIENT AGENTS
-- ============================================

CREATE TABLE agent_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('windows', 'macos', 'linux', 'ios', 'android')),
    version VARCHAR(20) NOT NULL,
    download_token_hash VARCHAR(255) NOT NULL UNIQUE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    downloaded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_agent_downloads_tenant ON agent_downloads(tenant_id);
CREATE INDEX idx_agent_downloads_token ON agent_downloads(download_token_hash);

CREATE TABLE agent_installations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    device_id VARCHAR(255) NOT NULL,  -- Unique device identifier
    device_name VARCHAR(255),
    platform VARCHAR(20) NOT NULL,
    os_version VARCHAR(50),
    agent_version VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disconnected', 'error')),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    error_message TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, device_id)
);

CREATE INDEX idx_agent_installations_tenant ON agent_installations(tenant_id);
CREATE INDEX idx_agent_installations_location ON agent_installations(location_id);
CREATE INDEX idx_agent_installations_device ON agent_installations(device_id);

-- Add MFA columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enforced BOOLEAN DEFAULT FALSE;

-- Add SSO columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sso_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sso_enforced BOOLEAN DEFAULT FALSE;
