# Flux Shield Admin Console — Completeness Evaluation

**Date:** 2026-10-31  
**Scope:** `admin-ui/`, `api/src/modules/admin*`, related alerting/billing modules  
**Production URL:** https://admin.shield.fluxlabs.net (not exercised in this run; local stack used)  
**Evaluator:** Cursor Cloud Agent (docs-only PR)

---

## Executive summary

The Flux Shield Admin Console delivers a **narrow slice** of platform operations: MSP listing and onboarding, tenant search with impersonation, system health, outbound alerting configuration, super-admin user listing, and a tenant billing surface. Against the **full MSP platform admin baseline** described in this evaluation (tenants/partners, infra, threat data, agents, audit, secrets, support/DMARC hooks), overall completeness is about **28–32%**. Against the **documented v1.2 admin-ui phases** in `.planning/phases/15–22` (health, MSP wizard, RBAC UI, admin users, alerting), implementation is closer to **~70%**, but several shipped flows **fail at runtime** due to API routing and schema gaps.

**Top blockers:** (1) **Broken admin-user sub-routes** — `GET /admin/users/invites` and `GET /admin/users/activity` are swallowed by `GET /admin/users/:id` (400 “uuid expected”), breaking pending invites and activity in the Admin Users UI. (2) **Dashboard is mostly fiction** — hardcoded KPIs and a dead **View Tenants** link to `/tenants` (no page). (3) **Tenant billing admin page errors** — subscription API 500 when `trial_history` is missing from the DB bootstrap path. (4) **No admin MFA challenge or enrollment UI** despite backend MFA entities and reset flows. (5) **RBAC not enforced by default** (`ADMIN_RBAC_ENABLED=false`). (6) **Health metrics can be mock data** without a clear UI warning when ClickHouse is down. (7) **Invitations and operational email** depend on SendGrid (logged-only locally).

**Local test method:** PostgreSQL 16 + Redis installed on the agent VM (Docker unavailable); schema from `scripts/init-postgres.sql`; API on `:4010`, admin-ui on `:4012` with `/backend` proxy. Super-admin: seeded `admin@nebula.local` with `mfa_setup_complete=true` (password not committed — matches dev seed in SQL). **No MFA step at login** for that account; dev-only login shortcut on the login page fills the same seed email. Playwright captured 20 full-page screenshots (desktop + iPhone) under `docs/reviews/admin-console-2026-10-31/`; telemetry in `browser-telemetry.json`.

---

## Route and navigation inventory

### App routes (`admin-ui/src/app/`)

| Route | Nav item | Primary data hooks / API |
|-------|----------|---------------------------|
| `/login` | — | `POST /admin/login` |
| `/` | Dashboard | **None** (static placeholders) |
| `/msps` | MSPs | `GET /admin/msp/tenants` |
| `/msps/new` | (CTA) | `POST /admin/msp/tenants` |
| `/msps/[id]` | — | `GET /admin/msp/tenants/:id`, `GET .../clients`, `POST /admin/impersonate/:tenantId` |
| `/health` | Health | `GET /admin/system/health`, `GET /admin/system/errors` |
| `/settings/alerting` | Alerting | `GET/POST/PATCH/DELETE /admin/alerting/*` |
| `/users` | Admin Users | `GET /admin/users`, `GET /admin/users/invites`, `GET /admin/users/activity`, mutations |
| `/tenants/[id]/billing` | — (deep link) | `GET/POST /admin/tenants/:id/billing/*` |
| `/invite/accept` | — | `POST /admin/users/invite/accept` (public) |

**Not in nav but linked from dashboard:** `/tenants` — **no `page.tsx` (404)**.

### Header navigation (`Header.tsx`)

Dashboard, MSPs, Health, Alerting, Admin Users — filtered by `ADMIN_PERMISSIONS` / `useAdminRole`.

### Component inventory (by area)

- **Layout:** `Header`, `TenantSearchDropdown`, `SessionWarningModal`, `ProductFooter`, `ProductWordmark`, `ShieldMark`
- **RBAC:** `AdminRoleBadge`, `PermissionGate`, `useRequireRole`, `useAdminRole`
- **MSP:** `MspOnboardingWizard` (+ steps), `SuccessConfirmation`
- **Admin users:** `AdminUsersTable`, `PendingInvitesSection`, `InviteAdminModal`, `AdminDetailDrawer`, `ActivityLogTable`
- **Alerting:** `AlertConfigCard`, `SlackConfigModal`, `PagerDutyConfigModal`, `TestAlertButton`
- **Billing:** `InvoiceTable`, `PaymentMethodList`, modals (`ApplyCredit`, `ChangeTier`, `ExtendTrial`, `ExtendGrace`, `AddPaymentMethod`)
- **UI kit:** `Button`, `Card`, `Modal`, `Tabs`, `Badge`, `EmptyState`, `Skeleton`, `Input`, `Toast`, `LoadingSpinner`

