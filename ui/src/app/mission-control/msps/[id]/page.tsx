/**
 * Nebula DNS - MSP Detail Page (Mission Control)
 * Admin interface for viewing MSP details and taking actions
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  CreditCardIcon,
  ArrowRightOnRectangleIcon,
  CheckBadgeIcon,
  CalendarIcon,
  UserGroupIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, Badge, Skeleton, SkeletonTable, EmptyState } from '@/components/ui'
import {
  useAdminMspDetail,
  useAdminMspClients,
  startImpersonation,
  MspDetailResponse,
  MspClient,
} from '@/hooks/useAdminApi'
import { useToast } from '@/components/Toast'

interface MspDetailPageProps {
  params: { id: string }
}

/**
 * Get Badge variant based on MSP status
 */
function getStatusBadgeVariant(status: MspDetailResponse['status']): 'success' | 'warning' | 'danger' {
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

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Loading skeleton for stat cards
 */
function StatCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} variant="glass" padding="md">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function MspDetailPage({ params }: MspDetailPageProps) {
  const mspId = params.id
  const router = useRouter()
  const { showToast } = useToast()
  const [isImpersonating, setIsImpersonating] = useState(false)

  // Period state for charts and usage metrics
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('7d')

  // Client list state
  const [clientSearch, setClientSearch] = useState('')
  const [debouncedClientSearch, setDebouncedClientSearch] = useState('')
  const [clientStatusFilter, setClientStatusFilter] = useState('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Debounce client search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedClientSearch(clientSearch), 300)
    return () => clearTimeout(timer)
  }, [clientSearch])

  // Click-outside handler for action menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data: msp, isLoading, error } = useAdminMspDetail(mspId, { period })

  // Fetch clients with period for query stats
  const { data: clientsData, isLoading: isLoadingClients } = useAdminMspClients(mspId, {
    q: debouncedClientSearch || undefined,
    status: clientStatusFilter || undefined,
    period,
    limit: 20,
  })

  /**
   * Handle impersonation - immediately starts session without confirmation
   */
  const handleImpersonate = async () => {
    if (isImpersonating) return
    setIsImpersonating(true)
    try {
      const result = await startImpersonation(mspId)
      // Store impersonation token and info
      localStorage.setItem('impersonation_token', result.accessToken)
      localStorage.setItem(
        'impersonation_info',
        JSON.stringify({
          tenantId: result.tenantId,
          tenantName: result.tenantName,
          tenantTier: result.tenantTier,
          startedAt: new Date().toISOString(),
        })
      )
      // Set as active tenant token for dashboard
      localStorage.setItem('token', result.accessToken)
      showToast('success', `Now impersonating ${result.tenantName}`)
      // Redirect to tenant dashboard
      window.location.href = '/dashboard'
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Impersonation failed')
      setIsImpersonating(false)
    }
  }

  /**
   * Handle View Billing - navigate to tenant billing page
   */
  const handleViewBilling = () => {
    router.push(`/mission-control/tenants/${mspId}/billing`)
  }

  /**
   * Handle View Client Details - placeholder for future implementation
   */
  const handleViewClientDetails = (clientId: string) => {
    showToast('info', 'Client detail view coming soon')
    setActiveMenu(null)
  }

  /**
   * Handle impersonating a client
   */
  const handleImpersonateClient = async (client: MspClient) => {
    setActiveMenu(null)
    try {
      const result = await startImpersonation(client.id)
      localStorage.setItem('impersonation_token', result.accessToken)
      localStorage.setItem(
        'impersonation_info',
        JSON.stringify({
          tenantId: result.tenantId,
          tenantName: result.tenantName,
          tenantTier: result.tenantTier,
          startedAt: new Date().toISOString(),
        })
      )
      localStorage.setItem('token', result.accessToken)
      showToast('success', `Now impersonating ${result.tenantName}`)
      window.location.href = '/dashboard'
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Impersonation failed')
    }
  }

  /**
   * Handle Client Billing - navigate to client's billing page
   */
  const handleClientBilling = (clientId: string) => {
    setActiveMenu(null)
    router.push(`/mission-control/tenants/${clientId}/billing`)
  }

  /**
   * Generate mock chart data from usage metrics
   * API returns aggregates, so we create time series with variance
   */
  const generateChartData = () => {
    if (!msp?.usage) return []
    const days = period === '24h' ? 24 : period === '7d' ? 7 : 30
    const avgQueries = Math.round(msp.usage.totalQueries / days)
    const avgBlocked = Math.round(msp.usage.blockedQueries / days)

    return Array.from({ length: days }, (_, i) => {
      const variance = 0.8 + Math.random() * 0.4 // 80-120% variance
      const queries = Math.round(avgQueries * variance)
      const blocked = Math.round(avgBlocked * variance)
      return {
        date:
          period === '24h'
            ? `${i}:00`
            : new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              }),
        queries,
        blocked,
        allowed: queries - blocked,
      }
    })
  }
  const chartData = generateChartData()

  /**
   * Get Badge variant based on client status
   */
  const getClientStatusBadgeVariant = (status: MspClient['status']): 'success' | 'warning' | 'danger' => {
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

  /**
   * Format large numbers for display
   */
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const hasClientFilters = clientSearch || clientStatusFilter

  const clearClientFilters = () => {
    setClientSearch('')
    setClientStatusFilter('')
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back Link */}
        <Link
          href="/mission-control/msps"
          className="inline-flex items-center gap-2 text-space-500 dark:text-space-400 hover:text-space-700 dark:hover:text-space-200 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to MSPs
        </Link>

        <Card
          variant="solid"
          padding="lg"
          className="border-red-200 dark:border-red-800 bg-danger-50 dark:bg-danger-900/20"
        >
          <p className="text-danger-800 dark:text-danger-200">
            Failed to load MSP details. {error.message || 'Please try again.'}
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back Link */}
      <Link
        href="/mission-control/msps"
        className="inline-flex items-center gap-2 text-space-500 dark:text-space-400 hover:text-space-700 dark:hover:text-space-200 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to MSPs
      </Link>

      {/* Breadcrumb */}
      <nav className="text-sm text-space-500 dark:text-space-400">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/mission-control" className="hover:text-space-700 dark:hover:text-space-200">
              Mission Control
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/mission-control/msps" className="hover:text-space-700 dark:hover:text-space-200">
              MSPs
            </Link>
          </li>
          <li>/</li>
          <li className="text-space-900 dark:text-white font-medium">
            {isLoading ? <Skeleton className="h-4 w-32 inline-block" /> : msp?.name || 'MSP Detail'}
          </li>
        </ol>
      </nav>

      {/* Page Header with Actions */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-space-900 dark:text-white">
            {isLoading ? <Skeleton className="h-9 w-64" /> : msp?.name}
          </h1>
          <p className="mt-2 text-space-500 dark:text-space-400">
            {isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              `ID: ${mspId.slice(0, 8)}...${mspId.slice(-4)}`
            )}
          </p>
        </div>

        {/* Action Buttons */}
        {!isLoading && msp && (
          <div className="mt-4 sm:mt-0 flex gap-3">
            <button
              onClick={handleViewBilling}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <CreditCardIcon className="h-5 w-5" />
              View Billing
            </button>
            <button
              onClick={handleImpersonate}
              disabled={isImpersonating}
              className="px-4 py-2 bg-space-100 dark:bg-space-800 text-space-700 dark:text-space-300 rounded-lg hover:bg-space-200 dark:hover:bg-space-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              {isImpersonating ? 'Starting...' : 'Impersonate'}
            </button>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <StatCardsSkeleton />
      ) : msp ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* MSP Name Card */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <BuildingOffice2Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">MSP Name</p>
                <p className="text-lg font-semibold text-space-900 dark:text-white truncate max-w-[180px]">
                  {msp.name}
                </p>
              </div>
            </div>
          </Card>

          {/* Tier Card */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-100 dark:bg-accent-900/30">
                <CheckBadgeIcon className="h-5 w-5 text-accent-600 dark:text-accent-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Tier</p>
                <p className="text-lg font-semibold text-space-900 dark:text-white uppercase">
                  {msp.tier}
                </p>
              </div>
            </div>
          </Card>

          {/* Status Card */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
                <UserGroupIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Status</p>
                <Badge variant={getStatusBadgeVariant(msp.status)} size="sm">
                  {msp.status}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Created Date Card */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30">
                <CalendarIcon className="h-5 w-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Created</p>
                <p className="text-lg font-semibold text-space-900 dark:text-white">
                  {formatDate(msp.createdAt)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Additional Stats Row */}
      {!isLoading && msp && (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Clients Count */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <BuildingOffice2Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Clients</p>
                <p className="text-2xl font-bold text-space-900 dark:text-white">
                  {msp.clientCount.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          {/* Locations Count */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-100 dark:bg-accent-900/30">
                <MapPinIcon className="h-5 w-5 text-accent-600 dark:text-accent-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Locations</p>
                <p className="text-2xl font-bold text-space-900 dark:text-white">
                  {msp.locationCount.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          {/* Users Count */}
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
                <UserGroupIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Users</p>
                <p className="text-2xl font-bold text-space-900 dark:text-white">
                  {msp.userCount.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Two-column layout: Clients (left) and Usage Charts (right) */}
      {!isLoading && msp && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column: Client list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-space-900 dark:text-white">
                Clients ({clientsData?.pagination?.total ?? 0})
              </h2>
            </div>

            {/* Search + filter */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-space-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-space-800 border border-space-200 dark:border-space-700 text-sm text-space-900 dark:text-white placeholder-space-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <select
                value={clientStatusFilter}
                onChange={(e) => setClientStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white dark:bg-space-800 border border-space-200 dark:border-space-700 text-sm text-space-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Results count when filters active */}
            {clientsData && clientsData.data.length > 0 && hasClientFilters && (
              <div className="text-sm text-space-500 dark:text-space-400">
                Showing {clientsData.data.length} of {clientsData.pagination.total} clients
                <button onClick={clearClientFilters} className="ml-2 text-primary-600 dark:text-primary-400 hover:underline">
                  Clear filters
                </button>
              </div>
            )}

            {/* Client table - compact per CONTEXT.md */}
            {isLoadingClients && <SkeletonTable rows={5} cols={5} />}

            {!isLoadingClients && clientsData && clientsData.data.length > 0 && (
              <Card variant="solid" padding="none">
                <div className="overflow-x-auto">
                  <table className="table text-sm">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell">Client Name</th>
                        <th className="table-header-cell">Status</th>
                        <th className="table-header-cell">Locations</th>
                        <th className="table-header-cell">Queries</th>
                        <th className="table-header-cell">Blocked</th>
                        <th className="table-header-cell text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {clientsData.data.map((client) => (
                        <tr key={client.id} className="table-row hover:bg-space-50 dark:hover:bg-space-800/50 transition-colors">
                          <td className="table-cell">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                <BuildingOffice2Icon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                              </div>
                              <div className="ml-3">
                                <div className="font-medium text-space-900 dark:text-white">{client.name}</div>
                                <div className="text-xs text-space-500 dark:text-space-400">
                                  {client.contactEmail || `ID: ${client.id.slice(0, 8)}...`}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="table-cell">
                            <Badge variant={getClientStatusBadgeVariant(client.status)} size="sm">
                              {client.status}
                            </Badge>
                          </td>
                          <td className="table-cell text-space-700 dark:text-space-300">{client.locationCount}</td>
                          <td className="table-cell text-space-700 dark:text-space-300">{formatNumber(client.totalQueries)}</td>
                          <td className="table-cell">
                            <span
                              className={clsx(
                                'font-medium',
                                client.totalQueries > 0
                                  ? ((client.blockedQueries / client.totalQueries) * 100 > 10 ? 'text-danger-600 dark:text-danger-400' : 'text-space-700 dark:text-space-300')
                                  : 'text-space-400'
                              )}
                            >
                              {client.totalQueries > 0
                                ? `${((client.blockedQueries / client.totalQueries) * 100).toFixed(1)}%`
                                : '-'}
                            </span>
                          </td>
                          <td className="table-cell text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="relative" ref={activeMenu === client.id ? menuRef : null}>
                              <button
                                onClick={() => setActiveMenu(activeMenu === client.id ? null : client.id)}
                                className="p-2 rounded-lg hover:bg-space-100 dark:hover:bg-space-700 transition-colors"
                              >
                                <EllipsisVerticalIcon className="h-5 w-5 text-space-500" />
                              </button>
                              {activeMenu === client.id && (
                                <div className="absolute right-0 top-10 z-10 w-48 bg-white dark:bg-space-800 rounded-xl shadow-xl ring-1 ring-space-200 dark:ring-space-700 py-1">
                                  <button
                                    onClick={() => handleViewClientDetails(client.id)}
                                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-space-50 dark:hover:bg-space-700 text-space-700 dark:text-space-300"
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => handleImpersonateClient(client)}
                                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-space-50 dark:hover:bg-space-700 text-space-700 dark:text-space-300"
                                  >
                                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                    Impersonate
                                  </button>
                                  <button
                                    onClick={() => handleClientBilling(client.id)}
                                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-space-50 dark:hover:bg-space-700 text-space-700 dark:text-space-300"
                                  >
                                    <CreditCardIcon className="h-4 w-4" />
                                    Go to Billing
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

            {/* Empty state - No clients */}
            {!isLoadingClients && clientsData && clientsData.data.length === 0 && !hasClientFilters && (
              <Card variant="solid" padding="lg">
                <EmptyState
                  icon={<BuildingOffice2Icon className="h-12 w-12" />}
                  title="No clients"
                  description="This MSP has no clients yet."
                />
              </Card>
            )}

            {/* Empty state - No results with filters */}
            {!isLoadingClients && clientsData && clientsData.data.length === 0 && hasClientFilters && (
              <Card variant="solid" padding="lg">
                <EmptyState
                  icon={<MagnifyingGlassIcon className="h-12 w-12" />}
                  title="No matching clients"
                  description="Try adjusting your search or filters."
                />
              </Card>
            )}
          </div>

          {/* Right column: Usage charts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-space-900 dark:text-white">Usage</h2>
              {/* Period Toggle */}
              <div className="flex gap-1 p-1 bg-space-100 dark:bg-space-800 rounded-lg">
                {(['24h', '7d', '30d'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={clsx(
                      'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                      period === p
                        ? 'bg-white dark:bg-space-700 text-space-900 dark:text-white shadow-sm'
                        : 'text-space-600 dark:text-space-400 hover:text-space-900 dark:hover:text-white'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Query volume chart */}
            <Card variant="glass" padding="md">
              <h3 className="text-sm font-medium text-space-700 dark:text-space-300 mb-4">Query Volume</h3>
              <div className="h-64">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="queryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => formatNumber(value)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: '#9ca3af' }}
                        formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : '0', 'Queries']}
                      />
                      <Area
                        type="monotone"
                        dataKey="queries"
                        stroke="#9333ea"
                        strokeWidth={2}
                        fill="url(#queryGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-space-400">No usage data available</div>
                )}
              </div>
            </Card>

            {/* Blocked vs Allowed chart */}
            <Card variant="glass" padding="md">
              <h3 className="text-sm font-medium text-space-700 dark:text-space-300 mb-4">Blocked vs Allowed</h3>
              <div className="h-64">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} stackOffset="expand">
                      <defs>
                        <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
                        </linearGradient>
                        <linearGradient id="allowedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0.2} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: '#9ca3af' }}
                        formatter={(value, name) => {
                          const num = typeof value === 'number' ? value : 0
                          return [`${(num * 100).toFixed(1)}%`, name === 'blocked' ? 'Blocked' : 'Allowed']
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="blocked"
                        stackId="1"
                        stroke="#ef4444"
                        fill="url(#blockedGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="allowed"
                        stackId="1"
                        stroke="#22c55e"
                        fill="url(#allowedGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-space-400">No usage data available</div>
                )}
              </div>
              {/* Legend */}
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-space-600 dark:text-space-400">Blocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-space-600 dark:text-space-400">Allowed</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
