# API Specification: Usage & Limits Endpoints
## Backend Implementation Guide for US-013 & US-014

---

## Overview

This document specifies the API endpoints required to support the Usage Widget (US-013) and Billing Page Usage Breakdown (US-014) features.

**Base URL:** `/api/v1/limits`

**Authentication:** All endpoints require Bearer token authentication

**Rate Limiting:** Standard rate limits apply (100 req/min per user)

---

## Endpoints

### 1. Get Current Usage Stats

**Endpoint:** `GET /api/v1/limits/usage`

**Description:** Returns current usage statistics against plan limits for the authenticated tenant.

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "locations": {
    "current": 5,
    "limit": 10,
    "percentage": 50.0
  },
  "clients": {
    "current": 8,
    "limit": 25,
    "percentage": 32.0
  },
  "billingPeriod": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-01-31T23:59:59Z"
  },
  "plan": {
    "name": "Enterprise Pro",
    "tier": "enterprise"
  }
}
```

**Response Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| locations.current | integer | Yes | Current number of locations |
| locations.limit | integer | Yes | Maximum allowed locations |
| locations.percentage | float | Yes | Usage percentage (0-100) |
| clients | object | Conditional | Only for MSP tier |
| clients.current | integer | If MSP | Current number of client orgs |
| clients.limit | integer | If MSP | Maximum allowed clients |
| clients.percentage | float | If MSP | Usage percentage (0-100) |
| billingPeriod.start | string (ISO 8601) | Yes | Billing period start |
| billingPeriod.end | string (ISO 8601) | Yes | Billing period end |
| plan.name | string | Yes | Human-readable plan name |
| plan.tier | enum | Yes | One of: free, home, enterprise, msp |

**Error Responses:**

```json
// 401 Unauthorized
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}

// 500 Internal Server Error
{
  "error": "InternalServerError",
  "message": "Failed to retrieve usage statistics"
}
```

**Caching:**
- Client caches for 60 seconds
- Backend should implement similar caching
- Invalidate on location/client creation/deletion

**Performance Requirements:**
- Response time: < 200ms (p95)
- Availability: 99.9%

---

### 2. Get Usage History

**Endpoint:** `GET /api/v1/limits/usage/history`

**Description:** Returns historical usage data for the specified time period.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| months | integer | No | 6 | Number of months of history (1-12) |

**Request:**
```
GET /api/v1/limits/usage/history?months=6
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "date": "2025-08-01T00:00:00Z",
    "locations": 3,
    "clients": 5,
    "policies": 8,
    "queries": 1250000
  },
  {
    "date": "2025-09-01T00:00:00Z",
    "locations": 4,
    "clients": 6,
    "policies": 10,
    "queries": 1800000
  },
  {
    "date": "2025-10-01T00:00:00Z",
    "locations": 4,
    "clients": 7,
    "policies": 12,
    "queries": 2100000
  },
  {
    "date": "2025-11-01T00:00:00Z",
    "locations": 5,
    "clients": 8,
    "policies": 15,
    "queries": 2500000
  },
  {
    "date": "2025-12-01T00:00:00Z",
    "locations": 5,
    "clients": 8,
    "policies": 16,
    "queries": 2800000
  },
  {
    "date": "2026-01-01T00:00:00Z",
    "locations": 5,
    "clients": 8,
    "policies": 18,
    "queries": 3200000
  }
]
```

**Response Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| date | string (ISO 8601) | Yes | First day of the month |
| locations | integer | Yes | Location count at month start |
| clients | integer | Conditional | Client count (MSP only) |
| policies | integer | Yes | Active policy count |
| queries | integer | Yes | Total queries for the month |

**Data Aggregation:**
- Data points should represent the first day of each month
- Use month-to-date for current month
- Include partial month data for current period

**Error Responses:**

```json
// 400 Bad Request
{
  "error": "BadRequest",
  "message": "Invalid months parameter. Must be between 1 and 12."
}
```

**Performance Requirements:**
- Response time: < 500ms (p95)
- Pre-aggregate data monthly to improve performance
- Cache results for 1 hour

---

### 3. Get Usage Breakdown

**Endpoint:** `GET /api/v1/limits/usage/breakdown`

**Description:** Returns detailed breakdown of current usage including resources and cost projections.

**Request:**
```
GET /api/v1/limits/usage/breakdown
Authorization: Bearer <token>
```

**Response for Enterprise/Home Tier (200 OK):**
```json
{
  "locations": [
    {
      "id": "loc_abc123",
      "name": "HQ Office",
      "createdAt": "2026-01-15T10:30:00Z",
      "policyId": "pol_xyz789",
      "policyName": "Standard Protection",
      "status": "active"
    },
    {
      "id": "loc_def456",
      "name": "Branch Office",
      "createdAt": "2026-01-18T14:20:00Z",
      "policyId": "pol_xyz789",
      "policyName": "Standard Protection",
      "status": "active"
    },
    {
      "id": "loc_ghi789",
      "name": "Home Network",
      "createdAt": "2026-01-20T09:15:00Z",
      "policyId": "pol_abc123",
      "policyName": "Family Safe",
      "status": "inactive"
    }
  ],
  "projectedMonthlyCost": 155.00,
  "currentPeriodCost": 125.50
}
```

**Response for MSP Tier (200 OK):**
```json
{
  "clients": [
    {
      "id": "org_client1",
      "name": "Acme Corporation",
      "createdAt": "2025-12-05T12:00:00Z",
      "locationCount": 12,
      "status": "active"
    },
    {
      "id": "org_client2",
      "name": "Widget Industries",
      "createdAt": "2026-01-12T08:30:00Z",
      "locationCount": 8,
      "status": "active"
    },
    {
      "id": "org_client3",
      "name": "Test Company",
      "createdAt": "2026-01-18T16:45:00Z",
      "locationCount": 2,
      "status": "suspended"
    }
  ],
  "projectedMonthlyCost": 3100.00,
  "currentPeriodCost": 2450.00
}
```

**Response Fields:**

**For Non-MSP Tiers:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| locations | array | Yes | Array of location objects |
| locations[].id | string | Yes | Unique location identifier |
| locations[].name | string | Yes | Location display name |
| locations[].createdAt | string (ISO 8601) | Yes | Creation timestamp |
| locations[].policyId | string | Yes | Associated policy ID |
| locations[].policyName | string | Yes | Policy display name |
| locations[].status | enum | Yes | One of: active, inactive |
| projectedMonthlyCost | float | Yes | Estimated cost for full month |
| currentPeriodCost | float | Yes | Cost accrued so far this period |

**For MSP Tier:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| clients | array | Yes | Array of client organization objects |
| clients[].id | string | Yes | Unique client org identifier |
| clients[].name | string | Yes | Client organization name |
| clients[].createdAt | string (ISO 8601) | Yes | Creation timestamp |
| clients[].locationCount | integer | Yes | Number of locations for this client |
| clients[].status | string | Yes | Client status (active, suspended, etc.) |
| projectedMonthlyCost | float | Yes | Estimated cost for full month |
| currentPeriodCost | float | Yes | Cost accrued so far this period |

**Cost Calculation Logic:**
```
currentPeriodCost = sum of actual costs incurred this billing period
projectedMonthlyCost = (currentPeriodCost / days_elapsed) * total_days_in_period
```

**Sorting:**
- Locations: Sort by createdAt DESC (newest first)
- Clients: Sort by name ASC (alphabetical)

**Performance Requirements:**
- Response time: < 300ms (p95)
- Paginate if list exceeds 100 items
- Include pagination metadata if needed

---

### 4. Export Usage Report (CSV)

**Endpoint:** `GET /api/v1/limits/usage/export`

**Description:** Generates and downloads a CSV file containing detailed usage report for the current billing period.

**Request:**
```
GET /api/v1/limits/usage/export
Authorization: Bearer <token>
```

**Response Headers:**
```
HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="usage-report-2026-01-17.csv"
Cache-Control: no-cache
```

**CSV Format (Non-MSP):**
```csv
Billing Period,2026-01-01 to 2026-01-31
Plan,Enterprise Pro
Generated,2026-01-17T15:30:00Z

