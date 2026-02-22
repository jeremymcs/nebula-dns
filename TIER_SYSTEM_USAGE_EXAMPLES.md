# Tier System Usage Examples

This document provides practical examples of how to use the tier-based feature access system in the Nebula DNS platform.

## Basic Usage

### Check Feature Access in a Component

```tsx
import { useTierFeatures } from '@/hooks/useTierFeatures'

function SiemPage() {
  const { hasAccess, upgradeMessage } = useTierFeatures()

  if (!hasAccess('siem')) {
    return (
      <div className="p-6 text-center">
        <p className="text-space-600">{upgradeMessage('siem')}</p>
        <a href="/dashboard/billing">Upgrade Now</a>
      </div>
    )
  }

  return <SiemIntegrations />
}
```

### Require a Feature (with Auto-Redirect)

```tsx
import { useRequireFeature } from '@/hooks/useTierFeatures'

function ApiKeysPage() {
  // Automatically redirects to /dashboard if user doesn't have access
  useRequireFeature('api-keys')

  return <ApiKeysManagement />
}
```

### Require a Tier (with Built-in Upgrade Prompt)

```tsx
import { useRequireTier } from '@/hooks/useTierFeatures'

function EnterpriseDashboard() {
  const { hasAccess, UpgradePrompt } = useRequireTier('enterprise')

  if (!hasAccess) {
    return <UpgradePrompt />
  }

  return <EnterpriseFeatures />
}
```

## Navigation Examples

### Filter Navigation Based on Tier

```tsx
import { getNavigationForTier } from '@/components/layout/NavigationConfig'
import { useAuth } from '@/contexts/AuthContext'

function CustomNav() {
  const { tier } = useAuth()
  const navigationGroups = getNavigationForTier(tier)

  return (
    <nav>
      {navigationGroups.map(group => (
        <div key={group.name}>
          <h3>{group.name}</h3>
          {group.items.map(item => (
            <a key={item.href} href={item.href}>
              {item.name}
            </a>
          ))}
        </div>
      ))}
    </nav>
  )
}
```

### Conditional Menu Items

```tsx
import { useTierFeatures } from '@/hooks/useTierFeatures'

function SettingsMenu() {
  const { hasAccess } = useTierFeatures()

  return (
    <Menu>
      <MenuItem href="/dashboard/settings">General Settings</MenuItem>
      {hasAccess('sso') && (
        <MenuItem href="/dashboard/settings/security/sso">SSO Configuration</MenuItem>
      )}
      {hasAccess('api-keys') && (
        <MenuItem href="/dashboard/settings/security/api-keys">API Keys</MenuItem>
      )}
      {hasAccess('white-label') && (
        <MenuItem href="/dashboard/settings/white-label">White Label</MenuItem>
      )}
    </Menu>
  )
}
```

## Feature Badges

### Show Tier-Specific Badges

```tsx
import { FEATURES } from '@/lib/tier-features'

function FeatureCard({ featureKey }) {
  const feature = FEATURES[featureKey]

  return (
    <div className="card">
      <h3>{feature.name}</h3>
      <p>{feature.description}</p>
      {feature.badge && (
        <span className="badge">{feature.badge}</span>
      )}
    </div>
  )
}
```

### Conditional Feature Rendering

```tsx
import { useTierFeatures } from '@/hooks/useTierFeatures'

function Dashboard() {
  const { hasAccess, isHome, isEnterprise, isMsp } = useTierFeatures()

  return (
    <div>
      {/* Everyone sees this */}
      <DashboardStats />

      {/* Home tier specific */}
      {isHome && <FamilyModeWidget />}

      {/* Enterprise and above */}
      {hasAccess('security-score') && <SecurityScoreWidget />}

      {/* MSP only */}
      {isMsp && <ClientOverviewWidget />}
    </div>
  )
}
```

## API Route Protection

### Frontend Route Guard

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { canAccessRoute } from '@/lib/tier-features'
import { useAuth } from '@/contexts/AuthContext'

export function TierGuard({ children, route }) {
  const { tier } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!canAccessRoute(tier, route)) {
      router.push('/dashboard')
    }
  }, [tier, route, router])

  if (!canAccessRoute(tier, route)) {
    return null
  }

  return <>{children}</>
}
```

### Usage in a Page

```tsx
import { TierGuard } from '@/components/TierGuard'

