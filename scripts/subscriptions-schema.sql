-- Subscription & Billing Schema for SafeDNS/Nebula DNS
-- Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>

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
-- INVOICES
-- ============================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    stripe_invoice_id VARCHAR(100),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
    invoice_pdf_url TEXT,
    hosted_invoice_url TEXT,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);

-- ============================================
-- SIGNUP REQUESTS (for tracking signups)
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
-- EMAIL VERIFICATION TOKENS
-- ============================================

CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_verification_token ON email_verification_tokens(token_hash);

-- ============================================
-- PASSWORD RESET TOKENS
-- ============================================

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_password_reset_token ON password_reset_tokens(token_hash);

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

-- ============================================
-- UPDATE TENANTS TABLE
-- ============================================

-- Add billing-related columns to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_size VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS industry VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country VARCHAR(2);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- ============================================
-- UPDATE USERS TABLE  
-- ============================================

-- Add email verification column
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;
