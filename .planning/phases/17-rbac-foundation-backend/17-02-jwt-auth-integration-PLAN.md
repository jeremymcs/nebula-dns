---
phase: 17-rbac-foundation-backend
plan: 02
type: execute
wave: 2
depends_on: ["17-01"]
files_modified:
  - api/src/modules/admin/dto/admin-jwt-payload.dto.ts
  - api/src/modules/admin/strategies/admin-jwt.strategy.ts
  - api/src/modules/admin/admin.service.ts
  - api/src/modules/admin/dto/admin-response.dto.ts
autonomous: true

must_haves:
  truths:
    - "Admin JWT tokens contain role claim"
    - "AdminUser object attached to request includes role"
    - "Login response includes admin role"
    - "Token generation includes role from database"
  artifacts:
    - path: "api/src/modules/admin/dto/admin-jwt-payload.dto.ts"
      provides: "JWT payload with role claim"
      contains: "role: AdminRole"
    - path: "api/src/modules/admin/strategies/admin-jwt.strategy.ts"
      provides: "Strategy returning AdminUser with role"
      contains: "role:"
    - path: "api/src/modules/admin/admin.service.ts"
      provides: "Token generation with role"
      contains: "role:"
  key_links:
    - from: "api/src/modules/admin/admin.service.ts"
      to: "api/src/modules/admin/entities/admin.entity.ts"
      via: "admin.role in token generation"
      pattern: "admin\\.role"
    - from: "api/src/modules/admin/strategies/admin-jwt.strategy.ts"
      to: "api/src/modules/admin/dto/admin-jwt-payload.dto.ts"
      via: "AdminJwtPayload with role"
      pattern: "payload\\.role"
---

<objective>
Integrate role into JWT authentication flow: payload definitions, strategy validation, token generation, and response DTOs.

Purpose: Enable role to flow from database through JWT token to request.user, making it available for AdminRolesGuard and frontend permission checks (RBAC-04).

Output: JWT tokens issued with role claim, AdminUser includes role, login response shows role.
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
@api/src/modules/admin/dto/admin-jwt-payload.dto.ts
@api/src/modules/admin/strategies/admin-jwt.strategy.ts
@api/src/modules/admin/admin.service.ts
@api/src/modules/admin/dto/admin-response.dto.ts

# Reference from Plan 01
@api/src/modules/admin/enums/admin-role.enum.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update AdminJwtPayload and AdminUser interfaces</name>
  <files>api/src/modules/admin/dto/admin-jwt-payload.dto.ts</files>
  <action>
Update the existing file to add role to both interfaces:

1. Import AdminRole from '../enums/admin-role.enum'
2. Add to AdminJwtPayload interface:
```typescript
/**
 * Admin's role for authorization
 */
role: AdminRole;
```
3. Add to AdminUser interface:
```typescript
/**
 * Admin's role for authorization
 */
role: AdminRole;
```

Place the role field after mfaVerified in both interfaces to maintain logical grouping.

Do NOT remove any existing fields or comments.
  </action>
  <verify>
TypeScript compiles: `cd api && npx tsc --noEmit`
Both interfaces include role field
  </verify>
  <done>AdminJwtPayload and AdminUser interfaces include role: AdminRole field</done>
</task>

<task type="auto">
  <name>Task 2: Update AdminJwtStrategy to include role in AdminUser</name>
  <files>api/src/modules/admin/strategies/admin-jwt.strategy.ts</files>
  <action>
Update the validate() method to include role in the returned AdminUser:

1. Import AdminRole from '../enums/admin-role.enum' (if not already imported via payload type)
2. In the validate() method, the returned object currently has:
   - adminId, email, name, mfaVerified, jti
3. Add role from the payload:
```typescript
return {
  adminId: payload.sub,
  email: payload.email,
  name: payload.name,
  mfaVerified: payload.mfaVerified,
  jti: payload.jti,
  role: payload.role,  // ADD THIS LINE
};
```

