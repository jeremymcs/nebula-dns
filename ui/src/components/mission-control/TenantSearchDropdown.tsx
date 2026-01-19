/**
 * Nebula DNS - Tenant Search Dropdown
 * Spotlight-style search dropdown for finding and impersonating tenants
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { Fragment, useState, useCallback, useRef, useEffect } from 'react'
import { Combobox, Transition } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useDebounce } from '@/hooks/useDebounce'
import {
  useAdminTenantSearch,
  startImpersonation,
  TenantSearchResult,
} from '@/hooks/useAdminApi'

/**
 * Get tier badge styling based on tenant tier
 */
function getTierBadge(tier: TenantSearchResult['tier']) {
  switch (tier) {
    case 'msp':
      return {
        label: 'MSP',
        className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      }
    case 'enterprise':
      return {
        label: 'Enterprise',
        className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      }
    case 'home':
    default:
      return {
        label: 'Home',
        className: 'bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-300',
      }
  }
}

/**
 * TenantSearchDropdown - Spotlight-style search for finding tenants
 * Allows admins to quickly find any tenant and start impersonation
 */
export function TenantSearchDropdown() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, 300)
  const { data, isLoading } = useAdminTenantSearch(debouncedQuery)

  // Open dropdown when debounced query is long enough and has results
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [debouncedQuery])

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle selection - start impersonation and navigate to dashboard
  const handleSelect = useCallback(async (tenant: TenantSearchResult | null) => {
    if (!tenant || isImpersonating) return

    setIsImpersonating(true)
    try {
      const response = await startImpersonation(tenant.id)

      // Store impersonation data
      localStorage.setItem('impersonation_token', response.accessToken)
      localStorage.setItem(
        'impersonation_info',
        JSON.stringify({
          tenantId: response.tenantId,
          tenantName: response.tenantName,
          tenantTier: response.tenantTier,
          startedAt: new Date().toISOString(),
        })
      )
      // Set as active token for tenant dashboard
      localStorage.setItem('token', response.accessToken)

      // Navigate to tenant dashboard with full page reload
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Failed to start impersonation:', error)
      setIsImpersonating(false)
    }
  }, [isImpersonating])

  // Handle escape key
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }, [])

  // Handle input focus
  const handleFocus = useCallback(() => {
    if (query.length >= 2) {
      setIsOpen(true)
    }
  }, [query])

  const results = data?.data || []
  const hasResults = results.length > 0
  const showDropdown = isOpen && debouncedQuery.length >= 2

  return (
    <div ref={containerRef} className="relative">
      <Combobox value={null} onChange={handleSelect}>
        {/* Search Input */}
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-space-400" />
          <Combobox.Input
            ref={inputRef}
            className={clsx(
              'w-48 md:w-64 h-9 pl-9 pr-3 rounded-xl',
              'bg-space-100/50 dark:bg-space-800/50',
              'border border-space-200 dark:border-space-700',
              'text-sm text-space-900 dark:text-white',
              'placeholder:text-space-400',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
              'transition-all'
            )}
            placeholder="Search tenants..."
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            value={query}
            displayValue={() => query}
          />
          {isLoading && debouncedQuery.length >= 2 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 border-2 border-space-300 dark:border-space-600 border-t-primary-500 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Results Dropdown */}
        <Transition
          as={Fragment}
          show={showDropdown}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Combobox.Options
            static
            className={clsx(
              'absolute mt-1 w-80 max-h-80 overflow-y-auto z-50',
              'rounded-xl bg-white dark:bg-space-800',
              'shadow-lg ring-1 ring-space-900/5 dark:ring-white/10',
              'p-1'
            )}
          >
            {hasResults ? (
              results.map((tenant) => {
                const badge = getTierBadge(tenant.tier)
                return (
                  <Combobox.Option
                    key={tenant.id}
                    value={tenant}
                    disabled={isImpersonating}
                    className={({ active }) =>
                      clsx(
                        'flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer',
                        active ? 'bg-primary-50 dark:bg-primary-900/20' : '',
                        isImpersonating ? 'opacity-50 cursor-wait' : ''
                      )
                    }
                  >
                    {({ active }) => (
                      <>
                        <div className="flex-1 min-w-0">
                          <p
                            className={clsx(
                              'text-sm font-medium truncate',
                              active
                                ? 'text-primary-700 dark:text-primary-300'
                                : 'text-space-900 dark:text-white'
                            )}
                          >
                            {tenant.name}
                          </p>
                          {tenant.matchedEmail && (
                            <p
                              className={clsx(
                                'text-xs truncate',
                                active
                                  ? 'text-primary-600/70 dark:text-primary-400/70'
                                  : 'text-space-500 dark:text-space-400'
                              )}
                            >
                              {tenant.matchedEmail}
                            </p>
                          )}
                        </div>
                        <span
                          className={clsx(
                            'ml-2 flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded',
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      </>
                    )}
                  </Combobox.Option>
                )
              })
            ) : (
              <div className="px-3 py-6 text-center">
                <p className="text-sm text-space-500 dark:text-space-400">
                  No tenants found for &quot;{debouncedQuery}&quot;
                </p>
              </div>
            )}
          </Combobox.Options>
        </Transition>
      </Combobox>
    </div>
  )
}
