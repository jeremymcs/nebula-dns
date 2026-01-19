/**
 * Nebula DNS - MSP Listing Page (Mission Control)
 * Admin interface for browsing and searching MSP accounts
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline'
import { Card, Badge, EmptyState, SkeletonTable } from '@/components/ui'
import { useAdminMspList, MspTenant } from '@/hooks/useAdminApi'

export default function MspListingPage() {
  const router = useRouter()

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch data - only pass params when they have values
  const { data, isLoading, error } = useAdminMspList({
    q: debouncedSearch || undefined,
    status: statusFilter || undefined,
    limit: 25,
  })

  const msps = data?.data || []
  const pagination = data?.pagination

  const hasActiveFilters = searchQuery || statusFilter

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
  }

  const getStatusBadgeVariant = (status: MspTenant['status']): 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'active':
        return 'success'
      case 'suspended':
        return 'warning'
      case 'cancelled':
        return 'danger'
      default:
        return 'success'
    }
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
        <Card variant="solid" padding="lg" className="border-red-200 dark:border-red-800 bg-danger-50 dark:bg-danger-900/20">
          <p className="text-danger-800 dark:text-danger-200">
            Failed to load MSP accounts. {error.message || 'Please try again.'}
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-space-900 dark:text-white">MSP Accounts</h1>
          <p className="mt-2 text-space-500 dark:text-space-400">
            {pagination?.total !== undefined ? `${pagination.total} total MSPs` : 'Loading...'}
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-space-400" />
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-space-800 border border-space-200 dark:border-space-700 text-space-900 dark:text-white placeholder-space-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-white dark:bg-space-800 border border-space-200 dark:border-space-700 text-space-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <FunnelIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-space-400 pointer-events-none" />
        </div>
      </div>

      {/* Results count when filters active */}
      {msps.length > 0 && hasActiveFilters && (
        <div className="text-sm text-space-500 dark:text-space-400">
          Showing {msps.length} of {pagination?.total || 0} MSPs
          <button
            onClick={clearFilters}
            className="ml-2 text-primary-600 dark:text-primary-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && <SkeletonTable rows={8} cols={4} />}

      {/* MSP Table */}
      {!isLoading && msps.length > 0 && (
        <Card variant="solid" padding="none">
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">MSP Name</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Clients</th>
                  <th className="table-header-cell">Contact Email</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {msps.map((msp) => (
                  <tr
                    key={msp.id}
                    className="table-row hover:bg-space-50 dark:hover:bg-space-800 cursor-pointer transition-colors"
                    onClick={() => {
                      // Navigation will be added in Plan 02
                      // router.push(`/mission-control/msps/${msp.id}`)
                    }}
                  >
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <BuildingOffice2Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-space-900 dark:text-white">
                            {msp.name}
                          </div>
                          <div className="text-xs text-space-500 dark:text-space-400 font-mono">
                            {msp.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <Badge variant={getStatusBadgeVariant(msp.status)} size="sm">
                        {msp.status}
                      </Badge>
                    </td>
                    <td className="table-cell text-space-900 dark:text-white">
                      {msp.clientCount}
                    </td>
                    <td className="table-cell text-space-500 dark:text-space-400">
                      {msp.contactEmail || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State - No MSPs at all */}
      {!isLoading && msps.length === 0 && !hasActiveFilters && (
        <Card variant="solid" padding="lg">
          <EmptyState
            icon={<BuildingOffice2Icon className="h-12 w-12" />}
            title="No MSPs found"
            description="No MSP accounts exist yet."
          />
        </Card>
      )}

      {/* Empty State - No results with filters */}
      {!isLoading && msps.length === 0 && hasActiveFilters && (
        <Card variant="solid" padding="lg">
          <EmptyState
            icon={<MagnifyingGlassIcon className="h-12 w-12" />}
            title="No MSPs found"
            description="Try adjusting your search or filters."
          />
        </Card>
      )}
    </div>
  )
}
