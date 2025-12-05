# I. MVP Milestones

## Overview

This document outlines the development milestones for SafeDNS MVP, broken into 6 iterations with clear acceptance criteria.

---

## Iteration 1: Foundation (Week 1-2)

### Objective
Set up core infrastructure and basic authentication.

### Deliverables

1. **Development Environment**
   - [ ] Docker Compose runs all services
   - [ ] Database migrations execute successfully
   - [ ] Services can communicate on internal network

2. **Authentication System**
   - [ ] User registration (owner creates initial account)
   - [ ] Email/password login with JWT tokens
   - [ ] Token refresh mechanism
   - [ ] Password change endpoint

3. **Tenant & User Management**
   - [ ] Tenant CRUD (internal only)
   - [ ] User CRUD with RBAC enforcement
   - [ ] Role assignment (owner, admin, analyst, readonly)

### Acceptance Criteria

- [ ] `docker compose up` starts all services without errors
- [ ] User can login and receive valid JWT
- [ ] User can refresh tokens before expiration
- [ ] Owner can create users with different roles
- [ ] Non-owners cannot create owner accounts
- [ ] Failed login attempts trigger account lockout after 5 tries

### Definition of Done

- All unit tests pass
- API endpoints documented in Swagger
- Basic audit logging for auth events

---

## Iteration 2: Policy Engine (Week 3-4)

### Objective
Implement policy management and evaluation engine.

### Deliverables

1. **Policy Management API**
   - [ ] Create policy with configuration
   - [ ] Update policy (creates new version)
   - [ ] View policy version history
   - [ ] Rollback to previous version
   - [ ] Set default policy for tenant

2. **Policy Evaluation Service**
   - [ ] Policy compilation to fast lookup structures
   - [ ] Allowlist/blocklist evaluation (exact + wildcard)
   - [ ] Category blocking
   - [ ] Threat feed checking
   - [ ] Schedule evaluation

3. **Caching Layer**
   - [ ] Policy caching in Redis
   - [ ] Cache invalidation on policy update
   - [ ] In-memory caching for hot paths

### Acceptance Criteria

- [ ] Policy update creates new version (immutable history)
- [ ] Rollback restores previous config as new version
- [ ] Allowlist takes precedence over blocklist
- [ ] Wildcard matching works for subdomains
- [ ] Schedules activate/deactivate categories by time
- [ ] Policy evaluation completes in <5ms average

### Definition of Done

- Policy evaluation has 95% test coverage
- Benchmark shows O(1) average lookup time
- Cache invalidation verified with integration tests

---

## Iteration 3: Data Plane Integration (Week 5-6)

### Objective
Connect DNS resolution with policy decisions.

### Deliverables

1. **Location Management**
   - [ ] Location CRUD
   - [ ] Assign policy to location
   - [ ] Generate DoH tokens
   - [ ] Token rotation

2. **dnsdist Integration**
   - [ ] Token validation endpoint
   - [ ] Policy evaluation endpoint
   - [ ] Response handling (BLOCK/ALLOW/REWRITE)

3. **DNS Resolution**
   - [ ] Unbound configured for recursive resolution
   - [ ] DNSSEC validation enabled
   - [ ] Response caching

### Acceptance Criteria

- [ ] DoH query with valid token returns policy decision
- [ ] Invalid token returns 401/REFUSED
- [ ] BLOCK decision returns NXDOMAIN or null-route
- [ ] ALLOW decision forwards to Unbound
- [ ] REWRITE decision returns SafeSearch target
- [ ] DNSSEC-invalid responses are rejected

### Definition of Done

- End-to-end DoH flow tested with real DNS queries
- Token creation/validation documented
- Rate limiting configured and tested

---

## Iteration 4: Custom Lists & Threat Feeds (Week 7-8)

### Objective
Enable tenant customization and threat intelligence.

### Deliverables

1. **Custom Lists**
   - [ ] Create allowlist/blocklist
   - [ ] Add/remove entries (exact + wildcard)
   - [ ] Bulk import from text file
   - [ ] Enable/disable lists

2. **Threat Feed Ingestion**
   - [ ] Background worker for feed updates
   - [ ] Support for domain list format
   - [ ] Feed enable/disable per tenant
   - [ ] Last update timestamp tracking

