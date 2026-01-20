---
phase: 17-rbac-foundation-backend
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - api/src/modules/admin/enums/admin-role.enum.ts
  - api/src/modules/admin/decorators/admin-roles.decorator.ts
  - api/src/modules/admin/guards/admin-roles.guard.ts
  - api/src/modules/admin/entities/admin.entity.ts
  - api/src/database/migrations/1713000000000-AddAdminRoleColumn.ts
autonomous: true

must_haves:
  truths:
    - "AdminRole enum defines super_admin, admin, viewer values"
    - "AdminRolesGuard can read required roles from decorator metadata"
    - "Admin entity has role column with default value"
    - "Database migration adds role column to admins table"
  artifacts:
    - path: "api/src/modules/admin/enums/admin-role.enum.ts"
      provides: "AdminRole enum and role hierarchy"
      exports: ["AdminRole", "ADMIN_ROLE_HIERARCHY"]
    - path: "api/src/modules/admin/decorators/admin-roles.decorator.ts"
      provides: "AdminRoles decorator for endpoint protection"
      exports: ["AdminRoles", "ADMIN_ROLES_KEY"]
    - path: "api/src/modules/admin/guards/admin-roles.guard.ts"
      provides: "AdminRolesGuard for role validation"
      exports: ["AdminRolesGuard"]
    - path: "api/src/database/migrations/1713000000000-AddAdminRoleColumn.ts"
      provides: "Database migration for role column"
      contains: "ALTER TABLE"
  key_links:
    - from: "api/src/modules/admin/guards/admin-roles.guard.ts"
      to: "api/src/modules/admin/decorators/admin-roles.decorator.ts"
      via: "ADMIN_ROLES_KEY constant"
      pattern: "ADMIN_ROLES_KEY"
    - from: "api/src/modules/admin/entities/admin.entity.ts"
      to: "api/src/modules/admin/enums/admin-role.enum.ts"
      via: "AdminRole type import"
      pattern: "import.*AdminRole"
---

<objective>
Create the foundational RBAC infrastructure: AdminRole enum, @AdminRoles() decorator, AdminRolesGuard, and database migration.

Purpose: Establish the role system foundation that all subsequent RBAC work builds upon. This creates the type definitions, metadata system, guard logic, and database schema needed before JWT integration and endpoint annotation.

Output: Enum, decorator, guard files, updated entity, and migration ready to run.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/17-rbac-foundation-backend/17-CONTEXT.md
@.planning/phases/17-rbac-foundation-backend/17-RESEARCH.md

# Existing patterns to follow
@api/src/common/guards/roles.guard.ts
@api/src/modules/admin/entities/admin.entity.ts
@api/src/modules/admin/guards/admin-auth.guard.ts
@api/src/database/migrations/1712000000000-CreateAdminsTable.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create AdminRole enum and hierarchy</name>
  <files>api/src/modules/admin/enums/admin-role.enum.ts</files>
  <action>
Create the AdminRole enum file with:
1. AdminRole enum with three values: SUPER_ADMIN = 'super_admin', ADMIN = 'admin', VIEWER = 'viewer'
2. ADMIN_ROLE_HIERARCHY constant mapping roles to numeric levels for comparison (SUPER_ADMIN=3, ADMIN=2, VIEWER=1)
3. Helper function `hasMinimumRole(userRole: AdminRole, requiredRole: AdminRole): boolean` that compares hierarchy levels

Include copyright header matching project conventions.
  </action>
  <verify>
File exists at api/src/modules/admin/enums/admin-role.enum.ts
TypeScript compiles without errors: `cd api && npx tsc --noEmit`
  </verify>
  <done>AdminRole enum exported with SUPER_ADMIN, ADMIN, VIEWER values and hierarchy comparison utilities</done>
</task>

<task type="auto">
  <name>Task 2: Create @AdminRoles() decorator</name>
  <files>api/src/modules/admin/decorators/admin-roles.decorator.ts</files>
  <action>
Create decorator file following the pattern in api/src/common/guards/roles.guard.ts (the Roles decorator):

1. Export ADMIN_ROLES_KEY constant = 'admin_roles' (distinct from tenant 'roles' key)
2. Export AdminRoles decorator that uses SetMetadata from @nestjs/common
3. Decorator accepts variadic AdminRole arguments: `AdminRoles(...roles: AdminRole[])`

Pattern to follow from existing code:
```typescript
import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../enums/admin-role.enum';

export const ADMIN_ROLES_KEY = 'admin_roles';
export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);
```

Include copyright header.
  </action>
  <verify>
