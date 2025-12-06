/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Reports & Analytics Page
 */

'use client'

import { useState } from 'react'
import { useSummaryStats, useTopBlocked, useBlocksByCategory, useLocationStats } from '@/hooks/useApi'
import { 
  ArrowDownTrayIcon,
  ShieldExclamationIcon,
  GlobeAltIcon,
  ClockIcon,
  CalendarDaysIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { LineChart, DonutChart, BarChart, ProgressRing } from '@/components/Charts'
import Link from 'next/link'

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('7d')
  
  const { data: summary, isLoading: summaryLoading } = useSummaryStats(dateRange)
  const { data: topBlocked, isLoading: topBlockedLoading } = useTopBlocked(dateRange, 8)
  const { data: categoryStats, isLoading: categoryLoading } = useBlocksByCategory(dateRange)
  const { data: locationStats, isLoading: locationLoading } = useLocationStats(dateRange)

  const isLoading = summaryLoading || topBlockedLoading || categoryLoading || locationLoading

  // Format large numbers
  const formatNumber = (num: number) => {
    if (!num) return '0'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="mt-2 text-sm text-gray-700">
            Analytics and insights for your DNS filtering
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <div className="relative">
            <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input pl-10"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
          <Link 
            href="/dashboard/reports/scheduled"
            className="btn-secondary inline-flex items-center"
          >
            <ClockIcon className="h-5 w-5 mr-2" />
            Scheduled
          </Link>
          <button className="btn-secondary inline-flex items-center">
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <GlobeAltIcon className="h-7 w-7 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Queries</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? <ArrowPathIcon className="h-6 w-6 animate-spin" /> : formatNumber(summary?.totalQueries || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <ShieldExclamationIcon className="h-7 w-7 text-red-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Blocked</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? <ArrowPathIcon className="h-6 w-6 animate-spin" /> : formatNumber(summary?.blockedQueries || 0)}
              </p>
              <p className="text-sm text-gray-500">{blockRate}% of total</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <ShieldExclamationIcon className="h-7 w-7 text-orange-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Threats Blocked</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? <ArrowPathIcon className="h-6 w-6 animate-spin" /> : formatNumber(summary?.threatsBlocked || 0)}
              </p>
              <p className="text-sm text-gray-500">Malware, phishing, C2</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <ClockIcon className="h-7 w-7 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Response</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? <ArrowPathIcon className="h-6 w-6 animate-spin" /> : `${summary?.avgResponseTime || 0}ms`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Query Trends Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Query Trends</h3>
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center">
                <span className="h-2 w-2 rounded-full bg-primary-500 mr-2" />
                Total Queries
              </span>
            </div>
          </div>
          <LineChart data={trendData} height={260} color="#4f46e5" />
        </div>

        {/* Block Reasons Donut Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Blocks by Category</h3>
          {categoryLoading ? (
            <div className="flex items-center justify-center py-16">
              <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : donutData.length > 0 ? (
            <div className="flex items-center justify-center py-4">
              <DonutChart data={donutData} size={180} thickness={35} />
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-gray-500">
              No category data available
            </div>
          )}
        </div>
      </div>

      {/* Secondary Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Threat Trends */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Threat Activity</h3>
          <BarChart data={threatTrendData} height={200} />
        </div>

        {/* Block Rate */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Block Rate</h3>
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
              <p className="text-2xl font-semibold text-gray-900">{formatNumber(summary?.blockedQueries || 0)}</p>
              <p className="text-sm text-gray-500">Blocked</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{formatNumber((summary?.totalQueries || 0) - (summary?.blockedQueries || 0))}</p>
              <p className="text-sm text-gray-500">Allowed</p>
            </div>
          </div>
        </div>

        {/* Cache Performance */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cache Performance</h3>
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
        </div>
      </div>

      {/* Top Tables */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Blocked Domains */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Blocked Domains</h3>
          {topBlockedLoading ? (
            <div className="flex items-center justify-center py-8">
              <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                    <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Blocks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(topBlocked || []).map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 text-sm font-mono text-gray-900">{item.domain}</td>
                      <td className="py-2 text-sm text-gray-500 capitalize">{item.category?.replace('_', ' ')}</td>
                      <td className="py-2 text-sm text-gray-900 text-right">{item.count?.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!topBlocked || topBlocked.length === 0) && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-500">No blocked domains</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Location Performance */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Location Performance</h3>
          {locationLoading ? (
            <div className="flex items-center justify-center py-8">
              <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Queries</th>
                    <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Block Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(locationStats || []).map((loc: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 text-sm font-medium text-gray-900">{loc.locationName}</td>
                      <td className="py-2 text-sm text-gray-900 text-right">{loc.totalQueries?.toLocaleString()}</td>
                      <td className="py-2 text-sm text-gray-900 text-right">{loc.blockRate}%</td>
                    </tr>
                  ))}
                  {(!locationStats || locationStats.length === 0) && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-500">No location data</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
