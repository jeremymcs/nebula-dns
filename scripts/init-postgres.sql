-- Nebula DNS PostgreSQL Initialization Script
-- Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
-- This script creates the database schema for the Control Plane

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TENANTS
-- ============================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    tier VARCHAR(20) DEFAULT 'home' CHECK (tier IN ('home', 'enterprise', 'msp')),
    location_limit INTEGER,
    client_limit INTEGER,
    subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'grace', 'suspended')),
    managed_by_msp_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_tier ON tenants(tier);
CREATE INDEX idx_tenants_managed_by_msp ON tenants(managed_by_msp_id);

-- ============================================
-- USERS
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'analyst', 'readonly', 'member')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    resource_name VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    previous_hash VARCHAR(64),
    record_hash VARCHAR(64) NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_record_hash ON audit_logs(record_hash);
CREATE INDEX idx_audit_logs_previous_hash ON audit_logs(previous_hash);

-- ============================================
-- AUDIT LOG IMMUTABILITY (US-005)
-- Database triggers to prevent UPDATE/DELETE on audit_logs
-- ============================================

-- Trigger function to prevent UPDATE on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'UPDATE operations are not permitted on audit_logs table. Audit logs are immutable for compliance and security purposes.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to prevent DELETE on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'DELETE operations are not permitted on audit_logs table. Audit logs are immutable for compliance and security purposes.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create UPDATE prevention trigger
DROP TRIGGER IF EXISTS audit_logs_prevent_update ON audit_logs;
CREATE TRIGGER audit_logs_prevent_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_update();

-- Create DELETE prevention trigger
DROP TRIGGER IF EXISTS audit_logs_prevent_delete ON audit_logs;
CREATE TRIGGER audit_logs_prevent_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_delete();

-- Add comment to table documenting immutability
COMMENT ON TABLE audit_logs IS 'Immutable audit log table with hash chain integrity. UPDATE and DELETE operations are prevented by database triggers for compliance and security purposes.';

-- ============================================
-- POLICIES
-- ============================================

CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    current_version INTEGER DEFAULT 1,
    is_default BOOLEAN DEFAULT FALSE,
    visual_flow JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_policies_tenant ON policies(tenant_id);
CREATE UNIQUE INDEX idx_policies_default ON policies(tenant_id) WHERE is_default = TRUE;

CREATE TABLE policy_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    config JSONB NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changelog TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(policy_id, version)
);

CREATE INDEX idx_policy_versions_policy ON policy_versions(policy_id);

-- ============================================
-- LOCATIONS
-- ============================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
    ip_range INET,
    dyndns VARCHAR(255),
    rate_limit INTEGER DEFAULT 1000,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_locations_tenant ON locations(tenant_id);
CREATE INDEX idx_locations_policy ON locations(policy_id);

-- ============================================
-- LOCATION TOKENS (DoH Authentication)
-- ============================================

CREATE TABLE location_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    token_prefix VARCHAR(12) NOT NULL,
    label VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_location_tokens_location ON location_tokens(location_id);
CREATE INDEX idx_location_tokens_hash ON location_tokens(token_hash);

-- ============================================
-- CUSTOM LISTS (Allow/Block)
-- ============================================

CREATE TABLE custom_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('allowlist', 'blocklist')),
    is_enabled BOOLEAN DEFAULT TRUE,
    entry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_custom_lists_tenant ON custom_lists(tenant_id);
CREATE INDEX idx_custom_lists_type ON custom_lists(type);

CREATE TABLE custom_list_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES custom_lists(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'exact' CHECK (type IN ('exact', 'wildcard')),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_custom_list_entries_list ON custom_list_entries(list_id);
CREATE INDEX idx_custom_list_entries_domain ON custom_list_entries(domain);

-- ============================================
-- CATEGORIES
-- ============================================

CREATE TABLE categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id VARCHAR(50) REFERENCES categories(id),
    is_system BOOLEAN DEFAULT TRUE
);

