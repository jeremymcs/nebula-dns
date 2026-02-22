# PRD: Unified User Tiers

## Introduction

Consolidate the separate `/partner` MSP portal into the main Nebula DNS application with a unified tier system. Users will be categorized into three tiers—Home, Enterprise, and MSP—each with configurable limits driven by Stripe subscription plans. This simplifies the codebase, improves user experience, and enables usage-based billing across all customer types.

## Goals

- Eliminate the separate partner portal by merging MSP functionality into the main dashboard
- Implement three user tiers: Home (residential), Enterprise (corporate), and MSP (managed service provider)
- Enable configurable location/client limits per subscription plan via Stripe metadata
- Implement usage-based billing (per location for Home/Enterprise, per client for MSP)
- Allow MSP users to manage and switch between client tenants from a unified "Clients" tab
- Migrate all existing partner data into the new unified system
- Remove legacy partner portal code after migration

## User Stories

### Phase 1: Database & Core Tier System

#### US-001: Add Tier Field to Tenant Entity
**Description:** As a system, I need to categorize tenants by tier so that appropriate features and limits can be applied.

**Acceptance Criteria:**
- [ ] Add `tier` enum column to tenants table: `'home' | 'enterprise' | 'msp'`
- [ ] Add `locationLimit` nullable integer column (null = unlimited)
- [ ] Add `clientLimit` nullable integer column for MSP tier (null = unlimited)
- [ ] Default tier is `'home'` for new tenants
- [ ] Generate and run migration successfully
- [ ] Existing tenants default to `'enterprise'` tier
- [ ] Typecheck/lint passes

#### US-002: Create Subscription Plan Limits Configuration
**Description:** As an admin, I want subscription plans to define tier limits so that billing and features are connected.

**Acceptance Criteria:**
- [ ] Create `subscription_plan_limits` table with: `planId`, `tier`, `locationLimit`, `clientLimit`, `pricePerLocation`, `pricePerClient`
- [ ] Seed default plans: Home Basic (3 locations), Home Plus (10 locations), Enterprise (50 locations), MSP Starter (10 clients), MSP Pro (100 clients)
- [ ] Add service method to fetch limits by Stripe price ID
- [ ] Generate and run migration successfully
- [ ] Typecheck/lint passes

#### US-003: Implement Limit Enforcement Service
**Description:** As a system, I need to enforce location/client limits so that users cannot exceed their plan allowance.

**Acceptance Criteria:**
- [ ] Create `LimitsService` with methods: `canCreateLocation(tenantId)`, `canCreateClient(tenantId)`, `getRemainingLocations(tenantId)`, `getRemainingClients(tenantId)`
- [ ] Service checks current count against tenant's limit (from subscription)
- [ ] Return `{ allowed: boolean, current: number, limit: number, remaining: number }`
- [ ] Throw `LimitExceededException` with upgrade prompt when limit reached
- [ ] Unit tests for all limit scenarios
- [ ] Typecheck/lint passes

#### US-004: Add Limit Checks to Location Creation
**Description:** As a user, I should be prevented from creating locations beyond my plan limit so that billing remains accurate.

**Acceptance Criteria:**
- [ ] LocationsService.create() calls LimitsService.canCreateLocation() before creation
- [ ] Returns 403 with message "Location limit reached. Please upgrade your plan." when exceeded
- [ ] Response includes `{ limitReached: true, current: X, limit: Y, upgradeUrl: '/settings/billing' }`
- [ ] Existing location creation tests still pass
- [ ] Typecheck/lint passes

### Phase 2: MSP Client Management

#### US-005: Create MSP Client Entity and Relationships
**Description:** As an MSP, I need a formal relationship between my tenant and client tenants so that I can manage them.

**Acceptance Criteria:**
- [ ] Create `msp_clients` junction table: `mspTenantId`, `clientTenantId`, `createdAt`, `status` (active/suspended)
- [ ] Add foreign keys to tenants table
- [ ] Add `managedByMspId` nullable column to tenants table
- [ ] Create MspClientsService with CRUD operations
- [ ] Unique constraint: one client can only have one MSP
- [ ] Typecheck/lint passes

#### US-006: MSP Client CRUD API Endpoints
**Description:** As an MSP user, I need API endpoints to manage my client organizations.

