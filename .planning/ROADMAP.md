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
- [x] **Phase 3: Impersonation Core** - Start/end impersonation sessions with audit logging ✓
- [x] **Phase 4: MSP Listing** - View all MSPs with status, client count, and search ✓
- [x] **Phase 5: MSP Drill-down** - View MSP client organizations and usage metrics ✓
- [x] **Phase 6: System Health** - DNS service status, error rates, and connection health ✓
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
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Impersonation DTOs, service methods, and controller endpoints ✓
- [x] 03-02-PLAN.md — JwtStrategy impersonation awareness and blacklist integration ✓

### Phase 4: MSP Listing
**Goal**: Admin can see all MSP tenants at a glance
**Depends on**: Phase 1
**Requirements**: VIS-01, VIS-05
**Success Criteria** (what must be TRUE):
  1. Admin can list all MSP tenants in the system
  2. List shows status (active, suspended, cancelled) for each MSP
  3. List shows client organization count per MSP
  4. Admin can search MSPs by name or ID
  5. Admin can filter MSPs by status
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — MSP listing endpoint with pagination and client count aggregation ✓
- [x] 04-02-PLAN.md — MSP search and filter capabilities ✓

### Phase 5: MSP Drill-down
**Goal**: Admin can see detailed MSP information including all client organizations and usage
**Depends on**: Phase 4
**Requirements**: VIS-02, VIS-03, VIS-04
**Success Criteria** (what must be TRUE):
  1. Admin can view all client organizations under an MSP
  2. Admin can view usage metrics per MSP (queries, locations, users)
  3. Admin can view usage metrics per client organization
  4. Usage metrics show current period and historical data
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — MSP detail endpoint and client organizations listing ✓
- [x] 05-02-PLAN.md — Usage metrics aggregation via ClickHouse ✓

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
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — System health DTOs and AdminHealthService infrastructure ✓
- [x] 06-02-PLAN.md — System health controller endpoints and tests ✓

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
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — MSP onboarding DTOs and transactional tenant+user creation service
- [ ] 07-02-PLAN.md — MSP creation endpoint and welcome email integration

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
| 3. Impersonation Core | 2/2 | ✓ Complete | 2026-01-18 |
| 4. MSP Listing | 2/2 | ✓ Complete | 2026-01-17 |
| 5. MSP Drill-down | 2/2 | ✓ Complete | 2026-01-17 |
| 6. System Health | 2/2 | ✓ Complete | 2026-01-18 |
| 7. MSP Onboarding | 0/2 | Not started | - |
| 8. Billing Operations | 0/3 | Not started | - |

---
*Created: 2026-01-17*
*Last updated: 2026-01-18 after Phase 7 planning complete*