Resource Type,Name,ID,Created,Status,Policy,Queries (Period),Cost
Location,HQ Office,loc_abc123,2026-01-15,active,Standard Protection,125000,45.50
Location,Branch Office,loc_def456,2026-01-18,active,Standard Protection,98000,35.00
Location,Home Network,loc_ghi789,2026-01-20,inactive,Family Safe,50000,18.00

Summary,,,,,,273000,98.50
Projected Monthly Total,,,,,,350000,125.50
```

**CSV Format (MSP):**
```csv
Billing Period,2026-01-01 to 2026-01-31
Plan,MSP Partner
Generated,2026-01-17T15:30:00Z

Resource Type,Client Name,Client ID,Created,Status,Locations,Queries (Period),Cost
Client,Acme Corporation,org_client1,2025-12-05,active,12,1500000,850.00
Client,Widget Industries,org_client2,2026-01-12,active,8,980000,520.00
Client,Test Company,org_client3,2026-01-18,suspended,2,125000,80.00

Summary,,,,,22,2605000,1450.00
Projected Monthly Total,,,,,22,3300000,2450.00
```

**CSV Requirements:**
- UTF-8 encoding
- CRLF line endings
- Header rows (billing info) followed by blank line
- Data rows with headers
- Summary row at bottom
- Projected totals row

**Error Responses:**

```json
// 500 Internal Server Error
{
  "error": "InternalServerError",
  "message": "Failed to generate usage report"
}
```

**Performance Requirements:**
- Generation time: < 3s for up to 1000 records
- Stream large datasets (don't load all in memory)
- Queue for async processing if needed

---

## Database Schema Recommendations

### Usage Snapshots Table
```sql
CREATE TABLE usage_snapshots (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  snapshot_date DATE NOT NULL,
  locations_count INTEGER NOT NULL,
  clients_count INTEGER,  -- NULL for non-MSP
  policies_count INTEGER NOT NULL,
  queries_count BIGINT NOT NULL,
  cost_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, snapshot_date)
);

