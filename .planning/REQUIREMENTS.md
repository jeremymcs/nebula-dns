# Requirements: Nebula DNS Mission Control Frontend

**Defined:** 2026-01-18
**Core Value:** Enable ops team to manage MSPs entirely through the UI — onboarding, billing, usage monitoring — without CLI or direct API calls.

## v1.1 Requirements

Requirements for Mission Control frontend integration. Each maps to roadmap phases.

### Admin Authentication UI

- [x] **AUTH-01**: Admin can log in with email and password
- [x] **AUTH-02**: Admin sees current session status in header
- [x] **AUTH-03**: Admin can log out and session is terminated
- [x] **AUTH-04**: Admin is redirected to login when session expires

### MSP Onboarding

- [ ] **ONBOARD-01**: Admin can access MSP onboarding wizard from dashboard
- [ ] **ONBOARD-02**: Wizard Step 1: Admin enters company information (name, domain)
- [ ] **ONBOARD-03**: Wizard Step 2: Admin creates initial admin user (email, temp password)
- [ ] **ONBOARD-04**: Wizard Step 3: Admin configures initial settings (tier, trial period)
- [ ] **ONBOARD-05**: Wizard Step 4: Admin reviews and confirms MSP creation
- [ ] **ONBOARD-06**: Admin receives confirmation with MSP details after creation

### MSP Listing

- [ ] **LIST-01**: Admin can view paginated list of all MSPs
- [ ] **LIST-02**: Admin can search MSPs by name
- [ ] **LIST-03**: Admin can see client count per MSP in list
- [ ] **LIST-04**: Admin can see subscription status per MSP in list
- [ ] **LIST-05**: Admin can click MSP row to navigate to detail view

### MSP Detail & Drill-Down

- [ ] **DETAIL-01**: Admin can view MSP overview (name, tier, status, created date)
- [ ] **DETAIL-02**: Admin can view list of MSP's clients
- [ ] **DETAIL-03**: Admin can see usage metrics (queries, blocked, charts)
- [ ] **DETAIL-04**: Admin can navigate to billing from MSP detail
- [ ] **DETAIL-05**: Admin can impersonate MSP tenant from detail view

### Tenant Search & Impersonation

- [ ] **IMP-01**: Admin can search tenants by name, email, or ID
- [ ] **IMP-02**: Admin sees search results with tenant details
- [ ] **IMP-03**: Admin can start impersonation session from search results
- [ ] **IMP-04**: Admin sees visual indicator when in impersonation mode
- [ ] **IMP-05**: Admin can end impersonation and return to admin context

### Billing Portal

- [ ] **BILL-01**: Admin can view tenant subscription status
- [ ] **BILL-02**: Admin can view invoice history with download links
- [ ] **BILL-03**: Admin can apply credits to tenant account
- [ ] **BILL-04**: Admin can change tenant tier
- [ ] **BILL-05**: Admin can extend trial period
- [ ] **BILL-06**: Admin can extend grace period

### Payment Methods (NEW Backend Required)

- [ ] **PAY-01**: Backend endpoint to list tenant payment methods
- [ ] **PAY-02**: Backend endpoint to add payment method (via Stripe)
- [ ] **PAY-03**: Backend endpoint to set default payment method
- [ ] **PAY-04**: Admin can view tenant's payment methods in UI
- [ ] **PAY-05**: Admin can add payment method for tenant
- [ ] **PAY-06**: Admin can set default payment method for tenant

### System Health Dashboard

- [ ] **HEALTH-01**: Admin can view DNS service status (up/down/degraded)
- [ ] **HEALTH-02**: Admin can view error rates and recent errors
- [ ] **HEALTH-03**: Admin can view aggregate query volume metrics
- [ ] **HEALTH-04**: Dashboard auto-refreshes health data

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Admin User Management

- **ADMIN-01**: Super admin can add new admin users
- **ADMIN-02**: Super admin can remove admin users
- **ADMIN-03**: Super admin can assign admin roles

### Automated Alerting

- **ALERT-01**: System sends alerts to PagerDuty on critical errors
- **ALERT-02**: System sends alerts to Slack channel
- **ALERT-03**: Admin can configure alert thresholds

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Role-based admin access | Small team (2-5), complexity not justified yet |
| Customer-facing admin features | This is internal ops only |
| Real-time WebSocket updates | Polling/refresh sufficient for ops dashboard |
| Dark mode | Nice-to-have, not essential for ops workflow |
| Mobile responsive admin UI | Ops team uses desktop only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 9 | Complete |
| AUTH-02 | Phase 9 | Complete |
| AUTH-03 | Phase 9 | Complete |
| AUTH-04 | Phase 9 | Complete |
| ONBOARD-01 | Phase 16 | Pending |
| ONBOARD-02 | Phase 16 | Pending |
| ONBOARD-03 | Phase 16 | Pending |
| ONBOARD-04 | Phase 16 | Pending |
| ONBOARD-05 | Phase 16 | Pending |
| ONBOARD-06 | Phase 16 | Pending |
| LIST-01 | Phase 11 | Pending |
| LIST-02 | Phase 11 | Pending |
| LIST-03 | Phase 11 | Pending |
| LIST-04 | Phase 11 | Pending |
| LIST-05 | Phase 11 | Pending |
| DETAIL-01 | Phase 12 | Pending |
| DETAIL-02 | Phase 12 | Pending |
| DETAIL-03 | Phase 12 | Pending |
| DETAIL-04 | Phase 12 | Pending |
| DETAIL-05 | Phase 12 | Pending |
| IMP-01 | Phase 13 | Pending |
| IMP-02 | Phase 13 | Pending |
| IMP-03 | Phase 13 | Pending |
| IMP-04 | Phase 13 | Pending |
| IMP-05 | Phase 13 | Pending |
| BILL-01 | Phase 14 | Pending |
| BILL-02 | Phase 14 | Pending |
| BILL-03 | Phase 14 | Pending |
| BILL-04 | Phase 14 | Pending |
| BILL-05 | Phase 14 | Pending |
| BILL-06 | Phase 14 | Pending |
| PAY-01 | Phase 10 | Pending |
| PAY-02 | Phase 10 | Pending |
| PAY-03 | Phase 10 | Pending |
| PAY-04 | Phase 14 | Pending |
| PAY-05 | Phase 14 | Pending |
| PAY-06 | Phase 14 | Pending |
| HEALTH-01 | Phase 15 | Pending |
| HEALTH-02 | Phase 15 | Pending |
| HEALTH-03 | Phase 15 | Pending |
| HEALTH-04 | Phase 15 | Pending |

**Coverage:**
- v1.1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0

---
*Requirements defined: 2026-01-18*
*Last updated: 2026-01-18 after roadmap creation*
