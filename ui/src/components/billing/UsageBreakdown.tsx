// Nebula DNS - Usage Breakdown Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useMemo } from 'react'
import { useUsageBreakdown, useUsageStats } from '@/hooks/useUsageStats'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ArrowPathIcon, MapPinIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

function LocationsTable({ locations }: { locations: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-space-200 dark:border-space-700">
            <th className="text-left py-3 px-4 text-sm font-semibold text-space-700 dark:text-space-300">
              Location Name
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-space-700 dark:text-space-300">
              Policy
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-space-700 dark:text-space-300">
              Created
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-space-700 dark:text-space-300">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {locations.map((location, index) => (
            <tr
              key={location.id}
              className={clsx(
                'border-b border-space-100 dark:border-space-800 last:border-0',
                'hover:bg-space-50 dark:hover:bg-space-800/50 transition-colors'
              )}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-space-400" />
                  <span className="text-sm font-medium text-space-900 dark:text-white">
                    {location.name}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-space-600 dark:text-space-400">
                  {location.policyName}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-space-600 dark:text-space-400">
                  {new Date(location.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </td>
              <td className="py-3 px-4">
                <Badge variant={location.status === 'active' ? 'success' : 'neutral'}>
                  {location.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClientsTable({ clients }: { clients: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-space-200 dark:border-space-700">
            <th className="text-left py-3 px-4 text-sm font-semibold text-space-700 dark:text-space-300">
              Client Name
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-space-700 dark:text-space-300">
              Locations
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-space-700 dark:text-space-300">
              Created
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-space-700 dark:text-space-300">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr
              key={client.id}
              className={clsx(
                'border-b border-space-100 dark:border-space-800 last:border-0',
                'hover:bg-space-50 dark:hover:bg-space-800/50 transition-colors'
              )}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="h-4 w-4 text-space-400" />
                  <span className="text-sm font-medium text-space-900 dark:text-white">
                    {client.name}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-space-600 dark:text-space-400">
                  {client.locationCount} location{client.locationCount !== 1 ? 's' : ''}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-space-600 dark:text-space-400">
                  {new Date(client.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </td>
              <td className="py-3 px-4">
                <Badge variant={client.status === 'active' ? 'success' : 'neutral'}>
                  {client.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function UsageBreakdown() {
  const { data: usageStats } = useUsageStats()
  const { data: breakdown, isLoading, error, mutate } = useUsageBreakdown()

  const isMsp = usageStats?.plan?.tier === 'msp'

  const billingPeriod = useMemo(() => {
    if (!usageStats?.billingPeriod) return null

    const start = new Date(usageStats.billingPeriod.start)
    const end = new Date(usageStats.billingPeriod.end)

    return {
      start: start.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      end: end.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    }
  }, [usageStats])

  if (isLoading) {
    return (
      <Card variant="glass" padding="md">
        <CardHeader title="Usage Breakdown" subtitle="Current billing period" />
        <div className="space-y-4 mt-4">
          <div className="h-12 skeleton rounded" />
          <div className="h-48 skeleton rounded" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card variant="glass" padding="md">
        <CardHeader title="Usage Breakdown" subtitle="Current billing period" />
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <p className="text-space-500 dark:text-space-400 mb-4">
            Failed to load usage breakdown
          </p>
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Retry
          </button>
        </div>
      </Card>
    )
  }

  if (!breakdown) {
    return null
  }

  return (
    <Card variant="glass" padding="md">
      <CardHeader
        title="Usage Breakdown"
        subtitle={
          billingPeriod
            ? `${billingPeriod.start} - ${billingPeriod.end}`
            : 'Current billing period'
        }
      />

      {/* Cost Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-space-50 dark:bg-space-800/50 rounded-lg">
        <div>
          <p className="text-sm text-space-500 dark:text-space-400 mb-1">
            Current Period Cost
          </p>
          <p className="text-2xl font-bold text-space-900 dark:text-white">
            ${breakdown.currentPeriodCost.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-space-500 dark:text-space-400 mb-1">
            Projected Monthly Cost
          </p>
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            ${breakdown.projectedMonthlyCost.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6">
        {isMsp && breakdown.clients ? (
          <div>
            <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
              Clients ({breakdown.clients.length})
            </h3>
            {breakdown.clients.length > 0 ? (
              <ClientsTable clients={breakdown.clients} />
            ) : (
              <div className="text-center py-8 text-space-500 dark:text-space-400">
                No clients yet
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
              Locations ({breakdown.locations?.length || 0})
            </h3>
            {breakdown.locations && breakdown.locations.length > 0 ? (
              <LocationsTable locations={breakdown.locations} />
            ) : (
              <div className="text-center py-8 text-space-500 dark:text-space-400">
                No locations yet
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
