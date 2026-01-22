# Phase 19: Admin User Management (Backend) - Research

// Nebula DNS Admin Dashboard - Phase 19 Research
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Researched:** 2026-01-21
**Domain:** NestJS Admin User CRUD, Invitation System, MFA Management, Activity Logging
**Confidence:** HIGH

## Summary

This phase implements complete admin user management capabilities for Super Admins. The Nebula DNS codebase already has established patterns for invitations (team_invitations table), MFA (admin_mfa table), email notifications (EmailService), and audit logging (AuditLogsService with hash-chain integrity). The RBAC foundation from Phase 17 provides the authorization framework.

The implementation requires:
1. New `admin_invitations` table for invite management (following existing `team_invitations` pattern)
2. New `admin_activity_logs` table for admin-specific audit trail (separate from tenant audit logs)
3. Admin user CRUD endpoints protected by @AdminRoles(AdminRole.SUPER_ADMIN)
4. Invitation flow with SHA256 hashed tokens and 7-day expiry
5. MFA reset functionality with email notification
6. Admin suspend/reactivate capabilities

**Primary recommendation:** Follow the existing invitation pattern from `InvitationsService` (token generation, SHA256 hashing, email sending) but adapt it for the admin context. Create a separate `admin_activity_logs` table since the existing audit_logs table is tenant-scoped.

## Standard Stack

The codebase already has all necessary tooling in place.

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/typeorm | ^10.x | Database ORM | Existing pattern |
| bcrypt | ^5.x | Password hashing | Existing in admin.service.ts |
| crypto | built-in | Token generation & SHA256 hashing | Existing in invitations.service.ts |
| @sendgrid/mail | ^8.x | Email delivery | Existing in email.service.ts |

### Supporting (Already in Use)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-validator | ^0.14.x | DTO validation | Request validation |
| class-transformer | ^0.5.x | Response serialization | @Exclude sensitive fields |
| uuid | ^9.x | Generate unique IDs | Token JTI, record IDs |

### No New Dependencies Required
All functionality can be built using existing patterns and libraries.

## Architecture Patterns

### Recommended Project Structure Changes
```
api/src/modules/admin/
├── entities/
│   ├── admin.entity.ts           # EXISTING - needs no changes
│   ├── admin-mfa.entity.ts       # EXISTING - needs no changes
│   ├── admin-invitation.entity.ts  # NEW - invite management
│   └── admin-activity-log.entity.ts  # NEW - admin audit trail
├── dto/
│   ├── admin-user.dto.ts         # NEW - user management DTOs
│   ├── admin-invitation.dto.ts   # NEW - invitation DTOs
│   └── admin-activity.dto.ts     # NEW - activity log DTOs
├── admin-users.controller.ts     # NEW - user management endpoints
├── admin-users.service.ts        # NEW - user management logic
├── admin-invitations.service.ts  # NEW - invitation logic
└── admin-activity.service.ts     # NEW - activity logging
```

### Pattern 1: Admin Invitation Entity
**What:** Store invitation tokens with SHA256 hashing (matching team_invitations pattern)
**When to use:** For all admin invitations
**Example:**
```typescript
// Source: Existing team_invitations pattern in invitations.entity.ts
@Entity('admin_invitations')
export class AdminInvitation extends BaseEntity {
  @Column({ name: 'invited_by_admin_id', type: 'uuid' })
  invitedByAdminId: string;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'invited_by_admin_id' })
  invitedBy: Admin;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  role: AdminRole;

  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash: string;  // SHA256 hash

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: AdminInvitationStatus;  // 'pending' | 'accepted' | 'expired' | 'revoked'

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;
}
```