**Acceptance Criteria:**
- [ ] `GET /api/v1/msp/clients` - List all clients for current MSP tenant
- [ ] `POST /api/v1/msp/clients` - Create new client organization (creates tenant + links to MSP)
- [ ] `GET /api/v1/msp/clients/:id` - Get client details
- [ ] `PATCH /api/v1/msp/clients/:id` - Update client (name, status)
- [ ] `DELETE /api/v1/msp/clients/:id` - Remove client relationship (optionally delete tenant)
- [ ] All endpoints require MSP tier, return 403 for other tiers
- [ ] Limit check before creating new client
- [ ] Swagger documentation for all endpoints
- [ ] Typecheck/lint passes

#### US-007: MSP Client Context Switching
**Description:** As an MSP user, I want to switch into a client's context so that I can manage their DNS settings.

**Acceptance Criteria:**
- [ ] `POST /api/v1/msp/clients/:id/switch` - Returns new JWT scoped to client tenant
- [ ] New JWT includes `mspParentTenantId` claim to allow switching back
- [ ] `POST /api/v1/msp/switch-back` - Returns JWT for original MSP tenant
- [ ] Switched context has full admin access to client tenant
- [ ] Audit log entry created for context switches
- [ ] Session tracks original MSP user for attribution
- [ ] Typecheck/lint passes

#### US-008: MSP Clients Dashboard Tab
**Description:** As an MSP user, I want a "Clients" tab in my dashboard to view and manage all client organizations.

**Acceptance Criteria:**
- [ ] New "Clients" navigation item visible only for MSP tier tenants
- [ ] Clients list page shows: client name, status, location count, created date
- [ ] Search/filter by client name
- [ ] "Add Client" button opens creation modal
- [ ] Click client row to view details or "Switch to Client" button
- [ ] Shows remaining client slots: "Using 5 of 10 clients"
- [ ] Typecheck/lint passes
- [ ] Verify in browser

#### US-009: MSP Client Switcher in Header
**Description:** As an MSP user managing a client, I want to see which client I'm viewing and easily switch back.

**Acceptance Criteria:**
- [ ] When in client context, header shows "Managing: [Client Name]" badge
- [ ] Badge is visually distinct (different color, icon)
- [ ] Click badge shows dropdown: "Switch back to [MSP Name]" and "Switch to different client"
- [ ] Keyboard shortcut (Cmd/Ctrl + Shift + M) to toggle switcher
- [ ] Badge not visible when in own MSP context
- [ ] Typecheck/lint passes
- [ ] Verify in browser

#### US-010: MSP Client Creation Flow
**Description:** As an MSP user, I want to create a new client organization with initial setup.

**Acceptance Criteria:**
- [ ] Modal form with fields: Organization Name, Admin Email, Initial Location (optional)
- [ ] Creates new tenant with tier='enterprise' and managedByMspId set
- [ ] Creates admin user for client with generated password
- [ ] Sends welcome email to admin with login credentials
- [ ] Option to apply MSP template policies to new client
- [ ] Success shows "Client created" with option to switch to client
- [ ] Typecheck/lint passes
- [ ] Verify in browser

### Phase 3: Usage-Based Billing Integration

#### US-011: Stripe Metered Billing for Locations
**Description:** As a system, I need to report location usage to Stripe for usage-based billing.

**Acceptance Criteria:**
- [ ] Create `BillingMeterService` with `reportLocationUsage(tenantId)` method
- [ ] On location create/delete, report current count to Stripe usage records
- [ ] Use Stripe metered billing API with `subscription_item` usage records
- [ ] Handle Stripe API errors gracefully with retry logic
- [ ] Log all billing events to audit log
- [ ] Typecheck/lint passes

#### US-012: Stripe Metered Billing for MSP Clients
**Description:** As a system, I need to report client count to Stripe for MSP usage-based billing.

**Acceptance Criteria:**
- [ ] Extend `BillingMeterService` with `reportClientUsage(mspTenantId)` method
- [ ] On client create/delete, report current count to Stripe usage records
- [ ] MSP subscriptions use different price ID for client metering
- [ ] Monthly usage summary available via API
- [ ] Typecheck/lint passes

#### US-013: Usage Dashboard Widget
**Description:** As a user, I want to see my current usage vs limits on the dashboard.

