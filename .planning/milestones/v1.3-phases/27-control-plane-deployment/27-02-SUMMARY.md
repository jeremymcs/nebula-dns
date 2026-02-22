---
phase: 27-control-plane-deployment
plan: 02
subsystem: ui-runtime-config
tags:
  - docker
  - nextjs
  - runtime-config
  - environment-variables
  - multi-environment
dependency_graph:
  requires:
    - 27-01 (API deployment with Helm)
  provides:
    - Runtime environment configuration for UI and Admin UI
    - Multi-environment Docker image support
  affects:
    - Docker image build process
    - Kubernetes deployment manifests (future)
    - CI/CD pipelines (future)
tech_stack:
  added:
    - Next.js API routes for runtime config
  patterns:
    - Runtime environment variable pattern
    - Server-side vs client-side env var separation
    - Dual-source configuration (runtime + build-time fallback)
key_files:
  created:
    - ui/src/app/api/config/route.ts
    - admin-ui/src/app/api/config/route.ts
  modified:
    - ui/src/lib/api.ts
    - admin-ui/src/lib/api.ts
    - ui/.env.example
    - admin-ui/.env.example
    - 21 UI component/hook files
    - 8 Admin UI component/hook files
decisions:
  - decision: Use runtime env vars (API_URL) with NEXT_PUBLIC_ fallbacks
    rationale: NEXT_PUBLIC_ vars are baked into JS bundles at build time, making Docker images environment-specific. Runtime vars sourced from /api/config enable single image for all environments.
    alternatives: [Keep NEXT_PUBLIC_ only, Use .env files per environment, Server-side rendering only]
    tradeoffs: Additional /api/config endpoint overhead (minimal), Slightly more complex config pattern
  - decision: Keep NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY unchanged
    rationale: Stripe.js client library requires publishable key at build time. This key is safe to expose (designed for client-side use).
    alternatives: []
    tradeoffs: None - this is Stripe's intended usage pattern
  - decision: Preserve build-time NEXT_PUBLIC_ vars as fallbacks
    rationale: Maintains backward compatibility for local development and provides graceful degradation if runtime config fetch fails.
    alternatives: [Remove NEXT_PUBLIC_ entirely, Use only runtime vars]
    tradeoffs: Slightly larger .env.example files
metrics:
  duration_minutes: 7.1
  tasks_completed: 2
  files_modified: 33
  commits: 2
  builds_verified: 2
  completed_at: "2026-02-13T13:34:25Z"
---

# Phase 27 Plan 02: Runtime Environment Configuration for UIs Summary

Refactored both UI and Admin UI to use runtime environment variables instead of build-time NEXT_PUBLIC_ vars for deployment-specific configuration (API URLs), enabling a single Docker image to work across staging and production environments.

## What Was Built

### UI Refactoring (Task 1)
- Created `/api/config` Next.js API route exposing runtime env vars
- Updated `ui/src/lib/api.ts` to export API_URL, APP_URL, ADMIN_UI_URL
- Replaced inline `process.env.NEXT_PUBLIC_*` references in 23 files:
  - 5 hooks (useApi, useUsageStats, useSubscriptionStatus, useImpersonation, useWebSocket)
  - 1 context (AuthContext)
  - 3 components (HomeDashboard, PolicyPresets, ExamplePolicyForm)
  - 14 pages (dashboard, impersonate, signup, pricing, invite/accept, locations, policies, lists, users, security, sso)
- Updated `.env.example` with runtime and build-time sections

### Admin UI Refactoring (Task 2)
- Created `/api/config` Next.js API route for Admin UI
- Updated `admin-ui/src/lib/api.ts` to export API_URL, TENANT_UI_URL
- Replaced inline `process.env.NEXT_PUBLIC_*` references in 10 files:
  - 3 hooks (useApi, useAdminBilling, useAlertConfigs)
  - 2 components (TenantSearchDropdown, InvoiceTable)
  - 2 pages (msps listing, msp detail)
- Updated `.env.example` with runtime and build-time sections

### Configuration Pattern

**Runtime env vars (preferred in production):**
```bash
API_URL=http://localhost:4010
APP_URL=http://localhost:4011
ADMIN_UI_URL=http://localhost:4012
TENANT_UI_URL=http://localhost:4011
```

