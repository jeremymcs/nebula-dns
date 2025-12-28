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
} from '@heroicons/react/24/outline'

export interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
  badge?: string
  shortcut?: string
}

export interface NavigationGroup {
  name: string
  items: NavigationItem[]
}

// New Mission Control Navigation Structure
export const navigationGroups: NavigationGroup[] = [
  {
    name: 'Mission Control',
    items: [
      { name: 'Command Center', href: '/mission-control', icon: RocketLaunchIcon, description: 'Real-time threat radar', shortcut: 'G M', badge: 'New' },
      { name: 'Dashboard', href: '/dashboard', icon: Squares2X2Icon, description: 'Classic overview', shortcut: 'G H' },
    ]
  },
  {
    name: 'Protection',
    items: [
      { name: 'Policies', href: '/dashboard/policies', icon: ShieldCheckIcon, description: 'Security policies', shortcut: 'G P' },
      { name: 'Visual Builder', href: '/dashboard/policy-builder', icon: BeakerIcon, description: 'No-code policy editor', badge: 'New' },
      { name: 'Templates', href: '/dashboard/templates', icon: RectangleStackIcon, description: 'Policy marketplace', badge: 'New' },
      { name: 'Zones', href: '/dashboard/locations', icon: MapPinIcon, description: 'Network zones', shortcut: 'G Z' },
      { name: 'Custom Lists', href: '/dashboard/lists', icon: ListBulletIcon, description: 'Allow & block lists', shortcut: 'G L' },
      { name: 'Block Pages', href: '/dashboard/block-pages', icon: NoSymbolIcon, description: 'Block page templates' },
    ]
  },
  {
    name: 'Investigate',
    items: [
      { name: 'Query Logs', href: '/dashboard/logs', icon: DocumentTextIcon, description: 'DNS query history', shortcut: 'G Q' },
      { name: 'Live Stream', href: '/dashboard/logs/live', icon: PlayIcon, description: 'Real-time queries', badge: 'Live' },
      { name: 'Domain Lookup', href: '/dashboard/investigate', icon: MagnifyingGlassIcon, description: 'Deep-dive investigation' },
    ]
  },
  {
    name: 'Insights',
    items: [
      { name: 'Reports', href: '/dashboard/reports', icon: ChartBarIcon, description: 'Analytics & reports', shortcut: 'G R' },
      { name: 'Security Score', href: '/dashboard/security-score', icon: PresentationChartBarIcon, description: 'Posture & achievements', badge: 'New' },
      { name: 'AI Insights', href: '/dashboard/insights', icon: SparklesIcon, description: 'AI-powered analysis', badge: 'Beta' },
    ]
  },
  {
    name: 'Automation',
    items: [
      { name: 'Agents', href: '/dashboard/agents', icon: ComputerDesktopIcon, description: 'Roaming clients' },
      { name: 'Playbooks', href: '/dashboard/playbooks', icon: BoltIcon, description: 'Incident response', badge: 'New' },
      { name: 'Integrations', href: '/dashboard/integrations', icon: CpuChipIcon, description: 'Third-party integrations' },
    ]
  },
  {
    name: 'Administration',
    items: [
      { name: 'Clients', href: '/dashboard/clients', icon: BuildingOffice2Icon, description: 'Client organizations', badge: 'MSP' },
      { name: 'Billing', href: '/dashboard/billing', icon: CreditCardIcon, description: 'Usage & billing', badge: 'MSP' },
      { name: 'Users', href: '/dashboard/users', icon: UsersIcon, description: 'Team members' },
      { name: 'Family Mode', href: '/dashboard/family', icon: UserGroupIcon, description: 'Family dashboard', badge: 'New' },
      { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon, description: 'Account settings', shortcut: 'G S' },
    ]
  }
]

// Flat navigation for backward compatibility
export const flatNavigation = navigationGroups.flatMap(group => group.items)