**Acceptance Criteria:**
- [ ] Dashboard widget shows: "Locations: 5/10 used" with progress bar
- [ ] For MSP: additional "Clients: 8/25 used" metric
- [ ] Progress bar changes color: green (<70%), yellow (70-90%), red (>90%)
- [ ] "Upgrade" button when approaching limit (>80%)
- [ ] Click widget navigates to billing page
- [ ] Typecheck/lint passes
- [ ] Verify in browser

#### US-014: Billing Page Usage Breakdown
**Description:** As a user, I want to see detailed usage breakdown on my billing page.

**Acceptance Criteria:**
- [ ] Current billing period usage table
- [ ] For Enterprise/Home: list of locations with creation dates
- [ ] For MSP: list of clients with location counts per client
- [ ] Projected monthly cost based on current usage
- [ ] Usage history chart (last 6 months)
- [ ] Download usage report as CSV
- [ ] Typecheck/lint passes
- [ ] Verify in browser

### Phase 4: Tier-Specific UI Adaptations

#### US-015: Home Tier Dashboard Simplification
**Description:** As a Home user, I want a simplified dashboard focused on family/residential use.

**Acceptance Criteria:**
- [ ] Hide advanced features: SIEM, API Keys, Webhooks, Scheduled Reports
- [ ] Rename "Locations" to "Networks" in navigation
- [ ] Show family-friendly categories prominently (Safe Search, Content Filtering)
- [ ] Simplified policy editor with presets: "Kids", "Teens", "Adults"
- [ ] Dashboard shows: blocked threats today, top blocked categories, active networks
- [ ] Typecheck/lint passes
- [ ] Verify in browser

#### US-016: Enterprise Tier Full Feature Access
**Description:** As an Enterprise user, I want access to all professional features.

**Acceptance Criteria:**
- [ ] All features visible: SIEM, API Keys, Webhooks, Scheduled Reports, Audit Logs
- [ ] Advanced policy editor with full category control
- [ ] Team management with role-based access
- [ ] SSO/SAML configuration available
- [ ] Priority support badge/link visible
- [ ] Typecheck/lint passes
- [ ] Verify in browser

#### US-017: MSP Tier Multi-Tenant Features
**Description:** As an MSP user, I want features specifically for managing multiple clients.

**Acceptance Criteria:**
- [ ] "Clients" tab in main navigation (from US-008)
- [ ] "Templates" section for policy templates to apply to clients
- [ ] Bulk actions: apply policy to multiple clients
- [ ] Cross-client reporting: aggregate stats across all clients
- [ ] White-label settings (custom branding for client portals)
- [ ] Typecheck/lint passes
- [ ] Verify in browser

#### US-018: Dynamic Navigation Based on Tier
**Description:** As a user, I want the navigation to show only features available to my tier.

**Acceptance Criteria:**
- [ ] Create `TierFeatureService` that maps tier to allowed features
- [ ] Navigation component filters items based on tenant tier
- [ ] API endpoints return 403 for tier-restricted features
- [ ] Middleware validates tier access on all routes
- [ ] Feature flags can override tier restrictions (for trials/upgrades)
- [ ] Typecheck/lint passes
- [ ] Verify in browser

### Phase 5: Migration & Cleanup

#### US-019: Migrate Partner Tenants to MSP Tier
**Description:** As a system, I need to migrate existing partner data to the new unified tier system.

**Acceptance Criteria:**
- [ ] Migration script identifies all partner tenants from `partners` table
- [ ] Sets `tier = 'msp'` on partner-linked tenants
- [ ] Creates `msp_clients` records for existing partner-client relationships
- [ ] Preserves all existing data (users, policies, locations)
- [ ] Migration is idempotent (safe to run multiple times)
- [ ] Dry-run mode available for testing
- [ ] Typecheck/lint passes

#### US-020: Migrate Partner Users to Main User Table
**Description:** As a system, I need to merge partner users into the main users table.

**Acceptance Criteria:**
- [ ] Partner users get standard user records with MSP tenant association
- [ ] Preserve original roles (map partner roles to standard roles)
- [ ] Handle email conflicts (append suffix or prompt for resolution)
- [ ] Partner-specific fields mapped to user metadata
- [ ] Login credentials remain valid after migration
- [ ] Typecheck/lint passes

