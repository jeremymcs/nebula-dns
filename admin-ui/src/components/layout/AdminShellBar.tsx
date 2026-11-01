/**
 * Admin top bar — account menu + tenant search (Design C)
 */

'use client'

import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import {
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { TenantSearchDropdown } from './TenantSearchDropdown'
import { useAdminRole } from '@/hooks/useAdminRole'
import { AdminRoleBadge } from '@/components/rbac/AdminRoleBadge'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function AdminShellBar() {
  const { admin, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { adminRole } = useAdminRole()

  return (
    <header className="sticky top-0 z-40 border-b fs-hairline bg-canvas/90 dark:bg-space-950/90 backdrop-blur-md">
      <div className="flex h-[52px] items-center gap-3 px-4 sm:px-7">
        <div className="flex-1 max-w-md hidden md:block">
          <TenantSearchDropdown />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="fs-btn h-9 w-9 p-0 rounded-lg"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <SunIcon className="h-4 w-4 text-warning-500" />
            ) : (
              <MoonIcon className="h-4 w-4 text-space-600" />
            )}
          </button>

          <Menu as="div" className="relative">
            <Menu.Button className="fs-btn h-9 gap-2 rounded-lg pl-1.5 pr-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-700 text-[11px] font-semibold text-white">
                {admin ? getInitials(admin.name) : 'AD'}
              </span>
              <span className="hidden sm:block max-w-[120px] truncate text-[13px] font-medium text-ink dark:text-white">
                {admin?.name ?? 'Admin'}
              </span>
              <ChevronDownIcon className="h-4 w-4 text-mut" />
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
              <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right fs-card py-1 shadow-lg focus:outline-none">
                <div className="px-3 py-2 border-b fs-hairline">
                  <p className="text-sm font-medium text-ink dark:text-white truncate">{admin?.name}</p>
                  <p className="text-xs text-mut truncate">{admin?.email}</p>
                  {adminRole && (
                    <div className="mt-2">
                      <AdminRoleBadge role={adminRole} />
                    </div>
                  )}
                </div>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      type="button"
                      onClick={() => logout()}
                      className={clsx(
                        'flex w-full items-center gap-2 px-3 py-2 text-sm text-txt',
                        active && 'bg-space-50 dark:bg-space-900/50',
                      )}
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      Sign out
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  )
}
