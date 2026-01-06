/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Mission Control Sidebar - Enhanced navigation with grouped menu structure
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useCommandBar } from '@/components/command-bar'
import { navigationGroups } from './NavigationConfig'
import {
  ChevronUpDownIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  KeyIcon,
  SunIcon,
  MoonIcon,
  MagnifyingGlassIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline'

export function MissionControlSidebar() {
  const pathname = usePathname()
  const { user, logout, isMsp } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const { open: openCommandBar } = useCommandBar()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="flex h-full w-64 flex-col bg-white dark:bg-space-900 border-r border-space-200 dark:border-space-800 transition-colors">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-space-200 dark:border-space-800">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-nebula-500 to-nebula-600 flex items-center justify-center shadow-lg shadow-nebula-500/25">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <span className="ml-3 text-lg font-bold bg-gradient-to-r from-nebula-500 to-nebula-400 bg-clip-text text-transparent">
          Nebula DNS
        </span>
      </div>

      {/* Command Bar Trigger */}
      <div className="px-3 py-3 border-b border-space-200 dark:border-space-800">
        <button
          onClick={openCommandBar}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-space-500 dark:text-space-400 bg-space-100 dark:bg-space-800 hover:bg-space-200 dark:hover:bg-space-700 transition-colors"
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-space-200 dark:bg-space-700 rounded">
            <CommandLineIcon className="h-3 w-3" />K
          </kbd>
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigationGroups.map((group) => {
          // Filter out MSP-only items for non-MSP users
          const visibleItems = group.items.filter(item =>
            item.badge !== 'MSP' || isMsp
          )

          // Skip group if no visible items
          if (visibleItems.length === 0) return null

          return (
            <div key={group.name}>
              <h3 className="px-3 text-xs font-semibold text-space-400 dark:text-space-500 uppercase tracking-wider">
                {group.name}
              </h3>
              <div className="mt-2 space-y-1">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={clsx(
                        'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-nebula-500/10 text-nebula-600 dark:text-nebula-400 shadow-sm'
                          : 'text-space-600 dark:text-space-400 hover:bg-space-100 dark:hover:bg-space-800 hover:text-space-900 dark:hover:text-white'
                      )}
                    >
                      <item.icon className={clsx('mr-3 h-5 w-5 flex-shrink-0', isActive ? 'text-nebula-500' : 'text-space-400 group-hover:text-space-500')} />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && item.badge !== 'MSP' && (
                        <span className={clsx(
                          'ml-2 px-1.5 py-0.5 text-xs font-medium rounded',
                          item.badge === 'Live' ? 'bg-success-100 text-success-700 dark:bg-success-900/50 dark:text-success-400' :
                          item.badge === 'New' ? 'bg-nebula-100 text-nebula-700 dark:bg-nebula-900/50 dark:text-nebula-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Theme toggle */}
      <div className="px-3 py-2 border-t border-space-200 dark:border-space-800">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-space-600 dark:text-space-400 hover:bg-space-100 dark:hover:bg-space-800 transition-colors"
        >
          {resolvedTheme === 'dark' ? <SunIcon className="mr-3 h-5 w-5 text-amber-400" /> : <MoonIcon className="mr-3 h-5 w-5 text-space-400" />}
          {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {/* User section */}
      <div className="relative shrink-0 border-t border-space-200 dark:border-space-800" ref={menuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex w-full items-center justify-between p-4 hover:bg-space-50 dark:hover:bg-space-800 transition-colors"
        >
          <div className="flex items-center min-w-0">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-nebula-400 to-nebula-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-nebula-500/25">
              <span className="text-sm font-medium text-white">
                {user?.name ? getInitials(user.name) : 'U'}
              </span>
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-space-700 dark:text-space-200 truncate">{user?.name || 'User'}</p>
              {user?.email && <p className="text-xs text-space-500 dark:text-space-400 truncate">{user.email}</p>}
            </div>
          </div>
          <ChevronUpDownIcon className="h-5 w-5 text-space-400 flex-shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {showUserMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-1 mx-3 bg-white dark:bg-space-800 rounded-lg shadow-lg border border-space-200 dark:border-space-700 py-1 z-50">
            <div className="px-4 py-3 border-b border-space-100 dark:border-space-700">
              <p className="text-sm font-medium text-space-900 dark:text-white">{user?.name}</p>
              <p className="text-xs text-space-500 dark:text-space-400">{user?.email}</p>
            </div>
            <div className="py-1">
              <Link href="/dashboard/settings" onClick={() => setShowUserMenu(false)} className="flex items-center px-4 py-2 text-sm text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700">
                <UserCircleIcon className="mr-3 h-5 w-5 text-space-400" />
                Account Settings
              </Link>
              <Link href="/dashboard/settings/api-keys" onClick={() => setShowUserMenu(false)} className="flex items-center px-4 py-2 text-sm text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700">
                <KeyIcon className="mr-3 h-5 w-5 text-space-400" />
                API Keys
              </Link>
            </div>
            <div className="border-t border-space-100 dark:border-space-700 py-1">
              <button onClick={() => { setShowUserMenu(false); logout() }} className="flex w-full items-center px-4 py-2 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20">
                <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