#### US-021: Update Existing Tenants with Default Tier
**Description:** As a system, I need to categorize existing tenants by their characteristics.

**Acceptance Criteria:**
- [ ] Tenants with <5 locations default to 'home' tier
- [ ] Tenants with 5+ locations default to 'enterprise' tier
- [ ] Tenants with partner relationships set to 'msp' tier
- [ ] Admin can override tier assignments before go-live
- [ ] Notification sent to affected users about tier assignment
- [ ] Typecheck/lint passes

#### US-022: Remove Partner Portal Routes
**Description:** As a developer, I want to remove the legacy partner portal to simplify the codebase.

**Acceptance Criteria:**
- [ ] Delete `/partner/*` pages from UI
- [ ] Remove partner-specific API controllers (after ensuring migration complete)
- [ ] Add redirects from old `/partner/*` routes to new locations
- [ ] Update navigation config to remove partner links
- [ ] Remove partner-specific components and hooks
- [ ] Typecheck/lint passes

#### US-023: Remove Partner Database Tables
**Description:** As a developer, I want to clean up legacy partner tables after successful migration.

**Acceptance Criteria:**
- [ ] Create "drop" migration for partner tables (reversible)
- [ ] Tables to remove: `partners`, `partner_users`, `partner_invitations`
- [ ] Migration only runs after verification that all data migrated
- [ ] Backup script creates JSON dump before deletion
- [ ] Migration includes rollback procedure
- [ ] Typecheck/lint passes

#### US-024: Update Documentation and API Docs
**Description:** As a developer, I want documentation to reflect the new tier system.

**Acceptance Criteria:**
- [ ] Update API documentation with new MSP endpoints
- [ ] Remove partner portal documentation
- [ ] Add tier system explanation to admin guide
- [ ] Update Swagger/OpenAPI spec
- [ ] Add migration guide for existing partners
- [ ] Typecheck/lint passes

### Phase 6: Additional Tier Features

#### US-027: MSP Managed-By Badge for Clients
**Description:** As a client managed by an MSP, I want to see who manages my account so I know who to contact for support.

**Acceptance Criteria:**
- [ ] Client dashboard header shows "Managed by [MSP Name]" badge
- [ ] Badge includes MSP contact email on hover/click
- [ ] Badge links to MSP's support page if configured
- [ ] Badge only visible to users of MSP-managed tenants
- [ ] MSP can customize the displayed name in their settings
- [ ] Typecheck/lint passes
- [ ] Verify in browser

#### US-028: MSP Subscription Lapse Grace Period
**Description:** As a system, I need to handle MSP subscription lapses to protect revenue while giving clients time to respond.

**Acceptance Criteria:**
- [ ] When MSP subscription lapses, start 30-day grace period
- [ ] During grace period: clients see warning banner "Service ending in X days"
- [ ] MSP receives daily email reminders during grace period
- [ ] Client admins receive notification at day 1, 7, 14, 21, 28
- [ ] After 30 days: set all client DNS responses to NXDOMAIN
- [ ] Store lapse state in tenant: `subscriptionStatus: 'active' | 'grace' | 'suspended'`
- [ ] Admin can manually extend grace period
- [ ] Typecheck/lint passes

#### US-029: MSP Subscription Lapse DNS Cutoff
**Description:** As a system, I need to stop DNS resolution for lapsed MSP clients to enforce payment.

**Acceptance Criteria:**
- [ ] Policy service checks tenant `subscriptionStatus` before resolution
- [ ] Suspended tenants receive NXDOMAIN for all queries
- [ ] Block page shows "Service suspended - contact your provider"
- [ ] Restoration is immediate upon subscription renewal
- [ ] Audit log records suspension and restoration events
- [ ] Typecheck/lint passes

#### US-030: Home Tier Family Members
**Description:** As a Home tier user, I want to invite family members so they can view and manage our home network protection.

**Acceptance Criteria:**
- [ ] Home tier tenants can invite up to 5 family members
- [ ] New role: `member` with permissions: view dashboard, view policies, edit safe search settings
- [ ] Members cannot: create/delete locations, change billing, invite others
- [ ] Invitation flow via email with accept/decline
- [ ] Family members list in Settings > Family
- [ ] Owner can remove family members at any time
- [ ] Typecheck/lint passes
- [ ] Verify in browser

