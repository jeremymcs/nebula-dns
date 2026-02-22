/**
 * Nebula DNS - Mobile Navigation Component
 * Cosmic Security Theme - Bottom Navigation for Mobile
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  HomeIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/react/24/solid'

// Mission Control moved to separate admin-ui app (port 4012)
const mobileNavigation = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon, activeIcon: HomeIconSolid },
  { name: 'Policies', href: '/dashboard/policies', icon: ShieldCheckIcon, activeIcon: ShieldCheckIconSolid },
  { name: 'Search', href: '/dashboard/investigate', icon: MagnifyingGlassIcon, activeIcon: MagnifyingGlassIconSolid },
  { name: 'Reports', href: '/dashboard/reports', icon: ChartBarIcon, activeIcon: ChartBarIconSolid },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon, activeIcon: Cog6ToothIconSolid },
]

export function MobileNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    return pathname === href || (href !== '/dashboard' && pathname?.startsWith(href))
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-area-inset">
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-white/80 dark:bg-space-900/80 backdrop-blur-xl border-t border-space-200 dark:border-space-800" />
      
      <div className="relative flex items-center justify-around h-16 px-2">
        {mobileNavigation.map((item) => {
          const active = isActive(item.href)
          const Icon = active ? item.activeIcon : item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl min-w-[60px] transition-all',
                active
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-space-500 dark:text-space-400 hover:text-space-700 dark:hover:text-space-300'
              )}
            >
              <Icon className={clsx('h-6 w-6', active && 'drop-shadow-[0_0_8px_rgba(147,51,234,0.5)]')} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