The role comes from the JWT payload which was set during token generation.

Do NOT modify any existing validation logic (issuer check, blacklist check, admin status check).
  </action>
  <verify>
TypeScript compiles: `cd api && npx tsc --noEmit`
validate() returns object with role property
  </verify>
  <done>AdminJwtStrategy returns AdminUser with role from JWT payload</done>
</task>

<task type="auto">
  <name>Task 3: Update AdminService token generation to include role</name>
  <files>api/src/modules/admin/admin.service.ts</files>
  <action>
Update the generateTokenAndSession() private method to include role in JWT payload:

1. Import AdminRole from './enums/admin-role.enum' at the top of the file
2. Find the payload object in generateTokenAndSession() method (around line 250):
```typescript
const payload = {
  sub: admin.id,
  email: admin.email,
  name: admin.name,
  iss: 'nebula-admin',
  jti,
  mfaVerified: admin.mfaSetupComplete,
};
```
3. Add role from the admin entity:
```typescript
const payload = {
  sub: admin.id,
  email: admin.email,
  name: admin.name,
  iss: 'nebula-admin',
  jti,
  mfaVerified: admin.mfaSetupComplete,
  role: admin.role,  // ADD THIS LINE
};
```

The admin.role comes from the database entity loaded during login.

Do NOT modify any other methods or logic in this file.
  </action>
  <verify>
TypeScript compiles: `cd api && npx tsc --noEmit`
Token payload includes role field
  </verify>
  <done>JWT token generation includes role claim from admin entity</done>
</task>

<task type="auto">
  <name>Task 4: Update login response DTO to include role</name>
  <files>api/src/modules/admin/dto/admin-response.dto.ts</files>
  <action>
Update the response DTOs to include role in admin info:

1. Import AdminRole from '../enums/admin-role.enum'
2. Find AdminLoginResponseDto class - it has a nested 'admin' object with:
   - id, email, name, status, mfaSetupComplete
3. Add role to the admin property type (look for ApiProperty decorator):
```typescript
@ApiProperty({
  description: 'Admin role for authorization',
  enum: ['super_admin', 'admin', 'viewer'],
  example: 'admin',
})
role: AdminRole;
```
4. Also find AdminProfileResponseDto and add role there:
```typescript
@ApiProperty({
  description: 'Admin role',
  enum: ['super_admin', 'admin', 'viewer'],
  example: 'admin',
})
role: AdminRole;
```

Also update the generateTokenAndSession() return in admin.service.ts (admin object):
After updating the DTO, ensure the service returns the role in the admin object:
```typescript
admin: {
  id: admin.id,
  email: admin.email,
  name: admin.name,
  status: admin.status,
  mfaSetupComplete: admin.mfaSetupComplete,
  role: admin.role,  // ADD THIS LINE
},
```

Similarly update getProfile() in admin.controller.ts to return role:
The AdminProfileResponseDto return object needs role added.
  </action>
  <verify>
TypeScript compiles: `cd api && npx tsc --noEmit`
Swagger docs would show role in response schemas
  </verify>
  <done>Login and profile responses include admin role for frontend use</done>
</task>

</tasks>

<verification>
After all tasks complete:
1. TypeScript compiles without errors: `cd api && npx tsc --noEmit`
2. AdminJwtPayload interface has role field
3. AdminUser interface has role field
4. AdminJwtStrategy.validate() returns role
5. Token payload in generateTokenAndSession() includes role
6. Login response DTO includes role
7. Profile response includes role
</verification>

<success_criteria>
1. JWT tokens contain role claim (verifiable by decoding a token)
2. request.user.role is available in controllers after authentication
3. Login response includes admin.role field
4. Profile endpoint returns role
</success_criteria>

<output>
After completion, create `.planning/phases/17-rbac-foundation-backend/17-02-SUMMARY.md`
</output>