-- Seed default categories
INSERT INTO categories (id, name, description) VALUES
    ('malware', 'Malware', 'Sites hosting malware or malicious content'),
    ('phishing', 'Phishing', 'Phishing and credential theft sites'),
    ('c2', 'Command & Control', 'Botnet command and control servers'),
    ('adult', 'Adult Content', 'Pornography and adult content'),
    ('gambling', 'Gambling', 'Online gambling and betting'),
    ('social_media', 'Social Media', 'Social networking platforms'),
    ('streaming', 'Streaming', 'Video and audio streaming services'),
    ('gaming', 'Gaming', 'Online gaming platforms'),
    ('advertising', 'Advertising', 'Advertising networks and trackers'),
    ('drugs', 'Drugs', 'Drug-related content'),
    ('weapons', 'Weapons', 'Weapons sales and information'),
    ('hate', 'Hate Speech', 'Hate speech and extremist content'),
    ('violence', 'Violence', 'Violent content'),
    ('piracy', 'Piracy', 'Copyright infringement and piracy'),
    ('vpn_proxy', 'VPN/Proxy', 'VPN and proxy services'),
    ('cryptocurrency', 'Cryptocurrency', 'Cryptocurrency and mining'),
    ('dating', 'Dating', 'Online dating platforms'),
    ('forums', 'Forums', 'Discussion forums and message boards'),
    ('news', 'News', 'News and media sites'),
    ('shopping', 'Shopping', 'E-commerce and shopping sites');

-- ============================================
-- THREAT FEEDS
-- ============================================

CREATE TABLE threat_feeds (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    url TEXT,
    format VARCHAR(20) DEFAULT 'domain_list',
    is_enabled BOOLEAN DEFAULT TRUE,
    last_updated_at TIMESTAMP WITH TIME ZONE,
    entry_count INTEGER DEFAULT 0
);

-- Seed default threat feeds
INSERT INTO threat_feeds (id, name, description) VALUES
    ('malware', 'Malware Domains', 'Known malware distribution domains'),
    ('phishing', 'Phishing Domains', 'Known phishing domains'),
    ('c2', 'C2 Domains', 'Command and control server domains'),
    ('cryptojacking', 'Cryptojacking', 'Cryptocurrency mining scripts');

-- ============================================
-- SAFESEARCH RULES
-- ============================================

CREATE TABLE safesearch_rules (
    id VARCHAR(50) PRIMARY KEY,
    service VARCHAR(50) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    target_cname VARCHAR(255),
    target_a INET,
    target_aaaa INET
);

-- Seed SafeSearch rules
INSERT INTO safesearch_rules (id, service, domain, target_cname) VALUES
    ('google', 'google', 'www.google.com', 'forcesafesearch.google.com'),
    ('google_search', 'google', 'google.com', 'forcesafesearch.google.com'),
    ('youtube', 'youtube', 'www.youtube.com', 'restrict.youtube.com'),
    ('youtube_m', 'youtube', 'm.youtube.com', 'restrict.youtube.com'),
    ('bing', 'bing', 'www.bing.com', 'strict.bing.com'),
    ('duckduckgo', 'duckduckgo', 'duckduckgo.com', 'safe.duckduckgo.com');

-- ============================================
-- PARTNERS (MSP/Reseller Hierarchy)
-- ============================================

CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    plan VARCHAR(20) DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise')),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(255),
    billing_email VARCHAR(255),
    address TEXT,
    branding JSONB,
    settings JSONB,
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_plan ON partners(plan);

CREATE TABLE partner_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('partner_owner', 'partner_admin', 'partner_support')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    impersonating_org_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_partner_users_partner ON partner_users(partner_id);
CREATE INDEX idx_partner_users_status ON partner_users(status);

-- Add partner hierarchy columns to tenants
-- Note: contact_email and contact_phone are already in CREATE TABLE
ALTER TABLE tenants ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE tenants ADD COLUMN address TEXT;
ALTER TABLE tenants ADD COLUMN industry VARCHAR(100);
ALTER TABLE tenants ADD COLUMN company_size VARCHAR(50);

