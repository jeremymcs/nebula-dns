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
  RocketLaunchIcon,
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
    { name: 'Admin Users', href: '/users', feature: 'admin-users' as const },
  ]

  // Filter based on role
  const filteredNavigation = navigationItems.filter(
    item => canAccess(item.feature)
  )

  return (
    <header className="sticky top-0 z-50 w-full overflow-visible">
      {/* Glass effect background — must not intercept taps (Safari mobile) */}
      <div className="pointer-events-none absolute inset-0 bg-white/80 dark:bg-space-900/80 backdrop-blur-xl border-b border-space-200 dark:border-space-800" />

      <nav className="relative mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <ShieldMark className="h-10 w-10" />
              <div className="hidden sm:flex flex-col">
                <span className="text-xl font-bold text-space-900 dark:text-white">
                  <ProductWordmark />
                </span>
                <span className="text-xs font-medium text-space-500 dark:text-space-400 -mt-0.5">
                  {ADMIN_PORTAL_NAME}
                </span>
              </div>
            </Link>

            {/* Navigation Links - Filtered by Role */}
            <div className="hidden md:flex items-center gap-1 ml-4 border-l border-space-200 dark:border-space-700 pl-4">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    (pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href)))
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-space-600 dark:text-space-400 hover:bg-space-100 dark:hover:bg-space-800 hover:text-space-900 dark:hover:text-white'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Search - Desktop only */}
          <div className="hidden md:block flex-1 max-w-sm mx-4">
            <TenantSearchDropdown />
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl text-space-500 hover:text-space-900 dark:hover:text-white hover:bg-space-100 dark:hover:bg-space-800 transition-colors touch-manipulation"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>

            {/* Admin User Menu */}
            <Menu as="div" className="relative z-50">
              <Menu.Button
                type="button"
                aria-label="Account menu"
                className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-space-100 dark:hover:bg-space-800 transition-colors touch-manipulation"
              >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {admin?.name ? getInitials(admin.name) : 'AD'}
                  </span>
                </div>
                <span className="hidden sm:block text-sm font-medium text-space-700 dark:text-space-300">
                  {admin?.name?.split(' ')[0] || 'Admin'}
                </span>
                {/* Role badge in header */}
                {adminRole && (
                  <AdminRoleBadge role={adminRole} size="sm" className="hidden sm:inline-flex" />
                )}
                <ChevronDownIcon className="h-4 w-4 text-space-400" />
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
                <Menu.Items className="absolute right-0 z-[100] mt-2 w-64 origin-top-right rounded-xl bg-white dark:bg-space-800 shadow-lg ring-1 ring-space-900/5 dark:ring-white/10 focus:outline-none p-1 touch-manipulation">
                  {/* Admin Info Header with Role */}
                  <div className="px-3 py-2 border-b border-space-100 dark:border-space-700">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-space-900 dark:text-white">
                        {admin?.name || 'Admin User'}
                      </p>
                      {adminRole && <AdminRoleBadge role={adminRole} size="sm" />}
                    </div>
                    <p className="text-xs text-space-500 dark:text-space-400 truncate mt-0.5">
                      {admin?.email || 'admin@example.com'}
                    </p>
                    {/* Permissions list */}
                    <div className="mt-2 pt-2 border-t border-space-100 dark:border-space-700">
                      <p className="text-xs font-medium text-space-500 dark:text-space-400 mb-1">
                        Permissions:
                      </p>
                      <ul className="text-xs text-space-600 dark:text-space-400 space-y-0.5">
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
