-- SafeDNS PostgreSQL Initialization Script
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
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ============================================
-- USERS
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'analyst', 'readonly')),
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
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

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
-- ROW LEVEL SECURITY
-- ============================================

-- Note: RLS policies would be added here for production
-- For development, we're not enabling RLS

-- ============================================
-- SEED DATA FOR DEVELOPMENT
-- ============================================

-- Create a test tenant
INSERT INTO tenants (id, name, slug, status, plan) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Demo Company', 'demo', 'active', 'pro');

-- Create a test admin user (password: Admin@12345!)
INSERT INTO users (id, tenant_id, email, name, password_hash, role, status) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 
     '550e8400-e29b-41d4-a716-446655440000',
     'admin@demo.local',
     'Admin User',
     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VVIHLtXWkeW.dq',  -- Admin@12345!
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

-- Done!