CREATE INDEX idx_tenants_partner ON tenants(partner_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Note: RLS policies would be added here for production
-- For development, we're not enabling RLS

-- ============================================
-- SEED DATA FOR DEVELOPMENT
-- ============================================

-- Create a test tenant (MSP tier for full feature access)
INSERT INTO tenants (id, name, slug, status, plan, tier) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Demo Company', 'demo', 'active', 'pro', 'msp');

-- Create a test admin user (password: Admin@12345!)
INSERT INTO users (id, tenant_id, email, name, password_hash, role, status) VALUES
    ('550e8400-e29b-41d4-a716-446655440001',
     '550e8400-e29b-41d4-a716-446655440000',
     'admin@demo.local',
     'Admin User',
     '$2b$10$4CfEKVSCZLuRs6pnYjOpOO6.V2rp3DAKpuJ1pwkXVS1zlOJrAUDpy',  -- Admin@12345!
     'owner',
     'active');

-- Create a default policy
INSERT INTO policies (id, tenant_id, name, description, current_version, is_default) VALUES
    ('550e8400-e29b-41d4-a716-446655440002',
     '550e8400-e29b-41d4-a716-446655440000',
     'Default Security Policy',
     'Standard security policy for new locations',
     1,
     TRUE);

-- Create initial policy version
INSERT INTO policy_versions (id, policy_id, version, config, changelog) VALUES
    ('550e8400-e29b-41d4-a716-446655440003',
     '550e8400-e29b-41d4-a716-446655440002',
     1,
     '{
       "blockCategories": ["malware", "phishing", "c2", "adult"],
       "threatBlocking": {
         "enabled": true,
         "feeds": ["malware", "phishing", "c2"]
       },
       "safesearch": {
         "enabled": false,
         "services": []
       },
       "schedules": []
     }',
     'Initial version');

-- Create a test location
INSERT INTO locations (id, tenant_id, name, description, policy_id, status) VALUES
    ('550e8400-e29b-41d4-a716-446655440004',
     '550e8400-e29b-41d4-a716-446655440000',
     'Main Office',
     'Primary office network',
     '550e8400-e29b-41d4-a716-446655440002',
     'active');

-- Create a test token for the location (token: dev-token-12345)
INSERT INTO location_tokens (id, location_id, token_hash, token_prefix, label, is_active) VALUES
    ('550e8400-e29b-41d4-a716-446655440005',
     '550e8400-e29b-41d4-a716-446655440004',
     'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
     'dev-token',
     'Development Token',
     TRUE);

-- Create sample custom lists
INSERT INTO custom_lists (id, tenant_id, name, description, type, entry_count) VALUES
    ('550e8400-e29b-41d4-a716-446655440006',
     '550e8400-e29b-41d4-a716-446655440000',
     'Corporate Blocklist',
     'Additional domains blocked by policy',
     'blocklist',
     3),
    ('550e8400-e29b-41d4-a716-446655440007',
     '550e8400-e29b-41d4-a716-446655440000',
     'Approved Exceptions',
     'Domains explicitly allowed',
     'allowlist',
     2);

-- Add sample entries
INSERT INTO custom_list_entries (list_id, domain, type, comment) VALUES
    ('550e8400-e29b-41d4-a716-446655440006', 'timewaster.example.com', 'exact', 'Time wasting site'),
    ('550e8400-e29b-41d4-a716-446655440006', '*.gambling-site.com', 'wildcard', 'Gambling site'),
    ('550e8400-e29b-41d4-a716-446655440006', 'distraction.net', 'exact', 'Distracting content'),
    ('550e8400-e29b-41d4-a716-446655440007', 'tools.example.com', 'exact', 'Required business tool'),
    ('550e8400-e29b-41d4-a716-446655440007', '*.internal.company.com', 'wildcard', 'Internal services');

-- ============================================
-- SUBSCRIPTION PLANS
-- ============================================

CREATE TABLE subscription_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_yearly DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    stripe_price_monthly_id VARCHAR(100),
    stripe_price_yearly_id VARCHAR(100),
    features JSONB NOT NULL DEFAULT '{}',
    limits JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed subscription plans
INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, limits, sort_order) VALUES
('free', 'Free', 'Perfect for trying out DNS security', 0, 0, 
    '{"dns_filtering": true, "basic_reporting": true, "email_support": false, "custom_blocklists": false, "api_access": false}',
    '{"locations": 1, "queries_per_month": 100000, "users": 1, "policies": 1, "custom_lists": 0}',
    1),
('starter', 'Starter', 'Great for small teams and home offices', 9.99, 99.99,
    '{"dns_filtering": true, "basic_reporting": true, "email_support": true, "custom_blocklists": true, "api_access": false, "safesearch": true}',
    '{"locations": 3, "queries_per_month": 500000, "users": 5, "policies": 3, "custom_lists": 5}',
    2),
('pro', 'Professional', 'For growing businesses with advanced needs', 29.99, 299.99,
    '{"dns_filtering": true, "advanced_reporting": true, "email_support": true, "priority_support": true, "custom_blocklists": true, "api_access": true, "safesearch": true, "schedules": true, "audit_logs": true}',
    '{"locations": 10, "queries_per_month": 5000000, "users": 25, "policies": 10, "custom_lists": 25}',
    3),
