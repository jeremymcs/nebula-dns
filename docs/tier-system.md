# Nebula DNS - Unified Tier System

Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Overview

Nebula DNS uses a unified tier system that provides different feature sets and capabilities based on the subscription tier. This replaces the previous partner portal system with a more integrated approach where all users access the same dashboard with tier-appropriate features.

## Tier Types

### Home Tier

The Home tier is designed for individual users and families who want DNS protection for their home network.

**Features:**
- Up to 3 locations (devices/networks)
- Basic DNS filtering and security
- Family protection features
- Standard content categories
- Basic reporting (7-day history)

**Use Cases:**
- Home network protection
- Parental controls
- Basic malware protection
- Ad blocking

### Enterprise Tier

The Enterprise tier is designed for businesses that need comprehensive DNS security and management.

**Features:**
- Unlimited locations
- Advanced threat intelligence
- Custom content categories
- Full audit logging
- 90-day query history
- SSO/SAML integration
- API access
- Custom block pages
- Scheduled reports
- SIEM integration

**Use Cases:**
- Corporate network security
- Branch office management
- Compliance requirements
- Security operations

### MSP Tier

The MSP (Managed Service Provider) tier is designed for service providers who manage DNS security for multiple client organizations.

**Features:**
- All Enterprise features
- Multi-tenant client management
- Per-client billing
- White-label options
- Global policy templates
- Cross-client reporting
- Bulk operations
- Usage-based pricing

**Use Cases:**
- IT service providers
- Managed security providers
- Resellers
- Large enterprises with subsidiaries

## Data Model

### Tenant Entity

The tenant entity represents an organization and includes tier information:

```typescript
interface Tenant {
  id: string;
  name: string;
  slug: string;
  tier: 'home' | 'enterprise' | 'msp';
  subscriptionStatus: 'active' | 'grace' | 'suspended';
  locationLimit: number | null;  // null = unlimited
  clientLimit: number | null;    // null = unlimited (MSP only)
  managedByMspId: string | null; // For MSP-managed clients
}
```

### MSP Client Relationship

MSP tenants can manage other tenants (clients) using a self-referential relationship:

```
MSP Tenant (tier: 'msp')
  |
  +-- Client Tenant 1 (managedByMspId: MSP's ID)
  +-- Client Tenant 2 (managedByMspId: MSP's ID)
  +-- Client Tenant 3 (managedByMspId: MSP's ID)
```

## API Endpoints

### Tier Information

```
GET /tenants/current
```

Returns the current tenant with tier information.

### MSP Endpoints

MSP-specific endpoints are available only to users in MSP-tier tenants:

```
GET    /msp/clients              # List managed clients
POST   /msp/clients              # Create new client
GET    /msp/clients/:id          # Get client details
PATCH  /msp/clients/:id          # Update client
DELETE /msp/clients/:id          # Delete client

GET    /msp/templates            # List policy templates
POST   /msp/templates            # Create template
POST   /msp/templates/:id/deploy # Deploy to clients

GET    /msp/billing/overview     # Billing overview
GET    /msp/billing/usage        # Usage statistics
```

### Organization Switching

MSP users can switch context to view/manage specific clients:

```
POST /auth/switch-tenant
{
  "tenantId": "client-tenant-id"
}
```

This returns new tokens scoped to the selected client tenant.

## UI Components

### Organization Switcher

MSP users see an organization switcher in the dashboard header that allows them to:
- View their own MSP dashboard
- Switch to any managed client
- Access client-specific settings

### Tier-Gated Features

The UI conditionally shows features based on the user's tenant tier:

```typescript
// Example: Show MSP features only for MSP tier
{user.tenantTier === 'msp' && (
  <NavigationItem href="/dashboard/clients" label="Clients" />
)}
```

### Dashboard Navigation

| Feature | Home | Enterprise | MSP |
|---------|------|------------|-----|
| Overview | Yes | Yes | Yes |
| Policies | Yes | Yes | Yes |
| Locations | Yes (3 max) | Yes | Yes |
| Reports | Basic | Advanced | Advanced |
| Clients | No | No | Yes |
| Templates | No | No | Yes |
| Billing | Yes | Yes | MSP Billing |
| Settings | Basic | Full | Full |

## Billing

### Home Tier
- Fixed monthly subscription
- Pay per additional location beyond limit

### Enterprise Tier
- Tiered pricing based on locations
- Annual contracts available
- Volume discounts

### MSP Tier
- Base platform fee
- Per-client charges
- Query-based usage billing
- Bundle purchasing options

## Migration from Partner Portal

The partner portal has been deprecated in favor of the unified tier system. See [MSP Migration Guide](./msp-migration-guide.md) for details on migrating existing partner accounts.

## Security Considerations

### Tier Enforcement

- Tier limits are enforced at the API level
- Creating locations/clients beyond limits returns 403 error
- Grace periods allow access during billing issues

### Data Isolation

- Each tenant's data is isolated using `tenant_id`
- MSP users can only access their managed clients
- Switching tenants requires valid relationship

### Audit Logging

All tier-related changes are logged:
- Tier upgrades/downgrades
- Client creation/deletion (MSP)
- Organization switching

## Configuration

### Environment Variables

```bash
# Default limits for new tenants
DEFAULT_HOME_LOCATION_LIMIT=3
DEFAULT_ENTERPRISE_LOCATION_LIMIT=null  # unlimited
DEFAULT_MSP_CLIENT_LIMIT=null           # unlimited

# Grace period for payment issues (days)
SUBSCRIPTION_GRACE_PERIOD_DAYS=7
```

### Feature Flags

Feature flags can be used to gradually roll out tier features:

```typescript
// In feature flag service
const tierFeatures = {
  'msp.templates': true,
  'msp.bulk-operations': true,
  'enterprise.siem': true,
  'home.family-mode': true,
};
```

## Related Documentation

- [MSP Migration Guide](./msp-migration-guide.md) - Migrating from partner portal
- [API Specification](./D-api-spec.md) - Full API documentation
- [Database Schema](./C-database-schema.md) - Data model details
