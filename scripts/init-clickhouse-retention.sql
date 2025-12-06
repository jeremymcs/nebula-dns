-- Nebula DNS - ClickHouse Data Retention Policies
-- Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
-- 
-- This script sets up TTL-based data retention for query logs

-- ============================================
-- QUERY LOGS TABLE WITH RETENTION
-- ============================================

-- Main query logs table with TTL-based retention
CREATE TABLE IF NOT EXISTS nebula_dns.query_logs
(
    -- Core fields
    id UUID DEFAULT generateUUIDv4(),
    timestamp DateTime64(3, 'UTC') DEFAULT now64(3),
    
    -- Tenant context
    tenant_id UUID,
    location_id UUID,
    
    -- Query details
    qname String,
    qtype String,
    rcode UInt8,
    
    -- Policy decision
    decision Enum8('ALLOW' = 1, 'BLOCK' = 2, 'REWRITE' = 3),
    reason LowCardinality(String),
    category LowCardinality(String),
    
    -- Client info
    client_ip IPv4,
    
    -- Performance
    latency_ms UInt16,
    
    -- Partition key (for efficient queries and retention)
    event_date Date DEFAULT toDate(timestamp)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (tenant_id, location_id, timestamp)
TTL event_date + INTERVAL 90 DAY DELETE
SETTINGS 
    index_granularity = 8192,
    ttl_only_drop_parts = 1;

-- Create materialized view for hourly aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS nebula_dns.query_logs_hourly
(
    hour DateTime,
    tenant_id UUID,
    location_id UUID,
    total_queries UInt64,
    blocked_queries UInt64,
    allowed_queries UInt64,
    categories AggregateFunction(uniq, String),
    avg_latency_ms Float64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (tenant_id, location_id, hour)
TTL hour + INTERVAL 1 YEAR DELETE
AS SELECT
    toStartOfHour(timestamp) AS hour,
    tenant_id,
    location_id,
    count() AS total_queries,
    countIf(decision = 'BLOCK') AS blocked_queries,
    countIf(decision = 'ALLOW') AS allowed_queries,
    uniqState(category) AS categories,
    avg(latency_ms) AS avg_latency_ms
FROM nebula_dns.query_logs
GROUP BY hour, tenant_id, location_id;

-- Create materialized view for daily aggregation (longer retention)
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
    avg_latency_ms Float64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, location_id, day)
TTL day + INTERVAL 2 YEAR DELETE
AS SELECT
    toDate(timestamp) AS day,
    tenant_id,
    location_id,
    count() AS total_queries,
    countIf(decision = 'BLOCK') AS blocked_queries,
    countIf(decision = 'ALLOW') AS allowed_queries,
    uniq(qname) AS unique_domains,
    uniq(client_ip) AS unique_clients,
    arraySlice(
        groupArrayIf((qname, 1), decision = 'BLOCK'), 
        1, 10
    ) AS top_blocked_domains,
    avg(latency_ms) AS avg_latency_ms
FROM nebula_dns.query_logs
GROUP BY day, tenant_id, location_id;

-- ============================================
-- THREAT LOGS TABLE (shorter retention for detailed data)
-- ============================================

CREATE TABLE IF NOT EXISTS nebula_dns.threat_logs
(
    id UUID DEFAULT generateUUIDv4(),
    timestamp DateTime64(3, 'UTC') DEFAULT now64(3),
    
    -- Context
    tenant_id UUID,
    location_id UUID,
    query_log_id UUID,
    
    -- Threat details
    threat_type LowCardinality(String),  -- malware, phishing, botnet, etc.
    threat_name String,
    severity Enum8('LOW' = 1, 'MEDIUM' = 2, 'HIGH' = 3, 'CRITICAL' = 4),
    confidence Float32,
    
    -- Query details
    qname String,
    client_ip IPv4,
    
    -- Threat intelligence source
    intel_source LowCardinality(String),
    
    -- Partition key
    event_date Date DEFAULT toDate(timestamp)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (tenant_id, timestamp)
TTL event_date + INTERVAL 180 DAY DELETE
SETTINGS 
    index_granularity = 8192,
    ttl_only_drop_parts = 1;

-- ============================================
-- AUDIT LOGS TABLE (longer retention for compliance)
-- ============================================

CREATE TABLE IF NOT EXISTS nebula_dns.audit_logs
(
    id UUID DEFAULT generateUUIDv4(),
    timestamp DateTime64(3, 'UTC') DEFAULT now64(3),
    
    -- Context
    tenant_id UUID,
    user_id UUID,
    
    -- Action details
    action LowCardinality(String),
    resource_type LowCardinality(String),
    resource_id UUID,
    
    -- Change details
    changes String,  -- JSON
    
    -- Request metadata
    ip_address IPv4,
    user_agent String,
    
    -- Partition key
    event_date Date DEFAULT toDate(timestamp)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (tenant_id, timestamp)
TTL event_date + INTERVAL 7 YEAR DELETE  -- 7 years for compliance
SETTINGS 
    index_granularity = 8192,
    ttl_only_drop_parts = 1;

-- ============================================
-- PERFORMANCE METRICS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS nebula_dns.performance_metrics
(
    timestamp DateTime64(3, 'UTC') DEFAULT now64(3),
    
    -- Metric identification
    metric_name LowCardinality(String),
    
    -- Dimensions
    location_id UUID,
    server_id String,
    
    -- Values
    value Float64,
    
    -- Partition key
    event_date Date DEFAULT toDate(timestamp)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (metric_name, timestamp)
TTL event_date + INTERVAL 30 DAY DELETE
SETTINGS 
    index_granularity = 8192,
    ttl_only_drop_parts = 1;

-- ============================================
-- HELPFUL VIEWS
-- ============================================

-- Top blocked domains by tenant (last 24 hours)
CREATE VIEW IF NOT EXISTS nebula_dns.v_top_blocked_domains AS
SELECT
    tenant_id,
    qname,
    count() as block_count,
    uniq(client_ip) as affected_clients,
    any(category) as category
FROM nebula_dns.query_logs
WHERE 
    decision = 'BLOCK'
    AND timestamp >= now() - INTERVAL 24 HOUR
GROUP BY tenant_id, qname
ORDER BY block_count DESC
LIMIT 100;

-- Hourly traffic summary
CREATE VIEW IF NOT EXISTS nebula_dns.v_hourly_summary AS
SELECT
    toStartOfHour(timestamp) AS hour,
    tenant_id,
    count() AS total_queries,
    countIf(decision = 'BLOCK') AS blocked,
    countIf(decision = 'ALLOW') AS allowed,
    avg(latency_ms) AS avg_latency
FROM nebula_dns.query_logs
WHERE timestamp >= now() - INTERVAL 7 DAY
GROUP BY hour, tenant_id
ORDER BY hour DESC;

-- Active threats summary
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
-- SYSTEM SETTINGS
-- ============================================

-- Optimize merge behavior
SYSTEM STOP MERGES nebula_dns.query_logs;
ALTER TABLE nebula_dns.query_logs MODIFY SETTING 
    merge_with_ttl_timeout = 86400,  -- Merge TTL parts once per day
    min_bytes_for_wide_part = 10485760;  -- 10MB min for wide parts
SYSTEM START MERGES nebula_dns.query_logs;

-- Create dictionaries for efficient lookups (optional)
-- CREATE DICTIONARY IF NOT EXISTS nebula_dns.category_names ...