('enterprise', 'Enterprise', 'Full-featured solution for large organizations', 99.99, 999.99,
    '{"dns_filtering": true, "advanced_reporting": true, "email_support": true, "priority_support": true, "dedicated_support": true, "custom_blocklists": true, "api_access": true, "safesearch": true, "schedules": true, "audit_logs": true, "sso": true, "custom_branding": true, "sla": true}',
    '{"locations": -1, "queries_per_month": -1, "users": -1, "policies": -1, "custom_lists": -1}',
    4);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'paused')),
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- SIGNUP REQUESTS
-- ============================================

CREATE TABLE signup_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'payment_pending', 'completed', 'failed', 'expired')),
    stripe_checkout_session_id VARCHAR(100),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_signup_requests_email ON signup_requests(email);
CREATE INDEX idx_signup_requests_checkout ON signup_requests(stripe_checkout_session_id);
CREATE INDEX idx_signup_requests_status ON signup_requests(status);

-- ============================================
-- ONBOARDING PROGRESS
-- ============================================

CREATE TABLE onboarding_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    steps_completed JSONB NOT NULL DEFAULT '[]',
    current_step VARCHAR(50) DEFAULT 'welcome',
    completed_at TIMESTAMP WITH TIME ZONE,
    skipped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_onboarding_tenant ON onboarding_progress(tenant_id);

-- Create a default subscription for the demo tenant
INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'pro', 'active', 'monthly', NOW(), NOW() + INTERVAL '30 days');

-- ============================================
-- P1 FEATURES: MFA
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enforced BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS user_mfa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    secret_encrypted TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mfa_backup_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user ON mfa_backup_codes(user_id);

-- ============================================
-- P1 FEATURES: SCHEDULED REPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL,
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
    schedule_time TIME NOT NULL DEFAULT '08:00',
    schedule_day INTEGER,
    timezone VARCHAR(50) DEFAULT 'UTC',
    recipients JSONB NOT NULL DEFAULT '[]',
    format VARCHAR(10) DEFAULT 'pdf' CHECK (format IN ('pdf', 'csv', 'html')),
    filters JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT TRUE,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_tenant ON scheduled_reports(tenant_id);

CREATE TABLE IF NOT EXISTS report_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheduled_report_id UUID NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    file_url TEXT,
    file_size INTEGER,
    error_message TEXT,
    recipients_notified JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_history_scheduled ON report_history(scheduled_report_id);

-- ============================================
-- P1 FEATURES: SSO
-- ============================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sso_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sso_enforced BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS sso_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('saml', 'oidc')),
    is_enabled BOOLEAN DEFAULT FALSE,
    allow_password_login BOOLEAN DEFAULT TRUE,
    auto_provision_users BOOLEAN DEFAULT TRUE,
    default_role VARCHAR(20) DEFAULT 'readonly',
    -- SAML IdP Configuration
    saml_entity_id TEXT,
    saml_sso_url TEXT,
    saml_slo_url TEXT,
    saml_certificate TEXT,
    saml_name_id_format VARCHAR(100),
    -- SAML SP Signing Configuration (US-003)
    saml_signing_cert TEXT,
    saml_signing_key_encrypted TEXT,
    saml_sign_requests BOOLEAN NOT NULL DEFAULT TRUE,
    saml_previous_signing_cert TEXT,
    saml_previous_cert_expires_at TIMESTAMP WITH TIME ZONE,
    -- OIDC Configuration
    oidc_issuer TEXT,
    oidc_client_id VARCHAR(255),
    oidc_client_secret_encrypted TEXT,
    oidc_authorization_url TEXT,
    oidc_token_url TEXT,
    oidc_userinfo_url TEXT,
    oidc_scopes TEXT DEFAULT 'openid profile email',
    pkce_required BOOLEAN NOT NULL DEFAULT TRUE,
    -- Common Settings
    domain_restriction VARCHAR(255),
    attribute_mapping JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for cleanup of expired previous SAML signing certificates
CREATE INDEX IF NOT EXISTS idx_sso_configurations_previous_cert_expires
    ON sso_configurations(saml_previous_cert_expires_at)
    WHERE saml_previous_cert_expires_at IS NOT NULL;

-- ============================================
-- P1 FEATURES: CLIENT AGENTS
-- ============================================

CREATE TABLE IF NOT EXISTS agent_installations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('windows', 'macos', 'linux', 'ios', 'android')),
    agent_version VARCHAR(20) NOT NULL,
    os_version VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'uninstalled')),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_installations_tenant ON agent_installations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_installations_device ON agent_installations(device_id);

