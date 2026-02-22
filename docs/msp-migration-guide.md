# Nebula DNS - MSP Migration Guide

Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Overview

This guide covers the migration from the legacy Partner Portal system to the new Unified Tier System. The partner portal has been deprecated in favor of a single dashboard where MSP users can manage their clients directly.

## What's Changing

### Before: Partner Portal (Legacy)

- Separate `/partner/*` routes in the UI
- Separate `partners` and `partner_users` database tables
- Partner users logged in via `/partner/login`
- Organizations linked via `tenants.partner_id`
- Separate authentication flow for partners

### After: Unified Tier System

- Single dashboard at `/dashboard/*` with tier-aware features
- MSP functionality via tenant tier (`tier: 'msp'`)
- All users log in via `/login` (same login page)
- Clients linked via `tenants.managed_by_msp_id` (self-referential)
- Single authentication flow with organization switching

## Migration Steps

### Step 1: Backup Existing Partner Data

Before any migration, create a backup of all partner data:

```bash
cd api
npm run script:backup-partner-data
```

This creates a JSON backup file in the `backups/` directory containing:
- All partners and their settings
- All partner users and their credentials
- Tenant-to-partner mappings

### Step 2: Create MSP Tenants

For each partner organization, create a corresponding MSP-tier tenant:

```sql
-- Example: Convert partner to MSP tenant
INSERT INTO tenants (
  name,
  slug,
  tier,
  subscription_status,
  contact_email,
  settings
)
SELECT
  p.name,
  p.slug,
  'msp' as tier,
  CASE p.status WHEN 'active' THEN 'active' ELSE 'suspended' END,
  p.contact_email,
  jsonb_build_object(
    'branding', p.branding,
    'legacy_partner_id', p.id
  )
FROM partners p
WHERE NOT EXISTS (
  SELECT 1 FROM tenants t WHERE t.slug = p.slug
);
```

### Step 3: Migrate Partner Users

Partner users become regular users in the new MSP tenant:

```sql
-- Example: Migrate partner users to regular users
INSERT INTO users (
  tenant_id,
  email,
  name,
  password_hash,
  role,
  status,
  mfa_enabled,
  mfa_secret,
  failed_login_attempts,
  locked_until,
  last_login_at
)
SELECT
  t.id as tenant_id,
  pu.email,
  pu.name,
  pu.password_hash,
  CASE pu.role
    WHEN 'partner_owner' THEN 'owner'
    WHEN 'partner_admin' THEN 'admin'
    WHEN 'partner_support' THEN 'analyst'
    WHEN 'partner_billing' THEN 'admin'
    ELSE 'readonly'
  END as role,
  pu.status,
  pu.mfa_enabled,
  pu.mfa_secret,
  pu.failed_login_attempts,
  pu.locked_until,
  pu.last_login_at
FROM partner_users pu
JOIN partners p ON p.id = pu.partner_id
JOIN tenants t ON t.slug = p.slug AND t.tier = 'msp'
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.email = pu.email
);
```

### Step 4: Update Client Tenant References

Update existing tenants to use the new `managed_by_msp_id` relationship:

```sql
-- Update tenants to reference new MSP tenant instead of legacy partner
UPDATE tenants t
SET managed_by_msp_id = msp.id
FROM partners p
JOIN tenants msp ON msp.slug = p.slug AND msp.tier = 'msp'
WHERE t.partner_id = p.id
  AND t.managed_by_msp_id IS NULL;
```

### Step 5: Verify Migration

Run the backup script again to verify all data has been migrated:

```bash
npm run script:backup-partner-data
```

The script will report if any tenants still have `partner_id` but no `managed_by_msp_id`.

### Step 6: Run the Drop Migration

Once verification passes, run the migration to drop legacy tables:

```bash
npm run migration:run
```

This executes `1711000000000-DropPartnerTables` which:
1. Checks for unmigrated data (fails if found)
2. Removes `partner_id` column from tenants
3. Drops `partner_users` table
4. Drops `partners` table

## URL Redirects

The following redirects are automatically configured in `next.config.js`:

| Old URL | New URL |
|---------|---------|
| `/partner/login` | `/login` |
| `/partner` | `/login` |
| `/partner/dashboard` | `/dashboard` |
| `/partner/organizations` | `/dashboard/clients` |
| `/partner/organizations/:id` | `/dashboard/clients/:id` |
| `/partner/organizations/new` | `/dashboard/clients/new` |
| `/partner/settings` | `/dashboard/settings` |
| `/partner/users` | `/dashboard/users` |
| `/partner/reports` | `/dashboard/reports` |

## API Endpoint Changes

### Deprecated Endpoints (Partner Portal)

The following endpoints have been removed:

```
POST   /partner-auth/login        # Use /auth/login
POST   /partner-auth/logout       # Use /auth/logout
GET    /partner-dashboard/*       # Use /msp/* endpoints
```

### New MSP Endpoints

```
GET    /msp/clients              # List managed clients
POST   /msp/clients              # Create new client
GET    /msp/clients/:id          # Get client details
PATCH  /msp/clients/:id          # Update client
DELETE /msp/clients/:id          # Delete client

POST   /auth/switch-tenant       # Switch to client context
GET    /auth/organizations       # List accessible organizations
```

## Rollback Procedure

If you need to rollback the migration:

### 1. Rollback the Database Migration

```bash
npm run migration:revert
```

This recreates the `partners` and `partner_users` tables (empty).

### 2. Restore Data from Backup

```bash
# Use the backup JSON to restore data
node scripts/restore-partner-data.js backups/partner-data-<timestamp>.json
```

### 3. Re-enable Partner Module (if needed)

Update `api/src/app.module.ts`:
```typescript
// Re-add PartnersModule import
import { PartnersModule } from './modules/partners/partners.module';

// Re-add to imports array
PartnersModule,
```

## Troubleshooting

### "Cannot drop partner tables" Error

This error occurs if there are tenants with `partner_id` but no `managed_by_msp_id`. Run Step 4 to update the references.

### User Cannot Login After Migration

- Check that the user was migrated to the `users` table
- Verify the password hash was copied correctly
- Check that the target MSP tenant exists and is active

### Missing Client Organizations

- Verify `managed_by_msp_id` was set correctly
- Check that the MSP tenant has `tier: 'msp'`
- Ensure the client tenant status is `active`

### MFA Not Working After Migration

- Verify `mfa_secret` was copied to the new user record
- Check `mfa_enabled` flag is set correctly
- Users may need to re-enroll MFA if secrets were not migrated

## Support

For migration assistance, contact:
- Technical Support: support@nebula-dns.com
- Documentation: https://docs.nebula-dns.com/migration

## Related Documentation

- [Tier System Overview](./tier-system.md)
- [API Specification](./D-api-spec.md)
- [Database Schema](./C-database-schema.md)