export default function SiemPage() {
  return (
    <TierGuard route="/dashboard/settings/security/siem">
      <SiemConfiguration />
    </TierGuard>
  )
}
```

## Backend Validation (Recommended)

### NestJS Tier Guard (to be implemented)

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TierGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTier = this.reflector.get<string>('tier', context.getHandler());
    if (!requiredTier) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const tierHierarchy = { home: 1, enterprise: 2, msp: 3 };
    return tierHierarchy[user.tenantTier] >= tierHierarchy[requiredTier];
  }
}
```

### Tier Decorator

```typescript
import { SetMetadata } from '@nestjs/common';

export const Tier = (tier: 'home' | 'enterprise' | 'msp') => SetMetadata('tier', tier);
```

### Controller Usage

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { TierGuard } from './guards/tier.guard';
import { Tier } from './decorators/tier.decorator';

@Controller('siem')
@UseGuards(TierGuard)
export class SiemController {
  @Get()
  @Tier('enterprise') // Requires enterprise or msp tier
  getSiemIntegrations() {
    // Only accessible by enterprise and msp tiers
  }
}
```

## MSP-Specific Examples

### Bulk Template Deployment

```tsx
import { BulkActions } from '@/components/msp/BulkActions'
import { useTierFeatures } from '@/hooks/useTierFeatures'

function TemplateDeploymentPage({ template }) {
  const { isMsp } = useTierFeatures()

  if (!isMsp) {
    return <div>MSP tier required</div>
  }

  return (
    <BulkActions
      clients={clients}
      templates={[template]}
      onComplete={() => {
        console.log('Deployment complete')
      }}
    />
  )
}
```

### Cross-Client Reporting

```tsx
import { CrossClientReporting } from '@/components/msp/CrossClientReporting'
import { useRequireTier } from '@/hooks/useTierFeatures'

function MspReportingPage() {
  const { hasAccess, UpgradePrompt } = useRequireTier('msp')

  if (!hasAccess) {
    return <UpgradePrompt />
  }

  return (
    <DashboardLayout>
      <h1>Cross-Client Reporting</h1>
      <CrossClientReporting />
    </DashboardLayout>
  )
}
```

### White Label Settings

```tsx
import { WhiteLabelSettings } from '@/components/msp/WhiteLabelSettings'
import { useTierFeatures } from '@/hooks/useTierFeatures'

function WhiteLabelPage() {
  const { hasAccess } = useTierFeatures()

  if (!hasAccess('white-label')) {
    return (
      <div className="p-6">
        <h2>White Label Settings</h2>
        <p>This feature is only available for MSP tier customers.</p>
        <a href="/dashboard/billing">Upgrade to MSP</a>
      </div>
    )
  }

  return <WhiteLabelSettings />
}
```

## Upgrade Prompts

### Inline Upgrade Prompt

```tsx
import { useTierFeatures } from '@/hooks/useTierFeatures'

function FeatureLockedCard({ feature }) {
  const { upgradeMessage } = useTierFeatures()

  return (
    <div className="p-6 border border-space-200 rounded-xl">
      <div className="flex items-center gap-3 mb-4">
        <LockIcon className="h-8 w-8 text-space-400" />
        <h3 className="text-lg font-semibold">Feature Locked</h3>
      </div>
      <p className="text-space-600 mb-4">{upgradeMessage(feature)}</p>
      <a
        href="/dashboard/billing"
        className="btn btn-primary"
      >
        Upgrade Now
      </a>
    </div>
  )
}
```

### Modal Upgrade Prompt

```tsx
import { useState } from 'react'
import { useTierFeatures } from '@/hooks/useTierFeatures'

function FeatureButton({ feature, onClick }) {
  const { hasAccess, upgradeMessage } = useTierFeatures()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const handleClick = () => {
    if (hasAccess(feature)) {
      onClick()
    } else {
      setShowUpgradeModal(true)
    }
  }

  return (
    <>
      <button onClick={handleClick}>
        Try Feature
      </button>

      {showUpgradeModal && (
        <Modal onClose={() => setShowUpgradeModal(false)}>
          <h2>Upgrade Required</h2>
          <p>{upgradeMessage(feature)}</p>
          <a href="/dashboard/billing">View Plans</a>
        </Modal>
      )}
    </>
  )
}
```

## Tier-Specific UI Customization

### Home Tier - Family Focus

```tsx
import { useTierFeatures } from '@/hooks/useTierFeatures'

function DashboardHeader() {
  const { isHome } = useTierFeatures()

  if (isHome) {
    return (
      <header>
        <h1>Family Protection Dashboard</h1>
        <p>Keep your family safe online</p>
      </header>
    )
  }

  return (
    <header>
      <h1>Enterprise Security Dashboard</h1>
      <p>Advanced threat protection and analytics</p>
    </header>
  )
}
```

### Enterprise Tier - Advanced Features

```tsx
import { useTierFeatures } from '@/hooks/useTierFeatures'

