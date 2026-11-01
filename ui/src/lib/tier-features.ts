// Nebula DNS - Tier Feature Access Control
// Maps tenant tiers to available features for dynamic navigation and access control
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

export type TenantTier = 'home' | 'enterprise' | 'msp'

export type FeatureKey =
  // Core Features (All Tiers)
  | 'dashboard'
  // mission-control removed - admin functionality moved to separate admin-ui app (port 4012)
  | 'policies'
  | 'locations'
  | 'zones'
  | 'lists'
  | 'block-pages'
  | 'logs'
  | 'reports'
  | 'investigate'
  | 'users'
  | 'settings'
  | 'billing'

  // Home Tier Features
  | 'family'
  | 'networks'

  // Enterprise Tier Features
  | 'siem'
  | 'api-keys'
  | 'webhooks'
  | 'scheduled-reports'
  | 'audit-logs'
  | 'sso'
  | 'playbooks'
  | 'insights'
  | 'agents'
  | 'integrations'
  | 'security-score'
  | 'policy-builder'
  | 'templates'
  | 'live-stream'

  // MSP Tier Features
  | 'clients'
  | 'msp-templates'
  | 'cross-reporting'
  | 'white-label'
  | 'bulk-actions'

export interface Feature {
  key: FeatureKey
  name: string
  description: string
  tier: TenantTier[]
  badge?: string
}

// Feature definitions
export const FEATURES: Record<FeatureKey, Feature> = {
  // Core features available to all tiers
  'dashboard': {
    key: 'dashboard',
    name: 'Dashboard',
    description: 'Main dashboard overview',
    tier: ['home', 'enterprise', 'msp'],
  },
  // mission-control removed - admin functionality moved to separate admin-ui app (port 4012)
  'policies': {
    key: 'policies',
    name: 'Policies',
    description: 'DNS security policies',
    tier: ['home', 'enterprise', 'msp'],
  },
  'locations': {
    key: 'locations',
    name: 'Locations',
    description: 'Network locations/zones',
    tier: ['home', 'enterprise', 'msp'],
  },
  'zones': {
    key: 'zones',
    name: 'Zones',
    description: 'Network zones',
    tier: ['home', 'enterprise', 'msp'],
  },
  'lists': {
    key: 'lists',
    name: 'Custom Lists',
    description: 'Allow and block lists',
    tier: ['home', 'enterprise', 'msp'],
  },
  'block-pages': {
    key: 'block-pages',
    name: 'Block Pages',
    description: 'Custom block page templates',
    tier: ['home', 'enterprise', 'msp'],
  },
  'logs': {
    key: 'logs',
    name: 'Query Logs',
    description: 'DNS query history',
    tier: ['home', 'enterprise', 'msp'],
  },
  'reports': {
    key: 'reports',
    name: 'Reports',
    description: 'Analytics and reports',
    tier: ['home', 'enterprise', 'msp'],
  },
  'investigate': {
    key: 'investigate',
    name: 'Investigate',
    description: 'Domain investigation tools',
    tier: ['home', 'enterprise', 'msp'],
  },
  'users': {
    key: 'users',
    name: 'Users',
    description: 'Team member management',
    tier: ['home', 'enterprise', 'msp'],
  },
  'settings': {
    key: 'settings',
    name: 'Settings',
    description: 'Account settings',
    tier: ['home', 'enterprise', 'msp'],
  },
  'billing': {
    key: 'billing',
    name: 'Billing',
    description: 'Subscription and billing',
    tier: ['home', 'enterprise', 'msp'],
  },

  // Home Tier Features
  'family': {
    key: 'family',
    name: 'Family Mode',
    description: 'Family member management',
    tier: ['home'],
    badge: 'Home',
  },
  'networks': {
    key: 'networks',
    name: 'Networks',
    description: 'Home network management',
    tier: ['home'],
  },

  // Enterprise Tier Features
  'siem': {
    key: 'siem',
    name: 'SIEM',
    description: 'SIEM integrations',
    tier: ['enterprise', 'msp'],
    badge: 'Enterprise',
  },
  'api-keys': {
    key: 'api-keys',
    name: 'API Keys',
    description: 'API key management',
    tier: ['enterprise', 'msp'],
    badge: 'Enterprise',
  },
  'webhooks': {
    key: 'webhooks',
    name: 'Webhooks',
    description: 'Webhook integrations',
    tier: ['enterprise', 'msp'],
    badge: 'Enterprise',
  },
  'scheduled-reports': {
    key: 'scheduled-reports',
    name: 'Scheduled Reports',
    description: 'Automated report delivery',
    tier: ['enterprise', 'msp'],
    badge: 'Enterprise',
  },
  'audit-logs': {
    key: 'audit-logs',
    name: 'Audit Logs',
    description: 'Security audit trail',
    tier: ['enterprise', 'msp'],
    badge: 'Enterprise',
  },
  'sso': {
    key: 'sso',
    name: 'SSO',
    description: 'SAML/OIDC single sign-on',
    tier: ['enterprise', 'msp'],
    badge: 'Enterprise',
  },
  'playbooks': {
    key: 'playbooks',
    name: 'Playbooks',
    description: 'Automated incident response',
    tier: ['enterprise', 'msp'],
  },
  'insights': {
    key: 'insights',
    name: 'AI Insights',
    description: 'AI-powered threat analysis',
    tier: ['enterprise', 'msp'],
    badge: 'Beta',
  },
  'agents': {
    key: 'agents',
    name: 'Agents',
    description: 'Roaming client agents',
    tier: ['home', 'enterprise', 'msp'], // Available to home tier for family roaming protection
  },
  'integrations': {
    key: 'integrations',
    name: 'Integrations',
    description: 'Third-party integrations',
    tier: ['enterprise', 'msp'],
  },
  'security-score': {
    key: 'security-score',
    name: 'Security Score',
    description: 'Security posture scoring',
    tier: ['enterprise', 'msp'],
  },
  'policy-builder': {
    key: 'policy-builder',
    name: 'Visual Builder',
    description: 'No-code policy editor',
    tier: ['enterprise', 'msp'],
    badge: 'New',
  },
  'templates': {
    key: 'templates',
    name: 'Templates',
    description: 'Policy template marketplace',
    tier: ['enterprise', 'msp'],
  },
  'live-stream': {
    key: 'live-stream',
    name: 'Live Stream',
    description: 'Real-time query stream',
    tier: ['enterprise', 'msp'],
    badge: 'Live',
  },

  // MSP Tier Features
  'clients': {
    key: 'clients',
    name: 'Clients',
    description: 'Client organization management',
    tier: ['msp'],
    badge: 'MSP',
  },
  'msp-templates': {
    key: 'msp-templates',
    name: 'MSP Templates',
    description: 'Policy templates for clients',
    tier: ['msp'],
    badge: 'MSP',
  },
  'cross-reporting': {
    key: 'cross-reporting',
    name: 'Cross-Client Reporting',
    description: 'Aggregate reporting across clients',
    tier: ['msp'],
    badge: 'MSP',
  },
  'white-label': {
    key: 'white-label',
    name: 'White Label',
    description: 'Custom branding for client portals',
    tier: ['msp'],
    badge: 'MSP',
  },
  'bulk-actions': {
    key: 'bulk-actions',
    name: 'Bulk Actions',
    description: 'Bulk operations across clients',
    tier: ['msp'],
    badge: 'MSP',
  },
}

