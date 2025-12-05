-- Seed data for development/testing
-- Run this manually after the database is initialized

-- Insert a test tenant
INSERT INTO tenants (id, name, domain, status, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Test Tenant',
    'test-tenant',
    'active',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert a test user (password: 'testpassword123')
-- Password hash is bcrypt hash of 'testpassword123'
INSERT INTO users (id, tenant_id, email, password_hash, role, status, created_at, updated_at)
VALUES (
    '660e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000',
    'admin@test.com',
    '$2b$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', -- Replace with actual bcrypt hash
    'owner',
    'active',
    NOW(),
    NOW()
)
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Insert a test location
INSERT INTO locations (id, tenant_id, name, description, doh_token_hash, doh_token_issued_at, status, created_at, updated_at)
VALUES (
    '770e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000',
    'Test Location',
    'Test network location',
    '$2b$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', -- Replace with actual token hash
    NOW(),
    'active',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert a test policy
INSERT INTO policies (id, tenant_id, name, version, description, config, is_active, created_by, created_at)
VALUES (
    '880e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000',
    'Default Policy',
    1,
    'Default test policy',
    '{"block_categories": ["malware", "phishing"], "block_threats": true, "safe_search_enabled": false}'::jsonb,
    true,
    '660e8400-e29b-41d4-a716-446655440000',
    NOW()
)
ON CONFLICT (tenant_id, version) DO NOTHING;

-- Link policy to location
INSERT INTO policy_locations (id, location_id, policy_id, activated_at, activated_by)
VALUES (
    '990e8400-e29b-41d4-a716-446655440000',
    '770e8400-e29b-41d4-a716-446655440000',
    '880e8400-e29b-41d4-a716-446655440000',
    NOW(),
    '660e8400-e29b-41d4-a716-446655440000'
)
ON CONFLICT (location_id) DO NOTHING;
