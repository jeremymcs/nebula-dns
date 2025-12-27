/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Dashboard Overview Page - Cosmic Security Theme
 */

'use client'

import { useState, useMemo } from 'react'
import { useSummaryStats, useTopBlocked, useBlocksByCategory, useLocationStats, useQueryTrends } from '@/hooks/useApi'
import { Select } from '@/components/ui'
import {
  HeroMetric,
  HeroMetricsGrid,
  QueryTrendsChart,
  CategoryBreakdownChart,
  TopBlockedList,
  ActivityFeed
} from '@/components/dashboard'
import {
  ShieldCheckIcon,
  NoSymbolIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'

export default function DashboardPage() {
  const [period, setPeriod] = useState('7d')

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useSummaryStats(period)
  const { data: topBlocked, isLoading: topBlockedLoading } = useTopBlocked(period, 5)
  const { data: categoryStats, isLoading: categoryLoading } = useBlocksByCategory(period)
  const { data: locationStats, isLoading: locationLoading } = useLocationStats(period)
  const { data: queryTrends, isLoading: trendsLoading } = useQueryTrends(period)

  const isLoading = summaryLoading || topBlockedLoading || categoryLoading || locationLoading || trendsLoading

  // Transform trend data for chart (mapping from API format to chart format)
  const trendData = useMemo(() => {
    if (!queryTrends || queryTrends.length === 0) {
      return []
    }
    return queryTrends.map(item => ({
      timestamp: item.timestamp,
      queries: item.total,
      blocked: item.blocked,
    }))
  }, [queryTrends])

  // Generate mock activity data
  const generateActivityData = () => {
    const domains = ['malware.example.com', 'ads.tracker.net', 'phishing.bad.com', 'porn.xxx', 'gambling.bet']
    const categories = ['Malware', 'Advertising', 'Phishing', 'Adult', 'Gambling']
    return Array.from({ length: 10 }, (_, i) => ({
      id: `activity-${i}`,
      type: 'block' as const,
      domain: domains[i % domains.length],
      category: categories[i % categories.length],
      location: 'Main Office',
      timestamp: new Date(Date.now() - i * 60000 * Math.random() * 10),
    }))
  }

  const periodOptions = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Dashboard</h1>
          <p className="text-space-500 dark:text-space-400 mt-1">
            Monitor your DNS security in real-time
          </p>
        </div>
        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          options={periodOptions}
          className="w-40"
        />
      </div>

      {/* Error Alert */}
      {summaryError && (
        <div className="p-4 rounded-xl bg-warning-50 dark:bg-warning-900/20 ring-1 ring-warning-200 dark:ring-warning-800">
          <p className="text-sm text-warning-800 dark:text-warning-200">
            ⚠️ Unable to load dashboard data. Make sure the API is running.
          </p>
        </div>
      )}

      {/* Hero Metrics */}
      <HeroMetricsGrid>
        <HeroMetric
          title="Total Queries"
          value={summary?.totalQueries || 0}
          icon={<GlobeAltIcon />}
          variant="primary"
          trend={summary ? { value: 12, isUp: true } : undefined}
        />
        <HeroMetric
          title="Blocked Queries"
          value={summary?.blockedQueries || 0}
          icon={<NoSymbolIcon />}
          variant="danger"
          trend={summary ? { value: summary?.blockRate || 0, isUp: false } : undefined}
        />
        <HeroMetric
          title="Threats Blocked"
          value={summary?.threatsBlocked || Math.floor((summary?.blockedQueries || 0) * 0.1)}
          icon={<ExclamationTriangleIcon />}
          variant="warning"
        />
        <HeroMetric
          title="Active Locations"
          value={locationStats?.length || 0}
          icon={<MapPinIcon />}
          variant="success"
        />
      </HeroMetricsGrid>

      {/* Query Trends Chart - Full Width */}
      <QueryTrendsChart
        data={trendData}
        isLoading={trendsLoading}
      />

      {/* Middle Section - 3 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Blocked List */}
        <TopBlockedList
          data={(topBlocked || []).map((item: any) => ({
            domain: item.domain,
            count: item.count || 0,
            category: item.category,
          }))}
          isLoading={topBlockedLoading}
          limit={5}
        />

        {/* Category Breakdown */}
        <CategoryBreakdownChart
          data={(categoryStats || []).map((item: any) => ({
            category: item.category?.replace('_', ' ') || 'Unknown',
            count: item.count || 0,
          }))}
          isLoading={categoryLoading}
        />

        {/* Activity Feed */}
        <ActivityFeed
          data={generateActivityData()}
          isLoading={isLoading}
          maxItems={8}
        />
      </div>

      {/* Location Performance Table */}
      <div className="card-solid p-6">
        <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
          Location Performance
        </h3>
        {locationLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Location</th>
                  <th className="table-header-cell text-right">Queries</th>
                  <th className="table-header-cell text-right">Blocked</th>
                  <th className="table-header-cell text-right">Block Rate</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {(locationStats || []).map((loc: any, idx: number) => (
                  <tr key={idx} className="table-row">
                    <td className="table-cell font-medium text-space-900 dark:text-white">
                      {loc.locationName}
                    </td>
                    <td className="table-cell text-right">
                      {Number(loc.totalQueries || 0).toLocaleString()}
                    </td>
                    <td className="table-cell text-right">
                      {Number(loc.blockedQueries || 0).toLocaleString()}
                    </td>
                    <td className="table-cell text-right">
                      <span className="badge-danger">
                        {Number(loc.blockRate || 0).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {(!locationStats || locationStats.length === 0) && (
                  <tr>
                    <td colSpan={4} className="table-cell text-center py-8 text-space-500 dark:text-space-400">
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
  )
}
