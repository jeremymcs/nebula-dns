---
phase: 17-rbac-foundation-backend
plan: 04
type: execute
wave: 3
depends_on: ["17-01", "17-02", "17-03"]
files_modified:
  - api/src/modules/admin/admin.service.ts
  - api/src/modules/audit-logs/entities/audit-log.entity.ts
  - api/src/scripts/create-super-admin.ts
autonomous: true

must_haves:
  truths:
    - "Admin cannot escalate their own role"
    - "Last super_admin cannot be demoted"
    - "Break-glass script can create super_admin when none exists"
    - "Role changes are audit logged"
    - "Sessions are invalidated on role downgrade"
  artifacts:
    - path: "api/src/modules/admin/admin.service.ts"
      provides: "Role change method with protections"
      contains: "updateAdminRole"
    - path: "api/src/scripts/create-super-admin.ts"
      provides: "Break-glass CLI script"
      contains: "BREAK_GLASS"
    - path: "api/src/modules/audit-logs/entities/audit-log.entity.ts"
      provides: "Audit action for role changes"
      contains: "admin_role_changed"
  key_links:
    - from: "api/src/modules/admin/admin.service.ts"
      to: "api/src/modules/audit-logs/audit-logs.service.ts"
      via: "auditLogsService.log call"
      pattern: "auditLogsService\\.log"
    - from: "api/src/modules/admin/admin.service.ts"
      to: "api/src/modules/admin/admin-session.service.ts"
      via: "session invalidation on role change"
      pattern: "revokeAllSessions"
---

<objective>
Implement role change protections (self-escalation prevention, last super_admin guard) and break-glass super_admin creation script.

Purpose: Fulfill RBAC-09 (self-escalation rejection) and RBAC-10 (break-glass super_admin). This ensures the RBAC system cannot be bypassed and provides emergency recovery capability.

Output: Protected role change method, audit logging, and CLI script for emergency super_admin creation.
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
@api/src/modules/admin/admin.service.ts
@api/src/modules/audit-logs/entities/audit-log.entity.ts

# Reference files
@api/src/modules/admin/enums/admin-role.enum.ts
@api/src/modules/admin/admin-session.service.ts
@api/src/modules/audit-logs/audit-logs.service.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add admin_role_changed audit action</name>
  <files>api/src/modules/audit-logs/entities/audit-log.entity.ts</files>
  <action>
Update the AuditAction type to include the new admin role change action:

1. Find the AuditAction type definition (around line 15-54)
2. Add 'admin_role_changed' to the union type, after 'billing_payment_method_deleted'

The type currently ends with:
```typescript
| 'billing_payment_method_deleted';
```

Update to:
```typescript
| 'billing_payment_method_deleted'
| 'admin_role_changed';
```

Also add 'admin' to AuditResourceType if not already present (for admin-related audit logs):
```typescript
| 'admin';
```

This allows audit logging of admin management actions.
  </action>
  <verify>
TypeScript compiles: `cd api && npx tsc --noEmit`
AuditAction includes 'admin_role_changed'
AuditResourceType includes 'admin'
  </verify>
  <done>Audit log types support admin role change tracking</done>
</task>

<task type="auto">
  <name>Task 2: Add role change method with protections</name>
  <files>api/src/modules/admin/admin.service.ts</files>
  <action>
Add a new public method to AdminService for changing admin roles with security protections:

1. Import ADMIN_ROLE_HIERARCHY from './enums/admin-role.enum' at the top
2. Add the following method after the existing revokeAllSessions method (around line 213):