### Pattern 2: Admin Activity Log Entity
**What:** Separate audit trail for admin actions (not tenant-scoped like audit_logs)
**When to use:** For all sensitive admin operations
**Example:**
```typescript
// Source: Security best practices, separate from tenant audit_logs
@Entity('admin_activity_logs')
export class AdminActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id', type: 'uuid' })
  adminId: string;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @Column({ type: 'varchar', length: 50 })
  action: AdminActivityAction;
  // 'admin_login', 'admin_logout', 'admin_login_failed',
  // 'admin_invited', 'admin_created', 'admin_suspended',
  // 'admin_reactivated', 'admin_role_changed', 'admin_mfa_reset',
  // 'admin_deleted', 'admin_password_changed'

  @Column({ name: 'target_admin_id', type: 'uuid', nullable: true })
  targetAdminId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

### Pattern 3: Token Generation (Existing Pattern)
**What:** Generate cryptographically secure tokens with SHA256 hashing
**When to use:** For all invitation tokens
**Example:**
```typescript
// Source: Existing invitations.service.ts generateToken()
private generateInviteToken(): { token: string; hash: string } {
  // Generate 32 random bytes = 64 hex characters
  const token = crypto.randomBytes(32).toString('hex');
  // Store only the SHA256 hash in database
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}
```

### Pattern 4: MFA Reset Flow
**What:** Super Admin can reset another admin's MFA, requiring re-setup
**When to use:** When admin loses access to authenticator
**Example:**
```typescript
// Source: Security best practice
async resetAdminMfa(
  requesterId: string,
  targetId: string,
  ipAddress?: string,
): Promise<void> {
  // 1. Verify requester is super_admin (guard handles this)

  // 2. Cannot reset own MFA (must have working MFA to be logged in)
  if (requesterId === targetId) {
    throw new ForbiddenException('Cannot reset your own MFA');
  }

  // 3. Delete existing MFA record
  await this.adminMfaRepository.delete({ adminId: targetId });

  // 4. Update admin status to require MFA setup
  await this.adminRepository.update(targetId, {
    mfaSetupComplete: false,
    status: 'pending_mfa',
  });

  // 5. Invalidate all sessions (force re-login)
  await this.adminSessionService.revokeAllSessions(targetId);

  // 6. Log the action
  await this.logActivity({
    adminId: requesterId,
    action: 'admin_mfa_reset',
    targetAdminId: targetId,
    ipAddress,
  });

  // 7. Send notification email to target admin
  const targetAdmin = await this.findById(targetId);
  await this.emailService.sendMfaResetNotification({
    to: targetAdmin.email,
    name: targetAdmin.name,
    resetByEmail: (await this.findById(requesterId)).email,
    loginUrl: `${this.configService.get('ADMIN_URL')}/login`,
  });
}
```

### Anti-Patterns to Avoid
- **Storing plaintext tokens:** Always hash with SHA256 before storage
- **Mixing admin audit with tenant audit:** Keep admin_activity_logs separate from audit_logs
- **Allowing self-escalation:** Already prevented in Phase 17, verify in all new endpoints
- **Sending temp password in plain email:** For new admins, use invite link with password setup, not temp password

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token generation | Custom random strings | crypto.randomBytes(32) | Cryptographically secure |
| Token hashing | MD5 or custom hash | crypto.createHash('sha256') | Industry standard |
| Email sending | Custom SMTP | EmailService with SendGrid | Already configured |
| Session invalidation | Custom logout logic | AdminSessionService.revokeAllSessions() | Already handles blacklisting |
| Password hashing | Custom logic | bcrypt.hash(password, 12) | Existing pattern |

**Key insight:** Follow existing patterns from InvitationsService and AdminService. The codebase has mature implementations.

## Common Pitfalls

### Pitfall 1: Storing Plaintext Invitation Tokens
**What goes wrong:** Token leaks via database access grant attacker invite capability
**Why it happens:** Developer stores token directly instead of hash
**How to avoid:** Always store SHA256 hash, reconstruct on lookup
**Warning signs:** Token column > 64 characters, or not using crypto.createHash

### Pitfall 2: Token Collision Handling
**What goes wrong:** Same hash collision causes "invitation not found"
**Why it happens:** SHA256 collisions are astronomically rare but check uniqueness anyway
**How to avoid:** UNIQUE constraint on token_hash column
**Warning signs:** Duplicate key errors on invite creation

### Pitfall 3: Race Condition on Last Super Admin
**What goes wrong:** Two concurrent requests both pass the "count > 1" check
**Why it happens:** Non-atomic check-then-act
**How to avoid:** Use SELECT FOR UPDATE or rely on application-level semaphore
**Warning signs:** Multiple super_admins being demoted simultaneously

### Pitfall 4: MFA Reset Without Notification
**What goes wrong:** Admin doesn't know their MFA was reset, can't log in
**Why it happens:** Forgot to send notification email
**How to avoid:** Always email target admin on MFA reset
**Warning signs:** Support tickets about "can't log in" after MFA reset

### Pitfall 5: Activity Log Missing for Security Events
**What goes wrong:** Compliance audit fails, no record of who did what
**Why it happens:** Forgot to add logging call for new endpoints
**How to avoid:** Checklist: every admin CRUD operation logs an activity
**Warning signs:** Gaps in admin_activity_logs timeline

### Pitfall 6: Invitation Email Contains Sensitive Data
**What goes wrong:** Email contains temp password or token in plain text (acceptable)
**Why it happens:** Design choice - invite link IS the sensitive data
**How to avoid:** Token in URL is acceptable (one-time use), but never include password
**Warning signs:** Temp passwords in emails (bad pattern - use password setup flow instead)

## Code Examples

Verified patterns from existing codebase:

### Generate Invitation and Send Email
```typescript
// Source: Adapted from invitations.service.ts create()
async createInvitation(
  invitedByAdminId: string,
  dto: CreateAdminInvitationDto,
): Promise<{ invitation: AdminInvitation; sent: boolean }> {
  // 1. Check if email already exists as admin
  const existingAdmin = await this.adminRepository.findOne({
    where: { email: dto.email.toLowerCase() },
  });
  if (existingAdmin) {
    throw new ConflictException('An admin with this email already exists');
  }

  // 2. Check for existing pending invitation
  const existingInvite = await this.adminInvitationRepository.findOne({
    where: { email: dto.email.toLowerCase(), status: 'pending' },
  });
  if (existingInvite) {
    throw new ConflictException('An invitation has already been sent to this email');
  }

  // 3. Generate token and hash
  const { token, hash } = this.generateInviteToken();

  // 4. Set 7-day expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // 5. Create invitation
  const invitation = this.adminInvitationRepository.create({
    invitedByAdminId,
    email: dto.email.toLowerCase(),
    role: dto.role,
    tokenHash: hash,
    expiresAt,
  });
  const saved = await this.adminInvitationRepository.save(invitation);

  // 6. Log activity
  await this.logActivity({
    adminId: invitedByAdminId,
    action: 'admin_invited',
    metadata: { email: dto.email, role: dto.role },
  });

  // 7. Send invitation email
  const inviter = await this.adminRepository.findOne({ where: { id: invitedByAdminId } });
  const inviteUrl = `${this.configService.get('ADMIN_URL')}/invite/accept?token=${token}`;
  const sent = await this.emailService.sendAdminInviteEmail({
    to: dto.email,
    inviterName: inviter?.name || 'Nebula DNS Admin',
    inviterEmail: inviter?.email || '',
    role: dto.role,
    inviteUrl,
    expiresAt,
  });

  return { invitation: saved, sent };
}
```

### Accept Invitation and Set Password
```typescript
// Source: Adapted from invitations.service.ts accept()
async acceptInvitation(dto: AcceptAdminInvitationDto): Promise<Admin> {
  // 1. Hash the provided token to find invitation
  const hash = crypto.createHash('sha256').update(dto.token).digest('hex');

  // 2. Find invitation by hash
  const invitation = await this.adminInvitationRepository.findOne({
    where: { tokenHash: hash },
  });
  if (!invitation) {
    throw new NotFoundException('Invitation not found');
  }

  // 3. Check status
  if (invitation.status !== 'pending') {
    throw new BadRequestException('This invitation has already been used or revoked');
  }

  // 4. Check expiry
  if (new Date() > invitation.expiresAt) {
    invitation.status = 'expired';
    await this.adminInvitationRepository.save(invitation);
    throw new BadRequestException('This invitation has expired');
  }

  // 5. Create admin account (transaction)
  return await this.dataSource.transaction(async (manager) => {
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const admin = manager.create(Admin, {
      email: invitation.email,
      name: dto.name,
      passwordHash,
      role: invitation.role,
      status: 'pending_mfa',  // Must set up MFA
      mfaSetupComplete: false,
      invitedByAdminId: invitation.invitedByAdminId,
    });
    const savedAdmin = await manager.save(admin);

    // Mark invitation as accepted
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await manager.save(invitation);

    // Log activity
    await this.logActivity({
      adminId: savedAdmin.id,
      action: 'admin_created',
      metadata: { invitedBy: invitation.invitedByAdminId },
    });

    return savedAdmin;
  });
}
```

### Suspend/Reactivate Admin
```typescript
// Source: Security best practice
async suspendAdmin(
  requesterId: string,
  targetId: string,
  ipAddress?: string,
): Promise<void> {
  // 1. Cannot suspend yourself
  if (requesterId === targetId) {
    throw new ForbiddenException('Cannot suspend yourself');
  }

  // 2. Find target admin
  const target = await this.adminRepository.findOne({ where: { id: targetId } });
  if (!target) {
    throw new NotFoundException('Admin not found');
  }

  // 3. Cannot suspend another super_admin (only way is to demote first)
  if (target.role === AdminRole.SUPER_ADMIN) {
    throw new ForbiddenException('Cannot suspend a super_admin. Demote them first.');
  }

  // 4. Update status
  await this.adminRepository.update(targetId, { status: 'suspended' });

  // 5. Invalidate all sessions
  await this.adminSessionService.revokeAllSessions(targetId);

  // 6. Log activity
  await this.logActivity({
    adminId: requesterId,
    action: 'admin_suspended',
    targetAdminId: targetId,
    ipAddress,
  });
}

