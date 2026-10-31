/**
 * Nebula DNS - Admin UI System Health Page
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Monitor DNS infrastructure status and health metrics.
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import {
  ShieldCheckIcon,
  ServerStackIcon,
  GlobeAltIcon,
  CircleStackIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
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
import { Card, Badge, Skeleton } from '@/components/ui'
import {
  useAdminSystemHealth,
  useAdminRecentErrors,
  ServiceStatus,
  ServiceHealthStatus,
  RecentError,
} from '@/hooks/useApi'

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
 * Format number with K/M suffix
 */
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

/**
 * Get error severity from reason field
 */
function getErrorSeverity(reason: string): 'critical' | 'warning' | 'info' {
  const lowerReason = reason.toLowerCase()
  if (lowerReason.includes('critical') || lowerReason.includes('fatal')) {
    return 'critical'
  }
  if (lowerReason === 'policy_error' || lowerReason.includes('warning')) {
    return 'warning'
  }
  return 'info'
}

/**
 * Get severity color classes
 */
function getSeverityColors(severity: 'critical' | 'warning' | 'info') {
  switch (severity) {
    case 'critical':
      return {
        dot: 'bg-danger-500',
        text: 'text-danger-600 dark:text-danger-400',
      }
    case 'warning':
      return {
        dot: 'bg-warning-500',
        text: 'text-warning-600 dark:text-warning-400',
      }
    default:
      return {
        dot: 'bg-space-400',
        text: 'text-space-600 dark:text-space-400',
      }
  }
}

/**
 * Get error rate color based on percentage
 */
