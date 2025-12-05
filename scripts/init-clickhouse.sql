-- SafeDNS ClickHouse Initialization Script
-- This script creates the schema for DNS query logging

-- Create database
CREATE DATABASE IF NOT EXISTS safedns;

-- ============================================
-- DNS QUERY LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS safedns.dns_query_log
(
    -- Timestamp and identifiers
    timestamp DateTime64(3, 'UTC'),
    tenant_id UUID,
    location_id UUID,
    
    -- Query details
    qname String,
    qtype UInt16,
    client_ip IPv6,
    
    -- Decision
    action LowCardinality(String),  -- ALLOW, BLOCK, REWRITE
    reason LowCardinality(String),  -- default, allowlist, blocklist, threat:malware, category:adult, safesearch
    category LowCardinality(String),
    
    -- Policy info
    policy_version UInt32,
    
    -- Response
    rcode UInt8,
    latency_ms Float32,
    
    -- Indexing
    date Date MATERIALIZED toDate(timestamp)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (tenant_id, location_id, timestamp)
TTL date + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

-- Create bloom filter index for domain search
ALTER TABLE safedns.dns_query_log ADD INDEX idx_qname qname TYPE bloom_filter(0.01) GRANULARITY 1;

-- Create set index for categories
ALTER TABLE safedns.dns_query_log ADD INDEX idx_category category TYPE set(100) GRANULARITY 1;

-- ============================================
-- MATERIALIZED VIEWS FOR REPORTING
-- ============================================

-- Hourly aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS safedns.hourly_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (tenant_id, location_id, hour, action)
AS SELECT
    toStartOfHour(timestamp) AS hour,
    tenant_id,
    location_id,
    action,
    count() AS query_count,
    uniqExact(qname) AS unique_domains,
    avg(latency_ms) AS avg_latency_ms,
    max(latency_ms) AS max_latency_ms
FROM safedns.dns_query_log
GROUP BY hour, tenant_id, location_id, action;

-- Top blocked domains (daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS safedns.top_blocked_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (tenant_id, date, count)
AS SELECT
    toDate(timestamp) AS date,
    tenant_id,
    qname,
    reason,
    category,
    count() AS count
FROM safedns.dns_query_log
WHERE action = 'BLOCK'
GROUP BY date, tenant_id, qname, reason, category;

-- Blocks by category (daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS safedns.blocks_by_category_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (tenant_id, date, category)
AS SELECT
    toDate(timestamp) AS date,
    tenant_id,
    category,
    count() AS count
FROM safedns.dns_query_log
WHERE action = 'BLOCK' AND category != ''
GROUP BY date, tenant_id, category;

-- Threat trends (daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS safedns.threat_trends_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (tenant_id, date, threat_type)
AS SELECT
    toDate(timestamp) AS date,
    tenant_id,
    extractAll(reason, 'threat:([a-z]+)')[1] AS threat_type,
    count() AS count
FROM safedns.dns_query_log
WHERE reason LIKE 'threat:%'
GROUP BY date, tenant_id, threat_type;

-- ============================================
-- SAMPLE DATA FOR DEVELOPMENT
-- ============================================

-- Insert sample query logs
INSERT INTO safedns.dns_query_log
(timestamp, tenant_id, location_id, qname, qtype, client_ip, action, reason, category, policy_version, rcode, latency_ms)
VALUES
    (now(), '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004', 'google.com', 1, toIPv6('192.168.1.100'), 'ALLOW', 'default', '', 1, 0, 2.5),
    (now() - INTERVAL 1 MINUTE, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004', 'malware.bad.com', 1, toIPv6('192.168.1.101'), 'BLOCK', 'threat:malware', 'malware', 1, 3, 1.2),
    (now() - INTERVAL 2 MINUTE, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004', 'facebook.com', 1, toIPv6('192.168.1.102'), 'BLOCK', 'category:social_media', 'social_media', 1, 3, 0.8),
    (now() - INTERVAL 3 MINUTE, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004', 'www.youtube.com', 1, toIPv6('192.168.1.103'), 'REWRITE', 'safesearch', '', 1, 0, 1.5),
    (now() - INTERVAL 4 MINUTE, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004', 'phishing.site.net', 1, toIPv6('192.168.1.104'), 'BLOCK', 'threat:phishing', 'phishing', 1, 3, 0.9);

-- Done!