/**
 * Check if a feature is available for a given tier
 */
export function hasFeature(tier: TenantTier | undefined, feature: FeatureKey): boolean {
  if (!tier) return false
  return FEATURES[feature]?.tier.includes(tier) ?? false
}

/**
 * Get all features available for a given tier
 */
export function getFeaturesForTier(tier: TenantTier): Feature[] {
  return Object.values(FEATURES).filter(feature => feature.tier.includes(tier))
}

/**
 * Get all feature keys available for a given tier
 */
export function getFeatureKeysForTier(tier: TenantTier): FeatureKey[] {
  return getFeaturesForTier(tier).map(f => f.key)
}

/**
 * Check if user should have access to a route based on their tier
 */
export function canAccessRoute(tier: TenantTier | undefined, route: string): boolean {
  if (!tier) return false

  // Map routes to features
  // /mission-control routes removed - admin functionality moved to separate admin-ui app (port 4012)
  const routeFeatureMap: Record<string, FeatureKey> = {
    '/dashboard': 'dashboard',
    '/dashboard/policies': 'policies',
    '/dashboard/policy-builder': 'policy-builder',
    '/dashboard/templates': 'templates',
    '/dashboard/locations': 'locations',
    '/dashboard/lists': 'lists',
    '/dashboard/block-pages': 'block-pages',
    '/dashboard/shield-certificate': 'block-pages',
    '/dashboard/logs': 'logs',
    '/dashboard/logs/live': 'live-stream',
    '/dashboard/reports': 'reports',
    '/dashboard/investigate': 'investigate',
    '/dashboard/insights': 'insights',
    '/dashboard/security-score': 'security-score',
    '/dashboard/playbooks': 'playbooks',
    '/dashboard/agents': 'agents',
    '/dashboard/integrations': 'integrations',
    '/dashboard/users': 'users',
    '/dashboard/family': 'family',
    '/dashboard/settings': 'settings',
    '/dashboard/billing': 'billing',
    '/dashboard/clients': 'clients',
    '/dashboard/msp/templates': 'msp-templates',
    '/dashboard/msp/reporting': 'cross-reporting',
    '/dashboard/settings/white-label': 'white-label',
    '/dashboard/settings/security/api-keys': 'api-keys',
    '/dashboard/settings/security/webhooks': 'webhooks',
    '/dashboard/settings/security/siem': 'siem',
    '/dashboard/settings/security/audit-logs': 'audit-logs',
    '/dashboard/settings/security/sso': 'sso',
    '/dashboard/reports/scheduled': 'scheduled-reports',
  }

  // Find matching feature for the route
  for (const [path, feature] of Object.entries(routeFeatureMap)) {
    if (route.startsWith(path)) {
      return hasFeature(tier, feature)
    }
  }

  // Default: allow access to unmatched routes (for settings, etc.)
  return true
}

/**
 * Get upgrade message for a feature that's not available in current tier
 */
export function getUpgradeMessage(tier: TenantTier, feature: FeatureKey): string {
  const featureData = FEATURES[feature]

  if (tier === 'home') {
    return `Upgrade to Enterprise tier to access ${featureData.name}`
  }
  if (tier === 'enterprise' && featureData.tier.includes('msp')) {
    return `Upgrade to MSP tier to access ${featureData.name}`
  }

  return `This feature is not available in your current plan`
}
