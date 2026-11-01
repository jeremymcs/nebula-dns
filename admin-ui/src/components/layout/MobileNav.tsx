'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  HomeIcon,
  BuildingOffice2Icon,
  UsersIcon,
  HeartIcon,
  BellAlertIcon,
  ClipboardDocumentListIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline'
import { useAdminRole } from '@/hooks/useAdminRole'

const navItems = [
  { name: 'Home', href: '/', feature: 'dashboard' as const, icon: HomeIcon },
  { name: 'Tenants', href: '/tenants', feature: 'tenants' as const, icon: BuildingLibraryIcon },
  { name: 'MSPs', href: '/msps', feature: 'msps' as const, icon: BuildingOffice2Icon },
  { name: 'Audit', href: '/audit', feature: 'audit' as const, icon: ClipboardDocumentListIcon },
  { name: 'Health', href: '/health', feature: 'health' as const, icon: HeartIcon },
  { name: 'Alerts', href: '/settings/alerting', feature: 'alerting-config' as const, icon: BellAlertIcon },
  { name: 'Admins', href: '/users', feature: 'admin-users' as const, icon: UsersIcon },
]

export function MobileNav() {
  const pathname = usePathname()
  const { canAccess } = useAdminRole()
  const items = navItems.filter((item) => canAccess(item.feature))

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-space-200 dark:border-space-800 bg-white/95 dark:bg-space-900/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <ul className="flex justify-around items-stretch">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/' && pathname?.startsWith(item.href))
          const Icon = item.icon
          return (
            <li key={item.href} className="flex-1 min-w-0">
              <Link
                href={item.href}
                className={clsx(
                  'flex flex-col items-center justify-center gap-0.5 py-2 px-1 text-[10px] font-medium touch-manipulation',
                  active
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-space-500 dark:text-space-400'
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="truncate max-w-full">{item.name}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