File exists at api/src/modules/admin/decorators/admin-roles.decorator.ts
TypeScript compiles: `cd api && npx tsc --noEmit`
  </verify>
  <done>@AdminRoles() decorator exported and usable with AdminRole enum values</done>
</task>

<task type="auto">
  <name>Task 3: Create AdminRolesGuard</name>
  <files>api/src/modules/admin/guards/admin-roles.guard.ts</files>
  <action>
Create AdminRolesGuard following research patterns and existing RolesGuard:

1. Injectable guard implementing CanActivate
2. Constructor injects Reflector from @nestjs/core
3. canActivate method:
   - Read required roles from metadata using ADMIN_ROLES_KEY
   - If no roles required, return true (allow access) - document this default policy
   - Get user from request context
   - If user has no role, throw ForbiddenException('Admin role not found in token')
   - If user role not in required roles, throw ForbiddenException(`Requires ${requiredRoles.join(' or ')} role`)
   - Return true if role matches

Key implementation detail from CONTEXT.md: 403 responses should include required role for debugging.

Pattern to follow from research:
```typescript
@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Default policy: if no roles specified, allow access
    // This means unannotated endpoints are accessible to all authenticated admins
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user?.role) {
      throw new ForbiddenException('Admin role not found in token');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Requires ${requiredRoles.join(' or ')} role`
      );
    }

    return true;
  }
}
```

Include copyright header.
  </action>
  <verify>
File exists at api/src/modules/admin/guards/admin-roles.guard.ts
TypeScript compiles: `cd api && npx tsc --noEmit`
  </verify>
  <done>AdminRolesGuard validates roles from JWT against decorator-specified requirements, returns helpful 403 messages</done>
</task>

<task type="auto">
  <name>Task 4: Update Admin entity with role column</name>
  <files>api/src/modules/admin/entities/admin.entity.ts</files>
  <action>
Update the existing Admin entity to add the role column:

1. Import AdminRole enum from '../enums/admin-role.enum'
2. Add role column after the status column:
```typescript
@Column({
  type: 'varchar',
  length: 20,
  default: AdminRole.ADMIN,
})
role: AdminRole;
```

Default is 'admin' (not super_admin) for security - super_admin must be explicitly assigned.

Do NOT modify any existing columns or relationships.
  </action>
  <verify>
TypeScript compiles: `cd api && npx tsc --noEmit`
Admin entity has role property with correct type
  </verify>
  <done>Admin entity has role column typed as AdminRole with 'admin' default</done>
</task>

<task type="auto">
  <name>Task 5: Create database migration for role column</name>
  <files>api/src/database/migrations/1713000000000-AddAdminRoleColumn.ts</files>
  <action>
Create migration file following the pattern in 1712000000000-CreateAdminsTable.ts:

1. Migration class name: AddAdminRoleColumn1713000000000
2. up() method:
   - Add role column to admins table with varchar(20), default 'admin', NOT NULL
   - Create index on role column for filtering queries
3. down() method:
   - Drop the index
   - Drop the role column

SQL for up():
```sql
ALTER TABLE "admins" ADD COLUMN "role" varchar(20) NOT NULL DEFAULT 'admin';
CREATE INDEX "IDX_admins_role" ON "admins" ("role");
```

SQL for down():
```sql
DROP INDEX IF EXISTS "IDX_admins_role";
ALTER TABLE "admins" DROP COLUMN "role";
```

Include copyright header per project conventions.
  </action>
  <verify>
Migration file exists with correct timestamp
TypeScript compiles: `cd api && npx tsc --noEmit`
  </verify>
  <done>Database migration ready to add role column to admins table with index</done>
</task>

</tasks>

<verification>
After all tasks complete:
1. All new files exist in correct locations
2. TypeScript compiles without errors: `cd api && npx tsc --noEmit`
3. Enum exports AdminRole with three values
4. Decorator exports AdminRoles function and ADMIN_ROLES_KEY constant
5. Guard exports AdminRolesGuard class
6. Entity has role property
7. Migration file ready (do NOT run migration yet - will be run in Plan 04 after break-glass setup)
</verification>

<success_criteria>
1. AdminRole enum defines super_admin, admin, viewer
2. @AdminRoles() decorator can annotate endpoints
3. AdminRolesGuard can validate roles from request.user
4. Admin entity has role column with TypeScript type
5. Migration file exists and is syntactically correct
</success_criteria>

<output>
After completion, create `.planning/phases/17-rbac-foundation-backend/17-01-SUMMARY.md`
</output>
