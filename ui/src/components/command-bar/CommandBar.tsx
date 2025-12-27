/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Command Bar (⌘K) - Global command palette for quick navigation and actions
 */

'use client'

import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, Transition, Combobox } from '@headlessui/react'
import { MagnifyingGlassIcon, CommandLineIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useCommandActions, CommandAction } from './useCommandActions'

interface CommandBarProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandBar({ isOpen, onClose }: CommandBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { actions, recentItems, addRecentItem } = useCommandActions()

  // Filter actions based on query
  const filteredActions = query === ''
    ? actions.slice(0, 8)
    : actions.filter((action) => {
        const searchText = `${action.name} ${action.description} ${action.keywords?.join(' ') || ''}`.toLowerCase()
        return searchText.includes(query.toLowerCase())
      }).slice(0, 10)

  // Group actions by category
  const groupedActions = filteredActions.reduce((acc, action) => {
    const category = action.category || 'Actions'
    if (!acc[category]) acc[category] = []
    acc[category].push(action)
    return acc
  }, {} as Record<string, CommandAction[]>)

  const handleSelect = useCallback((action: CommandAction) => {
    addRecentItem(action)
    onClose()
    setQuery('')
    
    if (action.href) {
      router.push(action.href)
    } else if (action.action) {
      action.action()
    }
  }, [router, onClose, addRecentItem])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  return (
    <Transition.Root show={isOpen} as={Fragment} afterLeave={() => setQuery('')}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-space-950/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-space-900 shadow-2xl ring-1 ring-space-900/5 dark:ring-white/10 transition-all">
              <Combobox onChange={handleSelect}>
                {/* Search input */}
                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-space-400" />
                  <Combobox.Input
                    ref={inputRef}
                    className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-space-900 dark:text-white placeholder:text-space-400 focus:ring-0 sm:text-sm"
                    placeholder="Search commands, pages, or type a domain..."
                    onChange={(e) => setQuery(e.target.value)}
                    value={query}
                  />
                  <div className="absolute right-4 top-3 text-xs text-space-400 flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-space-100 dark:bg-space-800 font-mono">esc</kbd>
                    <span>to close</span>
                  </div>
                </div>

                {/* Results */}
                <Combobox.Options static className="max-h-[60vh] scroll-py-2 overflow-y-auto border-t border-space-100 dark:border-space-800">
                  {/* Recent items section */}
                  {query === '' && recentItems.length > 0 && (
                    <div className="p-2">
                      <h3 className="px-3 py-1.5 text-xs font-semibold text-space-500 dark:text-space-400">Recent</h3>
                      {recentItems.slice(0, 3).map((item) => (
                        <CommandOption key={`recent-${item.id}`} action={item} />
                      ))}
                    </div>
                  )}

                  {/* Grouped actions */}
                  {Object.entries(groupedActions).map(([category, categoryActions]) => (
                    <div key={category} className="p-2">
                      <h3 className="px-3 py-1.5 text-xs font-semibold text-space-500 dark:text-space-400">{category}</h3>
                      {categoryActions.map((action) => (
                        <CommandOption key={action.id} action={action} />
                      ))}
                    </div>
                  ))}

                  {query !== '' && filteredActions.length === 0 && (
                    <div className="px-6 py-14 text-center sm:px-14">
                      <CommandLineIcon className="mx-auto h-6 w-6 text-space-400" />
                      <p className="mt-4 text-sm text-space-600 dark:text-space-400">
                        No commands found. Try a different search or{' '}
                        <button className="text-nebula-500 hover:text-nebula-400">block this domain</button>
                      </p>
                    </div>
                  )}
                </Combobox.Options>

                {/* Footer hints */}
                <div className="flex flex-wrap items-center gap-4 border-t border-space-100 dark:border-space-800 px-4 py-2.5 text-xs text-space-500">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-space-100 dark:bg-space-800 font-mono">↑↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-space-100 dark:bg-space-800 font-mono">↵</kbd>
                    select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-space-100 dark:bg-space-800 font-mono">/</kbd>
                    block domain
                  </span>
                </div>
              </Combobox>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

// Command option component
function CommandOption({ action }: { action: CommandAction }) {
  return (
    <Combobox.Option
      value={action}
      className={({ active }) =>
        clsx(
          'flex cursor-pointer select-none items-center rounded-lg px-3 py-2',
          active ? 'bg-nebula-500/10 text-nebula-600 dark:text-nebula-400' : 'text-space-700 dark:text-space-300'
        )
      }
    >
      {({ active }) => (
        <>
          {action.icon && (
            <action.icon className={clsx('h-5 w-5 flex-shrink-0', active ? 'text-nebula-500' : 'text-space-400')} />
          )}
          <div className="ml-3 flex-auto">
            <p className="text-sm font-medium">{action.name}</p>
            {action.description && (
              <p className={clsx('text-xs', active ? 'text-nebula-500/70' : 'text-space-500')}>
                {action.description}
              </p>
            )}
          </div>
          {action.shortcut && (
            <kbd className="ml-3 flex-shrink-0 px-2 py-1 text-xs font-mono rounded bg-space-100 dark:bg-space-800 text-space-500">
              {action.shortcut}
            </kbd>
          )}
        </>
      )}
    </Combobox.Option>
  )
}

