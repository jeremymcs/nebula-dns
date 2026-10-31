/**
 * Nebula DNS - TopNav Component
 * Cosmic Security Theme - Horizontal Navigation
 */

'use client'

import { useState, useRef, useEffect, Fragment } from 'react'
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
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  KeyIcon,
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
  // US-027: Get MSP managed info for badge
  const { mspInfo } = useSubscriptionStatus()

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
    <header className="sticky top-0 z-40 w-full">
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-white/80 dark:bg-space-900/80 backdrop-blur-xl border-b border-space-200 dark:border-space-800" />
      
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
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
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
                    <Menu.Items className="absolute left-0 mt-2 w-48 origin-top-left rounded-xl bg-white dark:bg-space-800 shadow-lg ring-1 ring-space-900/5 dark:ring-white/10 focus:outline-none p-1">
                      {mspNavigation.map((item) => (
                        <Menu.Item key={item.name}>
                          {({ active }) => (
                            <Link
                              href={item.href}
                              className={clsx(
                                'flex items-center gap-2 px-3 py-2 text-sm rounded-lg',
                                active ? 'bg-emerald-50 dark:bg-emerald-900/30' : '',
                                isActive(item.href)
                                  ? 'text-emerald-700 dark:text-emerald-300 font-medium'
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

            {/* User Menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-space-100 dark:hover:bg-space-800 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </span>
                </div>
                <span className="hidden sm:block text-sm font-medium text-space-700 dark:text-space-300">
                  {user?.name?.split(' ')[0] || 'User'}
                </span>
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
                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-space-800 shadow-lg ring-1 ring-space-900/5 dark:ring-white/10 focus:outline-none p-1">
                  <div className="px-3 py-2 border-b border-space-100 dark:border-space-700">
                    <p className="text-sm font-medium text-space-900 dark:text-white">{user?.name}</p>
                    <p className="text-xs text-space-500 dark:text-space-400 truncate">{user?.email}</p>
                  </div>
                  
                  {adminNavigation.map((item) => (
                    <Menu.Item key={item.name}>
                      {({ active }) => (
                        <Link
                          href={item.href}
                          className={clsx(
                            'flex items-center gap-2 px-3 py-2 text-sm rounded-lg',
                            active ? 'bg-space-100 dark:bg-space-700' : '',
                            'text-space-700 dark:text-space-300'
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.name}
                        </Link>
                      )}
                    </Menu.Item>
                  ))}

                  <div className="border-t border-space-100 dark:border-space-700 mt-1 pt-1">
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

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-space-500 hover:text-space-900 dark:hover:text-white hover:bg-space-100 dark:hover:bg-space-800"
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
    </header>
  )
}