#### US-031: Family Member Invitation Flow
**Description:** As a Home tier owner, I want a simple invitation flow to add family members.

**Acceptance Criteria:**
- [ ] "Invite Family Member" button in Settings > Family
- [ ] Form: email address, optional display name
- [ ] Invitation email with one-click accept link
- [ ] Accept flow: create account or link existing account
- [ ] Pending invitations shown with resend/cancel options
- [ ] Error if inviting 6th member: "Family member limit reached (5/5)"
- [ ] Typecheck/lint passes
- [ ] Verify in browser

#### US-032: Tier Upgrade Trial System
**Description:** As a user, I want to try a higher tier before committing so I can evaluate the features.

**Acceptance Criteria:**
- [ ] "Start 14-day free trial" button on upgrade prompts
- [ ] Trial creates temporary subscription with trial period in Stripe
- [ ] During trial: full access to higher tier features
- [ ] Trial banner shows days remaining: "Trial ends in X days"
- [ ] 3-day warning email before trial ends
- [ ] After trial: auto-downgrade to original tier unless converted
- [ ] One trial per tier per tenant (no repeat trials)
- [ ] Typecheck/lint passes
- [ ] Verify in browser

#### US-033: Trial Conversion Flow
**Description:** As a user on a trial, I want a smooth conversion to paid so I don't lose my settings.

**Acceptance Criteria:**
- [ ] "Convert to paid" button in trial banner
- [ ] Click opens billing page with trial tier pre-selected
- [ ] Adding payment method converts trial to paid immediately
- [ ] All data and settings preserved on conversion
- [ ] Confirmation email on successful conversion
- [ ] If trial expires without conversion: graceful downgrade with data preserved
- [ ] Typecheck/lint passes
- [ ] Verify in browser

#### US-034: MSP Template Versioning
**Description:** As an MSP, I want template version history so I can rollback if a template change causes issues.

**Acceptance Criteria:**
- [ ] Each template save creates a new version record
- [ ] Version table: `templateId`, `version`, `config`, `createdAt`, `createdBy`
- [ ] Templates show version number: "v1", "v2", etc.
- [ ] "View History" shows list of all versions with timestamps
- [ ] Click version to view diff against current
- [ ] Typecheck/lint passes

#### US-035: MSP Template Rollback
**Description:** As an MSP, I want to rollback a template to a previous version if the current version has issues.

