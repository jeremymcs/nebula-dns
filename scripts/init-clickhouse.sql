-- Initialize ClickHouse schema
-- This creates the DNS query log table

CREATE DATABASE IF NOT EXISTS safedns;

USE safedns;

CREATE TABLE IF NOT EXISTS dns_queries
(
    timestamp DateTime64(3) NOT NULL,
    tenant_id UUID NOT NULL,
    location_id UUID NOT NULL,
    client_id String,
    qname String NOT NULL,
    qtype UInt16 NOT NULL,
    action Enum8('ALLOW' = 1, 'BLOCK' = 2, 'REWRITE' = 3) NOT NULL,
    reason String NOT NULL,
    category String,
    policy_version Int32 NOT NULL,
    rcode UInt8 NOT NULL,
    latency_ms UInt32 NOT NULL,
    upstream_resolver String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, timestamp, qname)
TTL timestamp + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dns_queries_action ON dns_queries(action);
CREATE INDEX IF NOT EXISTS idx_dns_queries_reason ON dns_queries(reason);
CREATE INDEX IF NOT EXISTS idx_dns_queries_category ON dns_queries(category);
CREATE INDEX IF NOT EXISTS idx_dns_queries_qname ON dns_queries(qname);

-- Materialized views for aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS dns_queries_blocked_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, location_id, toStartOfHour(timestamp), qname)
AS SELECT
    tenant_id,
    location_id,
    toStartOfHour(timestamp) AS timestamp,
    qname,
    count() AS block_count
FROM dns_queries
WHERE action = 'BLOCK'
GROUP BY tenant_id, location_id, timestamp, qname;

CREATE MATERIALIZED VIEW IF NOT EXISTS dns_queries_category_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, location_id, toStartOfHour(timestamp), category)
AS SELECT
    tenant_id,
    location_id,
    toStartOfHour(timestamp) AS timestamp,
    category,
    count() AS block_count
FROM dns_queries
WHERE action = 'BLOCK' AND category != ''
GROUP BY tenant_id, location_id, timestamp, category;