---

## Page-by-page assessment

| Page | Purpose | Status | Evidence | Fix needed |
|------|---------|--------|----------|------------|
| **Login** (`login/page.tsx`) | Admin auth | **Working** | Screenshot `login-desktop.png`; `POST /admin/login` 200 locally | **S** — Remove or gate dev credential shortcut before prod; add MFA enrollment/challenge ( **L** ) |
| **Dashboard** (`page.tsx`) | Overview KPIs & activity | **Stub** | Hardcoded stats `130:161:admin-ui/src/app/(authenticated)/page.tsx`; fake activity `222:235`; static “healthy” panel `201:205`; screenshot `dashboard-desktop.png` | **M** — Wire real aggregates; **S** — fix `/tenants` link or add tenant index |
| **MSPs list** (`msps/page.tsx`) | Search/list MSPs | **Working** | `useAdminMspList` → `GET /admin/msp/tenants`; screenshot `msps-list-desktop.png` | **S** — Replace `bg-nebula-*` with Flux palette tokens |
| **MSP onboarding** (`msps/new/page.tsx`) | Create MSP | **Partial** | Wizard posts to API; welcome email `welcomeEmailSent` when SendGrid absent; screenshot `msps-new-desktop.png` | **M** — Surface email failure; **S** — branding classes |
| **MSP detail** (`msps/[id]/page.tsx`) | Clients, usage, impersonate | **Partial** | API-backed list; chart is **client-generated** from aggregates `212:240`; “Client detail coming soon” `175:178`; screenshot `msps-detail-desktop.png` | **M** — Real time-series from API; **L** — client detail admin view |
| **System health** (`health/page.tsx`) | DNS/storage health | **Partial** | API returns `isMockData: true` for error rates/volume when ClickHouse down (no UI flag); DNS services unhealthy without data plane; screenshot `health-desktop.png` | **M** — Mock banner; **M** — cert expiry / richer infra (see missing) |
| **Alerting** (`settings/alerting/page.tsx`) | Slack/PagerDuty configs | **Partial** | List/create/test wired; edit shows toast “Coming Soon” `116:119`; screenshot `alerting-desktop.png` | **S** — Implement edit modal |
| **Admin users** (`users/page.tsx`) | Admins, invites, activity | **Broken/Partial** | Table `GET /admin/users` OK; invites & activity **400** (route bug); screenshot `admin-users-desktop.png`; `browser-telemetry.json` | **S** — Reorder controller routes (`invites`, `activity` before `:id`) |
| **Tenant billing** (`tenants/[id]/billing/page.tsx`) | Stripe ops | **Broken** | `GET .../billing/subscription` **500** `trial_history` missing; screenshot `tenant-billing-desktop.png` | **M** — Migration/bootstrap parity for billing tables |
| **Accept invite** (`invite/accept/page.tsx`) | Public invite completion | **Partial** | UI complete; email delivery blocked without SendGrid; screenshot `invite-accept-desktop.png` | **M** — SendGrid + E2E invite path |
| **Tenant search** (header) | Find tenant / impersonate | **Working** | `GET /admin/tenants/search`; redirects to tenant UI with impersonation token | **S** — Mobile nav (search hidden `md:block`) |

**Status legend:** Working = core load + primary API success; Partial = usable with gaps/mock/stub; Stub = predominantly static; Broken = blocking errors; Missing = no route.

---

## Missing capabilities (not present in admin-ui)

Relative to the MSP platform admin baseline in the evaluation brief:

| Capability | Notes |
|------------|--------|
| General tenant/partner administration | Only MSP-centric views + search; no tenant detail, suspend, or plan/feature flags UI |
| Plans, limits, features (non-Stripe) | Limits only on MSP create; no global feature flag or plan catalog admin |
| Threat feeds, blocklists, global categories | No routes or API hooks in admin surface |
| Agents/devices across tenants | Not in admin-ui (tenant UI only) |
| Platform audit log (tenant actions) | Admin activity log UI broken; no cross-tenant audit explorer |
| Secrets / config management | `SecretsService` env-only; no admin UI |
| Support tooling | No support impersonation notes, ticket hooks, or debug consoles |
| DMARC / DNS Management module hooks | Product modules exist in branding only (`product-brand.ts`) |
| Certificate expiry monitoring | Not on health dashboard (runbooks mention certs; UI does not) |
| Mobile admin nav | Primary nav hidden below `md`; no bottom nav |

