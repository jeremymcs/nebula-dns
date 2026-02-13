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
    policy_id Nullable(UUID),
    event_date Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (tenant_id, timestamp)
TTL toDateTime(timestamp) + INTERVAL 90 DAY
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;

-- Create bloom filter index for domain search
ALTER TABLE nebula_dns.query_logs ADD INDEX IF NOT EXISTS idx_domain domain TYPE bloom_filter(0.01) GRANULARITY 1;

-- Create set index for categories
ALTER TABLE nebula_dns.query_logs ADD INDEX IF NOT EXISTS idx_category category TYPE set(100) GRANULARITY 1;

-- ============================================
-- AGGREGATION TABLES
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
-- THREAT LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS nebula_dns.threat_logs
(
    id UUID DEFAULT generateUUIDv4(),
    timestamp DateTime64(3, 'UTC') DEFAULT now64(3),
    tenant_id UUID,
    location_id UUID,
    query_log_id UUID,
    threat_type LowCardinality(String),
    threat_name String,
    severity Enum8('LOW' = 1, 'MEDIUM' = 2, 'HIGH' = 3, 'CRITICAL' = 4),
    confidence Float32,
    domain String,
    client_ip String,
    intel_source LowCardinality(String),
    event_date Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (tenant_id, timestamp)
TTL event_date + INTERVAL 180 DAY DELETE
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS nebula_dns.audit_logs
(
    id UUID DEFAULT generateUUIDv4(),
    timestamp DateTime64(3, 'UTC') DEFAULT now64(3),
    tenant_id UUID,
    user_id UUID,
    action LowCardinality(String),
    resource_type LowCardinality(String),
    resource_id UUID,
    changes String,
    ip_address String,
    user_agent String,
    event_date Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (tenant_id, timestamp)
TTL event_date + INTERVAL 7 YEAR DELETE
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;

-- ============================================
-- PERFORMANCE METRICS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS nebula_dns.performance_metrics
(
    timestamp DateTime64(3, 'UTC') DEFAULT now64(3),
    metric_name LowCardinality(String),
    location_id UUID,
    server_id String,
    value Float64,
    event_date Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (metric_name, timestamp)
TTL event_date + INTERVAL 30 DAY DELETE
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;

-- ============================================
-- MATERIALIZED VIEWS
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS nebula_dns.query_logs_hourly
(
    hour DateTime,
    tenant_id UUID,
    location_id UUID,
    total_queries UInt64,
    blocked_queries UInt64,
    allowed_queries UInt64,
    categories AggregateFunction(uniq, String),
    avg_response_time_ms Float64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (tenant_id, location_id, hour)
TTL hour + INTERVAL 1 YEAR DELETE
AS SELECT
    toStartOfHour(timestamp) AS hour,
    tenant_id,
    location_id,
    count() AS total_queries,
    countIf(action = 'block') AS blocked_queries,
    countIf(action = 'allow') AS allowed_queries,
    uniqState(category) AS categories,
    avg(response_time_ms) AS avg_response_time_ms
FROM nebula_dns.query_logs
GROUP BY hour, tenant_id, location_id;

CREATE MATERIALIZED VIEW IF NOT EXISTS nebula_dns.query_logs_daily
(
    day Date,
    tenant_id UUID,
    location_id UUID,
    total_queries UInt64,
    blocked_queries UInt64,
    allowed_queries UInt64,
    unique_domains UInt64,
    unique_clients UInt64,
    top_blocked_domains Array(Tuple(String, UInt64)),
    avg_response_time_ms Float64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, location_id, day)
TTL day + INTERVAL 2 YEAR DELETE
AS SELECT
    toDate(timestamp) AS day,
    tenant_id,
    location_id,
    count() AS total_queries,
    countIf(action = 'block') AS blocked_queries,
    countIf(action = 'allow') AS allowed_queries,
    uniq(domain) AS unique_domains,
    uniq(client_ip) AS unique_clients,
    arraySlice(
        groupArrayIf((domain, 1), action = 'block'),
        1, 10
    ) AS top_blocked_domains,
    avg(response_time_ms) AS avg_response_time_ms
FROM nebula_dns.query_logs
GROUP BY day, tenant_id, location_id;

-- ============================================
-- HELPER VIEWS
-- ============================================

CREATE VIEW IF NOT EXISTS nebula_dns.v_top_blocked_domains AS
SELECT
    tenant_id,
    domain,
    count() as block_count,
    uniq(client_ip) as affected_clients,
    any(category) as category
FROM nebula_dns.query_logs
WHERE
    action = 'block'
    AND timestamp >= now() - INTERVAL 24 HOUR
GROUP BY tenant_id, domain
ORDER BY block_count DESC
LIMIT 100;

CREATE VIEW IF NOT EXISTS nebula_dns.v_hourly_summary AS
SELECT
    toStartOfHour(timestamp) AS hour,
    tenant_id,
    count() AS total_queries,
    countIf(action = 'block') AS blocked,
    countIf(action = 'allow') AS allowed,
    avg(response_time_ms) AS avg_response_time
FROM nebula_dns.query_logs
WHERE timestamp >= now() - INTERVAL 7 DAY
GROUP BY hour, tenant_id
ORDER BY hour DESC;

CREATE VIEW IF NOT EXISTS nebula_dns.v_active_threats AS
SELECT
    tenant_id,
    threat_type,
    severity,
    count() AS incident_count,
    uniq(client_ip) AS affected_clients,
    max(timestamp) AS last_seen
FROM nebula_dns.threat_logs
WHERE timestamp >= now() - INTERVAL 24 HOUR
GROUP BY tenant_id, threat_type, severity
ORDER BY incident_count DESC;

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
