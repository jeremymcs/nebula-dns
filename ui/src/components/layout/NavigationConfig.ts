/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Navigation Configuration - Mission Control themed navigation structure
 */

import {
  HomeIcon,
  ShieldCheckIcon,
  MapPinIcon,
  DocumentTextIcon,
  ListBulletIcon,
  ChartBarIcon,
  UsersIcon,
  Cog6ToothIcon,
  NoSymbolIcon,
  ComputerDesktopIcon,
  MagnifyingGlassIcon,
  BoltIcon,
  SparklesIcon,
  GlobeAltIcon,
  RocketLaunchIcon,
  CpuChipIcon,
  BeakerIcon,
  PresentationChartBarIcon,
  ClockIcon,
  PlayIcon,
  RectangleStackIcon,
  UserGroupIcon,
  Squares2X2Icon,
  BuildingOffice2Icon,
  CreditCardIcon,
  WifiIcon,
  PaintBrushIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'
import { hasFeature, type TenantTier } from '@/lib/tier-features'
import type { FeatureKey } from '@/lib/tier-features'

export interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
  badge?: string
  shortcut?: string
  featureKey?: FeatureKey // Optional feature key for tier-based filtering
}

export interface NavigationGroup {
  name: string
  items: NavigationItem[]
}

// Navigation Structure - Mission Control moved to separate admin-ui app (port 4012)
export const navigationGroups: NavigationGroup[] = [
  {
    name: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: Squares2X2Icon, description: 'Overview & statistics', shortcut: 'G H', featureKey: 'dashboard' },
    ]
  },
  {
    name: 'Protection',
    items: [
      { name: 'Policies', href: '/dashboard/policies', icon: ShieldCheckIcon, description: 'Security policies', shortcut: 'G P', featureKey: 'policies' },
      { name: 'Visual Builder', href: '/dashboard/policy-builder', icon: BeakerIcon, description: 'No-code policy editor', badge: 'New', featureKey: 'policy-builder' },
      { name: 'Templates', href: '/dashboard/templates', icon: RectangleStackIcon, description: 'Policy marketplace', badge: 'New', featureKey: 'templates' },
      { name: 'Networks', href: '/dashboard/locations', icon: WifiIcon, description: 'Home & roaming networks', shortcut: 'G Z', featureKey: 'locations' }, // Updated for Home tier
      { name: 'Custom Lists', href: '/dashboard/lists', icon: ListBulletIcon, description: 'Allow & block lists', shortcut: 'G L', featureKey: 'lists' },
      { name: 'Block Pages', href: '/dashboard/block-pages', icon: NoSymbolIcon, description: 'Block page templates', featureKey: 'block-pages' },
      { name: 'Shield Certificate', href: '/dashboard/shield-certificate', icon: ShieldCheckIcon, description: 'HTTPS block page CA', featureKey: 'block-pages' },
    ]
  },
  {
    name: 'Investigate',
    items: [
      { name: 'Query Logs', href: '/dashboard/logs', icon: DocumentTextIcon, description: 'DNS query history', shortcut: 'G Q', featureKey: 'logs' },
      { name: 'Live Stream', href: '/dashboard/logs/live', icon: PlayIcon, description: 'Real-time queries', badge: 'Live', featureKey: 'live-stream' },
      { name: 'Domain Lookup', href: '/dashboard/investigate', icon: MagnifyingGlassIcon, description: 'Deep-dive investigation', featureKey: 'investigate' },
    ]
  },
  {
    name: 'Insights',
    items: [
      { name: 'Reports', href: '/dashboard/reports', icon: ChartBarIcon, description: 'Analytics & reports', shortcut: 'G R', featureKey: 'reports' },
      { name: 'Security Score', href: '/dashboard/security-score', icon: PresentationChartBarIcon, description: 'Posture & achievements', badge: 'New', featureKey: 'security-score' },
      { name: 'AI Insights', href: '/dashboard/insights', icon: SparklesIcon, description: 'AI-powered analysis', badge: 'Beta', featureKey: 'insights' },
    ]
  },
  {
    name: 'Automation',
    items: [
      { name: 'Agents', href: '/dashboard/agents', icon: ComputerDesktopIcon, description: 'Roaming clients', featureKey: 'agents' },
      { name: 'Playbooks', href: '/dashboard/playbooks', icon: BoltIcon, description: 'Incident response', badge: 'New', featureKey: 'playbooks' },
      { name: 'Integrations', href: '/dashboard/settings/integrations', icon: CpuChipIcon, description: 'Third-party integrations', featureKey: 'integrations' },
    ]
  },
  {
    name: 'MSP',
    items: [
      { name: 'Clients', href: '/dashboard/clients', icon: BuildingOffice2Icon, description: 'Client organizations', badge: 'MSP', featureKey: 'clients' },
      { name: 'Templates', href: '/dashboard/msp/templates', icon: DocumentDuplicateIcon, description: 'Policy templates for clients', badge: 'MSP', featureKey: 'msp-templates' },
      { name: 'Cross-Client Reporting', href: '/dashboard/msp/reporting', icon: ChartBarIcon, description: 'Aggregate client analytics', badge: 'MSP', featureKey: 'cross-reporting' },
      { name: 'White Label', href: '/dashboard/settings/white-label', icon: PaintBrushIcon, description: 'Custom branding', badge: 'MSP', featureKey: 'white-label' },
    ]
  },
  {
    name: 'Administration',
    items: [
      { name: 'Billing', href: '/dashboard/billing', icon: CreditCardIcon, description: 'Usage & billing', featureKey: 'billing' },
      { name: 'Users', href: '/dashboard/users', icon: UsersIcon, description: 'Team members', featureKey: 'users' },
      { name: 'Family Mode', href: '/dashboard/family', icon: UserGroupIcon, description: 'Family dashboard', badge: 'Home', featureKey: 'family' },
      { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon, description: 'Account settings', shortcut: 'G S', featureKey: 'settings' },
    ]
  }
]

// Flat navigation for backward compatibility
export const flatNavigation = navigationGroups.flatMap(group => group.items)

/**
 * Filter navigation groups based on tenant tier
 */
export function getNavigationForTier(tier: TenantTier | undefined): NavigationGroup[] {
  if (!tier) {
    // Default to enterprise navigation if tier is not set
    return navigationGroups
  }

  return navigationGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      // If no feature key is specified, item is available to all tiers
      if (!item.featureKey) return true

      // Check if the feature is available for this tier
      return hasFeature(tier, item.featureKey)
    }).map(item => {
      // For home tier, rename "Locations" to "Networks"
      if (tier === 'home' && item.href === '/dashboard/locations') {
        return {
          ...item,
          name: 'Networks',
          description: 'Home & roaming networks',
          icon: WifiIcon,
        }
      }
      return item
    }),
  })).filter(group => group.items.length > 0) // Remove empty groups
}
