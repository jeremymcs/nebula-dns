/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Dashboard Overview Page
 */

'use client'

import { useState } from 'react'
import { StatsCard } from '@/components/StatsCard'
import { useSummaryStats, useTopBlocked, useBlocksByCategory, useLocationStats } from '@/hooks/useApi'
import { 
  ShieldCheckIcon, 
  NoSymbolIcon, 
  GlobeAltIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function DashboardPage() {
  const [period, setPeriod] = useState('7d')
  
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useSummaryStats(period)
  const { data: topBlocked, isLoading: topBlockedLoading } = useTopBlocked(period, 5)
  const { data: categoryStats, isLoading: categoryLoading } = useBlocksByCategory(period)
  const { data: locationStats, isLoading: locationLoading } = useLocationStats(period)

  const isLoading = summaryLoading || topBlockedLoading || categoryLoading || locationLoading

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="input w-40"
        >
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>

      {summaryError && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Unable to load dashboard data. Make sure the API is running.
          </p>
        </div>
      )}

      <div className="mt-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Queries"
            value={isLoading ? '...' : formatNumber(summary?.totalQueries || 0)}
            icon={GlobeAltIcon}
            trend={summary ? { value: 12, isUp: true } : undefined}
          />
          <StatsCard
            title="Blocked Queries"
            value={isLoading ? '...' : formatNumber(summary?.blockedQueries || 0)}
            icon={NoSymbolIcon}
            trend={summary ? { value: summary?.blockRate || 0, isUp: false } : undefined}
            color="red"
          />
          <StatsCard
            title="Threats Blocked"
            value={isLoading ? '...' : formatNumber(summary?.threatsBlocked || summary?.blockedQueries * 0.1 || 0)}
            icon={ExclamationTriangleIcon}
            color="yellow"
          />
          <StatsCard
            title="Active Locations"
            value={isLoading ? '...' : (locationStats?.length || 0).toString()}
            icon={ShieldCheckIcon}
            color="green"
          />
        </div>

        {/* Activity Section */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Blocked Domains */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Top Blocked Domains
            </h3>
            {topBlockedLoading ? (
              <div className="flex items-center justify-center py-8">
                <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {(topBlocked || []).slice(0, 5).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 font-mono">{item.domain}</p>
                      <p className="text-xs text-gray-500">{item.category || 'Unknown'}</p>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {item.count?.toLocaleString()}
                    </span>
                  </div>
                ))}
                {(!topBlocked || topBlocked.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">No blocked domains yet</p>
                )}
              </div>
            )}
          </div>

          {/* Blocks by Category */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Blocks by Category
            </h3>
            {categoryLoading ? (
              <div className="flex items-center justify-center py-8">
                <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {(categoryStats || []).slice(0, 5).map((item: any, idx: number) => {
                  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-purple-500']
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 capitalize">{item.category?.replace('_', ' ')}</span>
                        <span className="text-gray-500">{item.percentage}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full ${colors[idx % colors.length]}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {(!categoryStats || categoryStats.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">No category data yet</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Location Performance */}
        <div className="mt-8">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Location Performance
            </h3>
            {locationLoading ? (
              <div className="flex items-center justify-center py-8">
                <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Queries</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Blocked</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Block Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(locationStats || []).map((loc: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {loc.locationName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {loc.totalQueries?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {loc.blockedQueries?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {loc.blockRate?.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                    {(!locationStats || locationStats.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                          No location data yet. Add locations to see statistics.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
