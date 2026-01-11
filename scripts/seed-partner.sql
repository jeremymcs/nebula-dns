-- Seed Partner Data for Testing
-- Run with: docker exec dnsfilter-postgres psql -U nebula -d nebula -f /scripts/seed-partner.sql
-- Or: docker exec -i dnsfilter-postgres psql -U nebula -d nebula < scripts/seed-partner.sql

-- Create partners table if not exists (TypeORM should create this, but just in case)
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    plan VARCHAR(20) DEFAULT 'starter',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(255),
    billing_email VARCHAR(255),
    address TEXT,
    branding JSONB,
    settings JSONB,
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create partner_users table if not exists
CREATE TABLE IF NOT EXISTS partner_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    impersonating_org_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert test partner (MSP company)
INSERT INTO partners (id, name, slug, status, plan, contact_email, branding, settings)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Acme MSP',
    'acme-msp',
    'active',
    'professional',
    'admin@acmemsp.com',
    '{"companyName": "Acme MSP", "primaryColor": "#10b981", "supportEmail": "support@acmemsp.com"}',
    '{"maxOrganizations": 100, "maxLocationsPerOrg": 50, "maxUsersPerOrg": 100, "features": {"whiteLabel": true, "apiAccess": true}}'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- Insert test partner user
-- Password is: partner123
-- Hash generated with bcrypt (12 rounds)
INSERT INTO partner_users (id, partner_id, email, name, password_hash, role, status)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'admin@acmemsp.com',
    'MSP Admin',
    '$2b$12$1afGcG3Xq2aUo6Vs7HDhmedBN0k45A3n4zS0KswJ6CtV6dCfj1bfO',
    'partner_owner',
    'active'
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- Link existing demo tenant to the partner
UPDATE tenants SET partner_id = 'a0000000-0000-0000-0000-000000000001' WHERE slug = 'demo';

-- Create additional test tenants for partner
INSERT INTO tenants (id, name, slug, status, partner_id, settings)
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'Contoso Corp',
    'contoso',
    'active',
    'a0000000-0000-0000-0000-000000000001',
    '{}'
)
ON CONFLICT (slug) DO UPDATE SET partner_id = EXCLUDED.partner_id;

INSERT INTO tenants (id, name, slug, status, partner_id, settings)
VALUES (
    '550e8400-e29b-41d4-a716-446655440002',
    'Northwind Traders',
    'northwind',
    'active',
    'a0000000-0000-0000-0000-000000000001',
    '{}'
)
ON CONFLICT (slug) DO UPDATE SET partner_id = EXCLUDED.partner_id;

-- Create a regular user with same email for unified login
-- This allows MSP users to login via main login page
INSERT INTO users (id, tenant_id, email, name, password_hash, role, status)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    '550e8400-e29b-41d4-a716-446655440000',  -- Demo Company tenant (will be their "home" tenant)
    'admin@acmemsp.com',
    'MSP Admin',
    '$2b$12$1afGcG3Xq2aUo6Vs7HDhmedBN0k45A3n4zS0KswJ6CtV6dCfj1bfO',  -- partner123
    'owner',
    'active'
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

SELECT 'Partner seed complete!' AS status;
SELECT p.name AS partner_name, pu.email AS user_email, pu.role
FROM partners p
JOIN partner_users pu ON p.id = pu.partner_id;