---

## API and security review

### Guards and roles

- **AdminAuthGuard** on protected admin routes; separate `ADMIN_JWT_SECRET` issuer `nebula-admin`.
- **AdminRolesGuard** with `@AdminRoles()` on controllers; however **`ADMIN_RBAC_ENABLED` defaults false** — all authenticated admins pass role checks (`admin-roles.guard.ts` `78:99`).
- Shadow mode defaults **on** — denials logged, not enforced (`103:108`).

### MFA

- **Login:** Password only in `admin.service.ts` `131:177`; JWT carries `mfaVerified: admin.mfaSetupComplete` but **no TOTP step** in admin-ui.
- **Invited admins:** Message says set up MFA on login; **no admin MFA setup pages** in `admin-ui`.
- **Super-admin reset:** `POST /admin/users/:id/mfa/reset` implemented.

### Session expiry

- JWT ~8h; admin-ui `SessionWarningModal` at 5 minutes (`layout.tsx`); “Stay logged in” opens new login tab (does not refresh token in-place).

### Audit logging

- **Admin actions:** `AdminActivityService` + `admin_activity_logs` for invites, suspend, impersonation, etc.
- **Tenant audit:** Admin billing/actions also call `AuditLogsService` with synthetic tenant id `00000000-...`.
- **Gap:** Activity API unreachable from UI due to routing bug.

### Invitations

- `AdminInvitationsService` creates tokens; **SendGrid not configured** → emails logged only (`EmailService` warn at API boot).
- Accept flow is public `POST /admin/users/invite/accept`.

### Impersonation

- `POST /admin/impersonate/:tenantId` with audit + 1h token; UI on MSP pages and tenant search. End impersonation uses tenant JWT on `POST /admin/impersonate/end`.

### Security findings

| Severity | Finding |
|----------|---------|
| **High** | Admin RBAC disabled by default — any compromised admin JWT has full API surface until `ADMIN_RBAC_ENABLED=true`. |
| **High** | Admin login lacks MFA verification step — `mfa_setup_complete` is a DB flag only. |
| **High** | `GET /admin/users/:id` route shadowing breaks invites/activity — super-admin UI fails open (empty/error states, console noise). |
| **Medium** | Dashboard displays false operational metrics — risk of wrong operational decisions. |
| **Medium** | Health/analytics show mock query/error rates without mandatory disclosure when `isMockData` is true. |
| **Medium** | Dev login shortcut exposes seed credentials pattern on login page in `NODE_ENV=development`. |
| **Medium** | Billing admin endpoints 500 on incomplete schema — may hide subscription state in incidents. |
| **Low** | Residual “Nebula DNS / Mission Control / nebula-*” branding in file headers, package name, CSS, and MSP wizard buttons. |
| **Low** | Swagger/API copy still “Nebula DNS” (`main.ts`). |

---

## Branding

- **Correct:** `ProductWordmark` → Flux Shield; `ADMIN_PORTAL_NAME` = “Admin Console”; `ProductFooter` single “Powered by Flux Labs” line (`ProductFooter.tsx`).
- **Off-palette / legacy:** Widespread `bg-nebula-500` and `text-nebula-*` in MSP flows (`msps/page.tsx`, onboarding components); package name `nebula-admin-ui`; page subtitles still say **“Mission Control”** (`page.tsx` `124`); copyright headers “Nebula DNS” across files; login dev button **Super Admin (admin@nebula.local)**.

Shared theme uses Flux navy `#1E3B78`, blue `#4B7CBB`, coral `#FF6E62` via `shared/flux-labs-tailwind-theme.js` (`primary` / `accent`).

---

## Live run artifacts

Screenshots (desktop 1440×900 and iPhone 13 viewport):

- `docs/reviews/admin-console-2026-10-31/*-{desktop,iphone}.png`
- `docs/reviews/admin-console-2026-10-31/browser-telemetry.json` — failed `/backend/admin/users/invites`, `/backend/admin/users/activity` (400), billing subscription (500); console errors on `/users` and billing pages.

