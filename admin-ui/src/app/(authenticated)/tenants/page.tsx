/**
 * Nebula DNS - Admin UI Tenant Search Page
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, UsersIcon } from '@heroicons/react/24/outline'
import { Card, Badge, EmptyState, SkeletonTable } from '@/components/ui'
import { useAdminTenantSearch } from '@/hooks/useApi'

export default function TenantsPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data, isLoading, error } = useAdminTenantSearch(debouncedQuery, 25)

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-space-900 dark:text-white">
          Tenants
        </h1>
        <p className="text-lg text-space-500 dark:text-space-400 mt-1">
          Search organizations by name, tenant ID, or user email
        </p>
      </div>

      <Card className="p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-space-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tenants (min. 2 characters)…"
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 text-space-900 dark:text-white"
          />
        </div>
      </Card>

      {debouncedQuery.length < 2 ? (
        <EmptyState
          icon={<UsersIcon className="h-12 w-12" />}
          title="Start typing to search"
          description="Enter at least two characters to find tenants across the platform."
        />
      ) : isLoading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : error ? (
        <Card className="p-6 text-danger-600 dark:text-danger-400">
          Failed to load tenants. Please try again.
        </Card>
      ) : !data?.data.length ? (
        <EmptyState
          icon={<UsersIcon className="h-12 w-12" />}
          title="No tenants found"
          description={`No results for "${debouncedQuery}".`}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-space-200 dark:divide-space-800">
              <thead className="bg-space-50 dark:bg-space-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-space-500">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-space-500">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-space-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-space-500">
                    ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-100 dark:divide-space-800">
                {data.data.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-space-50 dark:hover:bg-space-800/40">
                    <td className="px-6 py-4 font-medium text-space-900 dark:text-white">
                      {tenant.name}
                      {tenant.matchedEmail && (
                        <span className="block text-sm text-space-500">{tenant.matchedEmail}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 capitalize text-space-600 dark:text-space-300">
                      {tenant.tier}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={tenant.status === 'active' ? 'success' : 'warning'}>
                        {tenant.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-space-500">{tenant.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