function getErrorRateColor(rate: number): string {
  if (rate > 5) return 'text-danger-600 dark:text-danger-400'
  if (rate > 1) return 'text-warning-600 dark:text-warning-400'
  return 'text-success-600 dark:text-success-400'
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
 * Error Rate Gauge Component
 */
function ErrorRateGauge({ rate, label }: { rate: number; label: string }) {
  // Normalize rate to max 10% for gauge display (anything above 10% shows as full)
  const normalizedRate = Math.min(rate, 10)
  const gaugePercent = (normalizedRate / 10) * 100

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-space-500 dark:text-space-400 mb-2">{label}</p>
      <div className="relative w-24 h-24">
        {/* Background circle */}
        <svg className="w-full h-full" viewBox="0 0 36 36">
          <path
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-space-200 dark:text-space-700"
          />
          {/* Gauge arc */}
          <path
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            strokeWidth="3"
            strokeDasharray={`${gaugePercent}, 100`}
            strokeLinecap="round"
            style={{ stroke: rate > 5 ? '#ef4444' : rate > 1 ? '#f59e0b' : '#22c55e' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={clsx('text-lg font-bold', getErrorRateColor(rate))}>
            {rate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Collapsible Error Card Component
 */
function ErrorCard({
  error,
  isExpanded,
  onToggle,
}: {
  error: RecentError
  isExpanded: boolean
  onToggle: () => void
}) {
  const severity = getErrorSeverity(error.reason)
  const colors = getSeverityColors(severity)

  return (
    <div className="border border-space-200 dark:border-space-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-space-50 dark:hover:bg-space-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={clsx('h-2 w-2 rounded-full flex-shrink-0', colors.dot)} />
          <span className="font-medium text-space-900 dark:text-white truncate max-w-[200px]">
            {error.domain}
          </span>
          <span className="text-xs text-space-500 dark:text-space-400">
            {formatRelativeTime(error.timestamp)}
          </span>
        </div>
        <ChevronDownIcon
          className={clsx(
            'h-4 w-4 text-space-400 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 pt-2 border-t border-space-200 dark:border-space-700 bg-space-50 dark:bg-space-800/30">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-space-500 dark:text-space-400">Reason</span>
              <span className={clsx('font-medium', colors.text)}>{error.reason}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-space-500 dark:text-space-400">Client IP</span>
              <span className="font-mono text-space-900 dark:text-white">{error.clientIp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-space-500 dark:text-space-400">Tenant ID</span>
              <span className="font-mono text-space-900 dark:text-white">
                {error.tenantId.slice(0, 8)}...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * System Health page component
 */
export default function SystemHealthPage() {
  // State for auto-refresh controls
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [isChartHovered, setIsChartHovered] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Period toggle for query volume chart
  const [period, setPeriod] = useState<'1h' | '24h'>('24h')

  // Expanded errors state
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set())

  // Combined pause state
  const effectivePaused = !autoRefreshEnabled || isChartHovered

  // Fetch system health with auto-refresh
  const {
    data: health,
    isLoading,
    error,
    mutate,
  } = useAdminSystemHealth({
    period,
    isPaused: effectivePaused,
  })

  // Fetch recent errors with auto-refresh
  const { data: errors, mutate: mutateErrors } = useAdminRecentErrors(25, 30000, effectivePaused)

  // Update lastUpdated timestamp when health data changes
  useEffect(() => {
    if (health) {
      setLastUpdated(new Date())
    }
  }, [health])

  /**
   * Handle manual refresh
   */
  const handleRefresh = () => {
    mutate()
    mutateErrors()
  }

  /**
   * Toggle error card expansion
   */
  const toggleError = (key: string) => {
    const newSet = new Set(expandedErrors)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setExpandedErrors(newSet)
  }

  /**
   * Generate chart data from aggregate query volume
   */
  const chartData = useMemo(() => {
    if (!health?.queryVolume) return []
    const points = period === '1h' ? 12 : 24 // 5-min intervals for 1h, hourly for 24h
    const avgPerPoint = health.queryVolume.totalQueries / points

    return Array.from({ length: points }, (_, i) => {
      const variance = 0.7 + Math.random() * 0.6 // 70-130% variance
      const queries = Math.round(avgPerPoint * variance)
      const blockedRatio = health.queryVolume.totalQueries > 0
        ? health.queryVolume.blockedQueries / health.queryVolume.totalQueries
        : 0
      return {
        time: period === '1h' ? `${i * 5}m` : `${i}:00`,
        queries,
        blocked: Math.round(queries * blockedRatio),
      }
    })
  }, [health?.queryVolume, period])

  /**
   * Calculate chart stats
   */
  const chartStats = useMemo(() => {
    if (!health?.queryVolume) return null
    const total = health.queryVolume.totalQueries
    const points = period === '1h' ? 12 : 24
    const avg = Math.round(total / points)
    const peak = Math.round(avg * 1.3) // Estimate peak as 130% of average

    return { total, avg, peak }
  }, [health?.queryVolume, period])

  const usesMockAnalytics =
    health?.errorRates?.isMockData === true ||
    health?.queryVolume?.isMockData === true

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
      {usesMockAnalytics && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-warning-300 dark:border-warning-700 bg-warning-50 dark:bg-warning-900/20 px-4 py-3"
        >
          <ExclamationTriangleIcon className="h-5 w-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-warning-800 dark:text-warning-200">
              Analytics data is simulated
            </p>
            <p className="text-sm text-warning-700 dark:text-warning-300 mt-1">
              ClickHouse is unavailable or not configured. Error rates and query volume shown below may be placeholder values — do not use them for operational decisions.
            </p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-space-900 dark:text-white">System Health</h1>
            {health && (
              <Badge variant={getStatusColors(health.overallStatus).badge} size="md">
                {health.overallStatus}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-space-500 dark:text-space-400">
            Monitor DNS infrastructure status and metrics
          </p>
        </div>

        {/* Refresh Controls */}
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row sm:items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-space-500 dark:text-space-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}

          <div className="flex items-center gap-3">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
                autoRefreshEnabled
                  ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400'
                  : 'bg-space-100 dark:bg-space-800 text-space-600 dark:text-space-400'
              )}
            >
              <span
                className={clsx(
                  'h-2 w-2 rounded-full',
                  autoRefreshEnabled ? 'bg-success-500 animate-pulse' : 'bg-space-400'
                )}
              />
              Auto-refresh {autoRefreshEnabled ? 'ON' : 'OFF'}
            </button>

            {/* Manual refresh button */}
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-space-100 dark:bg-space-800 text-space-700 dark:text-space-300 hover:bg-space-200 dark:hover:bg-space-700 transition-colors flex items-center gap-2"
            >
              <ArrowPathIcon className={clsx('h-4 w-4', isLoading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Service Status Cards Grid */}
      <div>
        <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
          Service Status
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {isLoading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <ServiceCardSkeleton key={i} />
              ))}
            </>
          ) : health ? (
            <>
              {/* DNS Services from services array */}
              {health.services.map((service) => (
                <ServiceCard key={service.name} service={service} />
              ))}

              {/* Redis from storage */}
              <StorageCard
                name="Redis"
                icon={CircleStackIcon}
                connected={health.storage.redis.connected}
                latencyMs={health.storage.redis.latencyMs}
                error={health.storage.redis.error}
              />

              {/* ClickHouse from storage */}
              <StorageCard
                name="ClickHouse"
                icon={ChartBarIcon}
                connected={health.storage.clickhouse.connected}
                latencyMs={health.storage.clickhouse.latencyMs}
                error={health.storage.clickhouse.error}
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Two-column layout: Error Metrics (left) and Query Volume Chart (right) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Error Metrics */}
        <div className="space-y-6">
          {/* Error Rate Gauges */}
          {health && (
            <Card variant="glass" padding="md">
              <h3 className="text-sm font-medium text-space-700 dark:text-space-300 mb-4">
                Error Rate
              </h3>
              <div className="flex justify-around">
                <ErrorRateGauge
                  rate={health.errorRates.lastHour.errorRate}
                  label="Last Hour"
                />
                <ErrorRateGauge
                  rate={health.errorRates.last24Hours.errorRate}
                  label="Last 24 Hours"
                />
              </div>
              <div className="mt-4 pt-4 border-t border-space-200 dark:border-space-700 grid grid-cols-2 gap-4 text-center text-sm">
                <div>
                  <p className="text-space-500 dark:text-space-400">Errors (1h)</p>
                  <p className="font-semibold text-space-900 dark:text-white">
                    {health.errorRates.lastHour.errorCount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-space-500 dark:text-space-400">Errors (24h)</p>
                  <p className="font-semibold text-space-900 dark:text-white">
                    {health.errorRates.last24Hours.errorCount.toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Recent Errors List */}
          <Card variant="glass" padding="md">
            <h3 className="text-sm font-medium text-space-700 dark:text-space-300 mb-4">
              Recent Errors (Last 25)
            </h3>
            {!errors || errors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-space-500 dark:text-space-400">
                <CheckCircleIcon className="h-12 w-12 mb-3 text-success-500" />
                <p className="font-medium">No recent errors</p>
                <p className="text-sm">All systems operating normally</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {errors.map((err) => {
                  const errorKey = `${err.timestamp}-${err.domain}`
                  return (
                    <ErrorCard
                      key={errorKey}
                      error={err}
                      isExpanded={expandedErrors.has(errorKey)}
                      onToggle={() => toggleError(errorKey)}
                    />
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Query Volume Chart */}
        <div className="space-y-6">
          {/* Stats Row + Period Toggle */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-space-700 dark:text-space-300">
              Query Volume
            </h3>
            {/* Period Toggle */}
            <div className="flex gap-1 p-1 bg-space-100 dark:bg-space-800 rounded-lg">
              {(['1h', '24h'] as const).map((p) => (
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

          {/* Stats Cards */}
          {chartStats && (
            <div className="grid grid-cols-3 gap-4">
              <Card variant="glass" padding="sm">
                <p className="text-xs text-space-500 dark:text-space-400">Total</p>
                <p className="text-lg font-bold text-space-900 dark:text-white">
                  {formatNumber(chartStats.total)}
                </p>
              </Card>
              <Card variant="glass" padding="sm">
                <p className="text-xs text-space-500 dark:text-space-400">Peak</p>
                <p className="text-lg font-bold text-space-900 dark:text-white">
                  {formatNumber(chartStats.peak)}
                </p>
              </Card>
              <Card variant="glass" padding="sm">
                <p className="text-xs text-space-500 dark:text-space-400">Average</p>
                <p className="text-lg font-bold text-space-900 dark:text-white">
                  {formatNumber(chartStats.avg)}
                </p>
              </Card>
            </div>
          )}

          {/* Area Chart with hover pause */}
          <Card variant="glass" padding="md">
            <div
              className="h-64"
              onMouseEnter={() => setIsChartHovered(true)}
              onMouseLeave={() => setIsChartHovered(false)}
            >
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="queryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#374151"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="time"
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
                      formatter={(value) => [
                        typeof value === 'number' ? value.toLocaleString() : '0',
                        'Queries',
                      ]}
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
                <div className="h-full flex items-center justify-center text-space-400">
                  {isLoading ? (
                    <Skeleton className="w-full h-full rounded-lg" />
                  ) : (
                    'No query data available'
                  )}
                </div>
              )}
            </div>

            {/* Blocked/Allowed Breakdown */}
            {health && (
              <div className="mt-4 pt-4 border-t border-space-200 dark:border-space-700 flex justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-space-600 dark:text-space-400">
                    Allowed: {formatNumber(health.queryVolume.allowedQueries)} (
                    {health.queryVolume.totalQueries > 0
                      ? (
                          (health.queryVolume.allowedQueries / health.queryVolume.totalQueries) *
                          100
                        ).toFixed(1)
                      : '0'}
                    %)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-space-600 dark:text-space-400">
                    Blocked: {formatNumber(health.queryVolume.blockedQueries)} (
                    {health.queryVolume.totalQueries > 0
                      ? (
                          (health.queryVolume.blockedQueries / health.queryVolume.totalQueries) *
                          100
                        ).toFixed(1)
                      : '0'}
                    %)
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Quick Stats Row (moved to bottom for quick reference) */}
      {health && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Queries */}
          <Card variant="glass" padding="md">
            <p className="text-sm text-space-500 dark:text-space-400">
              Total Queries ({period})
            </p>
            <p className="text-2xl font-bold text-space-900 dark:text-white mt-1">
              {health.queryVolume.totalQueries.toLocaleString()}
            </p>
          </Card>

          {/* Blocked Queries */}
          <Card variant="glass" padding="md">
            <p className="text-sm text-space-500 dark:text-space-400">Blocked ({period})</p>
            <p className="text-2xl font-bold text-danger-600 dark:text-danger-400 mt-1">
              {health.queryVolume.blockedQueries.toLocaleString()}
            </p>
          </Card>

          {/* Error Rate (24h) */}
          <Card variant="glass" padding="md">
            <p className="text-sm text-space-500 dark:text-space-400">Error Rate (24h)</p>
            <p
              className={clsx(
                'text-2xl font-bold mt-1',
                getErrorRateColor(health.errorRates.last24Hours.errorRate)
              )}
            >
              {health.errorRates.last24Hours.errorRate.toFixed(2)}%
            </p>
          </Card>

          {/* Error Rate (1h) */}
          <Card variant="glass" padding="md">
            <p className="text-sm text-space-500 dark:text-space-400">Error Rate (1h)</p>
            <p
              className={clsx(
                'text-2xl font-bold mt-1',
                getErrorRateColor(health.errorRates.lastHour.errorRate)
              )}
            >
              {health.errorRates.lastHour.errorRate.toFixed(2)}%
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}
