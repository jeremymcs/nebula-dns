/**
 * Flux Shield — dashboard top bar (breadcrumbs, search, account)
 */

'use client'

import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { MagnifyingGlassIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useCommandBar } from '@/components/command-bar'
import { AccountMenu } from './AccountMenu'
import { ManagedByBadge } from '@/components/msp/ManagedByBadge'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { Cog6ToothIcon, UsersIcon } from '@heroicons/react/24/outline'

const segmentLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  policies: 'Policies',
  locations: 'Locations',
  lists: 'Custom Lists',
  logs: 'Query Logs',
  reports: 'Reports',
  settings: 'Settings',
  investigate: 'Investigate',
  agents: 'Agents',
  playbooks: 'Playbooks',
  insights: 'Insights',
  clients: 'Clients',
  billing: 'Billing',
  users: 'Users',
}

const adminNavigation = [
  { name: 'Users', href: '/dashboard/users', icon: UsersIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

export function DashboardShellBar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { open: openCommandBar } = useCommandBar()
  const { mspInfo } = useSubscriptionStatus()

  const segments = pathname?.split('/').filter(Boolean) ?? []
  const pageSegment = segments[segments.length - 1] ?? 'dashboard'
  const pageLabel = segmentLabels[pageSegment] ?? pageSegment.charAt(0).toUpperCase() + pageSegment.slice(1)

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  return (
    <header className="sticky top-0 z-40 flex h-[52px] shrink-0 items-center gap-2 border-b fs-hairline bg-canvas/80 dark:bg-space-950/80 backdrop-blur-md px-4 sm:px-7">
      <nav className="flex min-w-0 items-center gap-2 text-[13px] text-mut" aria-label="Breadcrumb">
        <span className="truncate">{user?.tenantName ?? 'Workspace'}</span>
        <span aria-hidden>/</span>
        <span className="truncate font-medium text-ink">{pageLabel}</span>
      </nav>

      <div className="ml-auto flex items-center gap-2.5">
        <ManagedByBadge mspInfo={mspInfo} className="hidden xl:block" />
        <button
          type="button"
          onClick={openCommandBar}
          className={clsx(
            'hidden sm:flex h-[30px] items-center gap-8 rounded-lg bg-white dark:bg-space-900 px-2.5',
            'text-xs text-mut shadow-[0_0_0_1px_var(--fs-line)] hover:text-txt transition-colors',
          )}
        >
          <span className="flex items-center gap-1.5">
            <MagnifyingGlassIcon className="h-3.5 w-3.5" />
            Search…
          </span>
          <kbd className="font-mono text-[11px] px-1 rounded shadow-[0_0_0_1px_var(--fs-line)]">⌘K</kbd>
        </button>
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg text-mut hover:text-ink hover:bg-white dark:hover:bg-space-900 shadow-[0_0_0_1px_var(--fs-line)]"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        </button>
        <AccountMenu
          userName={user?.name}
          userEmail={user?.email}
          adminNavigation={adminNavigation}
          onLogout={logout}
          getInitials={getInitials}
        />
      </div>
    </header>
  )
}
