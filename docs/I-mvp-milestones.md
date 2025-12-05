# I. MVP Milestones

## Overview

SafeDNS MVP will be delivered in 4-6 iterations, each with clear acceptance criteria. Each milestone builds on the previous one.

## Milestone 1: Foundation & Authentication (Week 1-2)

### Goals
- Set up development environment
- Implement authentication and authorization
- Basic tenant and user management

### Deliverables
- [x] Docker Compose setup with all services
- [x] PostgreSQL schema with migrations
- [x] NestJS API skeleton with auth module
- [x] JWT-based authentication
- [x] RBAC (Owner, Admin, Analyst, Read-only)
- [x] User CRUD endpoints
- [x] Tenant management endpoints
- [x] Password hashing and account lockout

### Acceptance Criteria
- ✅ User can register/login via API
- ✅ JWT tokens issued and validated
- ✅ Role-based access control enforced
- ✅ Account lockout after 5 failed attempts
- ✅ All API endpoints require authentication
- ✅ Tenant isolation enforced at API layer

### Testing
- Unit tests for auth service (>80% coverage)
- Integration tests for login/logout flow
- Security tests for password hashing and JWT validation

---

## Milestone 2: Policy Management (Week 3-4)

### Goals
- Policy CRUD operations
- Policy versioning (immutable versions)
- Policy activation workflow
- Basic policy configuration

### Deliverables
- [ ] Policy entity and repository
- [ ] Policy CRUD API endpoints
- [ ] Policy versioning logic (auto-increment)
- [ ] Policy activation endpoint (deactivates previous)
- [ ] Policy configuration validation
- [ ] Policy-to-location assignment
- [ ] Basic category taxonomy (seed data)

### Acceptance Criteria
- ✅ Admin can create policy with config
- ✅ Policy edits create new version (immutable)
- ✅ Only one active policy per tenant
- ✅ Policy can be assigned to location
- ✅ Policy config validated on creation
- ✅ Policy history visible (all versions)

### Testing
- Unit tests for policy versioning
- Integration tests for policy activation
- Tenant isolation tests (cross-tenant policy access blocked)

---

## Milestone 3: Location & Credential Management (Week 5-6)

### Goals
- Location CRUD operations
- DoH token generation and rotation
- DoT certificate generation (simplified)
- Location-to-policy assignment

### Deliverables
- [ ] Location entity and repository
- [ ] Location CRUD API endpoints
- [ ] DoH token generation (cryptographically random)
- [ ] Token hashing and storage
- [ ] Token rotation endpoint
- [ ] DoT certificate generation (placeholder)
- [ ] Certificate rotation endpoint
- [ ] Location-to-policy assignment

### Acceptance Criteria
- ✅ Admin can create location
- ✅ Location receives DoH token (shown once)
- ✅ Location receives DoT certificate (shown once)
- ✅ Tokens can be rotated (old token invalidated)
- ✅ Certificates can be rotated
- ✅ Location assigned to policy
- ✅ Token validation works (for data plane integration)

### Testing
- Unit tests for token generation and hashing
- Integration tests for token rotation
- Security tests for token isolation

---

## Milestone 4: Policy Decision Service (Week 7-8)

### Goals
- Go policy service implementation
- Policy snapshot compilation
- Policy evaluation logic
- Redis integration for caching

### Deliverables
- [ ] Go policy service HTTP server
- [ ] Policy evaluation endpoint (`/v1/evaluate`)
- [ ] Policy snapshot structure
- [ ] Redis client integration
- [ ] In-memory policy cache
- [ ] Policy evaluation algorithm (allowlist > blocklist > threat > category)
- [ ] Domain normalization
- [ ] Health check endpoint

### Acceptance Criteria
- ✅ Policy service accepts evaluation requests
- ✅ Loads policy snapshot from Redis
- ✅ Evaluates policy correctly (ALLOW/BLOCK/REWRITE)
- ✅ Returns decision with reason code
- ✅ Cache policy snapshots in memory
- ✅ Fallback to ALLOW if Redis unavailable
- ✅ Evaluation latency < 10ms p99

### Testing
- Unit tests for policy evaluation (>80% coverage)
- Integration tests for Redis integration
- Performance tests for evaluation latency
- Test all decision paths (allowlist, blocklist, threat, category)

---

## Milestone 5: Data Plane Integration (Week 9-10)

### Goals
- dnsdist configuration
- Tenant identification (DoH token)
- Policy service integration
- Unbound integration
- Basic DNS query flow

### Deliverables
- [ ] dnsdist configuration with Lua scripts
- [ ] DoH endpoint (port 443)
- [ ] Token extraction from DoH requests
- [ ] Tenant/location resolution from token
- [ ] Rate limiting per location
- [ ] Policy service HTTP calls
- [ ] Unbound pool configuration
- [ ] Query routing (BLOCK vs ALLOW)
- [ ] Basic logging to ClickHouse

### Acceptance Criteria
- ✅ DoH endpoint accepts DNS queries
- ✅ Token validated and tenant identified
- ✅ Policy service called for each query
- ✅ BLOCK decisions return NXDOMAIN
- ✅ ALLOW decisions forwarded to Unbound
- ✅ Rate limiting enforced (1000 QPS per location)
- ✅ Queries logged to ClickHouse

