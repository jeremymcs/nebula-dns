/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Sidebar Navigation Component
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
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
  ChevronUpDownIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  KeyIcon,
  BellIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Policies', href: '/dashboard/policies', icon: ShieldCheckIcon },
  { name: 'Locations', href: '/dashboard/locations', icon: MapPinIcon },
  { name: 'Custom Lists', href: '/dashboard/lists', icon: ListBulletIcon },
  { name: 'Block Pages', href: '/dashboard/block-pages', icon: NoSymbolIcon },
  { name: 'Agents', href: '/dashboard/agents', icon: ComputerDesktopIcon },
  { name: 'Query Logs', href: '/dashboard/logs', icon: DocumentTextIcon },
  { name: 'Reports', href: '/dashboard/reports', icon: ChartBarIcon },
  { name: 'Users', href: '/dashboard/users', icon: UsersIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
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
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'analyst':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200">
        <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <span className="ml-3 text-lg font-semibold text-gray-900">Nebula DNS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname?.startsWith(item.href))
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon
                className={clsx(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-400 group-hover:text-gray-500'
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User section with dropdown */}
      <div className="relative shrink-0 border-t border-gray-200" ref={menuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex w-full items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center min-w-0">
            <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-primary-700">
                {user?.name ? getInitials(user.name) : 'U'}
              </span>
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          </div>
          <ChevronUpDownIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {showUserMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-1 mx-3 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              {user?.role && (
                <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${getRoleBadgeColor(user.role)}`}>
                  {user.role}
                </span>
              )}
            </div>

            {/* Menu items */}
            <div className="py-1">
              <Link
                href="/dashboard/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400" />
                Account Settings
              </Link>
              <Link
                href="/dashboard/settings/security"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <KeyIcon className="mr-3 h-5 w-5 text-gray-400" />
                Security
              </Link>
              <Link
                href="/dashboard/settings/api-keys"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <BellIcon className="mr-3 h-5 w-5 text-gray-400" />
                API Keys
              </Link>
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 py-1">
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  logout()
                }}
                className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
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