CREATE INDEX idx_usage_snapshots_tenant_date ON usage_snapshots(tenant_id, snapshot_date DESC);
```

### Billing Periods Table
```sql
CREATE TABLE billing_periods (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_cost DECIMAL(10, 2),
  status VARCHAR(20) DEFAULT 'active',  -- active, closed
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, period_start)
);

CREATE INDEX idx_billing_periods_tenant_dates ON billing_periods(tenant_id, period_start DESC);
```

---

## Caching Strategy

### Redis Cache Keys

```
usage:stats:{tenant_id}
  TTL: 60 seconds
  Value: JSON of current usage stats

usage:history:{tenant_id}:{months}
  TTL: 3600 seconds (1 hour)
  Value: JSON array of historical data

usage:breakdown:{tenant_id}
  TTL: 300 seconds (5 minutes)
  Value: JSON of detailed breakdown
```

### Cache Invalidation Events

Invalidate `usage:stats:{tenant_id}` when:
- Location created/deleted
- Client created/deleted (MSP)
- Policy created/deleted
- Billing period changes

Invalidate `usage:breakdown:{tenant_id}` when:
- Location created/deleted/updated
- Client created/deleted/updated (MSP)
- Policy updated
- Cost recalculation occurs

---

## Security Considerations

### Authorization
- Verify tenant_id matches authenticated user's tenant
- MSP partners: only show their client data
- Regular users: only show their own data

### Data Privacy
- Don't expose internal IDs in error messages
- Sanitize user input for CSV export
- Rate limit export endpoint (max 10/hour)

### Input Validation
```javascript
// months parameter
if (months < 1 || months > 12) {
  return 400 Bad Request
}

// Verify tenant access
if (requestingUser.tenantId !== targetTenant.id) {
  return 403 Forbidden
}
```

---

## Testing Checklist

### Unit Tests
- [ ] Usage calculation logic
- [ ] Cost projection formulas
- [ ] CSV generation
- [ ] Date range handling

### Integration Tests
- [ ] API endpoint responses
- [ ] Database queries
- [ ] Cache operations
- [ ] Authentication/authorization

### Performance Tests
- [ ] Load test with 1000 locations
- [ ] Concurrent request handling
- [ ] CSV generation for large datasets
- [ ] Cache hit rates

### End-to-End Tests
- [ ] Full workflow from frontend
- [ ] CSV download and validation
- [ ] Multi-tenant isolation
- [ ] MSP vs non-MSP responses

---

## Migration Plan

### Phase 1: Database Setup
1. Create usage_snapshots table
2. Create billing_periods table
3. Set up indexes

### Phase 2: Data Backfill
1. Calculate historical snapshots
2. Populate usage_snapshots for last 6 months
3. Create current billing periods

### Phase 3: API Implementation
1. Implement GET /usage endpoint
2. Implement GET /usage/history endpoint
3. Implement GET /usage/breakdown endpoint
4. Implement GET /usage/export endpoint

### Phase 4: Caching Layer
1. Set up Redis cache
2. Implement cache invalidation
3. Monitor cache hit rates

### Phase 5: Testing & Deployment
1. Run test suite
2. Performance testing
3. Staging deployment
4. Production deployment
5. Monitor error rates

---

## Monitoring & Alerts

### Key Metrics
- API response times (p50, p95, p99)
- Error rates by endpoint
- Cache hit ratios
- CSV export success rate
- Database query performance

### Alerts
```yaml
- name: high_response_time
  condition: p95 > 500ms
  action: page_oncall

- name: high_error_rate
  condition: error_rate > 5%
  action: notify_slack

- name: cache_miss_rate
  condition: cache_miss > 50%
  action: notify_slack
```

---

## Support Documentation

### Common Issues

**Issue:** Usage stats not updating
**Solution:** Check cache invalidation logic, verify snapshot job is running

**Issue:** CSV export timing out
**Solution:** Implement pagination or async export for large datasets

**Issue:** Incorrect cost calculations
**Solution:** Verify billing period dates and cost formula

---

## Appendix: Example Requests

### cURL Examples

**Get Current Usage:**
```bash
curl -X GET "https://api.nebuladns.com/api/v1/limits/usage" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

**Get Usage History:**
```bash
curl -X GET "https://api.nebuladns.com/api/v1/limits/usage/history?months=3" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

**Export CSV:**
```bash
curl -X GET "https://api.nebuladns.com/api/v1/limits/usage/export" \
  -H "Authorization: Bearer eyJhbGc..." \
  -o usage-report.csv
```

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-17 | Initial specification for US-013 & US-014 |

---

**Document Owner:** Backend Team
**Related Documents:** IMPLEMENTATION_SUMMARY.md, USAGE_FEATURES_VISUAL_GUIDE.md
**Status:** Ready for Implementation
