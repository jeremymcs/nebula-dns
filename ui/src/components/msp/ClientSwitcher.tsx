// Nebula DNS - Client Context Switcher Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { Fragment, useEffect } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { useClientContext } from '@/hooks/useClientContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  BuildingOffice2Icon,
  ArrowLeftIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

export function ClientSwitcher() {
  const { isManagingClient, clientName, switchBackToMsp } = useClientContext()
  const { user, isMsp } = useAuth()

  // Keyboard shortcut: Cmd/Ctrl + Shift + M
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'm') {
        e.preventDefault()
        if (isManagingClient) {
          switchBackToMsp()
          window.location.href = '/dashboard/clients'
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isManagingClient, switchBackToMsp])

  // Don't show if not MSP or not managing a client
  if (!isMsp || !isManagingClient) {
    return null
  }

  const handleSwitchBack = () => {
    switchBackToMsp()
    window.location.href = '/dashboard/clients'
  }

  const handleSwitchToDifferent = () => {
    switchBackToMsp()
    window.location.href = '/dashboard/clients'
  }

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
          'bg-warning-100 dark:bg-warning-900/30 text-warning-900 dark:text-warning-200',
          'hover:bg-warning-200 dark:hover:bg-warning-900/50 transition-colors',
          'ring-1 ring-warning-300 dark:ring-warning-700'
        )}
      >
        <BuildingOffice2Icon className="w-5 h-5" />
        <span>Managing: {clientName}</span>
        <ChevronDownIcon className="w-4 h-4" />
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
        <Menu.Items
          className={clsx(
            'absolute right-0 mt-2 w-64 origin-top-right',
            'rounded-xl bg-white dark:bg-space-800 shadow-2xl',
            'ring-1 ring-space-900/5 dark:ring-white/10',
            'divide-y divide-space-100 dark:divide-space-700',
            'focus:outline-none z-50'
          )}
        >
          <div className="p-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-warning-500 to-warning-600 flex items-center justify-center">
                <BuildingOffice2Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-space-500 dark:text-space-400">Managing Client</p>
                <p className="text-sm font-semibold text-space-900 dark:text-white truncate">
                  {clientName}
                </p>
              </div>
            </div>
            <p className="text-xs text-space-500 dark:text-space-400 mt-2">
              You are currently viewing and managing this client's resources.
            </p>
          </div>

          <div className="p-2">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleSwitchBack}
                  className={clsx(
                    'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm',
                    'transition-colors',
                    active
                      ? 'bg-space-100 dark:bg-space-700 text-space-900 dark:text-white'
                      : 'text-space-700 dark:text-space-300'
                  )}
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">Switch back to {user?.tenantName || 'MSP'}</p>
                    <p className="text-xs text-space-500 dark:text-space-400">
                      Return to your MSP dashboard
                    </p>
                  </div>
                </button>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleSwitchToDifferent}
                  className={clsx(
                    'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm',
                    'transition-colors',
                    active
                      ? 'bg-space-100 dark:bg-space-700 text-space-900 dark:text-white'
                      : 'text-space-700 dark:text-space-300'
                  )}
                >
                  <ArrowsRightLeftIcon className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">Switch to different client</p>
                    <p className="text-xs text-space-500 dark:text-space-400">
                      View your clients list
                    </p>
                  </div>
                </button>
              )}
            </Menu.Item>
          </div>

          <div className="p-2">
            <div className="px-3 py-2 text-xs text-space-500 dark:text-space-400">
              Keyboard shortcut: <kbd className="font-mono">Cmd+Shift+M</kbd>
            </div>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
