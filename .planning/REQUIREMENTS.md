# Requirements: Nebula DNS Admin Dashboard

**Defined:** 2026-01-17
**Core Value:** Enable ops team to handle support escalations quickly through tenant impersonation

## v1 Requirements

Requirements for the admin dashboard backend API.

### Tenant Impersonation

- [x] **IMP-01**: Admin can search for a tenant by name, ID, or email ✓
- [x] **IMP-02**: Admin can start impersonation session for any tenant ✓
- [x] **IMP-03**: Impersonation grants full tenant admin access to dashboard ✓
- [x] **IMP-04**: Admin can end impersonation and return to admin dashboard ✓
- [x] **IMP-05**: All impersonation sessions are audit-logged (who, when, which tenant) ✓

### MSP/Client Visibility

- [x] **VIS-01**: Admin can list all MSP tenants with status and client count ✓
- [x] **VIS-02**: Admin can drill into MSP to see all client organizations ✓
- [x] **VIS-03**: Admin can view usage metrics per MSP (queries, locations, users) ✓
- [x] **VIS-04**: Admin can view usage metrics per client organization ✓
- [x] **VIS-05**: Admin can search/filter MSPs and clients ✓

### MSP Onboarding

- [x] **ONB-01**: Admin can create new MSP tenant account ✓
- [x] **ONB-02**: Admin can set initial MSP configuration (tier, limits) ✓
- [x] **ONB-03**: Admin can create initial admin user for MSP ✓
- [x] **ONB-04**: MSP receives welcome email with login credentials ✓

### Billing Operations

- [x] **BIL-01**: Admin can view subscription status for any tenant ✓
- [x] **BIL-02**: Admin can view invoice history for any tenant ✓
- [x] **BIL-03**: Admin can apply credit/adjustment to tenant account ✓
- [x] **BIL-04**: Admin can manually change subscription tier ✓
- [x] **BIL-05**: Admin can extend trial or grace period ✓

### System Health

- [x] **SYS-01**: Admin can view DNS service status (policy-svc, dnsdist, unbound) ✓
- [x] **SYS-02**: Admin can view error rates and recent errors ✓
- [x] **SYS-03**: Admin can view aggregate query volume across all tenants ✓
- [x] **SYS-04**: Admin can view ClickHouse and Redis connection status ✓

## v2 Requirements

Deferred to future release.

### Role-Based Admin Access

- **ROLE-01**: Admin roles (super-admin, support, billing-only)
- **ROLE-02**: Permission scoping per role
- **ROLE-03**: Admin user management

### Automated Alerting

- **ALRT-01**: Configure alert thresholds for system health
- **ALRT-02**: PagerDuty/Slack integration for alerts
- **ALRT-03**: Alert history and acknowledgment

## Out of Scope

| Feature | Reason |
|---------|--------|
| Customer-facing admin features | This is internal ops only |
| View-only impersonation mode | Full access needed to fix issues |
| Multi-region admin dashboard | Single deployment sufficient |
| Admin API for external use | Internal UI only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| IMP-01 | Phase 2 | Complete |
| IMP-02 | Phase 3 | Complete |
| IMP-03 | Phase 3 | Complete |
| IMP-04 | Phase 3 | Complete |
| IMP-05 | Phase 3 | Complete |
| VIS-01 | Phase 4 | Complete |
| VIS-02 | Phase 5 | Complete |
| VIS-03 | Phase 5 | Complete |
| VIS-04 | Phase 5 | Complete |
| VIS-05 | Phase 4 | Complete |
| ONB-01 | Phase 7 | Complete |
| ONB-02 | Phase 7 | Complete |
| ONB-03 | Phase 7 | Complete |
| ONB-04 | Phase 7 | Complete |
| BIL-01 | Phase 8 | Complete |
| BIL-02 | Phase 8 | Complete |
| BIL-03 | Phase 8 | Complete |
| BIL-04 | Phase 8 | Complete |
| BIL-05 | Phase 8 | Complete |
| SYS-01 | Phase 6 | Complete |
| SYS-02 | Phase 6 | Complete |
| SYS-03 | Phase 6 | Complete |
| SYS-04 | Phase 6 | Complete |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-01-17*
*Last updated: 2026-01-18 after Phase 8 complete — ALL v1 REQUIREMENTS COMPLETE*