async reactivateAdmin(
  requesterId: string,
  targetId: string,
  ipAddress?: string,
): Promise<void> {
  const target = await this.adminRepository.findOne({ where: { id: targetId } });
  if (!target) {
    throw new NotFoundException('Admin not found');
  }

  if (target.status !== 'suspended') {
    throw new BadRequestException('Admin is not suspended');
  }

  // Reactivate - they'll need to log in fresh
  await this.adminRepository.update(targetId, {
    status: target.mfaSetupComplete ? 'active' : 'pending_mfa'
  });

  await this.logActivity({
    adminId: requesterId,
    action: 'admin_reactivated',
    targetAdminId: targetId,
    ipAddress,
  });
}
```

### List Admins with Roles
```typescript
// Source: Standard pagination pattern
async listAdmins(query: ListAdminsQueryDto): Promise<ListAdminsResponseDto> {
  const limit = query.limit ?? 20;
  const offset = query.cursor ? parseInt(query.cursor, 10) : 0;

  const queryBuilder = this.adminRepository.createQueryBuilder('admin')
    .select([
      'admin.id',
      'admin.email',
      'admin.name',
      'admin.role',
      'admin.status',
      'admin.mfaSetupComplete',
      'admin.lastLoginAt',
      'admin.createdAt',
    ]);

  // Optional role filter
  if (query.role) {
    queryBuilder.where('admin.role = :role', { role: query.role });
  }

  // Optional status filter
  if (query.status) {
    queryBuilder.andWhere('admin.status = :status', { status: query.status });
  }

  const total = await queryBuilder.getCount();

  const admins = await queryBuilder
    .orderBy('admin.name', 'ASC')
    .skip(offset)
    .take(limit + 1)
    .getMany();

  const hasMore = admins.length > limit;
  const data = admins.slice(0, limit);

  return {
    data: data.map(admin => this.toAdminResponseDto(admin)),
    pagination: {
      cursor: hasMore ? String(offset + limit) : null,
      hasMore,
      total,
    },
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MD5/SHA1 for tokens | SHA256 | Security best practice | Stronger collision resistance |
| Temp password in email | Invite link with password setup | Security best practice | No plaintext passwords in email |
| Single audit_logs table | Separate admin_activity_logs | Multi-tenant architecture | Clean tenant isolation |
| Password-only invite | Token-based invite with 7-day expiry | Industry standard | Time-limited, single-use tokens |

**Deprecated/outdated:**
- Sending temporary passwords via email (use invite link with password setup instead)
- Storing tokens in plaintext (always hash)

## Open Questions

Things that couldn't be fully resolved:

1. **Admin deletion vs permanent deactivation**
   - What we know: Both patterns exist in industry
   - What's unclear: Business preference for soft delete vs hard delete
   - Recommendation: Implement soft delete (status='deleted') to preserve audit trail

2. **Self-password change for non-super-admins**
   - What we know: Phase focuses on super_admin managing others
   - What's unclear: Should all admins be able to change own password?
   - Recommendation: Yes, add password change endpoint accessible to all admin roles

3. **Bulk invite capability**
   - What we know: Existing team invitations has bulkInvite
   - What's unclear: Whether admin invites need bulk capability
   - Recommendation: Implement single invite first, can add bulk later if needed

## Email Templates Required

New email templates needed for EmailService:

1. **Admin Invite Email** (sendAdminInviteEmail)
   - Subject: "You've been invited to join Nebula DNS Admin"
   - Contains: invite URL, role assigned, expiry date

2. **MFA Reset Notification** (sendMfaResetNotification)
   - Subject: "Your MFA has been reset - Action Required"
   - Contains: who reset it, login URL, MFA setup instructions

3. **Admin Suspended Notification** (optional, consider)
   - Subject: "Your Nebula DNS Admin access has been suspended"
   - Contains: who to contact for questions

## API Endpoints Summary

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /admin/users | SUPER_ADMIN | List all admins with roles |
| POST | /admin/users/invite | SUPER_ADMIN | Send invitation email |
| GET | /admin/users/invites | SUPER_ADMIN | List pending invites |
| DELETE | /admin/users/invites/:id | SUPER_ADMIN | Revoke pending invite |
| POST | /admin/users/invite/accept | Public | Accept invitation, set password |
| GET | /admin/users/:id | SUPER_ADMIN | Get admin profile details |
| PATCH | /admin/users/:id/suspend | SUPER_ADMIN | Suspend admin |
| PATCH | /admin/users/:id/reactivate | SUPER_ADMIN | Reactivate admin |
| POST | /admin/users/:id/mfa/reset | SUPER_ADMIN | Reset admin's MFA |
| GET | /admin/activity | SUPER_ADMIN | View admin activity log |

## Sources

### Primary (HIGH confidence)
- Existing codebase: `api/src/modules/invitations/` - Team invitation pattern
- Existing codebase: `api/src/modules/admin/` - Admin auth, RBAC
- Existing codebase: `api/src/modules/email/email.service.ts` - Email patterns
- Existing codebase: `api/src/modules/audit-logs/` - Audit logging pattern

### Secondary (MEDIUM confidence)
- NestJS Documentation - Authentication and Authorization
- bcrypt documentation - Password hashing best practices
- Node.js crypto documentation - Token generation

### Tertiary (LOW confidence)
- None required - all patterns exist in codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing codebase patterns
- Architecture: HIGH - Following established patterns
- Pitfalls: HIGH - Based on security best practices
- Code examples: HIGH - Adapted from existing codebase

**Research date:** 2026-01-21
**Valid until:** 2026-02-21 (30 days - stable patterns)

---

## Implementation Notes for Planner

### Existing Infrastructure Summary
1. **Admin Entity** (`admin.entity.ts`): Has role, status, invitedByAdminId - ready to use
2. **Admin MFA Entity** (`admin-mfa.entity.ts`): Complete for MFA reset
3. **EmailService** (`email.service.ts`): Has template patterns, needs 2 new templates
4. **AdminSessionService** (`admin-session.service.ts`): Has revokeAllSessions for session invalidation
5. **AdminService** (`admin.service.ts`): Has updateAdminRole, login, logout patterns

### New Components Required
1. **AdminInvitation Entity** - New table for invitations
2. **AdminActivityLog Entity** - New table for admin audit trail
3. **AdminUsersController** - New controller for user management endpoints
4. **AdminUsersService** - New service for user management logic (or extend AdminService)
5. **AdminActivityService** - New service for activity logging

### Migration Required
```sql
-- admin_invitations table
CREATE TABLE admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by_admin_id UUID NOT NULL REFERENCES admins(id),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ
);

-- admin_activity_logs table
CREATE TABLE admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id),
  action VARCHAR(50) NOT NULL,
  target_admin_id UUID REFERENCES admins(id),
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_activity_admin ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_activity_created ON admin_activity_logs(created_at DESC);
```

### Requirement Mapping
| Requirement | Implementation Approach |
|-------------|------------------------|
| USER-01 | GET /admin/users with pagination |
| USER-02 | POST /admin/users/invite + email |
| USER-03 | SHA256 hash in admin_invitations, 7-day expiry |
| USER-04 | POST /admin/users/invite/accept (public endpoint) |
| USER-05 | GET /admin/users/:id |
| USER-06 | PATCH /admin/users/:id/suspend |
| USER-07 | PATCH /admin/users/:id/reactivate |
| USER-08 | POST /admin/users/:id/mfa/reset |
| USER-09 | EmailService.sendMfaResetNotification() |
| USER-10 | admin_activity_logs table + AdminActivityService |
| USER-11 | GET /admin/users/invites with expiry status |
| USER-12 | DELETE /admin/users/invites/:id |