```typescript
/**
 * Update an admin's role with security protections
 * - Prevents self-escalation (cannot increase own role)
 * - Prevents demoting the last super_admin
 * - Invalidates all sessions on role change
 * - Audit logs the change
 *
 * @param requesterId - ID of admin making the change
 * @param targetId - ID of admin being changed
 * @param newRole - New role to assign
 * @param ipAddress - IP address for audit logging
 * @throws ForbiddenException if self-escalation or last super_admin demotion
 * @throws NotFoundException if target admin not found
 */
async updateAdminRole(
  requesterId: string,
  targetId: string,
  newRole: AdminRole,
  ipAddress?: string,
): Promise<{ success: boolean; previousRole: AdminRole; newRole: AdminRole }> {
  // 1. Load both admins
  const requester = await this.findById(requesterId);
  const target = await this.findById(targetId);

  if (!target) {
    throw new NotFoundException('Target admin not found');
  }

  const previousRole = target.role;

  // 2. Prevent self-escalation
  if (requesterId === targetId) {
    if (ADMIN_ROLE_HIERARCHY[newRole] > ADMIN_ROLE_HIERARCHY[previousRole]) {
      this.logger.warn(
        `Admin ${requesterId} attempted self-escalation from ${previousRole} to ${newRole}`,
      );
      throw new ForbiddenException('Cannot escalate your own role');
    }
  }

  // 3. Prevent demoting the last super_admin
  if (previousRole === AdminRole.SUPER_ADMIN && newRole !== AdminRole.SUPER_ADMIN) {
    const superAdminCount = await this.adminRepository.count({
      where: { role: AdminRole.SUPER_ADMIN },
    });
    if (superAdminCount <= 1) {
      this.logger.warn(
        `Attempted to demote last super_admin ${targetId}`,
      );
      throw new ForbiddenException(
        'Cannot demote the last super_admin. Promote another admin first.',
      );
    }
  }

  // 4. Update the role
  await this.adminRepository.update(targetId, { role: newRole });

  // 5. Invalidate all sessions for the target admin (security: force re-login with new role)
  const revokedCount = await this.revokeAllSessions(targetId);
  this.logger.log(
    `Admin ${targetId} role changed from ${previousRole} to ${newRole}, ${revokedCount} sessions revoked`,
  );

  // 6. Audit log the change
  // Note: Using a synthetic tenant ID for admin audit logs since admins are not tenant-scoped
  // In production, consider a dedicated admin audit log table
  await this.auditLogsService.log({
    tenantId: '00000000-0000-0000-0000-000000000000', // System tenant placeholder
    userId: null,
    action: 'admin_role_changed' as AuditAction,
    resourceType: 'admin' as AuditResourceType,
    resourceId: targetId,
    resourceName: target.email,
    oldValue: { role: previousRole },
    newValue: { role: newRole },
    ipAddress: ipAddress || null,
    metadata: {
      changedBy: requesterId,
      changedByEmail: requester?.email,
    },
  });

  return {
    success: true,
    previousRole,
    newRole,
  };
}

/**
 * Find admins by role
 * Used for break-glass validation
 */
async findByRole(role: AdminRole): Promise<Admin[]> {
  return this.adminRepository.find({ where: { role } });
}

/**
 * Count super_admin accounts
 * Used for break-glass and last-admin protection
 */
async countSuperAdmins(): Promise<number> {
  return this.adminRepository.count({
    where: { role: AdminRole.SUPER_ADMIN },
  });
}
```

Also add the import for AdminRole at the top of the file:
```typescript
import { AdminRole, ADMIN_ROLE_HIERARCHY } from './enums/admin-role.enum';
```

And add to the existing AuditAction import (if not already using it):
```typescript
import {
  AuditAction,
  AuditResourceType,
} from '../audit-logs/entities/audit-log.entity';
```

Import NotFoundException and ForbiddenException from @nestjs/common if not already imported.
  </action>
  <verify>
TypeScript compiles: `cd api && npx tsc --noEmit`
updateAdminRole method exists
findByRole method exists
countSuperAdmins method exists
  </verify>
  <done>Role change method prevents self-escalation and last super_admin demotion, with audit logging</done>
</task>

<task type="auto">
  <name>Task 3: Create break-glass super_admin CLI script</name>
  <files>api/src/scripts/create-super-admin.ts</files>
  <action>
Create a CLI script for emergency super_admin creation:

