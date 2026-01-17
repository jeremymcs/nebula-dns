-- Nebula DNS ClickHouse Initialization Script
-- Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
-- This script creates the schema for DNS query logging

-- Create database
CREATE DATABASE IF NOT EXISTS nebula_dns;

-- ============================================
-- DNS QUERY LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS nebula_dns.query_logs
(
    timestamp DateTime64(3),
    tenant_id UUID,
    location_id UUID,
    location_name String,
    domain String,
    query_type String,
    client_ip String,
    action Enum8('allow' = 1, 'block' = 2, 'rewrite' = 3),
    reason String,
    category Nullable(String),
    response_time_ms UInt32,
    cached UInt8,
    threat_type Nullable(String),
    policy_id Nullable(UUID)
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (tenant_id, timestamp)
TTL toDateTime(timestamp) + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

-- Create bloom filter index for domain search
ALTER TABLE nebula_dns.query_logs ADD INDEX IF NOT EXISTS idx_domain domain TYPE bloom_filter(0.01) GRANULARITY 1;

-- Create set index for categories
ALTER TABLE nebula_dns.query_logs ADD INDEX IF NOT EXISTS idx_category category TYPE set(100) GRANULARITY 1;

-- ============================================
-- MATERIALIZED VIEWS FOR REPORTING
-- ============================================

-- Hourly aggregation
CREATE TABLE IF NOT EXISTS nebula_dns.hourly_stats (
    hour DateTime,
    tenant_id UUID,
    location_id UUID,
    total_queries UInt64,
    blocked_queries UInt64,
    allowed_queries UInt64,
    threat_blocks UInt64,
    avg_response_time Float64,
    cached_queries UInt64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (tenant_id, hour, location_id);

-- Category statistics
CREATE TABLE IF NOT EXISTS nebula_dns.category_stats (
    date Date,
    tenant_id UUID,
    category String,
    count UInt64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (tenant_id, date, category);

-- Domain statistics
CREATE TABLE IF NOT EXISTS nebula_dns.domain_stats (
    date Date,
    tenant_id UUID,
    domain String,
    action Enum8('allow' = 1, 'block' = 2, 'rewrite' = 3),
    category String,
    count UInt64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (tenant_id, date, action, domain);

-- ============================================
-- SAMPLE DATA FOR DEVELOPMENT
-- ============================================

-- Insert sample query logs for the demo tenant
INSERT INTO nebula_dns.query_logs 
(timestamp, tenant_id, location_id, location_name, domain, query_type, client_ip, action, reason, category, response_time_ms, cached, threat_type, policy_id) 
VALUES 
(now(), '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004', 'Main Office', 'google.com', 'A', '192.168.1.100', 'allow', 'Allowed by policy', NULL, 5, 0, NULL, '550e8400-e29b-41d4-a716-446655440002');

INSERT INTO nebula_dns.query_logs 
(timestamp, tenant_id, location_id, location_name, domain, query_type, client_ip, action, reason, category, response_time_ms, cached, threat_type, policy_id) 
VALUES 
(now() - INTERVAL 1 MINUTE, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004', 'Main Office', 'malware-site.bad.com', 'A', '192.168.1.101', 'block', 'Blocked: malware', 'malware', 3, 0, 'malware', '550e8400-e29b-41d4-a716-446655440002');

INSERT INTO nebula_dns.query_logs 
(timestamp, tenant_id, location_id, location_name, domain, query_type, client_ip, action, reason, category, response_time_ms, cached, threat_type, policy_id) 
VALUES 
(now() - INTERVAL 2 MINUTE, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004', 'Main Office', 'facebook.com', 'A', '192.168.1.102', 'block', 'Category: social_media', 'social_media', 4, 0, NULL, '550e8400-e29b-41d4-a716-446655440002');

INSERT INTO nebula_dns.query_logs 
(timestamp, tenant_id, location_id, location_name, domain, query_type, client_ip, action, reason, category, response_time_ms, cached, threat_type, policy_id) 
VALUES 
(now() - INTERVAL 3 MINUTE, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004', 'Main Office', 'www.youtube.com', 'A', '192.168.1.103', 'rewrite', 'SafeSearch enforcement', NULL, 6, 0, NULL, '550e8400-e29b-41d4-a716-446655440002');

INSERT INTO nebula_dns.query_logs 
(timestamp, tenant_id, location_id, location_name, domain, query_type, client_ip, action, reason, category, response_time_ms, cached, threat_type, policy_id) 
VALUES 
(now() - INTERVAL 4 MINUTE, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004', 'Main Office', 'phishing-site.net', 'A', '192.168.1.104', 'block', 'Blocked: phishing', 'phishing', 2, 0, 'phishing', '550e8400-e29b-41d4-a716-446655440002');

INSERT INTO nebula_dns.query_logs 
(timestamp, tenant_id, location_id, location_name, domain, query_type, client_ip, action, reason, category, response_time_ms, cached, threat_type, policy_id) 
VALUES 
(now() - INTERVAL 5 MINUTE, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004', 'Main Office', 'ads.doubleclick.net', 'A', '192.168.1.100', 'block', 'Category: advertising', 'advertising', 3, 1, NULL, '550e8400-e29b-41d4-a716-446655440002');

INSERT INTO nebula_dns.query_logs 
(timestamp, tenant_id, location_id, location_name, domain, query_type, client_ip, action, reason, category, response_time_ms, cached, threat_type, policy_id) 
VALUES 
(now() - INTERVAL 6 MINUTE, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004', 'Main Office', 'github.com', 'A', '192.168.1.105', 'allow', 'Allowed by policy', NULL, 8, 0, NULL, '550e8400-e29b-41d4-a716-446655440002');

INSERT INTO nebula_dns.query_logs 
(timestamp, tenant_id, location_id, location_name, domain, query_type, client_ip, action, reason, category, response_time_ms, cached, threat_type, policy_id) 
VALUES 
(now() - INTERVAL 7 MINUTE, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004', 'Main Office', 'tracking.analytics.com', 'A', '192.168.1.106', 'block', 'Category: advertising', 'advertising', 4, 0, NULL, '550e8400-e29b-41d4-a716-446655440002');

-- Done!
