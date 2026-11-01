'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import {
  PRODUCT_MODULE_DNS_FILTER,
  PRODUCT_MODULE_DNS_MANAGEMENT,
  PRODUCT_MODULE_DMARC,
} from '@/lib/branding'

const modules = [
  {
    id: 'dns-filter',
    label: PRODUCT_MODULE_DNS_FILTER,
    href: '/dashboard',
    match: (path: string) =>
      path.startsWith('/dashboard') && !path.startsWith('/dns-management'),
    available: true,
  },
  {
    id: 'dns-management',
    label: PRODUCT_MODULE_DNS_MANAGEMENT,
    href: '/dns-management',
    match: (path: string) => path.startsWith('/dns-management'),
    available: true,
  },
  {
    id: 'dmarc',
    label: PRODUCT_MODULE_DMARC,
    href: '#',
    match: () => false,
    available: false,
    hint: 'Coming soon',
  },
] as const

type ModuleSwitcherProps = {
  variant?: 'menu' | 'segment'
}

export function ModuleSwitcher({ variant = 'menu' }: ModuleSwitcherProps) {
  const pathname = usePathname()
  const active =
    modules.find((mod) => mod.available && mod.match(pathname)) ?? modules[0]

  if (variant === 'segment') {
    return (
      <div className="flex flex-nowrap rounded-lg bg-[#F0F2F7] dark:bg-space-900 p-0.5 text-[11px] leading-tight">
        {modules.map((mod) => {
          const isActive = mod.id === active.id
          if (!mod.available) {
            return (
              <span
                key={mod.id}
                className="flex min-w-0 flex-1 items-center justify-center gap-0.5 whitespace-nowrap rounded-md px-1 py-1.5 text-mut cursor-not-allowed"
                title={mod.hint}
              >
                DMARC
                <span className="text-[10px] text-[#C9443A]">soon</span>
              </span>
            )
          }
          const shortLabel = mod.id === 'dns-management' ? 'DNS Mgmt' : 'DNS Filter'
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className={clsx(
                'flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-md px-1 py-1.5 transition-colors',
                isActive
                  ? 'bg-white dark:bg-space-800 text-ink font-medium shadow-[0_0_0_1px_rgba(11,21,48,0.06),0_1px_2px_rgba(11,21,48,0.08)]'
                  : 'text-mut hover:text-txt',
              )}
            >
              {shortLabel}
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <Menu as="div" className="relative hidden md:block shrink-0">
      <Menu.Button
        className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 ring-1 ring-primary-200/80 dark:ring-primary-700/50 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
        aria-label="Switch platform module"
      >
        {active.label}
        <ChevronDownIcon className="h-3.5 w-3.5 opacity-70" />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <Menu.Items className="absolute left-0 mt-2 w-56 origin-top-left rounded-xl bg-white dark:bg-space-800 shadow-lg ring-1 ring-space-900/5 dark:ring-white/10 focus:outline-none p-1 z-50">
          {modules.map((mod) => (
            <Menu.Item key={mod.id} disabled={!mod.available}>
              {({ active: itemActive, disabled }) =>
                mod.available ? (
                  <Link
                    href={mod.href}
                    className={clsx(
                      'block px-3 py-2 text-sm rounded-lg font-medium',
                      itemActive && 'bg-primary-50 dark:bg-primary-900/30',
                      mod.id === active.id &&
                        'ring-1 ring-primary-200/80 dark:ring-primary-700/50',
                      'text-primary-700 dark:text-primary-300'
                    )}
                  >
                    {mod.label}
                  </Link>
                ) : (
                  <span
                    className={clsx(
                      'block px-3 py-2 text-sm rounded-lg',
                      disabled && 'cursor-not-allowed opacity-60',
                      'text-space-500 dark:text-space-400'
                    )}
                    title={mod.hint}
                  >
                    {mod.label}
                    <span className="ml-2 text-[10px] font-normal normal-case text-space-400">
                      {mod.hint}
                    </span>
                  </span>
                )
              }
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
