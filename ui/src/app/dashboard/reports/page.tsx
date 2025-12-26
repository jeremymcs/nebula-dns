/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Reports & Analytics Page - Cosmic Security Theme
 */

'use client'

import { useState } from 'react'
import { useSummaryStats, useTopBlocked, useBlocksByCategory, useLocationStats } from '@/hooks/useApi'
import {
  ArrowDownTrayIcon,
  ShieldExclamationIcon,
  GlobeAltIcon,
  ClockIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'
import { LineChart, DonutChart, BarChart, ProgressRing } from '@/components/Charts'
import { Button, Card, Badge, Select } from '@/components/ui'
import { HeroMetric, HeroMetricsGrid } from '@/components/dashboard'
import Link from 'next/link'

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('7d')

  const { data: summary, isLoading: summaryLoading } = useSummaryStats(dateRange)
  const { data: topBlocked, isLoading: topBlockedLoading } = useTopBlocked(dateRange, 8)
  const { data: categoryStats, isLoading: categoryLoading } = useBlocksByCategory(dateRange)
  const { data: locationStats, isLoading: locationLoading } = useLocationStats(dateRange)

  const isLoading = summaryLoading || topBlockedLoading || categoryLoading || locationLoading

  // Generate trend data for charts (mock for now, would come from API)
  const generateTrendData = () => {
    const days = dateRange === '24h' ? 24 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
    const data = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      data.push({
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: Math.floor(Math.random() * 50000) + 100000,
      })
    }
    return data
  }

  const trendData = generateTrendData()

  // Transform category stats for donut chart
  const categoryColors = ['#ef4444', '#3b82f6', '#f97316', '#eab308', '#8b5cf6', '#6b7280']
  const donutData = (categoryStats || []).map((item: any, idx: number) => ({
    label: item.category || 'Unknown',
    value: item.count || 0,
    color: categoryColors[idx % categoryColors.length],
  }))

  // Generate threat trend data
  const threatTrendData = [
    { label: 'Mon', value: 120, color: '#f97316' },
    { label: 'Tue', value: 145, color: '#f97316' },
    { label: 'Wed', value: 98, color: '#f97316' },
    { label: 'Thu', value: 167, color: '#f97316' },
    { label: 'Fri', value: 132, color: '#f97316' },
    { label: 'Sat', value: 78, color: '#f97316' },
    { label: 'Sun', value: 56, color: '#f97316' },
  ]

  const blockRate = summary?.blockRate || 0
  const cacheHitRate = summary?.cacheHitRate || 0

  const dateRangeOptions = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Reports</h1>
          <p className="mt-1 text-space-500 dark:text-space-400">
            Analytics and insights for your DNS filtering
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={dateRangeOptions}
            className="w-40"
          />
          <Link href="/dashboard/reports/scheduled">
            <Button variant="secondary" leftIcon={<ClockIcon className="h-5 w-5" />}>
              Scheduled
            </Button>
          </Link>
          <Button variant="secondary" leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}>
            Export
          </Button>
        </div>
      </div>

      {/* Hero Metrics */}
      <HeroMetricsGrid>
        <HeroMetric
          title="Total Queries"
          value={summary?.totalQueries || 0}
          icon={<GlobeAltIcon />}
          variant="primary"
        />
        <HeroMetric
          title="Blocked"
          value={summary?.blockedQueries || 0}
          icon={<ShieldExclamationIcon />}
          variant="danger"
          subtitle={`${blockRate}% of total`}
        />
        <HeroMetric
          title="Threats Blocked"
          value={summary?.threatsBlocked || 0}
          icon={<ShieldExclamationIcon />}
          variant="warning"
          subtitle="Malware, phishing, C2"
        />
        <HeroMetric
          title="Avg Response"
          value={`${summary?.avgResponseTime || 0}ms`}
          icon={<BoltIcon />}
          variant="success"
          formatValue={false}
        />
      </HeroMetricsGrid>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Query Trends Chart */}
        <Card variant="solid" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">Query Trends</h3>
            <div className="flex items-center gap-4 text-sm text-space-500 dark:text-space-400">
              <span className="flex items-center">
                <span className="h-2 w-2 rounded-full bg-primary-500 mr-2" />
                Total Queries
              </span>
            </div>
          </div>
          <LineChart data={trendData} height={260} color="#4f46e5" />
        </Card>

        {/* Block Reasons Donut Chart */}
        <Card variant="solid" padding="lg">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Blocks by Category</h3>
          {categoryLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="skeleton h-44 w-44 rounded-full" />
            </div>
          ) : donutData.length > 0 ? (
            <div className="flex items-center justify-center py-4">
              <DonutChart data={donutData} size={180} thickness={35} />
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-space-500 dark:text-space-400">
              No category data available
            </div>
          )}
        </Card>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Threat Trends */}
        <Card variant="solid" padding="lg">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Threat Activity</h3>
          <BarChart data={threatTrendData} height={200} />
        </Card>

        {/* Block Rate */}
        <Card variant="solid" padding="lg">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Block Rate</h3>
          <div className="flex items-center justify-center py-4">
            <ProgressRing
              value={parseFloat(blockRate.toString()) || 0}
              max={100}
              size={140}
              strokeWidth={12}
              color="#ef4444"
              label="of queries"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-space-900 dark:text-white">
                {(summary?.blockedQueries || 0).toLocaleString()}
              </p>
              <p className="text-sm text-space-500 dark:text-space-400">Blocked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-space-900 dark:text-white">
                {((summary?.totalQueries || 0) - (summary?.blockedQueries || 0)).toLocaleString()}
              </p>
              <p className="text-sm text-space-500 dark:text-space-400">Allowed</p>
            </div>
          </div>
        </Card>

        {/* Cache Performance */}
        <Card variant="solid" padding="lg">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Cache Performance</h3>
          <div className="flex items-center justify-center py-4">
            <ProgressRing
              value={parseFloat(cacheHitRate.toString()) || 0}
              max={100}
              size={140}
              strokeWidth={12}
              color="#22c55e"
              label="hit rate"
            />
          </div>
        </Card>
      </div>

      {/* Top Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Blocked Domains */}
        <Card variant="solid" padding="lg">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Top Blocked Domains</h3>
          {topBlockedLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-10 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Domain</th>
                    <th className="table-header-cell">Category</th>
                    <th className="table-header-cell text-right">Blocks</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {(topBlocked || []).map((item: any, idx: number) => (
                    <tr key={idx} className="table-row">
                      <td className="table-cell font-mono text-sm">{item.domain}</td>
                      <td className="table-cell">
                        <Badge variant="danger" size="sm">{item.category?.replace('_', ' ')}</Badge>
                      </td>
                      <td className="table-cell text-right font-medium">{item.count?.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!topBlocked || topBlocked.length === 0) && (
                    <tr>
                      <td colSpan={3} className="table-cell text-center py-8 text-space-500 dark:text-space-400">
                        No blocked domains
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Location Performance */}
        <Card variant="solid" padding="lg">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Location Performance</h3>
          {locationLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-10 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Location</th>
                    <th className="table-header-cell text-right">Queries</th>
                    <th className="table-header-cell text-right">Block Rate</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {(locationStats || []).map((loc: any, idx: number) => (
                    <tr key={idx} className="table-row">
                      <td className="table-cell font-medium text-space-900 dark:text-white">{loc.locationName}</td>
                      <td className="table-cell text-right">{loc.totalQueries?.toLocaleString()}</td>
                      <td className="table-cell text-right">
                        <Badge variant="danger">{loc.blockRate}%</Badge>
                      </td>
                    </tr>
                  ))}
                  {(!locationStats || locationStats.length === 0) && (
                    <tr>
                      <td colSpan={3} className="table-cell text-center py-8 text-space-500 dark:text-space-400">
                        No location data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