```typescript
#!/usr/bin/env ts-node
// Nebula DNS - Break Glass Super Admin Creation
// Emergency script to create super_admin when none exists
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

/**
 * Break Glass Super Admin Creation Script
 *
 * This script creates a super_admin account when no super_admin exists.
 * It is intended for emergency recovery scenarios only.
 *
 * Usage:
 *   BREAK_GLASS_EMAIL=admin@example.com BREAK_GLASS_PASSWORD=... npx ts-node src/scripts/create-super-admin.ts
 *
 * Requirements:
 *   - BREAK_GLASS_EMAIL: Email for the new admin account
 *   - BREAK_GLASS_PASSWORD: Password (must meet admin password requirements: 14+ chars)
 *   - Database must be accessible
 *   - No existing super_admin accounts
 *
 * Security:
 *   - This script ONLY works if no super_admin exists
 *   - Requires server/database access to run
 *   - Change password and enable MFA immediately after use
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from '../modules/admin/entities/admin.entity';
import { AdminRole } from '../modules/admin/enums/admin-role.enum';

async function createBreakGlassAdmin() {
  const email = process.env.BREAK_GLASS_EMAIL;
  const password = process.env.BREAK_GLASS_PASSWORD;

  // Validate environment variables
  if (!email || !password) {
    console.error('ERROR: BREAK_GLASS_EMAIL and BREAK_GLASS_PASSWORD environment variables are required');
    console.error('');
    console.error('Usage:');
    console.error('  BREAK_GLASS_EMAIL=admin@example.com BREAK_GLASS_PASSWORD=YourSecurePassword123! npx ts-node src/scripts/create-super-admin.ts');
    process.exit(1);
  }

  // Validate password requirements (14+ characters)
  if (password.length < 14) {
    console.error('ERROR: Password must be at least 14 characters');
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('ERROR: Invalid email format');
    process.exit(1);
  }

  console.log('Initializing Nest application...');

  let app;
  try {
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });
  } catch (error) {
    console.error('ERROR: Failed to initialize application. Is the database accessible?');
    console.error((error as Error).message);
    process.exit(1);
  }

  try {
    const adminRepository = app.get<Repository<Admin>>(getRepositoryToken(Admin));

    // Check if any super_admin exists
    const existingSuperAdminCount = await adminRepository.count({
      where: { role: AdminRole.SUPER_ADMIN },
    });

    if (existingSuperAdminCount > 0) {
      console.error('ERROR: Super admin already exists. This script only works when no super_admin exists.');
      console.error('Use the admin UI or API to manage existing admin accounts.');
      await app.close();
      process.exit(1);
    }

    // Check if email is already in use
    const existingAdmin = await adminRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingAdmin) {
      console.error(`ERROR: Email ${email} is already in use by an existing admin account.`);
      await app.close();
      process.exit(1);
    }

    // Create the break-glass super_admin
    console.log(`Creating break-glass super_admin: ${email}`);

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = adminRepository.create({
      email: email.toLowerCase(),
      name: 'Break Glass Admin',
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      status: 'pending_mfa', // Require MFA setup on first login
      mfaSetupComplete: false,
    });

    await adminRepository.save(admin);

    console.log('');
    console.log('========================================');
    console.log('Break-glass super_admin created successfully!');
    console.log('========================================');
    console.log('');
    console.log(`Email: ${email}`);
    console.log(`Role: super_admin`);
    console.log(`Status: pending_mfa`);
    console.log('');
    console.log('IMPORTANT SECURITY NOTES:');
    console.log('1. Log in immediately and complete MFA setup');
    console.log('2. Change the password after first login');
    console.log('3. Consider creating a second super_admin for redundancy');
    console.log('4. Review audit logs for any suspicious activity');
    console.log('');

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('ERROR: Failed to create super_admin');
    console.error((error as Error).message);
    await app.close();
    process.exit(1);
  }
}

createBreakGlassAdmin();
```

This script:
- Only works if no super_admin exists (safety check)
- Requires environment variables for credentials (no hardcoded values)
- Validates password meets requirements (14+ chars)
- Sets status to pending_mfa (requires MFA setup)
- Provides clear security guidance after creation
  </action>
  <verify>
File exists at api/src/scripts/create-super-admin.ts
TypeScript compiles: `cd api && npx tsc --noEmit`
  </verify>
  <done>Break-glass CLI script created for emergency super_admin creation</done>
</task>

</tasks>

<verification>
After all tasks complete:
1. TypeScript compiles without errors: `cd api && npx tsc --noEmit`
2. AuditAction type includes 'admin_role_changed'
3. AuditResourceType includes 'admin'
4. AdminService has updateAdminRole method
5. AdminService has findByRole method
6. AdminService has countSuperAdmins method
7. Break-glass script exists and is syntactically correct

Integration testing (after migration runs):
- Create test admin, attempt self-escalation -> should get 403
- Attempt to demote only super_admin -> should get 403
- Break-glass script creates super_admin when none exists
- Break-glass script fails when super_admin already exists
</verification>

<success_criteria>
1. Self-escalation attempt returns 403 with clear message
2. Last super_admin demotion attempt returns 403 with guidance
3. Role changes invalidate all target admin sessions
4. Role changes are audit logged with who, what, when
5. Break-glass script successfully creates super_admin when none exists
6. Break-glass script refuses to run when super_admin already exists
</success_criteria>

<output>
After completion, create `.planning/phases/17-rbac-foundation-backend/17-04-SUMMARY.md`
</output>
