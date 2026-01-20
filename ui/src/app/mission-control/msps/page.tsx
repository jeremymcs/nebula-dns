/**
 * Nebula DNS - MSP Listing Page (Mission Control)
 * Admin interface for browsing and searching MSP accounts
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  BuildingOffice2Icon,
  EllipsisVerticalIcon,
  ArrowRightOnRectangleIcon,
  EyeIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { Card, Badge, EmptyState, SkeletonTable } from '@/components/ui'
import { useAdminMspList, MspTenant } from '@/hooks/useAdminApi'
import { useToast } from '@/components/Toast'

export default function MspListingPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  // Initialize state from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') || '')

  // Debounce search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (statusFilter) params.set('status', statusFilter)
    const queryString = params.toString()
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(newUrl, { scroll: false })
  }, [debouncedSearch, statusFilter, pathname, router])

  // Infinite scroll state
  const [allMsps, setAllMsps] = useState<MspTenant[]>([])
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)

  // Fetch current page
  const { data, isLoading, error } = useAdminMspList({
    q: debouncedSearch || undefined,
    status: statusFilter || undefined,
    limit: 25,
    cursor,
  })

  // Reset when search/filter changes
  useEffect(() => {
    setAllMsps([])
    setCursor(undefined)
    setHasMore(true)
    loadingMoreRef.current = false
    setIsLoadingMore(false)
  }, [debouncedSearch, statusFilter])

  // Append new data when received
  useEffect(() => {
    if (data?.data) {
      if (cursor) {
        // Appending to existing results
        setAllMsps((prev) => [...prev, ...data.data])
      } else {
        // Fresh data (initial load or after filter change)
        setAllMsps(data.data)
      }
      setHasMore(data.pagination.hasMore)
      loadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [data, cursor])

  // Load more function
  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMore || isLoading || !data?.pagination.cursor) return
    loadingMoreRef.current = true
    setIsLoadingMore(true)
    setCursor(data.pagination.cursor)
  }, [hasMore, isLoading, data?.pagination.cursor])

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !loadingMoreRef.current) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, isLoading, loadMore])

  // Action menu state
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Click outside to close action menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Navigate to MSP detail page
  const handleViewDetails = (mspId: string) => {
    router.push(`/mission-control/msps/${mspId}`)
    setActiveMenu(null)
  }

  // Handle impersonation (placeholder - implemented in Phase 13)
  const handleImpersonate = (msp: MspTenant) => {
    showToast('info', `Impersonation for ${msp.name} coming soon`)
    setActiveMenu(null)
  }

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
        <Card
          variant="solid"
          padding="lg"
          className="border-red-200 dark:border-red-800 bg-danger-50 dark:bg-danger-900/20"
        >
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
            {data?.pagination?.total !== undefined ? `${data.pagination.total} total MSPs` : 'Loading...'}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/mission-control/msps/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-nebula-500 text-white text-sm font-medium rounded-lg hover:bg-nebula-600 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Onboard New MSP
          </Link>
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
      {allMsps.length > 0 && hasActiveFilters && (
        <div className="text-sm text-space-500 dark:text-space-400">
          Showing {allMsps.length} of {data?.pagination?.total || 0} MSPs
          <button
            onClick={clearFilters}
            className="ml-2 text-primary-600 dark:text-primary-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Loading State (initial load only) */}
      {isLoading && allMsps.length === 0 && <SkeletonTable rows={8} cols={5} />}

      {/* MSP Table */}
      {allMsps.length > 0 && (
        <Card variant="solid" padding="none">
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">MSP Name</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Clients</th>
                  <th className="table-header-cell">Contact Email</th>
                  <th className="table-header-cell text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {allMsps.map((msp) => (
                  <tr
                    key={msp.id}
                    onClick={() => handleViewDetails(msp.id)}
                    className="table-row cursor-pointer hover:bg-space-50 dark:hover:bg-space-800/50 transition-colors"
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
                          <div className="text-xs text-space-500 dark:text-space-400">
                            ID: {msp.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <Badge variant={getStatusBadgeVariant(msp.status)} size="sm">
                        {msp.status}
                      </Badge>
                    </td>
                    <td className="table-cell text-sm text-space-700 dark:text-space-300">
                      {msp.clientCount} {msp.clientCount === 1 ? 'client' : 'clients'}
                    </td>
                    <td className="table-cell text-sm text-space-500 dark:text-space-400">
                      {msp.contactEmail || '-'}
                    </td>
                    <td className="table-cell text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative" ref={activeMenu === msp.id ? menuRef : null}>
                        <button
                          onClick={() => setActiveMenu(activeMenu === msp.id ? null : msp.id)}
                          className="p-2 rounded-lg hover:bg-space-100 dark:hover:bg-space-700 transition-colors"
                        >
                          <EllipsisVerticalIcon className="h-5 w-5 text-space-500" />
                        </button>
                        {activeMenu === msp.id && (
                          <div className="absolute right-0 top-10 z-10 w-48 bg-white dark:bg-space-800 rounded-xl shadow-xl ring-1 ring-space-200 dark:ring-space-700 py-1">
                            <button
                              onClick={() => handleViewDetails(msp.id)}
                              className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-space-50 dark:hover:bg-space-700 text-space-700 dark:text-space-300"
                            >
                              <EyeIcon className="h-4 w-4" />
                              View Details
                            </button>
                            <button
                              onClick={() => handleImpersonate(msp)}
                              className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-space-50 dark:hover:bg-space-700 text-space-700 dark:text-space-300"
                            >
                              <ArrowRightOnRectangleIcon className="h-4 w-4" />
                              Impersonate
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && allMsps.length > 0 && <div ref={sentinelRef} className="h-4" />}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="py-4 text-center text-space-500 dark:text-space-400">Loading more...</div>
      )}

      {/* End of results indicator */}
      {!hasMore && allMsps.length > 0 && (
        <div className="py-4 text-center text-sm text-space-400 dark:text-space-500">
          Showing all {data?.pagination?.total || allMsps.length} MSPs
        </div>
      )}

      {/* Empty State - No MSPs at all */}
      {!isLoading && allMsps.length === 0 && !hasActiveFilters && (
        <Card variant="solid" padding="lg">
          <EmptyState
            icon={<BuildingOffice2Icon className="h-12 w-12" />}
            title="No MSPs found"
            description="No MSP accounts exist yet."
          />
        </Card>
      )}

      {/* Empty State - No results with filters */}
      {!isLoading && allMsps.length === 0 && hasActiveFilters && (
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