### Testing
- Integration tests for DoH flow
- End-to-end tests: query → policy → response
- Rate limiting tests
- Tenant isolation tests (token scope)

---

## Milestone 6: Lists & Threat Feeds (Week 11-12)

### Goals
- Allowlist/blocklist management
- Threat feed ingestion
- Domain-to-category mapping
- Policy snapshot compilation with lists

### Deliverables
- [ ] Allowlist CRUD endpoints
- [ ] Blocklist CRUD endpoints
- [ ] Wildcard domain support
- [ ] Threat feed entity and storage
- [ ] Background worker for feed ingestion
- [ ] Domain-to-category mapping table
- [ ] Policy snapshot compilation (includes lists)
- [ ] Redis snapshot updates on list changes

### Acceptance Criteria
- ✅ Admin can add/remove domains from allowlist
- ✅ Admin can add/remove domains from blocklist
- ✅ Wildcard domains supported (`*.example.com`)
- ✅ Threat feeds can be configured
- ✅ Background worker ingests feeds periodically
- ✅ Policy snapshots include allowlist/blocklist
- ✅ Policy evaluation uses lists correctly

### Testing
- Unit tests for list matching (exact + wildcard)
- Integration tests for feed ingestion
- Policy evaluation tests with lists

---

## Milestone 7: Reporting & Logging (Week 13-14)

### Goals
- ClickHouse query logging
- Report API endpoints
- Basic dashboard UI

### Deliverables
- [ ] ClickHouse schema and initialization
- [ ] Query logging from dnsdist/policy service
- [ ] Report API endpoints:
  - Top blocked domains
  - Blocks by category
  - Threat trends
- [ ] Basic Next.js dashboard
- [ ] Login page
- [ ] Policy management UI
- [ ] Location management UI
- [ ] Report visualization

### Acceptance Criteria
- ✅ All DNS queries logged to ClickHouse
- ✅ Logs include tenant_id, location_id, action, reason
- ✅ Report endpoints return aggregated data
- ✅ Dashboard shows policy status
- ✅ Dashboard shows recent blocks
- ✅ Reports filtered by tenant (isolation)

### Testing
- Integration tests for ClickHouse logging
- Report query tests (correct aggregations)
- UI tests for dashboard pages

---

## Milestone 8: Polish & Production Readiness (Week 15-16)

### Goals
- Security hardening
- Performance optimization
- Documentation
- Deployment guides

### Deliverables
- [ ] Security audit and fixes
- [ ] Performance tuning (caching, indexes)
- [ ] Error handling and logging improvements
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Deployment documentation
- [ ] Monitoring and alerting setup
- [ ] Backup and recovery procedures

### Acceptance Criteria
- ✅ All security tests pass
- ✅ Performance targets met (<1ms policy eval, >10k QPS)
- ✅ Comprehensive error handling
- ✅ Structured logging throughout
- ✅ Documentation complete
- ✅ Deployment guide available

### Testing
- Security penetration testing
- Load testing (10k+ QPS)
- Disaster recovery testing

---

## Post-MVP Enhancements (Future)

### Phase 2 Features
- DoT (DNS-over-TLS) full implementation
- Advanced scheduling (time-based policies)
- SafeSearch rewrites
- Multi-region deployment
- Certificate management (proper CA)
- Advanced reporting (custom queries)
- API rate limiting
- Webhook notifications

### Phase 3 Features
- Machine learning threat detection
- Custom category creation
- Policy templates
- Bulk operations
- Advanced analytics
- Mobile app
- SSO integration

---

## Success Metrics

### Technical Metrics
- **Availability**: 99.9% uptime
- **Latency**: <10ms policy evaluation p99
- **Throughput**: >10,000 QPS per region
- **Error Rate**: <0.1%

### Business Metrics
- **Time to First Query**: <5 minutes from signup
- **Policy Update Latency**: <30 seconds to propagate
- **Report Query Time**: <500ms for 1-day window

---

## Risk Mitigation

### High-Risk Items
1. **Policy evaluation performance**: Mitigated by caching and O(1) algorithms
2. **Tenant isolation**: Mitigated by comprehensive testing and code review
3. **Redis availability**: Mitigated by fail-open strategy and monitoring
4. **dnsdist complexity**: Mitigated by incremental implementation and testing

### Contingency Plans
- If policy service too slow: Add more caching layers
- If Redis fails: Fallback to database (slower but functional)
- If dnsdist issues: Simplify Lua scripts, use HTTP API directly

---

## Timeline Summary

| Milestone | Duration | Key Deliverable |
|-----------|----------|----------------|
| M1: Foundation | 2 weeks | Auth & RBAC |
| M2: Policies | 2 weeks | Policy CRUD & versioning |
| M3: Locations | 2 weeks | Credential management |
| M4: Policy Service | 2 weeks | Evaluation engine |
| M5: Data Plane | 2 weeks | DNS query flow |
| M6: Lists | 2 weeks | Allowlist/blocklist/threats |
| M7: Reporting | 2 weeks | Logging & dashboard |
| M8: Polish | 2 weeks | Production readiness |

**Total**: 16 weeks (4 months) for MVP
