/**
 * Flux Shield — Linear-style app sidebar (Design C)
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { getNavigationForTier } from './NavigationConfig'
import { OrgSwitcher } from './OrgSwitcher'
import { ModuleSwitcher } from './ModuleSwitcher'
import { ProductWordmark } from '@/components/ui/ProductWordmark'
import { ShieldMark } from '@/components/ui/ShieldMark'
import { ProductFooter } from '@/components/ui/ProductFooter'
import { usePolicies, useLocations, useAgents } from '@/hooks/useApi'

function navBadgeForHref(
  href: string,
  counts: { policies?: number; locations?: number; agents?: number },
): string | undefined {
  switch (href) {
    case '/dashboard/policies':
      return counts.policies !== undefined && counts.policies > 0
        ? String(counts.policies)
        : undefined
    case '/dashboard/locations':
      return counts.locations !== undefined && counts.locations > 0
        ? String(counts.locations)
        : undefined
    case '/dashboard/agents':
      return counts.agents !== undefined && counts.agents > 0
        ? String(counts.agents)
        : undefined
    default:
      return undefined
  }
}

export function AppSidebar() {
  const pathname = usePathname()
  const { tier, user } = useAuth()
  const groups = getNavigationForTier(tier)

  const { data: policies } = usePolicies()
  const { data: locationsPage } = useLocations({ limit: 1 })
  const { data: agents } = useAgents()

  const counts = {
    policies: policies?.data?.length,
    locations: locationsPage?.data?.length,
    agents: agents?.data?.length,
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname?.startsWith(href))

  return (
    <aside
      data-flux-app-shell
      className="hidden lg:flex w-[248px] shrink-0 flex-col border-r border-[var(--fs-line)] bg-[#FBFBFD] dark:bg-space-950 px-3 py-3.5"
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <ShieldMark className="h-7 w-7 rounded-[7px] shadow-none" iconClassName="h-4 w-4" />
        <div className="min-w-0 flex-1">
          <OrgSwitcher />
          {user?.tenantName && (
            <p className="text-[11px] text-mut truncate mt-0.5">
              <ProductWordmark className="inline text-[11px] font-normal" /> ·{' '}
              {tier === 'msp' ? 'MSP' : tier === 'home' ? 'Home' : 'Pro'}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 mx-1">
        <ModuleSwitcher variant="segment" />
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto space-y-4 pb-4">
        {groups.map((group) => (
          <div key={group.name}>
            <h6 className="px-2.5 pb-1.5 text-[11px] font-medium text-mut">{group.name}</h6>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href)
                const countBadge = navBadgeForHref(item.href, counts)
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
                        'h-4 w-4 shrink-0 stroke-[1.6]',
                        active ? 'text-[var(--fs-navy)]' : 'text-[#8A93A8]',
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {item.badge === 'Live' && (
                      <span
                        className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500 shadow-[0_0_0_3px_rgba(255,110,98,0.18)]"
                        aria-hidden
                      />
                    )}
                    {item.badge && item.badge !== 'Live' && (
                      <span className="ml-auto shrink-0 text-[10px] font-medium leading-none text-mut pl-2">
                        {item.badge}
                      </span>
                    )}
                    {countBadge && (
                      <span className="ml-auto shrink-0 font-mono text-[10.5px] leading-none text-mut pl-2">
                        {countBadge}
                      </span>
                    )}
                    {item.shortcut && !countBadge && !item.badge && (
                      <span className="ml-auto shrink-0 font-mono text-[10.5px] leading-none text-mut pl-2">
                        {item.shortcut.replace('G ', '')}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <ProductFooter variant="compact" className="border-t fs-hairline pt-3 px-2 text-[11.5px]" />
    </aside>
  )
}