**Build-time fallbacks (development):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:4010
NEXT_PUBLIC_APP_URL=http://localhost:4011
NEXT_PUBLIC_ADMIN_UI_URL=http://localhost:4012
NEXT_PUBLIC_TENANT_UI_URL=http://localhost:4011
```

**Preserved build-time only:**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_ENABLE_SSO=true
NEXT_PUBLIC_ENABLE_MFA=true
NEXT_PUBLIC_ENABLE_API_KEYS=true
```

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Details

### /api/config Endpoint (UI)
```typescript
export async function GET() {
  return NextResponse.json({
    apiUrl: process.env.API_URL || 'http://localhost:4010',
    appUrl: process.env.APP_URL || 'http://localhost:4011',
    adminUiUrl: process.env.ADMIN_UI_URL || 'http://localhost:4012',
  });
}
```

### Centralized Config (ui/src/lib/api.ts)
```typescript
export const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4010'
export const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4011'
export const ADMIN_UI_URL = process.env.ADMIN_UI_URL || process.env.NEXT_PUBLIC_ADMIN_UI_URL || 'http://localhost:4012'
```

### Usage Pattern
Before:
```typescript
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/policies`)
```

After:
```typescript
import { API_URL } from '@/lib/api'
const res = await fetch(`${API_URL}/policies`)
```

## Testing & Verification

### UI Build Verification
```bash
cd ui && npm run build
✓ Compiled successfully in 6.0s
✓ Generating static pages (40/40)
```

### Admin UI Build Verification
```bash
cd admin-ui && npm run build
✓ Compiled successfully in 6.5s
✓ Generating static pages (12/12)
```

### No NEXT_PUBLIC_* References Remaining
```bash
# UI - only lib/api.ts fallbacks remain
grep -r "NEXT_PUBLIC_API_URL" ui/src/
ui/src/lib/api.ts:export const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4010'

# Admin UI - only lib/api.ts fallbacks remain
grep -r "NEXT_PUBLIC_API_URL" admin-ui/src/
admin-ui/src/lib/api.ts:export const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4010'
```

## Files Modified (33 total)

### Created (2)
- `ui/src/app/api/config/route.ts`
- `admin-ui/src/app/api/config/route.ts`

### UI Modified (23)
- `ui/src/lib/api.ts`
- `ui/.env.example`
- 5 hooks: useApi.ts, useUsageStats.ts, useSubscriptionStatus.ts, useImpersonation.ts, useWebSocket.ts
- 1 context: AuthContext.tsx
- 3 components: HomeDashboard.tsx, PolicyPresets.tsx, ExamplePolicyForm.tsx
- 13 pages: impersonate, dashboard, signup, pricing, invite/accept, locations, policies, lists, users, security, sso

### Admin UI Modified (10)
- `admin-ui/src/lib/api.ts`
- `admin-ui/.env.example`
- 3 hooks: useApi.ts, useAdminBilling.ts, useAlertConfigs.ts
- 2 components: TenantSearchDropdown.tsx, InvoiceTable.tsx
- 2 pages: msps/page.tsx, msps/[id]/page.tsx

## Commits

**66d8f03** - `feat(27-02): refactor UI to use runtime env vars`
- UI /api/config endpoint
- 23 files updated to import from @/lib/api
- Build verified successful

**2cd86fc** - `feat(27-02): refactor Admin UI to use runtime env vars`
- Admin UI /api/config endpoint
- 10 files updated to import from @/lib/api
- Build verified successful

## Next Steps

1. **Kubernetes Deployment Manifests** (Plan 27-03):
   - Create UI and Admin UI Deployments
   - Add ConfigMaps for runtime env vars
   - Configure Ingress for app.nebuladns.io and admin.nebuladns.io

2. **Dockerfile Updates** (if needed):
   - Verify Dockerfiles don't hardcode NEXT_PUBLIC_ vars
   - Ensure runtime env vars are passed through

3. **CI/CD Pipeline**:
   - Build single image per environment
   - Pass runtime env vars via Kubernetes ConfigMap/Secrets

## Self-Check: PASSED

✓ UI build succeeds: `/Users/jeremymcspadden/Github/nebula-dns/ui/.next`
✓ Admin UI build succeeds: `/Users/jeremymcspadden/Github/nebula-dns/admin-ui/.next`
✓ Commit 66d8f03 exists in git log
✓ Commit 2cd86fc exists in git log
✓ /api/config routes exist in both UIs
✓ Centralized config exports exist in both lib/api.ts files
✓ No inline NEXT_PUBLIC_* references remain (except lib/api.ts fallbacks)
