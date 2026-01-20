---
phase: 17-rbac-foundation-backend
plan: 03
type: execute
wave: 2
depends_on: ["17-01"]
files_modified:
  - api/src/modules/admin/admin.controller.ts
  - api/src/modules/admin/admin.module.ts
autonomous: true

must_haves:
  truths:
    - "AdminRolesGuard is applied to AdminController"
    - "All admin endpoints have @AdminRoles() decorators"
    - "GET endpoints allow all roles (super_admin, admin, viewer)"
    - "POST/PUT/PATCH/DELETE endpoints require admin or super_admin"
    - "Viewer role gets 403 on mutating endpoints"
  artifacts:
    - path: "api/src/modules/admin/admin.controller.ts"
      provides: "Controller with role annotations"
      contains: "@AdminRoles"
    - path: "api/src/modules/admin/admin.module.ts"
      provides: "Module exporting AdminRolesGuard"
      contains: "AdminRolesGuard"
  key_links:
    - from: "api/src/modules/admin/admin.controller.ts"
      to: "api/src/modules/admin/guards/admin-roles.guard.ts"
      via: "UseGuards decorator"
      pattern: "UseGuards.*AdminRolesGuard"
    - from: "api/src/modules/admin/admin.controller.ts"
      to: "api/src/modules/admin/decorators/admin-roles.decorator.ts"
      via: "AdminRoles decorator import"
      pattern: "import.*AdminRoles"
---

<objective>
Apply AdminRolesGuard and @AdminRoles() decorators to all admin endpoints, implementing role-based access control per endpoint.

Purpose: Implement RBAC-05 (all endpoints have role requirements) and RBAC-08 (viewer has read-only access). After this plan, the guard will enforce roles once JWT contains the role claim.

Output: All 24+ admin endpoints annotated with appropriate role requirements.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/17-rbac-foundation-backend/17-CONTEXT.md
@.planning/phases/17-rbac-foundation-backend/17-RESEARCH.md

# Files to modify
@api/src/modules/admin/admin.controller.ts
@api/src/modules/admin/admin.module.ts

# Reference from Plan 01
@api/src/modules/admin/guards/admin-roles.guard.ts
@api/src/modules/admin/decorators/admin-roles.decorator.ts
@api/src/modules/admin/enums/admin-role.enum.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update AdminModule to export AdminRolesGuard</name>
  <files>api/src/modules/admin/admin.module.ts</files>
  <action>
Update the AdminModule to include AdminRolesGuard in providers and exports:

1. Import AdminRolesGuard from './guards/admin-roles.guard'
2. Add AdminRolesGuard to the providers array (after AdminAuthGuard)
3. Add AdminRolesGuard to the exports array (after AdminAuthGuard)

The providers array currently has:
- AdminService, AdminSessionService, AdminHealthService, AdminBillingService, AdminJwtStrategy, AdminAuthGuard

Add AdminRolesGuard after AdminAuthGuard.

The exports array currently has:
- AdminService, AdminHealthService, AdminBillingService, AdminAuthGuard, JwtModule

Add AdminRolesGuard after AdminAuthGuard.

Do NOT modify any imports, controllers, or other module configuration.
  </action>
  <verify>
TypeScript compiles: `cd api && npx tsc --noEmit`
AdminRolesGuard is in providers and exports
  </verify>
  <done>AdminModule exports AdminRolesGuard for use by other modules if needed</done>
</task>

<task type="auto">
  <name>Task 2: Add AdminRolesGuard to controller and annotate endpoints</name>
  <files>api/src/modules/admin/admin.controller.ts</files>
  <action>
Update AdminController with role-based access control:

1. Add imports at the top:
```typescript
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AdminRoles } from './decorators/admin-roles.decorator';
import { AdminRole } from './enums/admin-role.enum';
```

2. Add AdminRolesGuard at controller level (after existing @UseGuards on individual methods):
   - DO NOT add at class level since login endpoint should not have guard
   - Instead, add AdminRolesGuard to each protected endpoint's @UseGuards

