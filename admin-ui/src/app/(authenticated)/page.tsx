/**
 * Nebula DNS - Admin UI Dashboard Page
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Admin overview dashboard for managing MSPs, tenants, and system health.
 */

'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  BuildingOffice2Icon,
  UsersIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import {
  useAdminDashboardStats,
  useAdminSystemHealth,
  useAdminActivity,
  ServiceHealthStatus,
} from '@/hooks/useApi'
import type { AdminActivityItem, AdminActivityAction } from '@/types/admin-users'

function formatCount(value: number | undefined, loading: boolean): string {
  if (loading || value === undefined) return '—'
  return value.toLocaleString()
}

function formatRevenue(cents: number | null | undefined, billingEnabled: boolean, loading: boolean): string {
  if (loading) return '—'
  if (!billingEnabled) return 'Billing off'
  if (cents == null) return '—'
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function overallHealthLabel(status: ServiceHealthStatus | undefined, loading: boolean): string {
  if (loading || !status) return '—'
  switch (status) {
    case 'healthy':
      return 'Healthy'
    case 'degraded':
      return 'Degraded'
    case 'unhealthy':
      return 'Unhealthy'
    default:
      return '—'
  }
}

function overallHealthSubtitle(status: ServiceHealthStatus | undefined, loading: boolean): string {
  if (loading || !status) return 'Loading status…'
  switch (status) {
    case 'healthy':
      return 'All services operational'
    case 'degraded':
      return 'Some services degraded'
    case 'unhealthy':
      return 'Attention required'
    default:
      return ''
  }
}

function mapServiceStatus(status: ServiceHealthStatus): 'healthy' | 'degraded' | 'down' {
  if (status === 'unhealthy') return 'down'
  if (status === 'degraded') return 'degraded'
  return 'healthy'
}

function getActivityIcon(action: AdminActivityAction) {
  switch (action) {
    case 'admin_login':
    case 'admin_created':
    case 'admin_reactivated':
      return CheckCircleIcon
    case 'admin_login_failed':
    case 'admin_suspended':
      return ExclamationTriangleIcon
    default:
      return ClockIcon
  }
}

function getActivityColor(action: AdminActivityAction): string {
  switch (action) {
    case 'admin_login_failed':
    case 'admin_suspended':
      return 'text-warning-500'
    case 'admin_deleted':
    case 'invite_revoked':
      return 'text-danger-500'
    case 'admin_login':
      return 'text-success-500'
    default:
      return 'text-primary-500'
  }
}

function describeActivity(item: AdminActivityItem): string {
  const actor = item.adminName || item.adminEmail || 'An admin'
  switch (item.action) {
    case 'admin_login':
      return `${actor} signed in`
    case 'admin_logout':
      return `${actor} signed out`
    case 'admin_login_failed':
      return `${actor} failed to sign in`
    case 'admin_invited':
      return `${actor} invited ${item.targetAdminEmail ?? 'a new admin'}`
    case 'admin_suspended':
      return `${actor} suspended ${item.targetAdminEmail ?? 'an admin'}`
    case 'admin_reactivated':
      return `${actor} reactivated ${item.targetAdminEmail ?? 'an admin'}`
    case 'admin_mfa_reset':
      return `${actor} reset MFA for ${item.targetAdminEmail ?? 'an admin'}`
    case 'invite_revoked':
      return `${actor} revoked an invitation`
    default:
      return `${actor} performed ${item.action.replace(/_/g, ' ')}`
  }
}

// Quick stat card component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  color = 'primary',
  loading = false,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color?: 'primary' | 'success' | 'warning' | 'danger'
  loading?: boolean
}) {
  const colorStyles = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400',
    warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400',
    danger: 'bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400',
  }

  return (
    <Link
      href={href}
      className="block card p-8 transition-all hover:shadow-md group"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-mut uppercase tracking-widest">{title}</p>
          <p
            className={`text-3xl font-semibold text-ink tracking-tight ${loading ? 'animate-pulse' : ''}`}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-sm font-medium text-mut">{subtitle}</p>
          )}
        </div>
        <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 duration-300 ${colorStyles[color]}`}>
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </Link>
  )
}

// Quick action card
function ActionCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-6 card p-6 transition-all hover:shadow-md group"
    >
      <div className="p-4 rounded-xl bg-space-100 dark:bg-space-800 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
        <Icon className="h-6 w-6 text-space-600 dark:text-space-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
      </div>
      <div>
        <p className="font-semibold text-ink group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{title}</p>
        <p className="text-sm font-medium text-mut">{description}</p>
      </div>
    </Link>
  )
}

// System status indicator
function StatusIndicator({ status, label }: { status: 'healthy' | 'degraded' | 'down'; label: string }) {
  const styles = {
    healthy: { bg: 'bg-success-500', text: 'text-success-600 dark:text-success-400', label: 'Healthy' },
    degraded: { bg: 'bg-warning-500', text: 'text-warning-600 dark:text-warning-400', label: 'Degraded' },
    down: { bg: 'bg-danger-500', text: 'text-danger-600 dark:text-danger-400', label: 'Down' },
  }

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-space-600 dark:text-space-300">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${styles[status].bg}`} />
        <span className={`text-sm font-medium ${styles[status].text}`}>{styles[status].label}</span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { admin } = useAuth()
  const { data: stats, isLoading: statsLoading, error: statsError } = useAdminDashboardStats()
  const { data: health, isLoading: healthLoading } = useAdminSystemHealth({ period: '24h', refreshInterval: 60000 })
  const { data: activityData, isLoading: activityLoading } = useAdminActivity({ limit: 5 })

  const loading = statsLoading && !stats

  const mspSubtitle =
    stats && stats.mspPendingCount.available
      ? stats.mspPendingCount.value === 0
        ? 'No pending MSPs'
        : `${stats.mspPendingCount.value} pending`
      : statsError
        ? 'Unable to load MSP stats'
        : '—'

  const tenantSubtitle =
    stats && stats.activeTenants7d.available
      ? stats.activeTenants7d.value === 0
        ? '0 active this week'
        : `${formatCount(stats.activeTenants7d.value, false)} active this week`
      : stats?.activeTenants7d.available === false
        ? 'Activity data unavailable'
        : '—'

  const healthStatus = health?.overallStatus
  const healthCardColor =
    healthStatus === 'unhealthy' ? 'danger' : healthStatus === 'degraded' ? 'warning' : 'success'

  const policySvc = health?.services.find((s) => s.name === 'policy-svc')
  const dnsdist = health?.services.find((s) => s.name === 'dnsdist')
  const unbound = health?.services.find((s) => s.name === 'unbound')

  const dnsWorst: ServiceHealthStatus =
    [dnsdist?.status, unbound?.status].includes('unhealthy')
      ? 'unhealthy'
      : [dnsdist?.status, unbound?.status].includes('degraded')
        ? 'degraded'
        : 'healthy'

  const activities = activityData?.data ?? []

  return (
    <div className="p-6 lg:p-8 space-y-10 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-space-900 dark:text-white">
          Welcome back, {admin?.name || 'Admin'}
        </h1>
        <p className="text-lg text-space-500 dark:text-space-400">
          Mission Control <span className="mx-2 text-space-300 dark:text-space-700">•</span> Admin overview and system health
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard
          title="Total MSPs"
          value={formatCount(stats?.mspCount.value, loading)}
          subtitle={mspSubtitle}
          icon={BuildingOffice2Icon}
          href="/msps"
          color="primary"
          loading={loading}
        />
        <StatCard
          title="Total Tenants"
          value={formatCount(stats?.tenantCount.total.value, loading)}
          subtitle={tenantSubtitle}
          icon={UsersIcon}
          href="/tenants"
          color="success"
          loading={loading}
        />
        <StatCard
          title="System Health"
          value={overallHealthLabel(healthStatus, healthLoading && !health)}
          subtitle={overallHealthSubtitle(healthStatus, healthLoading && !health)}
          icon={HeartIcon}
          href="/health"
          color={healthCardColor}
          loading={healthLoading && !health}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatRevenue(
            stats?.monthlyRevenueCents.value,
            stats?.billingEnabled ?? false,
            loading,
          )}
          subtitle={
            stats && !stats.billingEnabled
              ? 'Stripe billing disabled'
              : stats?.monthlyRevenueCents.available === false
                ? 'Revenue unavailable'
                : undefined
          }
          icon={CurrencyDollarIcon}
          href="/tenants"
          color="warning"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-space-900 dark:text-white">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionCard
              title="Manage MSPs"
              description="View and manage MSP accounts"
              href="/msps"
              icon={BuildingOffice2Icon}
            />
            <ActionCard
              title="Onboard New MSP"
              description="Create a new MSP organization"
              href="/msps/new"
              icon={BuildingOffice2Icon}
            />
            <ActionCard
              title="View Tenants"
              description="Search and manage tenants"
              href="/tenants"
              icon={UsersIcon}
            />
            <ActionCard
              title="System Health"
              description="Monitor service status"
              href="/health"
              icon={HeartIcon}
            />
          </div>
        </div>

        {/* System Status Panel */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-space-900 dark:text-white">System Status</h2>
          <div className="card p-6">
            {healthLoading && !health ? (
              <p className="text-sm text-space-500 animate-pulse">Loading service status…</p>
            ) : (
              <div className="divide-y divide-space-100 dark:divide-space-800">
                <StatusIndicator
                  status={mapServiceStatus(policySvc?.status ?? 'degraded')}
                  label="API Services"
                />
                <StatusIndicator
                  status={mapServiceStatus(dnsWorst)}
                  label="DNS Resolution"
                />
                <StatusIndicator
                  status={health?.storage.redis.connected ? 'healthy' : 'down'}
                  label="Database"
                />
                <StatusIndicator
                  status={health?.storage.redis.connected ? 'healthy' : 'down'}
                  label="Redis Cache"
                />
                <StatusIndicator
                  status={health?.storage.clickhouse.connected ? 'healthy' : 'degraded'}
                  label="ClickHouse Analytics"
                />
              </div>
            )}
            <Link
              href="/health"
              className="block mt-6 text-center text-sm font-bold text-primary-600 dark:text-primary-400 hover:text-primary-500 uppercase tracking-wider"
            >
              View detailed health →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-space-900 dark:text-white">Recent Activity</h2>
        <div className="card overflow-hidden">
          {activityLoading && !activityData ? (
            <div className="px-6 py-8 text-sm text-space-500 animate-pulse">Loading activity…</div>
          ) : activities.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <ClockIcon className="mx-auto h-10 w-10 text-space-300 dark:text-space-600 mb-3" />
              <p className="font-medium text-space-700 dark:text-space-300">No recent admin activity</p>
              <p className="text-sm text-space-500 dark:text-space-400 mt-1">
                Logins and management actions will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-space-100 dark:divide-space-800">
              {activities.map((item) => {
                const Icon = getActivityIcon(item.action)
                const color = getActivityColor(item.action)
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-6 px-6 py-4 hover:bg-space-50 dark:hover:bg-space-800/50 transition-colors"
                  >
                    <div
                      className={`p-2 rounded-lg bg-space-100 dark:bg-space-800 ${color.replace('text', 'bg').replace('500', '500/10')}`}
                    >
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <span className="flex-1 font-medium text-space-700 dark:text-space-300">
                      {describeActivity(item)}
                    </span>
                    <span className="text-sm font-bold text-space-400 dark:text-space-500 uppercase tracking-tight">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