-- ============================================
-- P2 FEATURES: BLOCK PAGES
-- ============================================

CREATE TABLE IF NOT EXISTS block_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    logo_url TEXT,
    background_color VARCHAR(7) DEFAULT '#f3f4f6',
    primary_color VARCHAR(7) DEFAULT '#4f46e5',
    text_color VARCHAR(7) DEFAULT '#1f2937',
    title VARCHAR(255) DEFAULT 'Access Blocked',
    message TEXT DEFAULT 'This website has been blocked by your organization''s security policy.',
    show_category BOOLEAN DEFAULT TRUE,
    show_domain BOOLEAN DEFAULT TRUE,
    show_timestamp BOOLEAN DEFAULT TRUE,
    show_request_access BOOLEAN DEFAULT TRUE,
    custom_css TEXT,
    custom_html TEXT,
    footer_text VARCHAR(255),
    support_email VARCHAR(255),
    support_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_block_pages_tenant ON block_pages(tenant_id);

CREATE TABLE IF NOT EXISTS access_requests (
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

CREATE INDEX IF NOT EXISTS idx_access_requests_tenant ON access_requests(tenant_id);

-- ============================================
-- P2 FEATURES: API KEYS
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(12) NOT NULL,
    scopes JSONB NOT NULL DEFAULT '["read"]',
    rate_limit INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_used_ip INET,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

CREATE TABLE IF NOT EXISTS api_key_usage (
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

CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON api_key_usage(api_key_id);

-- ============================================
-- P2 FEATURES: TEAM INVITATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'analyst', 'readonly')),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    message TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_tenant ON team_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);

-- ============================================
-- P2 FEATURES: SIEM INTEGRATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS siem_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    integration_type VARCHAR(20) NOT NULL CHECK (integration_type IN ('splunk', 'elastic', 'sentinel', 'syslog', 'webhook')),
    is_enabled BOOLEAN DEFAULT TRUE,
    config_encrypted JSONB NOT NULL DEFAULT '{}',
    log_types JSONB DEFAULT '["blocked", "threats"]',
    include_allowed BOOLEAN DEFAULT FALSE,
    min_severity VARCHAR(20) DEFAULT 'low',
    last_sent_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_siem_integrations_tenant ON siem_integrations(tenant_id);

-- ============================================
-- P2 FEATURES: WEBHOOKS
-- ============================================

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    secret_hash VARCHAR(255),
    events JSONB NOT NULL DEFAULT '[]',
    is_enabled BOOLEAN DEFAULT TRUE,
    headers JSONB DEFAULT '{}',
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    last_status_code INTEGER,
    last_error TEXT,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
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

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

-- Add block_page_id to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS block_page_id UUID REFERENCES block_pages(id) ON DELETE SET NULL;

-- ============================================
-- FAMILY MEMBERS (Parental Controls)
-- ============================================

CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) DEFAULT '',
    date_of_birth DATE,
    role VARCHAR(20) NOT NULL DEFAULT 'child' CHECK (role IN ('parent', 'teen', 'child')),
    devices JSONB NOT NULL DEFAULT '[]',
    policy_overrides JSONB NOT NULL DEFAULT '{}',
    schedules JSONB NOT NULL DEFAULT '[]',
    screen_time JSONB NOT NULL DEFAULT '{}',
    parental_pin_hash VARCHAR(255),
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_members_tenant ON family_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_family_members_role ON family_members(role);
CREATE INDEX IF NOT EXISTS idx_family_members_is_online ON family_members(is_online);
CREATE INDEX IF NOT EXISTS idx_family_members_created ON family_members(created_at);
CREATE INDEX IF NOT EXISTS idx_family_members_devices ON family_members USING GIN (devices);

-- ============================================
-- FAMILY INVITATIONS (US-030, US-031)
-- ============================================

CREATE TABLE IF NOT EXISTS family_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_invitations_tenant ON family_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_email ON family_invitations(email);
CREATE INDEX IF NOT EXISTS idx_family_invitations_status ON family_invitations(status);
CREATE INDEX IF NOT EXISTS idx_family_invitations_token_hash ON family_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_family_invitations_expires ON family_invitations(expires_at) WHERE status = 'pending';

-- Add 'member' role to users table
-- Note: The role column constraint needs to be updated to include 'member'
-- Run this ALTER statement if not using the migration:
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'admin', 'analyst', 'readonly', 'member'));
COMMENT ON COLUMN users.role IS 'User role: owner, admin, analyst, readonly, member (Home tier family member)';

