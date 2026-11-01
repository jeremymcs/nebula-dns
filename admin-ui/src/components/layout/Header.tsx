/**
 * Nebula DNS - Admin UI Header Component
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Header component for Mission Control admin portal.
 * Displays admin session status, theme toggle, and logout functionality.
 */

'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Transition } from '@headlessui/react'
import {
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { TenantSearchDropdown } from './TenantSearchDropdown'
import { useAdminRole } from '@/hooks/useAdminRole'
import { AdminRoleBadge } from '@/components/rbac/AdminRoleBadge'
import { ProductWordmark } from '@/components/ProductWordmark'
import { ShieldMark } from '@/components/ShieldMark'
import { ADMIN_PORTAL_NAME } from '@/lib/branding'

/**
 * Get initials from a name string
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * AdminHeader component for Mission Control
 * Displays logo, theme toggle, and admin user menu with logout
 */
export function Header() {
  const { admin, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const { adminRole, isSuperAdmin, canWrite, canAccess } = useAdminRole()

  // Define navigation items with role requirements
  const navigationItems = [
    { name: 'Dashboard', href: '/', feature: 'dashboard' as const },
    { name: 'Tenants', href: '/tenants', feature: 'tenants' as const },
    { name: 'MSPs', href: '/msps', feature: 'msps' as const },
    { name: 'Audit', href: '/audit', feature: 'audit' as const },
    { name: 'Health', href: '/health', feature: 'health' as const },
    { name: 'Alerting', href: '/settings/alerting', feature: 'alerting-config' as const },
    { name: 'DNS Platform', href: '/dns-platform/connection', feature: 'dns-platform' as const },
    { name: 'Admin Users', href: '/users', feature: 'admin-users' as const },
  ]

  // Filter based on role
  const filteredNavigation = navigationItems.filter(
    item => canAccess(item.feature)
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b fs-hairline bg-canvas/80 dark:bg-space-950/80 backdrop-blur-md">
      <nav className="mx-auto max-w-[1600px] px-4 sm:px-7">
        <div className="flex h-[52px] items-center justify-between gap-3">
          {/* Logo and Title */}
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <ShieldMark className="h-8 w-8" />
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="text-[15px] font-semibold tracking-tight text-ink">
                  <ProductWordmark />
                </span>
                <span className="text-[11px] font-medium text-mut">
                  {ADMIN_PORTAL_NAME}
                </span>
              </div>
            </Link>

            {/* Navigation Links - Filtered by Role */}
            <div className="hidden lg:flex items-center gap-0.5 ml-2 pl-3 border-l fs-hairline">
              {filteredNavigation.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/' && pathname?.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      'px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                      active
                        ? 'text-ink bg-white dark:bg-space-900 shadow-[0_0_0_1px_var(--fs-line)]'
                        : 'text-mut hover:text-ink hover:bg-white/80 dark:hover:bg-space-900/80',
                    )}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Search - Desktop only */}
          <div className="hidden md:block flex-1 max-w-sm mx-2">
            <TenantSearchDropdown />
          </div>

          {/* Right section */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-mut hover:text-ink hover:bg-white dark:hover:bg-space-900 shadow-[0_0_0_1px_var(--fs-line)] transition-colors touch-manipulation"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <SunIcon className="h-4 w-4" />
              ) : (
                <MoonIcon className="h-4 w-4" />
              )}
            </button>

            {/* Admin User Menu */}
            <Menu as="div" className="relative z-50">
              <Menu.Button
                type="button"
                aria-label="Account menu"
                className="flex items-center gap-1.5 rounded-lg py-1 pl-1 pr-2 text-[13px] hover:bg-white dark:hover:bg-space-900 shadow-[0_0_0_1px_var(--fs-line)] transition-colors touch-manipulation"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary-500 to-accent-500">
                  <span className="text-[10px] font-bold text-white">
                    {admin?.name ? getInitials(admin.name) : 'AD'}
                  </span>
                </div>
                <span className="hidden sm:block font-medium text-ink max-w-[6rem] truncate">
                  {admin?.name?.split(' ')[0] || 'Admin'}
                </span>
                {adminRole && (
                  <AdminRoleBadge role={adminRole} size="sm" className="hidden sm:inline-flex" />
                )}
                <ChevronDownIcon className="h-3.5 w-3.5 text-mut" />
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-[100] mt-2 w-64 origin-top-right rounded-xl fs-card p-1 shadow-lg focus:outline-none touch-manipulation">
                  {/* Admin Info Header with Role */}
                  <div className="px-3 py-2 border-b fs-hairline">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink">
                        {admin?.name || 'Admin User'}
                      </p>
                      {adminRole && <AdminRoleBadge role={adminRole} size="sm" />}
                    </div>
                    <p className="text-xs text-mut truncate mt-0.5">
                      {admin?.email || 'admin@example.com'}
                    </p>
                    {/* Permissions list */}
                    <div className="mt-2 pt-2 border-t fs-hairline">
                      <p className="text-xs font-medium text-mut mb-1">
                        Permissions:
                      </p>
                      <ul className="text-xs text-txt space-y-0.5">
                        <li className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
                          View dashboards & MSPs
                        </li>
                        {canWrite && (
                          <li className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
                            Create & edit MSPs
                          </li>
                        )}
                        {canAccess('alerting-config') && (
                          <li className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
                            Configure alerting
                          </li>
                        )}
                        {isSuperAdmin && (
                          <li className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
                            Manage admin users
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Sign Out Button */}
                  <div className="pt-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={logout}
                          className={clsx(
                            'flex w-full items-center gap-2 px-3 py-2 text-sm rounded-lg',
                            active ? 'bg-danger-50 dark:bg-danger-900/20' : '',
                            'text-danger-600 dark:text-danger-400'
                          )}
                        >
                          <ArrowRightOnRectangleIcon className="h-4 w-4" />
                          Sign out
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </nav>
    </header>
  )
}