3. **SafeSearch Implementation**
   - [ ] Google SafeSearch rewrite
   - [ ] YouTube Restricted Mode
   - [ ] Bing SafeSearch
   - [ ] Enable/disable per policy

### Acceptance Criteria

- [ ] Custom list entries affect policy decisions immediately
- [ ] Bulk import handles 10,000+ entries
- [ ] Threat feeds update on schedule
- [ ] SafeSearch rewrites return correct CNAME
- [ ] Lists can be enabled/disabled without deletion

### Definition of Done

- Import tested with malformed data
- Feed ingestion has error handling and retry
- SafeSearch verified with real DNS queries

---

## Iteration 5: Logging & Reporting (Week 9-10)

### Objective
Implement query logging and analytics.

### Deliverables

1. **Query Logging**
   - [ ] Log all queries to ClickHouse
   - [ ] Include tenant_id, location_id, qname, action, reason
   - [ ] Latency tracking
   - [ ] Async logging (no impact on query latency)

2. **Query Log Viewer**
   - [ ] Filter by date range, location, action
   - [ ] Search by domain
   - [ ] Pagination
   - [ ] Export to CSV

3. **Reports Dashboard**
   - [ ] Summary statistics (total/blocked/allowed)
   - [ ] Top blocked domains
   - [ ] Blocks by category
   - [ ] Threat trends over time
   - [ ] Per-location breakdown

### Acceptance Criteria

- [ ] All queries logged with <1ms overhead
- [ ] Query logs filterable by all fields
- [ ] Reports load within 3 seconds
- [ ] CSV export includes all visible columns
- [ ] 90-day retention with auto-cleanup

### Definition of Done

- ClickHouse materialized views for fast aggregation
- Reports verified against raw log counts
- Export tested with large datasets

---

## Iteration 6: Production Readiness (Week 11-12)

### Objective
Harden for production deployment.

### Deliverables

1. **Security Hardening**
   - [ ] TLS 1.2+ only
   - [ ] HSTS headers
   - [ ] Rate limiting on all endpoints
   - [ ] Input validation audit
   - [ ] Dependency vulnerability scan

2. **Monitoring & Alerting**
   - [ ] Health check endpoints
   - [ ] Prometheus metrics
   - [ ] Structured logging
   - [ ] Error tracking (Sentry)

3. **Documentation**
   - [ ] API documentation complete
   - [ ] Deployment guide
   - [ ] Configuration reference
   - [ ] Troubleshooting guide

4. **Admin UI Polish**
   - [ ] Responsive design
   - [ ] Error handling UX
   - [ ] Loading states
   - [ ] Form validation feedback

### Acceptance Criteria

- [ ] Security scan passes with no critical findings
- [ ] Health endpoints return detailed status
- [ ] Metrics cover key performance indicators
- [ ] Documentation reviewed by non-author
- [ ] UI works on mobile devices

### Definition of Done

- Penetration test completed (basic)
- Load test shows 10,000 QPS per node
- Runbook for common operations
- Demo environment deployed

---

## Post-MVP Roadmap

### Phase 2: Enterprise Features
- Multi-user SSO (SAML/OIDC)
- Advanced scheduling (recurring, exceptions)
- Custom categories
- API access for automation

### Phase 3: Scale & Distribution
- Multi-region deployment
- Anycast DNS
- Enhanced threat intelligence
- Machine learning categorization

### Phase 4: Compliance & Reporting
- Scheduled report delivery
- Compliance reports (CIPA, etc.)
- Data residency options
- Enhanced audit logging

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| ClickHouse performance at scale | High | Medium | Pre-aggregate with materialized views |
| Policy evaluation latency | High | Low | Benchmark early, optimize data structures |
| dnsdist Lua complexity | Medium | Medium | Start simple, add features incrementally |
| Token security | High | Low | HMAC signing, short expiry, rotation |
| Tenant data leakage | Critical | Low | RLS, thorough testing, code review |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Query latency (p99) | <50ms | Prometheus metrics |
| Policy evaluation time | <5ms | Go benchmarks |
| Uptime | 99.9% | Health check monitoring |
| Block accuracy | >99% | Manual sampling |
| False positive rate | <0.1% | User reports |
| API response time (p95) | <200ms | APM tracking |