-- ============================================
-- ADMIN AUTHENTICATION SYSTEM
-- ============================================

-- Admin users table (separate from tenant users)
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'viewer')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending_mfa' CHECK (status IN ('active', 'pending_mfa', 'suspended')),
    mfa_setup_complete BOOLEAN NOT NULL DEFAULT false,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    invited_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_status ON admins(status);
CREATE INDEX idx_admins_role ON admins(role);

-- Admin MFA table
CREATE TABLE admin_mfa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    admin_id UUID NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    secret VARCHAR(255) NOT NULL,
    backup_codes JSONB NOT NULL DEFAULT '[]',
    is_verified BOOLEAN NOT NULL DEFAULT false,
    last_used_at TIMESTAMP
);

-- Admin invitations table
CREATE TABLE admin_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    invited_by_admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP
);

CREATE INDEX idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX idx_admin_invitations_status ON admin_invitations(status);
CREATE INDEX idx_admin_invitations_expires ON admin_invitations(expires_at);

-- Admin activity logs table
CREATE TABLE admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    target_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_activity_admin ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_activity_action ON admin_activity_logs(action);
CREATE INDEX idx_admin_activity_created ON admin_activity_logs(created_at DESC);

-- ============================================
-- ALERTING CONFIGURATION
-- ============================================

CREATE TABLE alert_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('slack', 'pagerduty')),
    name VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    config_encrypted JSONB NOT NULL DEFAULT '{}',
    severity_filter VARCHAR[] NOT NULL DEFAULT '{"critical","error"}',
    event_types VARCHAR[] NOT NULL DEFAULT '{}',
    last_sent_at TIMESTAMPTZ,
    last_error TEXT,
    error_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_configs_provider_type ON alert_configs(provider_type);

-- ============================================
-- SEED ADMIN USER
-- ============================================

-- Create initial super admin user (password: Admin@123456789!)
-- $2b$12$... is bcrypt hash with cost factor 12
INSERT INTO admins (id, email, name, password_hash, role, status, mfa_setup_complete) VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@nebula.local', 'Super Admin', '$2b$12$v.aDuCFehgSSQD3FfoqS4uEMJOVAH0iUWwWicDGqtsz0.bza3vVT6', 'super_admin', 'active', true);

-- ============================================
-- TYPEORM MIGRATIONS TRACKING
-- ============================================
-- Mark all migrations as complete since init-postgres.sql creates the schema

CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL
);

INSERT INTO migrations (timestamp, name) VALUES
    (1701900000000, 'InitialSchema1701900000000'),
    (1702100000000, 'SyncEntitySchemas1702100000000'),
    (1703500000000, 'AddPartnerHierarchy1703500000000'),
    (1704000000000, 'AddMspBilling1704000000000'),
    (1705000000000, 'AddMspTemplates1705000000000'),
    (1705000000000, 'AddWebhookSecurityControls1705000000000'),
    (1706000000000, 'AddAuditLogImmutability1706000000000'),
    (1706000000000, 'AddSamlSigningColumns1706000000000'),
    (1707000000000, 'AddPkceSupport1707000000000'),
    (1707000000000, 'FixSchemaInconsistencies1707000000000'),
    (1708000000000, 'AddApiKeyIpAllowlist1708000000000'),
    (1708000000000, 'AddFamilyMembers1708000000000'),
    (1708000000000, 'AddWebhookIdempotency1708000000000'),
    (1708000000000, 'AddWebhookSecretRotation1708000000000'),
    (1709000000000, 'AddTenantTierSystem1709000000000'),
    (1709000000000, 'CreateSubscriptionPlanLimits1709000000000'),
    (1710000000000, 'CreateMspClients1710000000000'),
    (1711000000000, 'AddFamilyInvitations1711000000000'),
    (1711000000000, 'AddMspTemplateVersions1711000000000'),
    (1711000000000, 'AddTrialHistory1711000000000'),
    (1711000000000, 'DropPartnerTables1711000000000'),
    (1712000000000, 'CreateAdminsTable1712000000000'),
    (1712000000001, 'SeedInitialAdmin1712000000001'),
    (1713000000000, 'AddAdminRoleColumn1713000000000'),
    (1714000000000, 'CreateAdminUserManagementTables1714000000000'),
    (1737500000000, 'CreateAlertConfig1737500000000');

-- Done!
