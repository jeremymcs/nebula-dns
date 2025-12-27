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
  RocketLaunchIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  BoltIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline'
import { useCommandBar } from '@/components/command-bar'

const navigation = [
  { name: 'Mission Control', href: '/dashboard/mission-control', icon: RocketLaunchIcon },
  { name: 'Policies', href: '/dashboard/policies', icon: ShieldCheckIcon },
  { name: 'Zones', href: '/dashboard/locations', icon: MapPinIcon },
  { name: 'Investigate', href: '/dashboard/investigate', icon: MagnifyingGlassIcon },
  { name: 'Reports', href: '/dashboard/reports', icon: ChartBarIcon },
  { name: 'Insights', href: '/dashboard/insights', icon: SparklesIcon },
  { name: 'Playbooks', href: '/dashboard/playbooks', icon: BoltIcon },
]

const adminNavigation = [
  { name: 'Users', href: '/dashboard/users', icon: UsersIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

export function TopNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { open: openCommandBar } = useCommandBar()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
      
      <nav className="relative mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-shadow">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-space-900 dark:text-white">
              Nebula<span className="text-gradient"> DNS</span>
            </span>
          </Link>

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
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
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

