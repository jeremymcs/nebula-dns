/**
 * Nebula DNS - System Health Page (Mission Control)
 * Monitor DNS infrastructure status and health metrics
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState } from 'react'
import clsx from 'clsx'
import {
  ShieldCheckIcon,
  ServerStackIcon,
  GlobeAltIcon,
  CircleStackIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { Card, Badge, Skeleton } from '@/components/ui'
import {
  useAdminSystemHealth,
  ServiceStatus,
  ServiceHealthStatus,
  StorageStatus,
} from '@/hooks/useAdminApi'

/**
 * Get icon component for a service by name
 */
function getServiceIcon(serviceName: string) {
  switch (serviceName.toLowerCase()) {
    case 'policy-svc':
      return ShieldCheckIcon
    case 'dnsdist':
      return ServerStackIcon
    case 'unbound':
      return GlobeAltIcon
    default:
      return ServerStackIcon
  }
}

/**
 * Get traffic light color classes based on health status
 */
function getStatusColors(status: ServiceHealthStatus) {
  switch (status) {
    case 'healthy':
      return {
        dot: 'bg-success-500',
        badge: 'success' as const,
        bg: 'bg-success-100 dark:bg-success-900/30',
        icon: 'text-success-600 dark:text-success-400',
      }
    case 'degraded':
      return {
        dot: 'bg-warning-500',
        badge: 'warning' as const,
        bg: 'bg-warning-100 dark:bg-warning-900/30',
        icon: 'text-warning-600 dark:text-warning-400',
      }
    case 'unhealthy':
      return {
        dot: 'bg-danger-500',
        badge: 'danger' as const,
        bg: 'bg-danger-100 dark:bg-danger-900/30',
        icon: 'text-danger-600 dark:text-danger-400',
      }
    default:
      return {
        dot: 'bg-space-400',
        badge: 'neutral' as const,
        bg: 'bg-space-100 dark:bg-space-800',
        icon: 'text-space-600 dark:text-space-400',
      }
  }
}

/**
 * Format relative time from ISO string
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)

  if (diffSecs < 5) return 'Just now'
  if (diffSecs < 60) return `${diffSecs}s ago`
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`
  return `${Math.floor(diffSecs / 3600)}h ago`
}

/**
 * Format time for display
 */
function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Service status card component
 */
function ServiceCard({ service }: { service: ServiceStatus }) {
  const Icon = getServiceIcon(service.name)
  const colors = getStatusColors(service.status)

  return (
    <Card variant="glass" padding="md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx('p-2 rounded-lg', colors.bg)}>
            <Icon className={clsx('h-5 w-5', colors.icon)} />
          </div>
          <div>
            <p className="font-medium text-space-900 dark:text-white">{service.name}</p>
            <p className="text-xs text-space-500 dark:text-space-400">
              {formatRelativeTime(service.lastChecked)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx('h-2.5 w-2.5 rounded-full animate-pulse', colors.dot)} />
          <Badge variant={colors.badge} size="sm">
            {service.status}
          </Badge>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-space-200 dark:border-space-700">
        <div className="flex justify-between text-sm">
          <span className="text-space-500 dark:text-space-400">Latency</span>
          <span className="font-medium text-space-900 dark:text-white">
            {service.latencyMs !== undefined ? `${service.latencyMs}ms` : '-'}
          </span>
        </div>
        {service.error && (
          <p className="mt-2 text-xs text-danger-600 dark:text-danger-400 line-clamp-2">
            {service.error}
          </p>
        )}
      </div>
    </Card>
  )
}

/**
 * Storage status card component (Redis/ClickHouse)
 */
function StorageCard({
  name,
  icon: Icon,
  connected,
  latencyMs,
  error,
}: {
  name: string
  icon: typeof CircleStackIcon
  connected: boolean
  latencyMs?: number
  error?: string
}) {
  const status: ServiceHealthStatus = connected ? 'healthy' : 'unhealthy'
  const colors = getStatusColors(status)

  return (
    <Card variant="glass" padding="md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx('p-2 rounded-lg', colors.bg)}>
            <Icon className={clsx('h-5 w-5', colors.icon)} />
          </div>
          <div>
            <p className="font-medium text-space-900 dark:text-white">{name}</p>
            <p className="text-xs text-space-500 dark:text-space-400">Storage</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx('h-2.5 w-2.5 rounded-full animate-pulse', colors.dot)} />
          <Badge variant={colors.badge} size="sm">
            {connected ? 'healthy' : 'unhealthy'}
          </Badge>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-space-200 dark:border-space-700">
        <div className="flex justify-between text-sm">
          <span className="text-space-500 dark:text-space-400">Latency</span>
          <span className="font-medium text-space-900 dark:text-white">
            {latencyMs !== undefined ? `${latencyMs}ms` : '-'}
          </span>
        </div>
        {error && (
          <p className="mt-2 text-xs text-danger-600 dark:text-danger-400 line-clamp-2">{error}</p>
        )}
      </div>
    </Card>
  )
}

/**
 * Loading skeleton for service cards
 */
