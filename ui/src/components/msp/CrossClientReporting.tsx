// Nebula DNS - Cross-Client Reporting Component
// Aggregate reporting and analytics across all MSP-managed clients
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChartBarIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'

interface ClientStats {
  tenantId: string
  tenantName: string
  totalQueries: number
  blockedQueries: number
  threatsBlocked: number
  blockRate: number
  topCategory?: string
}

interface AggregateStats {
  totalClients: number
  totalQueries: number
  totalBlocked: number
  totalThreats: number
  averageBlockRate: number
  topClient: ClientStats | null
  clientStats: ClientStats[]
}

export function CrossClientReporting() {
  const [stats, setStats] = useState<AggregateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d')
  const [sortBy, setSortBy] = useState<'queries' | 'blocked' | 'threats' | 'rate'>('queries')

  useEffect(() => {
    loadStats()
  }, [timeRange])

  const loadStats = async () => {
    setLoading(true)
    try {
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      switch (timeRange) {
        case '24h':
          startDate.setDate(startDate.getDate() - 1)
          break
        case '7d':
          startDate.setDate(startDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(startDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(startDate.getDate() - 90)
          break
      }

      // Fetch usage data by tenant
      const response = await api.getMspUsageByTenant({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })

      // Calculate aggregate statistics
      const clientStats: ClientStats[] = response.usageByTenant.map((usage: any) => ({
        tenantId: usage.tenantId,
        tenantName: usage.tenantName,
        totalQueries: usage.totalQueries || 0,
        blockedQueries: usage.totalBlocked || 0,
        threatsBlocked: usage.totalThreats || 0,
        blockRate: usage.totalQueries > 0
          ? ((usage.totalBlocked || 0) / usage.totalQueries) * 100
          : 0,
        topCategory: usage.topCategory,
      }))

      const aggregateStats: AggregateStats = {
        totalClients: clientStats.length,
        totalQueries: clientStats.reduce((sum, s) => sum + s.totalQueries, 0),
        totalBlocked: clientStats.reduce((sum, s) => sum + s.blockedQueries, 0),
        totalThreats: clientStats.reduce((sum, s) => sum + s.threatsBlocked, 0),
        averageBlockRate: clientStats.length > 0
          ? clientStats.reduce((sum, s) => sum + s.blockRate, 0) / clientStats.length
          : 0,
        topClient: clientStats.length > 0
          ? clientStats.reduce((max, s) => s.totalQueries > max.totalQueries ? s : max)
          : null,
        clientStats: sortClientStats(clientStats, sortBy),
      }

      setStats(aggregateStats)
    } catch (error) {
      logger.error('Failed to load cross-client stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const sortClientStats = (clients: ClientStats[], sortKey: string): ClientStats[] => {
    return [...clients].sort((a, b) => {
      switch (sortKey) {
        case 'queries':
          return b.totalQueries - a.totalQueries
        case 'blocked':
          return b.blockedQueries - a.blockedQueries
        case 'threats':
          return b.threatsBlocked - a.threatsBlocked
        case 'rate':
          return b.blockRate - a.blockRate
        default:
          return 0
      }
    })
  }

  const handleSortChange = (newSort: typeof sortBy) => {
    setSortBy(newSort)
    if (stats) {
      setStats({
        ...stats,
        clientStats: sortClientStats(stats.clientStats, newSort),
      })
    }
  }

  const exportToCsv = () => {
    if (!stats) return

    const headers = ['Client', 'Total Queries', 'Blocked', 'Threats', 'Block Rate (%)']
    const rows = stats.clientStats.map(s => [
      s.tenantName,
      s.totalQueries,
      s.blockedQueries,
      s.threatsBlocked,
      s.blockRate.toFixed(2),
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cross-client-report-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-space-500 dark:text-space-400">
        No data available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="rounded-xl border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 px-4 py-2 text-space-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as any)}
            className="rounded-xl border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 px-4 py-2 text-space-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="queries">Sort by Queries</option>
            <option value="blocked">Sort by Blocked</option>
            <option value="threats">Sort by Threats</option>
            <option value="rate">Sort by Block Rate</option>
          </select>
        </div>

        <button
          onClick={exportToCsv}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          Export CSV
        </button>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={GlobeAltIcon}
          label="Total Clients"
          value={stats.totalClients.toLocaleString()}
          color="primary"
        />
        <StatCard
          icon={ChartBarIcon}
          label="Total Queries"
          value={stats.totalQueries.toLocaleString()}
          color="blue"
        />
        <StatCard
          icon={ShieldCheckIcon}
          label="Total Blocked"
          value={stats.totalBlocked.toLocaleString()}
          color="success"
        />
        <StatCard
          icon={ExclamationTriangleIcon}
          label="Threats Blocked"
          value={stats.totalThreats.toLocaleString()}
          color="danger"
        />
      </div>

      {/* Average Block Rate */}
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-space-600 dark:text-space-400">Average Block Rate</div>
            <div className="text-3xl font-bold text-space-900 dark:text-white mt-1">
              {stats.averageBlockRate.toFixed(2)}%
            </div>
          </div>
          <ArrowTrendingUpIcon className="h-12 w-12 text-primary-500" />
        </div>
      </div>

      {/* Client Stats Table */}
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-space-200 dark:border-space-700">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white">
            Client Statistics
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-space-50 dark:bg-space-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-space-500 dark:text-space-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-space-500 dark:text-space-400 uppercase tracking-wider">
                  Queries
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-space-500 dark:text-space-400 uppercase tracking-wider">
                  Blocked
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-space-500 dark:text-space-400 uppercase tracking-wider">
                  Threats
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-space-500 dark:text-space-400 uppercase tracking-wider">
                  Block Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-space-200 dark:divide-space-700">
              {stats.clientStats.map((client, index) => (
                <motion.tr
                  key={client.tenantId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-space-50 dark:hover:bg-space-900/50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-space-900 dark:text-white">
                      {client.tenantName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-space-900 dark:text-white">
                    {client.totalQueries.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-space-900 dark:text-white">
                    {client.blockedQueries.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-danger-600 dark:text-danger-400">
                    {client.threatsBlocked.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      client.blockRate > 10
                        ? 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400'
                        : client.blockRate > 5
                        ? 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400'
                        : 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400'
                    }`}>
                      {client.blockRate.toFixed(2)}%
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: 'primary' | 'blue' | 'success' | 'danger'
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    success: 'bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400',
    danger: 'bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400',
  }

  return (
    <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-sm text-space-600 dark:text-space-400">{label}</div>
          <div className="text-2xl font-bold text-space-900 dark:text-white">{value}</div>
        </div>
      </div>
    </div>
  )
}