function PolicyEditor() {
  const { hasAccess } = useTierFeatures()

  return (
    <div>
      {/* Basic editor for all tiers */}
      <BasicPolicyEditor />

      {/* Advanced controls for enterprise+ */}
      {hasAccess('policy-builder') && (
        <AdvancedPolicyControls />
      )}

      {/* Category granular control for enterprise+ */}
      {hasAccess('policy-builder') && (
        <CategoryGranularControl />
      )}
    </div>
  )
}
```

### MSP Tier - Client Management

```tsx
import { useTierFeatures } from '@/hooks/useTierFeatures'

function MainLayout() {
  const { isMsp } = useTierFeatures()

  return (
    <div>
      <Sidebar>
        <NavItem href="/dashboard">Dashboard</NavItem>
        <NavItem href="/dashboard/policies">Policies</NavItem>

        {isMsp && (
          <>
            <NavDivider />
            <NavItem href="/dashboard/clients">Clients</NavItem>
            <NavItem href="/dashboard/msp/templates">Templates</NavItem>
            <NavItem href="/dashboard/msp/reporting">Cross-Client Reports</NavItem>
          </>
        )}
      </Sidebar>
    </div>
  )
}
```

## Testing Tier Access

### Unit Test Example

```typescript
import { hasFeature } from '@/lib/tier-features'

describe('Tier Features', () => {
  it('home tier has access to family mode', () => {
    expect(hasFeature('home', 'family')).toBe(true)
  })

  it('home tier does not have access to SIEM', () => {
    expect(hasFeature('home', 'siem')).toBe(false)
  })

  it('enterprise tier has access to SIEM', () => {
    expect(hasFeature('enterprise', 'siem')).toBe(true)
  })

  it('msp tier has access to all features', () => {
    expect(hasFeature('msp', 'family')).toBe(true)
    expect(hasFeature('msp', 'siem')).toBe(true)
    expect(hasFeature('msp', 'white-label')).toBe(true)
  })
})
```

### Integration Test Example

```typescript
import { render, screen } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'

describe('Tier-Based Navigation', () => {
  it('shows MSP navigation for MSP users', () => {
    const mockUser = { tier: 'msp', ... }

    render(
      <AuthProvider value={{ user: mockUser }}>
        <Navigation />
      </AuthProvider>
    )

    expect(screen.getByText('Clients')).toBeInTheDocument()
    expect(screen.getByText('White Label')).toBeInTheDocument()
  })

  it('hides MSP navigation for home users', () => {
    const mockUser = { tier: 'home', ... }

    render(
      <AuthProvider value={{ user: mockUser }}>
        <Navigation />
      </AuthProvider>
    )

    expect(screen.queryByText('Clients')).not.toBeInTheDocument()
    expect(screen.queryByText('White Label')).not.toBeInTheDocument()
  })
})
```

## Common Patterns

### 1. Feature Gating

```tsx
const { hasAccess } = useTierFeatures()

return hasAccess('feature-key') ? <Feature /> : <UpgradePrompt />
```

### 2. Tier Checking

```tsx
const { isHome, isEnterprise, isMsp } = useTierFeatures()

if (isHome) return <HomeView />
if (isEnterprise) return <EnterpriseView />
if (isMsp) return <MspView />
```

### 3. Route Protection

```tsx
useRequireFeature('feature-key') // Auto-redirects if no access
```

### 4. Minimum Tier Requirement

```tsx
const { meetsMinimumTier } = useTierFeatures()

return meetsMinimumTier('enterprise') ? <Content /> : <UpgradePrompt />
```

## Best Practices

1. **Always check tier on backend**: Frontend checks are UX only, not security
2. **Use hooks over direct imports**: `useTierFeatures()` vs `hasFeature()`
3. **Provide clear upgrade paths**: Always show how to unlock features
4. **Test all tier combinations**: Home, Enterprise, MSP
5. **Cache tier checks**: Don't re-compute on every render
6. **Fail gracefully**: Show useful error messages, not blank screens

## Summary

The tier system provides:
- ✅ Type-safe feature access checks
- ✅ Dynamic navigation filtering
- ✅ Reusable hooks and utilities
- ✅ Clear upgrade prompts
- ✅ Flexible tier hierarchy
- ✅ Easy testing and mocking

Use the provided hooks and utilities for consistent tier-based access control throughout the application.