function ServiceCardSkeleton() {
  return (
    <Card variant="glass" padding="md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div>
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-space-200 dark:border-space-700">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
    </Card>
  )
}

/**
 * System Health page component
 */
export default function SystemHealthPage() {
  const [isPaused, setIsPaused] = useState(false)
  const { data, isLoading, error, mutate } = useAdminSystemHealth({
    period: '24h',
    isPaused,
  })

  /**
   * Handle manual refresh
   */
  const handleRefresh = () => {
    mutate()
  }

  /**
   * Toggle auto-refresh pause
   */
  const togglePause = () => {
    setIsPaused(!isPaused)
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-space-900 dark:text-white">System Health</h1>
            <p className="mt-2 text-space-500 dark:text-space-400">
              Monitor DNS infrastructure status
            </p>
          </div>
        </div>
        <Card
          variant="solid"
          padding="lg"
          className="border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/20"
        >
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-danger-600 dark:text-danger-400 flex-shrink-0" />
            <div>
              <p className="text-danger-800 dark:text-danger-200 font-medium">
                Failed to load system health data
              </p>
              <p className="text-sm text-danger-600 dark:text-danger-400 mt-1">
                {error.message || 'Please try again.'}
              </p>
              <button
                onClick={handleRefresh}
                className="mt-3 px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-space-900 dark:text-white">System Health</h1>
            {data && (
              <Badge
                variant={getStatusColors(data.overallStatus).badge}
                size="md"
              >
                {data.overallStatus}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-space-500 dark:text-space-400">
            Monitor DNS infrastructure status and performance
          </p>
        </div>

        {/* Actions */}
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          {/* Last updated */}
          {data && (
            <span className="text-sm text-space-500 dark:text-space-400">
              Last updated: {formatTime(data.timestamp)}
            </span>
          )}

          {/* Pause/Resume toggle */}
          <button
            onClick={togglePause}
            className={clsx(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isPaused
                ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300'
                : 'bg-space-100 dark:bg-space-800 text-space-700 dark:text-space-300 hover:bg-space-200 dark:hover:bg-space-700'
            )}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>

          {/* Manual refresh */}
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-space-100 dark:bg-space-800 text-space-700 dark:text-space-300 hover:bg-space-200 dark:hover:bg-space-700 transition-colors"
            title="Refresh now"
          >
            <ArrowPathIcon className={clsx('h-5 w-5', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Service Status Cards Grid */}
      <div>
        <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
          Service Status
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <ServiceCardSkeleton key={i} />
              ))}
            </>
          ) : data ? (
            <>
              {/* DNS Services from services array */}
              {data.services.map((service) => (
                <ServiceCard key={service.name} service={service} />
              ))}

              {/* Redis from storage */}
              <StorageCard
                name="Redis"
                icon={CircleStackIcon}
                connected={data.storage.redis.connected}
                latencyMs={data.storage.redis.latencyMs}
                error={data.storage.redis.error}
              />

              {/* ClickHouse from storage */}
              <StorageCard
                name="ClickHouse"
                icon={ChartBarIcon}
                connected={data.storage.clickhouse.connected}
                latencyMs={data.storage.clickhouse.latencyMs}
                error={data.storage.clickhouse.error}
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Quick Stats Row */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Queries */}
          <Card variant="glass" padding="md">
            <p className="text-sm text-space-500 dark:text-space-400">Total Queries (24h)</p>
            <p className="text-2xl font-bold text-space-900 dark:text-white mt-1">
              {data.queryVolume.totalQueries.toLocaleString()}
            </p>
          </Card>

          {/* Blocked Queries */}
          <Card variant="glass" padding="md">
            <p className="text-sm text-space-500 dark:text-space-400">Blocked (24h)</p>
            <p className="text-2xl font-bold text-danger-600 dark:text-danger-400 mt-1">
              {data.queryVolume.blockedQueries.toLocaleString()}
            </p>
          </Card>

          {/* Error Rate (24h) */}
          <Card variant="glass" padding="md">
            <p className="text-sm text-space-500 dark:text-space-400">Error Rate (24h)</p>
            <p
              className={clsx(
                'text-2xl font-bold mt-1',
                data.errorRates.last24Hours.errorRate > 1
                  ? 'text-danger-600 dark:text-danger-400'
                  : data.errorRates.last24Hours.errorRate > 0.1
                  ? 'text-warning-600 dark:text-warning-400'
                  : 'text-success-600 dark:text-success-400'
              )}
            >
              {data.errorRates.last24Hours.errorRate.toFixed(2)}%
            </p>
          </Card>

          {/* Error Rate (1h) */}
          <Card variant="glass" padding="md">
            <p className="text-sm text-space-500 dark:text-space-400">Error Rate (1h)</p>
            <p
              className={clsx(
                'text-2xl font-bold mt-1',
                data.errorRates.lastHour.errorRate > 1
                  ? 'text-danger-600 dark:text-danger-400'
                  : data.errorRates.lastHour.errorRate > 0.1
                  ? 'text-warning-600 dark:text-warning-400'
                  : 'text-success-600 dark:text-success-400'
              )}
            >
              {data.errorRates.lastHour.errorRate.toFixed(2)}%
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}
