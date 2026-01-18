# Roadmap: Nebula DNS Admin Dashboard

## Overview

This roadmap delivers the backend API for the internal admin dashboard, enabling the ops team to manage MSP accounts and troubleshoot tenant issues. The journey starts with admin authentication foundation, then builds tenant impersonation (the core value), followed by MSP visibility, system health monitoring, and finally onboarding and billing operations.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Admin Auth Foundation** - Separate auth system for admin endpoints ✓
- [x] **Phase 2: Tenant Search** - Find tenants by name, ID, or email ✓
- [ ] **Phase 3: Impersonation Core** - Start/end impersonation sessions with audit logging
- [ ] **Phase 4: MSP Listing** - View all MSPs with status, client count, and search
- [ ] **Phase 5: MSP Drill-down** - View MSP client organizations and usage metrics
- [ ] **Phase 6: System Health** - DNS service status, error rates, and connection health
- [ ] **Phase 7: MSP Onboarding** - Create new MSP accounts with initial configuration
- [ ] **Phase 8: Billing Operations** - View and manage tenant billing

## Phase Details

### Phase 1: Admin Auth Foundation
**Goal**: Admin endpoints are protected by a separate auth system from tenant JWT
**Depends on**: Nothing (first phase)
**Requirements**: None directly (enables all other requirements)
**Success Criteria** (what must be TRUE):
  1. Admin can authenticate via dedicated admin login endpoint
  2. Admin endpoints reject regular tenant JWT tokens
  3. Admin auth guard protects all admin routes
  4. Admin session includes admin identity for audit purposes
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Admin module scaffolding, entity, migration, strategy, and auth guard ✓
- [x] 01-02-PLAN.md — Admin authentication endpoints and session management ✓

### Phase 2: Tenant Search
**Goal**: Admin can quickly find any tenant in the system
**Depends on**: Phase 1
**Requirements**: IMP-01
**Success Criteria** (what must be TRUE):
  1. Admin can search tenants by partial name match
  2. Admin can search tenants by exact tenant ID
  3. Admin can search tenants by admin user email
  4. Search returns tenant details including status and tier
**Plans**: 1 plan

Plans:
- [x] 02-01-PLAN.md — Tenant search endpoint with auto-detection (name/ID/email) ✓

### Phase 3: Impersonation Core
**Goal**: Admin can access any tenant's dashboard as if they were the tenant admin
**Depends on**: Phase 2
**Requirements**: IMP-02, IMP-03, IMP-04, IMP-05
**Success Criteria** (what must be TRUE):
  1. Admin can start impersonation session for any tenant
  2. Impersonation token grants full tenant admin access to all tenant endpoints
  3. Admin can end impersonation and return to admin dashboard
  4. All impersonation start/end events are audit-logged with admin identity
  5. Audit log captures which tenant, which admin, start time, and end time
**Plans**: TBD

Plans:
- [ ] 03-01: Impersonation session management (start/end)
- [ ] 03-02: Impersonation token generation with tenant admin scope
- [ ] 03-03: Audit logging integration for impersonation events

### Phase 4: MSP Listing
**Goal**: Admin can see all MSP tenants at a glance
**Depends on**: Phase 1
**Requirements**: VIS-01, VIS-05
**Success Criteria** (what must be TRUE):
  1. Admin can list all MSP tenants in the system
  2. List shows status (active, suspended, trial) for each MSP
  3. List shows client organization count per MSP
  4. Admin can search MSPs by name or ID
  5. Admin can filter MSPs by status
**Plans**: TBD

Plans:
- [ ] 04-01: MSP listing endpoint with pagination
- [ ] 04-02: MSP search and filter capabilities

### Phase 5: MSP Drill-down
**Goal**: Admin can see detailed MSP information including all client organizations and usage
**Depends on**: Phase 4
**Requirements**: VIS-02, VIS-03, VIS-04
**Success Criteria** (what must be TRUE):
  1. Admin can view all client organizations under an MSP
  2. Admin can view usage metrics per MSP (queries, locations, users)
  3. Admin can view usage metrics per client organization
  4. Usage metrics show current period and historical data
**Plans**: TBD

Plans:
- [ ] 05-01: MSP client organizations endpoint
- [ ] 05-02: MSP usage metrics aggregation
- [ ] 05-03: Client organization usage metrics

### Phase 6: System Health
**Goal**: Admin can monitor system health and identify issues
**Depends on**: Phase 1
**Requirements**: SYS-01, SYS-02, SYS-03, SYS-04
**Success Criteria** (what must be TRUE):
  1. Admin can view DNS service status (policy-svc, dnsdist, unbound)
  2. Admin can view error rates for the last hour and 24 hours
  3. Admin can view recent error log entries
  4. Admin can view aggregate query volume across all tenants
  5. Admin can view ClickHouse and Redis connection status
**Plans**: TBD

Plans:
- [ ] 06-01: DNS service health check endpoint
- [ ] 06-02: Error rate and recent errors endpoint
- [ ] 06-03: Aggregate query volume endpoint
- [ ] 06-04: Storage connection status endpoint

### Phase 7: MSP Onboarding
**Goal**: Admin can create new MSP accounts without manual database work
**Depends on**: Phase 4
**Requirements**: ONB-01, ONB-02, ONB-03, ONB-04
**Success Criteria** (what must be TRUE):
  1. Admin can create a new MSP tenant account
  2. Admin can set initial MSP configuration (tier, limits)
  3. Admin can create an initial admin user for the MSP
  4. MSP receives welcome email with login credentials
  5. New MSP appears in MSP listing immediately
**Plans**: TBD

Plans:
- [ ] 07-01: MSP tenant creation endpoint
- [ ] 07-02: Initial MSP configuration and admin user creation
- [ ] 07-03: Welcome email integration

### Phase 8: Billing Operations
**Goal**: Admin can view and manage tenant billing
**Depends on**: Phase 4
**Requirements**: BIL-01, BIL-02, BIL-03, BIL-04, BIL-05
**Success Criteria** (what must be TRUE):
  1. Admin can view subscription status for any tenant
  2. Admin can view invoice history for any tenant
  3. Admin can apply credit/adjustment to tenant account
  4. Admin can manually change subscription tier
  5. Admin can extend trial or grace period
**Plans**: TBD

Plans:
- [ ] 08-01: Subscription status and invoice history endpoint
- [ ] 08-02: Credit/adjustment application endpoint
- [ ] 08-03: Subscription tier and trial management endpoints

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Admin Auth Foundation | 2/2 | ✓ Complete | 2026-01-18 |
| 2. Tenant Search | 1/1 | ✓ Complete | 2026-01-17 |
| 3. Impersonation Core | 0/3 | Not started | - |
| 4. MSP Listing | 0/2 | Not started | - |
| 5. MSP Drill-down | 0/3 | Not started | - |
| 6. System Health | 0/4 | Not started | - |
| 7. MSP Onboarding | 0/3 | Not started | - |
| 8. Billing Operations | 0/3 | Not started | - |

---
*Created: 2026-01-17*
*Last updated: 2026-01-17 after Phase 2 complete*