Reproduce screenshots: `node docs/reviews/admin-console-2026-10-31/capture-screenshots.mjs` (requires local API + admin-ui; set `ADMIN_PASSWORD` in env, do not commit).

---

## Comparison to repo docs / plans

- **`.planning/phases/15–22`:** Health UI, MSP onboarding, RBAC display, admin user management UI, alerting UI — largely present as code, with verification docs claiming completeness; **this evaluation found runtime defects** (user routes, billing schema, dashboard stub) not captured in phase verification.
- **`.planning/ROADMAP.md`:** v1.1 Mission Control frontend marked shipped; v1.2 RBAC/alerting phases archived — **production enforcement still gated on env flags** (phase 23 runbook).
- **`docs/RBAC-ROLLOUT-RUNBOOK.md`:** Still references Nebula DNS URLs and admin API hostnames — operational gap for Flux Shield rebrand.
- **`IMPLEMENTATION_SUMMARY.md`:** Describes Mission Control widgets tied to **tenant** dashboard billing — not reflected in admin dashboard.

---

## Prioritized remediation plan

### P0 — Launch blockers

| Item | Size | Suggested PR chunk |
|------|------|-------------------|
| Fix Nest route order: register `GET invites`, `GET activity` **before** `GET :id` on `AdminUsersController` | S | `fix/admin-users-route-order` |
| Repair admin billing bootstrap (`trial_history` + related tables) or graceful degradation on billing page | M | `fix/admin-billing-schema` |
| Replace dashboard placeholders; remove or implement `/tenants` | M | `feat/admin-dashboard-real-data` |
| Document + enable RBAC for production (`ADMIN_RBAC_ENABLED=true`, shadow off after soak) | S | `ops/admin-rbac-enforcement` |
| Admin MFA: login challenge + enrollment UI, enforce when `mfa_setup_complete=false` | L | `feat/admin-mfa` (multi-PR) |
| Configure SendGrid (or provider) for invites/reset emails; show UI when email not sent | M | `feat/admin-email-delivery` |
| Surface `isMockData` on health dashboard when ClickHouse unavailable | S | `fix/health-mock-disclosure` |

### P1 — Required for credible MSP operations

| Item | Size | PR chunk |
|------|------|----------|
| Tenant admin index + detail (status, tier, limits, impersonate) | L | `feat/admin-tenant-management` |
| Alerting edit modal (PATCH wired) | S | `feat/alerting-edit-ui` |
| MSP client detail view (replace “coming soon”) | M | `feat/msp-client-admin` |
| Real usage time-series from ClickHouse/API (remove random chart) | M | `feat/msp-usage-timeseries` |
| Mobile navigation for admin sections | M | `feat/admin-mobile-nav` |
| Platform audit log viewer (tenant + admin) | L | `feat/admin-audit-explorer` |
| Certificate expiry + dnsdist/unbound health hardening in UI | M | `feat/admin-infra-health` |

### P2 — Strategic / module hooks

| Item | Size | PR chunk |
|------|------|----------|
| Global threat feeds & blocklist admin | L | `feat/admin-threat-data` |
| Cross-tenant agent/device inventory | L | `feat/admin-agents` |
| Secrets/config admin (read-only at minimum) | M | `feat/admin-secrets-readonly` |
| Support tooling hooks | M | `feat/admin-support` |
| DMARC module admin entry points | M | `feat/admin-dmarc-hooks` |
| Flux Shield rebrand sweep (nebula/Mission Control/package names) | M | `chore/admin-brand-cleanup` |

---

## Appendix: API endpoints used by admin-ui (existence check)

| Endpoint group | Implemented | Notes |
|----------------|-------------|--------|
| `/admin/login`, `/logout`, `/me` | Yes | |
| `/admin/msp/tenants` CRUD/list/detail/clients | Yes | |
| `/admin/tenants/search` | Yes | |
| `/admin/impersonate/*` | Yes | |
| `/admin/system/health`, `/errors`, `/query-volume` | Yes | Mock fallbacks |
| `/admin/alerting/*` | Yes | |
| `/admin/users` | Yes | |
| `/admin/users/invites`, `/activity` | Yes but **broken routing** | |
| `/admin/tenants/:id/billing/*` | Yes | Schema errors on fresh DB |
| Admin MFA setup endpoints | **No dedicated admin-ui/API login MFA flow** | Reset only |

---

*End of evaluation.*
