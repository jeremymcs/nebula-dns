/**
 * Nebula DNS - Client Insights Page
 * Analytics and query logs for a specific client
 */

'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useClientStats, useClientQueryLogs } from '@/hooks/useApi'
import { useToast } from '@/components/Toast'
import {
  ChartBarIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const TIME_RANGES = [
  { value: '1h', label: 'Last Hour' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
]

const ACTION_FILTERS = [
  { value: 'all', label: 'All Actions' },
  { value: 'allowed', label: 'Allowed' },
  { value: 'blocked', label: 'Blocked' },
]

export default function ClientInsightsPage() {
  const params = useParams()
  const clientId = params.id as string
  const [timeRange, setTimeRange] = useState('24h')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [actionFilter, setActionFilter] = useState('all')
  const [domainSearch, setDomainSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const { showToast } = useToast()
  const { data: stats, isLoading: statsLoading, mutate: refreshStats } = useClientStats(clientId)
  const { data: logs, isLoading: logsLoading, mutate: refreshLogs } = useClientQueryLogs(clientId, { limit: 50 })

  const queryLogs = logs?.logs || []
  const filteredLogs = queryLogs.filter((log: any) => {
    const matchesAction = actionFilter === 'all' || log.action === actionFilter
    const matchesDomain = !domainSearch || log.domain?.toLowerCase().includes(domainSearch.toLowerCase())
    return matchesAction && matchesDomain
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([refreshStats(), refreshLogs()])
      showToast('success', 'Data refreshed')
    } catch {
      showToast('error', 'Failed to refresh data')
    } finally {
      setRefreshing(false)
    }
  }

  const handleApplyFilters = () => {
    setShowFilterModal(false)
    // Filters are applied reactively through filteredLogs
  }

  const handleClearFilters = () => {
    setActionFilter('all')
    setDomainSearch('')
    setShowFilterModal(false)
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                timeRange === range.value
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-white dark:bg-space-800 text-space-600 dark:text-space-400 hover:bg-space-50 dark:hover:bg-space-700'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-space-100 dark:bg-space-800 text-space-700 dark:text-space-300 rounded-xl text-sm font-medium hover:bg-space-200 dark:hover:bg-space-700 transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Queries', value: stats?.totalQueries || 0, icon: GlobeAltIcon, color: 'text-blue-500' },
          { label: 'Allowed', value: stats?.allowedQueries || 0, icon: ChartBarIcon, color: 'text-success-500' },
          { label: 'Blocked', value: stats?.blockedQueries || 0, icon: ShieldCheckIcon, color: 'text-warning-500' },
          { label: 'Threats', value: stats?.threatsBlocked || 0, icon: ExclamationTriangleIcon, color: 'text-danger-500' },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white dark:bg-space-800 rounded-2xl p-5 ring-1 ring-space-200 dark:ring-space-700">
              <div className="flex items-center gap-3">
                <Icon className={`h-8 w-8 ${stat.color}`} />
                <div>
                  <p className="text-sm text-space-500 dark:text-space-400">{stat.label}</p>
                  {statsLoading ? (
                    <div className="h-7 w-20 bg-space-200 dark:bg-space-700 rounded animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-space-900 dark:text-white">{stat.value.toLocaleString()}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Query Logs */}
      <div className="bg-white dark:bg-space-800 rounded-2xl ring-1 ring-space-200 dark:ring-space-700">
        <div className="p-4 border-b border-space-100 dark:border-space-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">Recent Queries</h3>
            {(actionFilter !== 'all' || domainSearch) && (
              <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                Filtered
              </span>
            )}
          </div>
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center gap-2 text-sm text-space-500 hover:text-space-700 dark:hover:text-space-300"
          >
            <FunnelIcon className="h-4 w-4" />
            Filter
          </button>
        </div>

        {logsLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="h-4 w-4 bg-space-200 dark:bg-space-700 rounded" />
                <div className="flex-1 h-4 bg-space-200 dark:bg-space-700 rounded" />
                <div className="w-24 h-4 bg-space-200 dark:bg-space-700 rounded" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <GlobeAltIcon className="h-12 w-12 text-space-300 mx-auto mb-4" />
            <p className="text-space-500 dark:text-space-400">
              {queryLogs.length === 0 ? 'No query logs available for this time period' : 'No logs match your filter criteria'}
            </p>
            {queryLogs.length > 0 && (
              <button onClick={handleClearFilters} className="mt-2 text-sm text-primary-600 hover:text-primary-700">Clear filters</button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-space-100 dark:divide-space-700">
            {filteredLogs.map((log: any, idx: number) => (
              <div key={idx} className="p-4 flex items-center gap-4 hover:bg-space-50 dark:hover:bg-space-700/50">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  log.action === 'blocked' ? 'bg-danger-500' : 
                  log.action === 'allowed' ? 'bg-success-500' : 'bg-space-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-space-900 dark:text-white truncate">{log.domain}</p>
                  <p className="text-xs text-space-500 dark:text-space-400">
                    {log.queryType} • {log.sourceIp || 'Unknown IP'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    log.action === 'blocked' 
                      ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300'
                      : 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300'
                  }`}>
                    {log.action}
                  </span>
                  <p className="text-xs text-space-400 mt-1 flex items-center gap-1 justify-end">
                    <ClockIcon className="h-3 w-3" />
                    {log.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-space-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-space-100 dark:border-space-700">
              <h3 className="text-lg font-semibold text-space-900 dark:text-white">Filter Logs</h3>
              <button onClick={() => setShowFilterModal(false)} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Domain Search</label>
                <input
                  type="text"
                  value={domainSearch}
                  onChange={(e) => setDomainSearch(e.target.value)}
                  placeholder="e.g., google.com"
                  className="w-full px-4 py-2.5 bg-space-50 dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Action</label>
                <div className="flex gap-2">
                  {ACTION_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setActionFilter(filter.value)}
                      className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        actionFilter === filter.value
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'bg-space-50 dark:bg-space-900 text-space-600 dark:text-space-400 hover:bg-space-100 dark:hover:bg-space-800'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between gap-3 p-6 border-t border-space-100 dark:border-space-700">
              <button onClick={handleClearFilters} className="px-4 py-2 text-space-500 hover:text-space-700 dark:hover:text-space-300 text-sm">Clear All</button>
              <button onClick={handleApplyFilters} className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

