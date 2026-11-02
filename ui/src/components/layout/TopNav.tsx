/**
 * Nebula DNS - TopNav Component
 * Cosmic Security Theme - Horizontal Navigation
 */

'use client'

import { useState, useEffect, Fragment } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Transition } from '@headlessui/react'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
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
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  BoltIcon,
  CommandLineIcon,
  BuildingOffice2Icon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'
import { useCommandBar } from '@/components/command-bar'
import { OrgSwitcher } from './OrgSwitcher'
import { ClientSwitcher } from '@/components/msp/ClientSwitcher'
import { hasFeature } from '@/lib/tier-features'
import { WifiIcon } from '@heroicons/react/24/outline'
// US-027: MSP Managed By Badge
import { ManagedByBadge } from '@/components/msp/ManagedByBadge'
import { ModuleSwitcher } from './ModuleSwitcher'
import { ProductWordmark } from '@/components/ui/ProductWordmark'
import { ShieldMark } from '@/components/ui/ShieldMark'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { AccountMenu } from './AccountMenu'

const adminNavigation = [
  { name: 'Users', href: '/dashboard/users', icon: UsersIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

// MSP-only navigation items
const mspNavigation = [
  { name: 'Clients', href: '/dashboard/clients', icon: BuildingOffice2Icon },
  { name: 'Templates', href: '/dashboard/msp/templates', icon: DocumentDuplicateIcon },
]

export function TopNav() {
  const pathname = usePathname()
  const { user, logout, isMsp, tier } = useAuth()
  const { theme, setTheme } = useTheme()
  const { open: openCommandBar } = useCommandBar()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileMenuMounted, setMobileMenuMounted] = useState(false)
  // US-027: Get MSP managed info for badge
  const { mspInfo } = useSubscriptionStatus()

  useEffect(() => {
    setMobileMenuMounted(true)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Build tier-specific navigation
  // Note: Admin portal has been moved to separate admin-ui app on port 4012
  const navigation = [
    { name: 'Policies', href: '/dashboard/policies', icon: ShieldCheckIcon, featureKey: 'policies' },
    // For home tier, show "Networks" instead of "Zones"
    tier === 'home'
      ? { name: 'Networks', href: '/dashboard/locations', icon: WifiIcon, featureKey: 'locations' }
      : { name: 'Zones', href: '/dashboard/locations', icon: MapPinIcon, featureKey: 'locations' },
    { name: 'Investigate', href: '/dashboard/investigate', icon: MagnifyingGlassIcon, featureKey: 'investigate' },
    { name: 'Reports', href: '/dashboard/reports', icon: ChartBarIcon, featureKey: 'reports' },
    { name: 'Insights', href: '/dashboard/insights', icon: SparklesIcon, featureKey: 'insights' },
    { name: 'Playbooks', href: '/dashboard/playbooks', icon: BoltIcon, featureKey: 'playbooks' },
  ].filter(item => !item.featureKey || hasFeature(tier, item.featureKey as any))

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isActive = (href: string) => {
    return pathname === href || (href !== '/dashboard' && pathname?.startsWith(href))
  }

  return (
    <header className="sticky top-0 z-50 w-full overflow-visible">
      {/* Glass effect background — must not intercept taps (Safari mobile) */}
      <div className="pointer-events-none absolute inset-0 bg-white/80 dark:bg-space-900/80 backdrop-blur-xl border-b border-space-200 dark:border-space-800" />
      
      <nav className="relative mx-auto max-w-[1600px] px-3 sm:px-4 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
          {/* Logo and Org Switcher */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 group shrink-0">
              <ShieldMark className="h-9 w-9 sm:h-10 sm:w-10" iconClassName="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="hidden sm:block text-lg sm:text-xl font-bold text-space-900 dark:text-white truncate">
                <ProductWordmark />
              </span>
            </Link>

            <ModuleSwitcher />

            {/* Organization Switcher for MSP users */}
            <OrgSwitcher />

            {/* US-027: MSP Managed By Badge - shown for clients managed by an MSP */}
            <ManagedByBadge mspInfo={mspInfo} className="hidden md:block" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-all',
                  isActive(item.href)
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-space-600 dark:text-space-400 hover:text-space-900 dark:hover:text-white hover:bg-space-100 dark:hover:bg-space-800'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}

            {/* MSP Dropdown Menu */}
            {isMsp && (
              <>
                <div className="h-6 w-px bg-space-200 dark:bg-space-700 mx-1" />
                <Menu as="div" className="relative">
                  <Menu.Button
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-all',
                      mspNavigation.some(item => isActive(item.href))
                        ? 'bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300'
                        : 'text-space-600 dark:text-space-400 hover:text-space-900 dark:hover:text-white hover:bg-space-100 dark:hover:bg-space-800'
                    )}
                  >
                    <BuildingOffice2Icon className="h-4 w-4" />
                    MSP
                    <ChevronDownIcon className="h-3 w-3" />
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
                    <Menu.Items className="absolute left-0 z-[100] mt-2 w-48 origin-top-left rounded-xl bg-white dark:bg-space-800 shadow-lg ring-1 ring-space-900/5 dark:ring-white/10 focus:outline-none p-1 touch-manipulation">
                      {mspNavigation.map((item) => (
                        <Menu.Item key={item.name}>
                          {({ active }) => (
                            <Link
                              href={item.href}
                              className={clsx(
                                'flex items-center gap-2 px-3 py-2 text-sm rounded-lg',
                                active ? 'bg-success-50 dark:bg-success-900/30' : '',
                                isActive(item.href)
                                  ? 'text-success-700 dark:text-success-300 font-medium'
                                  : 'text-space-700 dark:text-space-300'
                              )}
                            >
                              <item.icon className="h-4 w-4" />
                              {item.name}
                            </Link>
                          )}
                        </Menu.Item>
                      ))}
                    </Menu.Items>
                  </Transition>
                </Menu>
              </>
            )}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Client Context Switcher for MSP */}
            <ClientSwitcher />

            {/* Command Bar Button */}
            <button
              onClick={openCommandBar}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-space-500 hover:text-space-900 dark:hover:text-white bg-space-100 dark:bg-space-800 hover:bg-space-200 dark:hover:bg-space-700 transition-colors"
              aria-label="Open command bar"
            >
              <CommandLineIcon className="h-4 w-4" />
              <span className="text-xs font-medium">⌘K</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl text-space-500 hover:text-space-900 dark:hover:text-white hover:bg-space-100 dark:hover:bg-space-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>

            <AccountMenu
              userName={user?.name}
              userEmail={user?.email}
              adminNavigation={adminNavigation}
              onLogout={logout}
              getInitials={getInitials}
            />

            {/* Mobile menu button */}
            <button
              type="button"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="lg:hidden p-2 rounded-xl text-space-500 hover:text-space-900 dark:hover:text-white hover:bg-space-100 dark:hover:bg-space-800 touch-manipulation"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && mobileMenuMounted
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close navigation menu backdrop"
                className="fixed inset-0 z-[90] bg-black/40 lg:hidden touch-manipulation"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div
                role="dialog"
                aria-label="Navigation menu"
                className="fixed inset-x-0 top-16 z-[95] lg:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-space-200 dark:border-space-800 bg-white dark:bg-space-900 shadow-xl touch-manipulation"
              >
                <div className="mx-auto max-w-[1600px] px-4 py-4 space-y-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl',
                        isActive(item.href)
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-800',
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  ))}

                  {isMsp && (
                    <>
                      <div className="pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-space-400">
                        MSP
                      </div>
                      {mspNavigation.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={clsx(
                            'flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl',
                            isActive(item.href)
                              ? 'bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300'
                              : 'text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-800',
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.name}
                        </Link>
                      ))}
                    </>
                  )}

                  <div className="border-t border-space-200 dark:border-space-800 my-2 pt-2">
                    {adminNavigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-800"
                      >
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        logout()
                      }}
                      className="flex w-full items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </header>
  )
}

