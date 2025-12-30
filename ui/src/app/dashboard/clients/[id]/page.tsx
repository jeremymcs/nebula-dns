/**
 * Nebula DNS - Client Overview Page
 * Dashboard overview for a specific client
 */

'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useClientStats, useMspClient } from '@/hooks/useApi'
import {
  GlobeAltIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MapPinIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'

export default function ClientOverviewPage() {
  const params = useParams()
  const clientId = params.id as string
  const { data: client } = useMspClient(clientId)
  const { data: stats, isLoading } = useClientStats(clientId)

  const statCards = [
    {
      label: 'Total Queries',
      value: stats?.totalQueries?.toLocaleString() || '0',
      icon: GlobeAltIcon,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Threats Blocked',
      value: stats?.threatsBlocked?.toLocaleString() || '0',
      icon: ShieldCheckIcon,
      color: 'from-red-500 to-orange-500',
      bgColor: 'bg-danger-50 dark:bg-danger-900/20',
    },
    {
      label: 'Active Zones',
      value: stats?.activeZones?.toString() || '0',
      icon: MapPinIcon,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'Active Users',
      value: stats?.activeUsers?.toString() || '0',
      icon: UserGroupIcon,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ]

  const quickActions = [
    { label: 'Manage Zones', href: `/dashboard/clients/${clientId}/zones`, icon: MapPinIcon },
    { label: 'Edit Policies', href: `/dashboard/clients/${clientId}/policies`, icon: ShieldCheckIcon },
    { label: 'View Users', href: `/dashboard/clients/${clientId}/users`, icon: UserGroupIcon },
    { label: 'View Insights', href: `/dashboard/clients/${clientId}/insights`, icon: ChartBarIcon },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-space-800 rounded-2xl p-5 ring-1 ring-space-200 dark:ring-space-700"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} style={{ stroke: 'url(#gradient)' }} />
                </div>
                <div>
                  <p className="text-sm text-space-500 dark:text-space-400">{stat.label}</p>
                  {isLoading ? (
                    <div className="h-7 w-16 bg-space-200 dark:bg-space-700 rounded animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-space-900 dark:text-white">{stat.value}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-space-800 rounded-2xl p-6 ring-1 ring-space-200 dark:ring-space-700">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 p-4 bg-space-50 dark:bg-space-700/50 rounded-xl hover:bg-space-100 dark:hover:bg-space-700 transition-colors"
                >
                  <Icon className="h-5 w-5 text-primary-500" />
                  <span className="font-medium text-space-900 dark:text-white">{action.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Protection Status */}
        <div className="bg-white dark:bg-space-800 rounded-2xl p-6 ring-1 ring-space-200 dark:ring-space-700">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Protection Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-success-50 dark:bg-success-900/20 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-6 w-6 text-success-500" />
                <span className="font-medium text-success-700 dark:text-success-300">DNS Filtering Active</span>
              </div>
              <span className="text-sm text-success-600 dark:text-success-400">{stats?.activePolicies || 0} policies</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-space-50 dark:bg-space-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <ArrowTrendingUpIcon className="h-6 w-6 text-primary-500" />
                <span className="font-medium text-space-700 dark:text-space-300">Query Volume</span>
              </div>
              <span className="text-sm text-space-500">{stats?.totalQueries?.toLocaleString() || 0} today</span>
            </div>
            {(stats?.threatsBlocked || 0) > 0 && (
              <div className="flex items-center justify-between p-4 bg-warning-50 dark:bg-warning-900/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-warning-500" />
                  <span className="font-medium text-warning-700 dark:text-warning-300">Threats Detected</span>
                </div>
                <span className="text-sm text-warning-600 dark:text-warning-400">{stats?.threatsBlocked} blocked</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Client Details */}
      <div className="bg-white dark:bg-space-800 rounded-2xl p-6 ring-1 ring-space-200 dark:ring-space-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white">Client Details</h3>
          <Link
            href={`/dashboard/clients/${clientId}/edit`}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Edit
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {client?.contactEmail && (
            <div>
              <p className="text-sm text-space-500 dark:text-space-400">Contact Email</p>
              <p className="font-medium text-space-900 dark:text-white">{client.contactEmail}</p>
            </div>
          )}
          {client?.contactPhone && (
            <div>
              <p className="text-sm text-space-500 dark:text-space-400">Contact Phone</p>
              <p className="font-medium text-space-900 dark:text-white">{client.contactPhone}</p>
            </div>
          )}
          {client?.industry && (
            <div>
              <p className="text-sm text-space-500 dark:text-space-400">Industry</p>
              <p className="font-medium text-space-900 dark:text-white">{client.industry}</p>
            </div>
          )}
          {client?.companySize && (
            <div>
              <p className="text-sm text-space-500 dark:text-space-400">Company Size</p>
              <p className="font-medium text-space-900 dark:text-white">{client.companySize}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

