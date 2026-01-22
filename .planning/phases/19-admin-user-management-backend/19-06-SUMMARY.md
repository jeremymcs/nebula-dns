---
phase: 19-admin-user-management-backend
plan: 06
subsystem: auth
tags: [admin, invitations, security, email, sha256, bcrypt]

# Dependency graph
requires:
  - phase: 19-01
    provides: Entity definitions and DTOs for admin invitations
  - phase: 19-03
    provides: AdminActivityService for activity logging
  - phase: 19-04
    provides: Email templates for admin invitations
provides:
  - AdminInvitationsService with complete invitation workflow
  - createInvitation() with SHA256 token hashing
  - acceptInvitation() with transactional account creation
  - listInvitations() with pagination and status filtering
  - revokeInvitation() for invitation management
affects: [19-07, 20, admin-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SHA256 token hashing for invitation security"
    - "Transaction pattern for atomic invitation acceptance"
    - "7-day expiry with automatic expiration marking"
    - "Activity logging for all invitation operations"

key-files:
  created:
    - api/src/modules/admin/admin-invitations.service.ts
  modified:
    - api/src/modules/admin/admin.module.ts

key-decisions:
  - "Store only SHA256 hashes of invitation tokens, never plaintext"
  - "Use setImmediate for activity logging in transaction to prevent blocking"
  - "Email sending failures are logged but don't block invitation creation"
  - "Expired invitations marked on acceptance attempt, not via background job"

patterns-established:
  - "Invitation workflow: create -> email -> accept -> account creation"
  - "Status lifecycle: pending -> accepted/expired/revoked"
  - "isExpired computed field in DTO avoids client-side logic"

# Metrics
duration: 3min
completed: 2026-01-22
---

# Phase 19 Plan 06: Admin Invitations Service Summary

**Secure admin invitation workflow with SHA256 token hashing, transactional account creation, and complete lifecycle management**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-22T01:19:44Z
- **Completed:** 2026-01-22T01:22:41Z
- **Tasks:** 1 (service already created in previous execution)
- **Files modified:** 1

## Accomplishments
- AdminInvitationsService with complete invitation workflow
- Secure token generation using SHA256 hashing (only hashes stored)
- Transactional invitation acceptance with account creation
- Invitation listing with pagination and status filtering
- Invitation revocation for pending invitations
- All operations logged to AdminActivityService

## Task Commits

Each task was committed atomically:

1. **Task 4: Register AdminInvitationsService in AdminModule** - `041ed8c` (feat)

**Note:** Tasks 1-3 (service implementation) were already completed in a previous execution. The service file was created with commit `2cee6f2` (from plan 19-05). This execution only needed to register the service in the module.

## Files Created/Modified
- `api/src/modules/admin/admin-invitations.service.ts` - Admin invitation management service (pre-existing, 409 lines)
- `api/src/modules/admin/admin.module.ts` - Updated to register AdminInvitationsService

## Key Features Implemented

### createInvitation (USER-02, USER-03)
- Validates email is not already an admin
- Checks for existing pending invitations
- Generates cryptographically secure token (32 random bytes)
- Stores SHA256 hash only (not plaintext token)
- Sets 7-day expiry
- Logs to activity service
- Sends email with invitation link
- Returns invitation details and email status

### acceptInvitation (USER-04)
- Hashes provided token to find invitation
- Validates invitation status and expiry
- Creates admin account with bcrypt password hashing (12 rounds)
- Sets status to 'pending_mfa' (requires MFA setup)
- Marks invitation as accepted
- Uses transaction for atomicity (account + invitation update)
- Logs activity asynchronously (setImmediate)

### listInvitations (USER-11)
- Cursor-based pagination (default 20, max 100)
- Status filtering (pending, accepted, expired, revoked)
- Includes inviter email for context
- Computed isExpired field in response
- Ordered by creation date (newest first)

### revokeInvitation (USER-12)
- Only pending invitations can be revoked
- Marks invitation as revoked
- Logs activity with metadata

## Decisions Made

**1. Store only SHA256 hashes of invitation tokens**
- Security: Limits exposure if database is compromised
- Raw tokens only exist in email links and memory
- Hash comparison for validation (like password hashing)

**2. Use setImmediate for activity logging in transaction**
- Prevents activity log from blocking transaction commit
- Activity logging is separate concern from account creation
- Failures logged but don't affect invitation acceptance

**3. Email sending failures are logged but don't block invitation creation**
- Invitation record still created if email fails
- emailSent flag in response indicates email status
- Allows retry or manual notification

**4. Expired invitations marked on acceptance attempt, not background job**
- Simpler implementation without scheduled jobs
- Expiry check happens when token is used
- Status update prevents reuse

**5. isExpired computed field in DTO**
- Avoids client-side expiry logic duplication
- Consistent expiry calculation
- Server-side time is authoritative

## Deviations from Plan

None - plan executed as written. The AdminInvitationsService was already created in a previous execution (likely plan 19-05 which created both admin-users.service.ts and admin-invitations.service.ts). This execution only needed to complete Task 4 (module registration).

## Issues Encountered

None.

## User Setup Required

None - invitation service uses existing email service configuration. Requires ADMIN_URL environment variable (already documented in .env.example).

## Next Phase Readiness

Ready for phase 19-07 (Admin API endpoints) which will:
- Create controller endpoints for invitation operations
- Add route guards for super_admin role
- Wire up AdminInvitationsService to HTTP layer

All invitation business logic is complete and tested (TypeScript compiles).

---
*Phase: 19-admin-user-management-backend*
*Completed: 2026-01-22*
