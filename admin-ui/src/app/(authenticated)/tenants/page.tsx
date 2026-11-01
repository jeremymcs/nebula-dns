'use client'

import { useEffect, useState } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Card, Badge, Skeleton, SkeletonTable, EmptyState } from '@/components/ui'
import { useAdminTenantList } from '@/hooks/useApi'
import { useDebounce } from '@/hooks/useDebounce'
import Link from 'next/link'

export default function TenantsIndexPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [plan, setPlan] = useState('')
  const [tier, setTier] = useState('')
  const [cursor, setCursor] = useState<string | undefined>()
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    setCursor(undefined)
  }, [debouncedSearch, status, plan, tier])

  const { data, isLoading, error } = useAdminTenantList({
    q: debouncedSearch || undefined,
    status: status || undefined,
    plan: plan || undefined,
    tier: tier || undefined,
    limit: 25,
    cursor,
  })

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-space-900 dark:text-white">Tenants</h1>
        <p className="mt-2 text-space-500 dark:text-space-400">
          Search and manage organizations across the Flux Shield platform.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-space-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or ID…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 px-3 py-2 text-sm"
        >
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 px-3 py-2 text-sm"
        >
          <option value="">All tiers</option>
          <option value="home">Home</option>
          <option value="enterprise">Enterprise</option>
          <option value="msp">MSP</option>
        </select>
      </div>

      {error && (
        <Card variant="solid" padding="md" className="border-danger-200">
          <p className="text-danger-700">{error.message}</p>
        </Card>
      )}

      {isLoading && <SkeletonTable rows={8} cols={5} />}

      {!isLoading && data && data.data.length === 0 && (
        <EmptyState
          icon={<MagnifyingGlassIcon className="h-12 w-12" />}
          title="No tenants found"
          description="Try adjusting filters."
        />
      )}

      {!isLoading && data && data.data.length > 0 && (
        <Card variant="solid" padding="none">
          <div className="overflow-x-auto">
            <table className="table text-sm w-full">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Plan</th>
                  <th className="table-header-cell">Tier</th>
                  <th className="table-header-cell">MSP</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {data.data.map((row) => (
                  <tr key={row.id} className="table-row hover:bg-space-50 dark:hover:bg-space-800/40">
                    <td className="table-cell">
                      <Link
                        href={`/tenants/${row.id}`}
                        className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {row.name}
                      </Link>
                      <div className="text-xs text-space-500">{row.contactEmail || row.slug}</div>
                    </td>
                    <td className="table-cell capitalize">
                      <Badge size="sm">{row.status}</Badge>
                    </td>
                    <td className="table-cell uppercase">{row.plan}</td>
                    <td className="table-cell uppercase">{row.tier}</td>
                    <td className="table-cell text-space-600">
                      {row.managedByMspName || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pagination.hasMore && (
            <div className="p-4 border-t border-space-200 dark:border-space-700 flex justify-center">
              <button
                type="button"
                onClick={() => setCursor(data.pagination.cursor || undefined)}
                className="text-sm text-primary-600 dark:text-primary-400 font-medium"
              >
                Load more
              </button>
            </div>
          )}
        </Card>
      )}

      {isLoading && !data && <Skeleton className="h-8 w-32" />}
    </div>
  )
}
