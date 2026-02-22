/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Command Actions Registry - Central registry for all command bar actions
 */

import { useState, useCallback, useMemo } from 'react'
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
  PlusIcon,
  MagnifyingGlassIcon,
  BoltIcon,
  PauseIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  GlobeAltIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

export interface CommandAction {
  id: string
  name: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  href?: string
  action?: () => void
  shortcut?: string
  keywords?: string[]
  category: 'Navigation' | 'Quick Actions' | 'Policies' | 'Zones' | 'Lists' | 'Search'
}

const RECENT_ITEMS_KEY = 'nebula_command_recent'
const MAX_RECENT_ITEMS = 5

export function useCommandActions() {
  // Store only action IDs in localStorage, not the full action (icons can't be serialized)
  const [recentItemIds, setRecentItemIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(RECENT_ITEMS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const actions = useMemo<CommandAction[]>(() => [
    // Navigation - Mission Control moved to separate admin-ui app (port 4012)
    { id: 'nav-dashboard', name: 'Dashboard', description: 'Dashboard overview', icon: HomeIcon, href: '/dashboard', category: 'Navigation', keywords: ['home', 'dashboard', 'overview'] },
    { id: 'nav-policies', name: 'Policies', description: 'Manage security policies', icon: ShieldCheckIcon, href: '/dashboard/policies', category: 'Navigation', shortcut: 'G P' },
    { id: 'nav-zones', name: 'Protection Zones', description: 'Manage network locations', icon: MapPinIcon, href: '/dashboard/locations', category: 'Navigation', shortcut: 'G Z' },
    { id: 'nav-lists', name: 'Custom Lists', description: 'Allow & block lists', icon: ListBulletIcon, href: '/dashboard/lists', category: 'Navigation', shortcut: 'G L' },
    { id: 'nav-logs', name: 'Query Logs', description: 'View DNS query history', icon: DocumentTextIcon, href: '/dashboard/logs', category: 'Navigation', shortcut: 'G Q' },
    { id: 'nav-reports', name: 'Reports', description: 'Analytics & insights', icon: ChartBarIcon, href: '/dashboard/reports', category: 'Navigation' },
    { id: 'nav-agents', name: 'Agents', description: 'Roaming client agents', icon: ComputerDesktopIcon, href: '/dashboard/agents', category: 'Navigation' },
    { id: 'nav-block-pages', name: 'Block Pages', description: 'Customize block pages', icon: NoSymbolIcon, href: '/dashboard/block-pages', category: 'Navigation' },
    { id: 'nav-users', name: 'Users', description: 'Manage team members', icon: UsersIcon, href: '/dashboard/users', category: 'Navigation' },
    { id: 'nav-settings', name: 'Settings', description: 'Account & preferences', icon: Cog6ToothIcon, href: '/dashboard/settings', category: 'Navigation', shortcut: 'G S' },

    // Quick Actions
    { id: 'action-block-domain', name: 'Block Domain', description: 'Add domain to blocklist', icon: NoSymbolIcon, category: 'Quick Actions', shortcut: '/', keywords: ['block', 'deny', 'blacklist'] },
    { id: 'action-allow-domain', name: 'Allow Domain', description: 'Add domain to allowlist', icon: GlobeAltIcon, category: 'Quick Actions', keywords: ['allow', 'whitelist', 'permit'] },
    { id: 'action-new-policy', name: 'Create Policy', description: 'Create a new security policy', icon: PlusIcon, href: '/dashboard/policies/new', category: 'Quick Actions' },
    { id: 'action-new-zone', name: 'Create Zone', description: 'Add a new protection zone', icon: PlusIcon, href: '/dashboard/locations/new', category: 'Quick Actions' },
    { id: 'action-pause', name: 'Pause Protection', description: 'Temporarily disable filtering', icon: PauseIcon, category: 'Quick Actions', keywords: ['pause', 'disable', 'stop'] },
    { id: 'action-lockdown', name: 'Emergency Lockdown', description: 'Block all non-essential traffic', icon: ExclamationTriangleIcon, category: 'Quick Actions', keywords: ['emergency', 'lockdown', 'security'] },
    { id: 'action-refresh', name: 'Refresh Data', description: 'Reload current view', icon: ArrowPathIcon, category: 'Quick Actions', shortcut: 'R' },

    // Search
    { id: 'search-logs', name: 'Search Logs', description: 'Find queries in log history', icon: MagnifyingGlassIcon, href: '/dashboard/logs', category: 'Search' },
    { id: 'search-domain', name: 'Investigate Domain', description: 'Deep dive into a domain', icon: SparklesIcon, category: 'Search', keywords: ['investigate', 'lookup', 'whois'] },
    { id: 'search-recent', name: 'Recent Activity', description: 'View latest blocked threats', icon: ClockIcon, href: '/dashboard/logs?filter=blocked', category: 'Search' },
  ], [])

  // Resolve recent item IDs to full actions
  const recentItems = useMemo(() => {
    return recentItemIds
      .map(id => actions.find(a => a.id === id))
      .filter((a): a is CommandAction => a !== undefined)
  }, [recentItemIds, actions])

  const addRecentItem = useCallback((action: CommandAction) => {
    setRecentItemIds((prev) => {
      const filtered = prev.filter((id) => id !== action.id)
      const updated = [action.id, ...filtered].slice(0, MAX_RECENT_ITEMS)
      try {
        localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [])

  return { actions, recentItems, addRecentItem }
}

