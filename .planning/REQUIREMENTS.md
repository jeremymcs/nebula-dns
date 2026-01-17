# Requirements: Nebula DNS Admin Dashboard

**Defined:** 2026-01-17
**Core Value:** Enable ops team to handle support escalations quickly through tenant impersonation

## v1 Requirements

Requirements for the admin dashboard backend API.

### Tenant Impersonation

- [ ] **IMP-01**: Admin can search for a tenant by name, ID, or email
- [ ] **IMP-02**: Admin can start impersonation session for any tenant
- [ ] **IMP-03**: Impersonation grants full tenant admin access to dashboard
- [ ] **IMP-04**: Admin can end impersonation and return to admin dashboard
- [ ] **IMP-05**: All impersonation sessions are audit-logged (who, when, which tenant)

### MSP/Client Visibility

- [ ] **VIS-01**: Admin can list all MSP tenants with status and client count
- [ ] **VIS-02**: Admin can drill into MSP to see all client organizations
- [ ] **VIS-03**: Admin can view usage metrics per MSP (queries, locations, users)
- [ ] **VIS-04**: Admin can view usage metrics per client organization
- [ ] **VIS-05**: Admin can search/filter MSPs and clients

### MSP Onboarding

- [ ] **ONB-01**: Admin can create new MSP tenant account
- [ ] **ONB-02**: Admin can set initial MSP configuration (tier, limits)
- [ ] **ONB-03**: Admin can create initial admin user for MSP
- [ ] **ONB-04**: MSP receives welcome email with login credentials

### Billing Operations

- [ ] **BIL-01**: Admin can view subscription status for any tenant
- [ ] **BIL-02**: Admin can view invoice history for any tenant
- [ ] **BIL-03**: Admin can apply credit/adjustment to tenant account
- [ ] **BIL-04**: Admin can manually change subscription tier
- [ ] **BIL-05**: Admin can extend trial or grace period

### System Health

- [ ] **SYS-01**: Admin can view DNS service status (policy-svc, dnsdist, unbound)
- [ ] **SYS-02**: Admin can view error rates and recent errors
- [ ] **SYS-03**: Admin can view aggregate query volume across all tenants
- [ ] **SYS-04**: Admin can view ClickHouse and Redis connection status

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
| IMP-01 | TBD | Pending |
| IMP-02 | TBD | Pending |
| IMP-03 | TBD | Pending |
| IMP-04 | TBD | Pending |
| IMP-05 | TBD | Pending |
| VIS-01 | TBD | Pending |
| VIS-02 | TBD | Pending |
| VIS-03 | TBD | Pending |
| VIS-04 | TBD | Pending |
| VIS-05 | TBD | Pending |
| ONB-01 | TBD | Pending |
| ONB-02 | TBD | Pending |
| ONB-03 | TBD | Pending |
| ONB-04 | TBD | Pending |
| BIL-01 | TBD | Pending |
| BIL-02 | TBD | Pending |
| BIL-03 | TBD | Pending |
| BIL-04 | TBD | Pending |
| BIL-05 | TBD | Pending |
| SYS-01 | TBD | Pending |
| SYS-02 | TBD | Pending |
| SYS-03 | TBD | Pending |
| SYS-04 | TBD | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 0
- Unmapped: 23 ⚠️

---
*Requirements defined: 2026-01-17*
*Last updated: 2026-01-17 after initial definition*
