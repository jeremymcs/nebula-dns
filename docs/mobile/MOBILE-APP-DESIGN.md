# Flux Shield Mobile — Admin & MSP Native App Design

**Product:** [Flux Shield](https://shield.fluxlabs.net) (`jeremymcs/nebula-dns`)  
**Audience:** Flux Labs platform admins (`admin-ui` / `nebula-admin` JWT) and MSP partner operators (`ui` tenant JWT, MSP tier)  
**Date:** 2026-10-31  
**Status:** Design reference — docs-only; no app code in this PR  
**Related work:** Admin eval [PR #18](https://github.com/jeremymcs/nebula-dns/pull/18) (`docs/reviews/ADMIN-CONSOLE-EVAL-2026-10-31.md`), P0 admin [PR #19](https://github.com/jeremymcs/nebula-dns/pull/19) (admin MFA, `GET /admin/stats`), DNS Management phase 1 [PR #17](https://github.com/jeremymcs/nebula-dns/pull/17), tenant admin index (in progress on `cursor/*` admin tenant management branches per eval follow-ups)

**Mockups:** [`docs/mobile/mockups/`](mockups/) (SVG wireframes + [`index.html`](mockups/index.html))

---

## 1. Recommended stack & monorepo placement

### Default: Expo (React Native) + TypeScript

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Expo SDK 52+** / React Native | One codebase for iOS + Android; team already uses React (Next.js `ui/`, `admin-ui/`). |
| Navigation | **Expo Router** (file-based) | Deep links map cleanly to tenant/client routes; aligns with Next mental model. |
| Build / store | **EAS Build + EAS Submit** | Managed signing, TestFlight / internal testing tracks, CI-friendly secrets. |
| State / data | **TanStack Query** + Zustand (minimal) | Matches web hooks pattern; cache + pull-to-refresh; offline read cache. |
| Types | **`shared/` package** (extend) | Reuse `shared/product-brand.ts`, `shared/flux-labs-tailwind-theme.js` tokens; add `shared/api-types/` generated from OpenAPI or hand-maintained DTO mirrors. |
| Secure storage | **expo-secure-store** | Keychain / Keystore for refresh tokens and biometric gate flags. |
| Biometrics | **expo-local-authentication** | Face ID / fingerprint to unlock stored session. |
| Push | **expo-notifications** → Expo Push → APNs / FCM | Avoid maintaining native push bridges in v1. |

**Monorepo location:** `apps/mobile/` at repo root (sibling to `api/`, `ui/`, `admin-ui/`). Keeps API contract changes in the same PR workflow as backend gaps close. A separate repo is only justified if mobile release cadence must decouple from platform — not recommended for MVP.

### Alternatives (brief)

| Option | When | Tradeoff |
|--------|------|----------|
| **Swift + Kotlin** (two apps) | Maximum native UX, large dedicated mobile team | 2× implementation; duplicates all API client and RBAC logic already expressed in TypeScript web apps. |
| **Capacitor** wrapping `admin-ui` + `ui` | Fastest “shell around web” | Poor offline, weak biometrics/token story, two WebViews for admin vs MSP; fails “native admin” bar for policy editing and log search at scale. |

**API base URL:** `https://api.shield.fluxlabs.net` (`shared/public-url-defaults.ts` → `DEFAULT_API_ORIGIN`). Routes are mounted at `/admin/*`, `/auth/*`, `/msp/*`, etc. (no `/api/v1` prefix in `api/src/main.ts`).

---

## 2. Personas, roles & navigation

### Personas

| Persona | Auth issuer | Roles | Primary goals on mobile |
|---------|-------------|-------|-------------------------|
| **Flux platform admin** | `nebula-admin` (`api/src/modules/admin/admin.module.ts`) | `super_admin`, `admin`, `viewer` (`api/src/modules/admin/enums/admin-role.enum.ts`) | MSP onboarding, tenant search, health, billing ops, alerting config, impersonation, audit |
| **MSP owner / tech** | `nebula-dns` (tenant JWT) | `owner`, `admin`, `analyst`, `readonly` (`api/src/common/guards/roles.guard.ts`) | Client CRUD, context switch into client, policies, agents, logs, templates |
| **MSP analyst** | Same | `analyst` / `readonly` | Read-heavy: logs, threats, reports; limited writes |

Permission matrix for admin nav today: `admin-ui/src/lib/admin-permissions.ts` (`ADMIN_PERMISSIONS`). Mobile admin IA should mirror this until RBAC enforcement is on (`ADMIN_RBAC_ENABLED` — see PR #19 runbook).

### One app, two login modes

1. **Launch screen:** two explicit paths — **Platform admin** vs **MSP / organization** (not auto-detected; avoids emailing credentials to wrong auth stack).
2. **Credentials:** same email could exist in both systems — store **auth mode** (`admin` \| `tenant`) in secure storage with tokens; never mix Bearer tokens on one request.
3. **Post-login routing:**
   - Admin JWT → admin tab shell (Dashboard, MSPs, Alerts, More).
   - Tenant JWT → if `tenant.tier === msp` → MSP home; else show “Use web dashboard” for non-MSP business tenants (Home/Family tiers out of scope for v1 mobile).
4. **Switching accounts:** Settings → “Switch login mode” clears tokens for current mode after confirmation; optional **multi-account** (Phase 2): up to 2 saved admin + 2 MSP profiles with distinct secure-store keys.
5. **MSP client context:** use existing `POST /msp/clients/:id/switch` and `POST /msp/switch-back` (`api/src/modules/msp/msp.controller.ts`) — show persistent **context chip** (“Managing: Northwind”) in header; switching client is a first-class nav action.

---

## 3. Auth, security & compliance

### Login & MFA

| Mode | Flow | API (today / PR #19) |
|------|------|----------------------|
| **Tenant / MSP** | `POST /auth/login` → optional `POST /auth/mfa/verify` | `api/src/modules/auth/auth.controller.ts`; returns **access + refresh** (`LoginResponseDto`) |
| **Platform admin** | `POST /admin/login` → TOTP challenge | **Main:** password-only JWT, `mfaVerified` tied to setup flag. **PR #19:** `AdminMfaGuard`, `POST /admin/mfa/verify`, enroll `/admin/mfa/enroll/*` |

Mobile must implement **admin TOTP step** before relying on PR #19 merge; treat MFA as blocking for all admin routes except enroll/verify/login.

### Session & tokens

| Concern | Tenant / MSP | Platform admin |
|---------|--------------|----------------|
| Access token TTL | ~15 min (Swagger in `api/src/main.ts`) | 8 h (`admin.module.ts` JwtModule) |
| Refresh | `POST /auth/refresh` | **Missing** — admin uses single JWT + blacklist (`AdminSessionService`) |
| Storage | expo-secure-store: refresh + access | Same; store admin refresh once API adds it |
| Resume | Biometric unlock → refresh access | Same |
| Revoke | `DELETE /auth/sessions/:id`, `DELETE /auth/sessions` | `POST /admin/sessions/revoke-all` only; **no list/revoke single session HTTP** (service exists: `admin-session.service.ts`) |

**Required API (Phase 0):** admin refresh tokens (rotate + revoke), `GET /admin/sessions`, `DELETE /admin/sessions/:id`, pass **`X-Device-Id`** + **`X-Flux-Shield-App`** headers on login/refresh for audit.

### Biometrics

After first successful MFA login, offer **Face ID / fingerprint** to unlock app: biometric does not replace MFA at login time; it gates reading refresh token from secure store. Fallback: OS passcode → full email/password + MFA.

### Device registration & revocation

New module **`mobile-devices`** (proposed):

- `POST /auth/mobile/register` and `POST /admin/mobile/register` — body: `{ expoPushToken?, platform, appVersion, deviceName }`, returns `deviceId`.
- `GET` / `DELETE` device list per user/admin; revoking device invalidates refresh tokens tied to `deviceId`.

Reuse session metadata patterns from `api/src/modules/auth/session.service.ts` and `admin-session.service.ts` (`parseDeviceInfo`, `isMobile`).

### Jailbreak / root

Use **`expo-device` + community jailbreak detection** (or Play Integrity / DeviceCheck attestation Phase 2). **Default policy:** warn + block **write** actions on compromised devices; allow read-only for viewers. Config flag `MOBILE_BLOCK_ROOTED=true`.

### Certificate pinning

**Default: off for MVP** (operational risk when rotating TLS on `api.shield.fluxlabs.net` / DoH endpoints). Phase 2: pin SPKI hash via `expo-ssl-pinning` or native config, with remote config kill-switch. Document rotation in runbook alongside droplet cert PR #14.

### Impersonation on mobile

- **Allowed:** `super_admin` and `admin` only (`POST /admin/impersonate/:tenantId`, `POST /admin/impersonate/end` — `admin.controller.ts`).
- **UX:** confirmation sheet + mandatory reason text → stored in admin activity metadata.
- **Restrictions:** read-only admin (`viewer`) **cannot** impersonate; optional global flag **`MOBILE_IMPERSONATION_ENABLED=false`** default in prod until audited.
- **Token handling:** swap to tenant JWT in memory; show high-visibility banner; auto-end at 1 h per API; never persist impersonation refresh in secure store longer than session.

### Audit logging

Every mutating mobile request should log:

- Admin: existing `AdminActivityService` + extend with `deviceId`, `appVersion`, `platform`.
- Tenant/MSP: `audit-logs` module (`api/src/modules/audit-logs/audit-logs.controller.ts`) with same headers.

---

## 4. Capability map — “manage everything”

Legend: **Ready** = API usable from mobile with standard JWT; **Tweak** = exists but needs mobile-oriented pagination, headers, or UX-safe subset; **Missing** = net-new API.

### Platform admin (Flux)

| Area | Mobile scope | API / code | Status |
|------|--------------|------------|--------|
| Dashboard KPIs | MSP/tenant counts, health summary, recent activity | `GET /admin/stats` (**PR #19**), `GET /admin/system/health` | Tweak → Ready after #19 |
| MSP list / detail / create | List, drill-down, onboard MSP | `GET/POST /admin/msp/tenants`, `GET .../:mspId`, `GET .../:mspId/clients` — `admin.controller.ts` | Ready |
| Tenant search | Global search | `GET /admin/tenants/search` | Ready |
| Tenant admin index | Suspend tenant, plan flags, detail | Eval gaps; branch in progress | **Missing** UI + **Missing** `PATCH /admin/tenants/:id` style APIs on main |
| Impersonation | Enter tenant as admin | `POST /admin/impersonate/:tenantId`, `POST /admin/impersonate/end` | Ready (policy: Tweak) |
| Billing (Stripe off) | Read subscription, invoices | `GET /admin/tenants/:tenantId/billing/*` — `admin.controller.ts` | Tweak (schema/migrations PR #19); writes **off** at launch |
| System health | DNS, storage, errors, volume | `GET /admin/system/health`, `/system/errors`, `/system/query-volume` | Ready (surface `isMockData`) |
| Alerting config | Slack / PagerDuty | `admin/alerting/*` — `alerting.controller.ts` | Ready |
| Admin users & invites | super_admin only | `admin/users/*` — `admin-users.controller.ts` | Tweak (route ordering fixed PR #19) |
| Admin activity | Audit feed | `GET /admin/users/activity` | Ready after #19 |
| DNS Management (admin) | Connection, zone assign | `admin/dns-management/*` — **PR #17** | Tweak (secrets never on device — use server-side only) |
| Secrets / platform config | Env secrets refresh | `admin/secrets` — `secrets.controller.ts` | **Missing** safe mobile subset (deny on mobile default) |
| DMARC module | Placeholder nav | Brand only — `shared/product-brand.ts` `PRODUCT_MODULE_DMARC` | **Missing** |
| Threat feeds / global lists | Platform curation | No admin routes in eval | **Missing** |

### MSP / tenant (partner)

| Area | Mobile scope | API | Status |
|------|--------------|-----|--------|
| Clients | CRUD, suspend via patch | `msp/clients/*` — `msp-clients.controller.ts`; `suspendClient` in service | Ready |
| Context switch | Act as client tenant | `POST /msp/clients/:id/switch`, `switch-back`, `GET /msp/context` | Ready |
| Users | Invite, suspend | `users/*` — `users.controller.ts` | Ready |
| Policies & compile | Edit categories, compile to locations | `policies/*` — `policies.controller.ts` | Tweak (large payloads — mobile simplified editor) |
| Allow/block lists | Entries CRUD | `lists/*` — `lists.controller.ts` | Ready |
| Locations & install tokens | Token create/revoke (one-time display) | `locations/:id/tokens` — `locations.controller.ts` | Ready (handle one-time token UX) |
| Windows agents | List, patch, delete, download link | `agents/*` — `agents.controller.ts` | Ready |
| Query logs & analytics | Search, filters | `reports/logs`, `reports/investigate`, `reports/summary`, etc. — `reports.controller.ts` | Tweak (pagination + rate limits) |
| Threats / alerts | Recent threats, stats | `threat-detection/*` | Ready |
| DNS Management (tenant) | Zones & records read-only | `GET /dns-management/zones`, `.../records` — **PR #17** | Ready after merge |
| Billing | Read-only MSP | `msp/billing`, `payments/*` | Tweak; Stripe off → read-only |
| Playbooks, SIEM, webhooks | Power features | respective controllers | Phase 2+ |
| DMARC | Coming soon | — | **Missing** |

### Quick actions (mobile-first)

| Action | Role | API |
|--------|------|-----|
| Block domain now | MSP admin | `POST /lists/:id/entries` or playbook — prefer dedicated `POST /lists/:id/entries/quick-block` (**Missing** convenience) |
| Suspend client | MSP admin | `PATCH /msp/clients/:id` `{ status: 'suspended' }` |
| Suspend tenant (platform) | super_admin | **Missing** admin API |
| Revoke agent | MSP admin | `DELETE /agents/:id` |
| Revoke location token | MSP admin | `DELETE /locations/:id/tokens/:tokenId` |
| Revoke mobile session | All | `DELETE /auth/sessions/:id` / admin equivalent **Missing** |

---

## 5. API gap table (engineering backlog)

| ID | Gap | Priority | Proposed endpoint / change | Phase |
|----|-----|----------|----------------------------|-------|
| G1 | Admin refresh tokens | P0 | `POST /admin/refresh`, refresh entity + rotation; shorten access to 15m | 0 |
| G2 | Admin session list / revoke one | P0 | `GET /admin/sessions`, `DELETE /admin/sessions/:id` wrapping `AdminSessionService` | 0 |
| G3 | Mobile device registry + push token | P0 | `POST /auth/mobile/register`, `POST /admin/mobile/register`, CRUD devices | 0 |
| G4 | Push notification dispatch service | P0 | Internal worker + `POST /notifications/test`; store preferences per user | 0 |
| G5 | Platform tenant admin (suspend, detail) | P0 | `GET/PATCH /admin/tenants/:id` (align w/ in-progress admin tenant branch) | 0–1 |
| G6 | Admin dashboard stats | P0 | `GET /admin/stats` — **PR #19** | 0 |
| G7 | Admin MFA verify/enroll | P0 | **PR #19** routes + `AdminMfaGuard` on mutating routes | 0 |
| G8 | Audit metadata | P1 | Accept `X-Device-Id`, `X-App-Version` on all authenticated routes | 1 |
| G9 | Alert inbox (unified) | P1 | `GET /notifications/inbox` aggregating threat spikes, agent offline, cert warnings | 1 |
| G10 | Quick block domain | P1 | `POST /lists/:id/entries` body template or dedicated shortcut | 1 |
| G11 | DNS Management write on mobile | P2 | Defer record edits; admin zone assign stays web-only | 2 |
| G12 | DMARC module | P3 | New module API TBD | 3 |
| G13 | Certificate expiry feed | P1 | `GET /admin/system/certs` or extend health DTO | 1 |
| G14 | Impersonation mobile policy flag | P1 | `MOBILE_IMPERSONATION_ENABLED` + audit reason field | 1 |

---

## 6. Push notifications

### Alert types (v1)

| Alert | Source signal | Audience |
|-------|---------------|----------|
| Threat spike | ClickHouse / `threat-detection` anomalies | MSP + admin |
| Agent offline | Agent heartbeat missed — `agents` heartbeat | MSP |
| DoT/DoH health | `admin/system/health` DNS services | Admin |
| TLS cert expiry | Health / infra (extend API G13) | Admin |
| Failed login burst | Auth rate limit / audit | Admin + tenant admin |
| New MSP signup | `POST /admin/msp/tenants` activity | Admin |

### Delivery

1. App obtains Expo push token → **G3** register with user/admin id.
2. Backend **NotificationService** (new): rules engine maps events → templates; sends via **Expo Push API** (APNs/FCM abstracted).
3. User preferences: per-channel toggles stored in Postgres keyed by `user_id` or `admin_id`.

### API changes (summary)

- Entities: `push_devices`, `notification_preferences`, `notification_deliveries`.
- Endpoints: register/unregister device, `GET/PATCH /notifications/preferences`, optional `GET /notifications/inbox` for in-app alert center (mockup `08-alert-inbox.svg`).

---

## 7. Information architecture & key screens

### Admin tab shell (bottom)

| Tab | Screens |
|-----|---------|
| **Home** | Dashboard stats, recent admin activity, health badge |
| **MSPs** | MSP list → MSP detail → clients → tenant search |
| **Alerts** | Inbox (G9) + link to alerting config (admin write) |
| **More** | Health detail, billing deep links, admin users (super_admin), settings |

### MSP tab shell

| Tab | Screens |
|-----|---------|
| **Home** | Client KPIs, offline agents, threat summary |
| **Clients** | Client list → client detail (policies, users, devices) |
| **Logs** | Query log search, investigate entry |
| **Settings** | Team, MFA, notifications, context switch back to MSP root |

### Mobile patterns

- **Search** in header (tenant, client, domain, device).
- **Pull-to-refresh** on all lists; stale-while-revalidate cache (5 min lists, 30 s health).
- **Swipe actions** on list rows: suspend client, revoke agent (confirm sheet).
- **FAB** on client list → create client / block domain.
- **Offline:** read cache only; show banner “Offline — showing cached data”; queue no writes.

### Deep links

| URL scheme | Example |
|------------|---------|
| Custom | `fluxshield://admin/msp/{id}`, `fluxshield://msp/client/{id}/devices` |
| Universal | `https://app.shield.fluxlabs.net/app/...` → app link (apple-app-site-association / assetlinks on the tenant app host) |

Expo Router file routes mirror paths under `apps/mobile/app/(admin)/` and `(msp)/`.

### Accessibility & dark mode

- RN accessibility labels on all icon tabs; min touch 44pt.
- Support system dark mode via theme tokens from `shared/flux-labs-tailwind-theme.js` (navy background `#0c1424`, primary `#4B7CBB`, coral accents `#FF6E62`).
- Respect OS font scaling; test VoiceOver / TalkBack on login MFA and policy toggles.

**Mockups:** see [`mockups/`](mockups/).

---

## 8. Branding

| Element | Spec |
|---------|------|
| App name | **Flux Shield** (`shared/product-brand.ts` → `PRODUCT_NAME`) |
| Subtitle (store / splash) | “Modular security platform” or “Enterprise DNS filtering” |
| Footer (single line) | **Powered by Flux Labs** — once per settings/about, not on every screen (mockups show optional subtle footer) |
| Colors | Navy `#1E3B78`, blue `#4B7CBB`, coral `#FF6E62` (`shared/flux-labs-tailwind-theme.js`) |
| Icon direction | Shield mark on navy field; coral accent chevron or pulse dot suggesting “active filtering”; avoid text in icon |

Reuse `ShieldMark` / wordmark logic from `admin-ui` and `ui` ProductWordmark components for consistency.

---

## 9. Distribution & Jeremy checklist

### Store accounts & IDs

| Item | Owner action |
|------|----------------|
| Apple Developer Program | Enroll Flux Labs org |
| Google Play Console | Flux Labs org account |
| iOS bundle ID | `net.fluxlabs.shield` (recommended) |
| Android applicationId | `net.fluxlabs.shield` |
| Expo project | Create under Flux Labs Expo org; link GitHub `jeremymcs/nebula-dns` |

### Testing tracks

- **iOS:** TestFlight internal (Flux admins + select MSPs).
- **Android:** Play Internal testing → closed beta.

### EAS secrets (examples)

`EXPO_PUBLIC_API_URL`, `SENTRY_DSN`, `EAS_PROJECT_ID`, signing credentials (managed), optional `GOOGLE_SERVICES_JSON` / APNs key upload.

### CORS

Add mobile deep-link origins not required for native; ensure **`CORS_ORIGINS`** includes any Expo web preview if using Expo web for debugging (`api/src/main.ts`).

---

## 10. Phased delivery plan

Rough engineering sizing (single team, includes API + app PRs):

| Phase | Scope | Size | PR chunks |
|-------|--------|------|-----------|
| **0 — API prep** | G1–G4, G6–G7, device headers, notification schema | **L** (~3–4 weeks) | `api/mobile-devices`, `api/admin-refresh`, `api/notifications` |
| **1 — MVP** | Login both modes, MFA, biometric unlock, admin MSP list + stats, MSP clients + context switch, agents list, query logs read, top 5 actions (suspend client, revoke agent, create token, block list entry, impersonate read-only viewer deny) | **L** (~4–5 weeks) | `apps/mobile` scaffold, auth screens, admin/MSP shells, EAS profiles |
| **2 — Parity** | Policies editor subset, lists, locations, billing read-only, DNS mgmt read-only (PR #17), admin users, alerting config, platform tenant admin APIs | **XL** (~6–8 weeks) | Feature modules per domain |
| **3 — Push & polish** | G9 inbox, preferences, cert/health pushes, pinning optional, tablet layout | **M** (~2–3 weeks) | notifications UI + backend worker |

---

## 11. Open decisions for Jeremy

| # | Decision | Options | **Recommended default** |
|---|----------|---------|-------------------------|
| D1 | Non-MSP business tenants on mobile | Allow vs MSP-only | **MSP-only v1** — show message to use web for single-org tenants |
| D2 | Impersonation on mobile | Allow vs web-only | **Allow super_admin/admin with reason + banner**; global kill-switch default off until tested |
| D3 | Certificate pinning | On vs off | **Off MVP**, revisit Phase 3 with kill-switch |
| D4 | Admin access token TTL | Keep 8h vs 15m + refresh | **15m + refresh (G1)** aligned with tenant auth |
| D5 | Stripe billing writes on mobile | Read vs write | **Read-only** at launch (matches admin eval Stripe-off posture) |
| D6 | Repo layout | Monorepo `apps/mobile` vs separate | **`apps/mobile` in nebula-dns** |
| D7 | Root/jailbreak policy | Block app vs read-only | **Read-only on rooted**; block writes |
| D8 | Unified vs two store listings | One app vs two | **One app “Flux Shield”** with login mode selector |

---

## Appendix A — Endpoint index (grounding)

**Admin auth & ops** — `api/src/modules/admin/admin.controller.ts`, `admin-users.controller.ts`  
**Tenant auth** — `api/src/modules/auth/auth.controller.ts`  
**MSP** — `api/src/modules/msp/msp.controller.ts`, `msp-clients.controller.ts`  
**Policies / lists / locations / agents** — `policies.controller.ts`, `lists.controller.ts`, `locations.controller.ts`, `agents.controller.ts`  
**Reports / investigate** — `reports.controller.ts` (`GET reports/logs`, `GET reports/investigate`)  
**Threats** — `threat-detection.controller.ts`  
**Audit** — `audit-logs.controller.ts`  
**Alerting (admin)** — `alerting.controller.ts` under `/admin/alerting`  
**DNS Management (PR #17)** — `dns-management.controller.ts` (`/dns-management`, `/admin/dns-management`)

---

## Appendix B — Mockup index

| File | Screen |
|------|--------|
| `mockups/01-login-mfa.svg` | Login mode + MFA |
| `mockups/02-admin-home.svg` | Platform admin dashboard |
| `mockups/03-msp-home.svg` | MSP home |
| `mockups/04-tenant-detail.svg` | Client/tenant detail + quick actions |
| `mockups/05-devices.svg` | Agents & install tokens |
| `mockups/06-policy-editor.svg` | Policy editor |
| `mockups/07-query-logs.svg` | Query log search |
| `mockups/08-alert-inbox.svg` | Alert inbox |
| `mockups/09-dns-zones.svg` | DNS zones (phase 1 read-only) |
| `mockups/10-settings.svg` | Settings & account switch |
