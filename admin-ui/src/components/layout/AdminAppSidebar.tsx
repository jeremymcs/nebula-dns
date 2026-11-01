/**
 * Flux Shield — admin app sidebar (Design C, matches tenant UI)
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  BuildingOffice2Icon,
  ChartBarSquareIcon,
  HeartIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  BellAlertIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'
import { ShieldMark } from '@/components/ShieldMark'
import { ProductWordmark } from '@/components/ProductWordmark'
import { ProductFooter } from '@/components/ProductFooter'
import { ADMIN_PORTAL_NAME } from '@/lib/branding'
import { useAdminRole } from '@/hooks/useAdminRole'

const navItems = [
  { name: 'Dashboard', href: '/', feature: 'dashboard' as const, icon: ChartBarSquareIcon },
  { name: 'Tenants', href: '/tenants', feature: 'tenants' as const, icon: BuildingOffice2Icon },
  { name: 'MSPs', href: '/msps', feature: 'msps' as const, icon: ServerStackIcon },
  { name: 'Audit', href: '/audit', feature: 'audit' as const, icon: ShieldCheckIcon },
  { name: 'Health', href: '/health', feature: 'health' as const, icon: HeartIcon },
  { name: 'Alerting', href: '/settings/alerting', feature: 'alerting-config' as const, icon: BellAlertIcon },
  { name: 'DNS Platform', href: '/dns-platform/connection', feature: 'dns-platform' as const, icon: GlobeAltIcon },
  { name: 'Admin Users', href: '/users', feature: 'admin-users' as const, icon: UserGroupIcon },
]

export function AdminAppSidebar() {
  const pathname = usePathname()
  const { canAccess } = useAdminRole()
  const items = navItems.filter((item) => canAccess(item.feature))

  return (
    <aside
      data-flux-app-shell
      className="hidden lg:flex w-[248px] shrink-0 flex-col border-r border-[var(--fs-line)] bg-[#FBFBFD] dark:bg-space-950 px-3 py-3.5"
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <ShieldMark className="h-7 w-7 rounded-[7px]" iconClassName="h-4 w-4" />
        <div className="min-w-0">
          <ProductWordmark className="text-[14px] font-semibold tracking-tight text-ink dark:text-white" />
          <p className="text-[11px] text-mut truncate">{ADMIN_PORTAL_NAME}</p>
        </div>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto space-y-0.5 pb-4">
        {items.map((item) => {
          const active =
            pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-2.5 rounded-[7px] px-2.5 py-1.5 text-[13px] leading-none',
                active
                  ? 'fs-sidebar-item-active font-medium text-ink'
                  : 'text-[var(--fs-txt)] hover:bg-white/80 dark:hover:bg-space-900/40',
              )}
            >
              <Icon
                className={clsx(
                  'h-4 w-4 shrink-0',
                  active ? 'text-[var(--fs-navy)]' : 'text-[#8A93A8]',
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <ProductFooter variant="dashboard" className="px-1 pb-1 hidden lg:block opacity-80" />
    </aside>
  )
}