3. For each endpoint, add @AdminRoles() decorator based on these rules:

**All roles (SUPER_ADMIN, ADMIN, VIEWER) - Read operations:**
- GET /tenants/search - searchTenants()
- GET /msp/tenants - listMspTenants()
- GET /msp/tenants/:mspId - getMspDetail()
- GET /msp/tenants/:mspId/clients - getMspClients()
- GET /me - getProfile()
- GET /system/health - getSystemHealth()
- GET /system/errors - getRecentErrors()
- GET /system/query-volume - getQueryVolume()
- GET /tenants/:tenantId/billing/subscription - getSubscriptionStatus()
- GET /tenants/:tenantId/billing/invoices - listInvoices()
- GET /tenants/:tenantId/billing/invoices/:invoiceId/pdf - downloadInvoicePdf()
- GET /tenants/:tenantId/billing/payment-methods - listPaymentMethods()

**Admin and Super Admin (SUPER_ADMIN, ADMIN) - Write operations:**
- POST /msp/tenants - createMspTenant()
- POST /impersonate/:tenantId - startImpersonation()
- POST /impersonate/end - endImpersonation() [Note: uses tenant JWT, but include for consistency]
- POST /logout - logout()
- POST /sessions/revoke-all - revokeAllSessions()
- POST /tenants/:tenantId/billing/credits - applyCredit()
- POST /tenants/:tenantId/billing/tier - changeTier()
- POST /tenants/:tenantId/billing/trial/extend - extendTrial()
- POST /tenants/:tenantId/billing/grace/extend - extendGracePeriod()
- POST /tenants/:tenantId/billing/payment-methods - createSetupIntent()
- PATCH /tenants/:tenantId/billing/payment-methods/default - setDefaultPaymentMethod()
- DELETE /tenants/:tenantId/billing/payment-methods/:paymentMethodId - deletePaymentMethod()

**No guard (public):**
- POST /login - login() (no authentication needed)

Example pattern for a GET endpoint:
```typescript
@Get('tenants/search')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
@ApiBearerAuth('admin-jwt')
// ... rest of decorators
async searchTenants(...) { ... }
```

Example pattern for a POST endpoint:
```typescript
@Post('msp/tenants')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
@ApiBearerAuth('admin-jwt')
// ... rest of decorators
async createMspTenant(...) { ... }
```

IMPORTANT: The guard order matters - AdminAuthGuard MUST come before AdminRolesGuard.
  </action>
  <verify>
TypeScript compiles: `cd api && npx tsc --noEmit`
All endpoints except login have @AdminRoles decorator
Count of @AdminRoles in file should be ~23 (all protected endpoints)
  </verify>
  <done>All admin endpoints annotated with role requirements, viewer restricted to GET operations</done>
</task>

</tasks>

<verification>
After all tasks complete:
1. TypeScript compiles without errors: `cd api && npx tsc --noEmit`
2. AdminModule exports AdminRolesGuard
3. All protected endpoints have @UseGuards(AdminAuthGuard, AdminRolesGuard)
4. All protected endpoints have @AdminRoles() with appropriate roles
5. GET endpoints allow VIEWER role
6. POST/PATCH/DELETE endpoints require ADMIN or SUPER_ADMIN
7. Login endpoint has no role guard

Manual verification (after migration runs and initial admin exists):
- Viewer role should get 403 on POST /msp/tenants
- Viewer role should succeed on GET /msp/tenants
</verification>

<success_criteria>
1. AdminRolesGuard applied to all protected endpoints
2. @AdminRoles() decorator on all protected endpoints
3. GET requests allow all roles (super_admin, admin, viewer)
4. POST/PUT/DELETE requests return 403 for viewer role
5. Login endpoint remains public (no role check)
</success_criteria>

<output>
After completion, create `.planning/phases/17-rbac-foundation-backend/17-03-SUMMARY.md`
</output>