**Acceptance Criteria:**
- [ ] "Rollback to this version" button on each historical version
- [ ] Rollback creates new version (doesn't delete history)
- [ ] Confirmation modal: "Rollback to v3? This will create v6 with v3's configuration"
- [ ] After rollback: option to re-apply template to all clients using it
- [ ] Audit log records rollback with old/new version numbers
- [ ] Typecheck/lint passes
- [ ] Verify in browser

#### US-036: MSP Template Application to Clients
**Description:** As an MSP, I want to apply updated templates to clients so they get the latest policies.

**Acceptance Criteria:**
- [ ] Template detail page shows "Clients using this template" list
- [ ] "Apply to all clients" button pushes current version to all linked clients
- [ ] "Apply to selected" allows choosing specific clients
- [ ] Application is async with progress indicator
- [ ] Results summary: "Applied to 8/10 clients. 2 failed (see details)"
- [ ] Failed applications can be retried individually
- [ ] Typecheck/lint passes
- [ ] Verify in browser

### Phase 7: Testing & Validation

#### US-037: Tier System Integration Tests
**Description:** As a developer, I want comprehensive tests for the tier system.

**Acceptance Criteria:**
- [ ] E2E tests for each tier's feature access
- [ ] Tests for limit enforcement (location and client limits)
- [ ] Tests for MSP client switching
- [ ] Tests for usage billing reporting
- [ ] Tests for tier upgrade/downgrade flows
- [ ] Tests for trial start/convert/expire flows
- [ ] Tests for family member invitation and permissions
- [ ] Tests for MSP subscription lapse and DNS cutoff
- [ ] All tests pass in CI
- [ ] Typecheck/lint passes

#### US-038: Migration Validation Tests
**Description:** As a developer, I want to verify migration correctness.

**Acceptance Criteria:**
- [ ] Test migration with production data snapshot
- [ ] Verify all partner relationships preserved
- [ ] Verify all user logins work post-migration
- [ ] Verify billing subscriptions remain valid
- [ ] Verify no data loss in any table
- [ ] Performance test with large dataset
- [ ] Typecheck/lint passes

## Functional Requirements

- FR-1: Tenants must have a `tier` field with values: `home`, `enterprise`, or `msp`
- FR-2: Subscription plans define location/client limits via Stripe metadata
- FR-3: Location creation must check and enforce tenant limits
- FR-4: MSP tenants can create, view, update, and delete client organizations
- FR-5: MSP users can switch context to any client tenant they manage
- FR-6: Context switches must be audited with timestamp and user
- FR-7: Usage (locations/clients) must be reported to Stripe for metered billing
- FR-8: Navigation and feature access must be filtered by tier
- FR-9: Home tier hides advanced features (SIEM, API Keys, Webhooks)
- FR-10: MSP tier shows Clients tab and multi-tenant management features
- FR-11: All existing partner data must be migrated without data loss
- FR-12: Old partner portal routes must redirect to new unified locations
- FR-13: Usage dashboard widget must show current usage vs limits
- FR-14: Billing page must show detailed usage breakdown with projected costs
- FR-15: MSP-managed clients must see "Managed by [MSP Name]" badge
- FR-16: MSP subscription lapse triggers 30-day grace period, then DNS cutoff
- FR-17: Suspended tenants receive NXDOMAIN responses for all DNS queries
- FR-18: Home tier users can invite up to 5 family members with "member" role
- FR-19: Family members have limited permissions (view + safe search edit only)
- FR-20: Users can start 14-day free trial of any higher tier (once per tier)
- FR-21: Trial expiration auto-downgrades to original tier with data preserved
- FR-22: MSP templates must maintain full version history
- FR-23: MSP template rollback creates new version (non-destructive)
- FR-24: MSP can bulk-apply templates to multiple clients

## Non-Goals (Out of Scope)

- Custom tier creation (only Home/Enterprise/MSP)
- Self-service tier upgrades in this phase (manual via support)
- White-label domain customization (deferred to future PRD)
- MSP client self-onboarding portal
- Per-client billing (all billing through MSP)
- Mobile app changes
- Internationalization of new UI components

## Design Considerations

- Reuse existing dashboard layout and components
- MSP client switcher should be prominent but not intrusive
- Progress bars for usage should match existing design system colors
- Tier badges should be subtle in header (not distracting)
- Client list should follow existing table patterns (pagination, search, filters)

## Technical Considerations

- JWT tokens need new claims: `tier`, `mspParentTenantId`, `managedByMspId`
- Context switching creates new tokens (not session modification)
- Stripe webhook handlers need updates for usage-based billing
- Consider Redis caching for limit checks (high-frequency operation)
- Migration should be run during maintenance window
- Feature flags for gradual rollout of tier restrictions
- Stripe trial subscriptions use `trial_period_days` parameter
- Grace period tracking requires scheduled job (daily cron) to check lapsed subscriptions
- Policy service needs fast path to check `subscriptionStatus` (Redis cache recommended)
- Template versioning uses same pattern as policy versioning (append-only)
- Family member "member" role needs new permission set in RBAC system
- DNS cutoff must be coordinated between API (status update) and Policy Service (enforcement)

## Success Metrics

- 100% of partner data successfully migrated
- Zero increase in support tickets for MSP users
- Location limit checks complete in <50ms
- Client context switch completes in <500ms
- Usage billing accuracy: 99.9% match between internal counts and Stripe
- Trial-to-paid conversion rate >20%
- Family member invitation acceptance rate >80%
- MSP template rollback completes in <2 seconds
- DNS cutoff enforcement: 100% of suspended tenants blocked within 1 hour of grace period end

## Resolved Decisions

1. **MSP client visibility:** Yes, show "Managed by [MSP Name]" badge in client dashboard
2. **MSP subscription lapse:** DNS stops resolving after 30-day grace period (hard cutoff)
3. **Home tier family members:** Yes, up to 5 family members with "member" role (view + limited edit)
4. **Trial periods:** Yes, 14-day free trial of higher tier
5. **MSP template versioning:** Yes, full version history with rollback (like policies)
