/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Reports & Analytics Page
 */

'use client'

import { useState, useMemo } from 'react'
import { 
  ArrowDownTrayIcon,
  ShieldExclamationIcon,
  GlobeAltIcon,
  ClockIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { LineChart, DonutChart, BarChart, ProgressRing } from '@/components/Charts'

// Generate mock trend data for the charts
const generateTrendData = (days: number) => {
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

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('7d')

  const trendData = useMemo(() => {
    const days = dateRange === '24h' ? 24 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
    return generateTrendData(days)
  }, [dateRange])

  const blockReasonData = [
    { label: 'Adult Content', value: 15000, color: '#ef4444' },
    { label: 'Social Media', value: 12000, color: '#3b82f6' },
    { label: 'Malware', value: 8000, color: '#f97316' },
    { label: 'Advertising', value: 7500, color: '#eab308' },
    { label: 'Phishing', value: 3500, color: '#8b5cf6' },
    { label: 'Other', value: 2500, color: '#6b7280' },
  ]

  const threatTrendData = [
    { label: 'Mon', value: 120 },
    { label: 'Tue', value: 145 },
    { label: 'Wed', value: 98 },
    { label: 'Thu', value: 167 },
    { label: 'Fri', value: 132 },
    { label: 'Sat', value: 78 },
    { label: 'Sun', value: 56 },
  ]

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
              <option value="90d">Last 90 days</option>
            </select>
          </div>
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
              <p className="text-2xl font-semibold text-gray-900">1.2M</p>
              <p className="text-sm text-green-600">↑ 12% from last period</p>
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
              <p className="text-2xl font-semibold text-gray-900">48.5K</p>
              <p className="text-sm text-gray-500">4.0% of total</p>
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
              <p className="text-2xl font-semibold text-gray-900">3.2K</p>
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
              <p className="text-2xl font-semibold text-gray-900">12ms</p>
              <p className="text-sm text-green-600">↓ 2ms from last period</p>
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
          <div className="flex items-center justify-center py-4">
            <DonutChart data={blockReasonData} size={180} thickness={35} />
          </div>
        </div>
      </div>

      {/* Secondary Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Threat Trends */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Threat Activity</h3>
          <BarChart 
            data={threatTrendData.map(d => ({ ...d, color: '#f97316' }))} 
            height={200} 
          />
        </div>

        {/* Block Rate */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Block Rate</h3>
          <div className="flex items-center justify-center py-4">
            <ProgressRing value={4} max={100} size={140} strokeWidth={12} color="#ef4444" label="of queries" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold text-gray-900">48.5K</p>
              <p className="text-sm text-gray-500">Blocked</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">1.15M</p>
              <p className="text-sm text-gray-500">Allowed</p>
            </div>
          </div>
        </div>

        {/* Cache Performance */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cache Performance</h3>
          <div className="flex items-center justify-center py-4">
            <ProgressRing value={78} max={100} size={140} strokeWidth={12} color="#22c55e" label="hit rate" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold text-gray-900">936K</p>
              <p className="text-sm text-gray-500">Cache Hits</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">264K</p>
              <p className="text-sm text-gray-500">Cache Misses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Tables */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Blocked Domains */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Blocked Domains</h3>
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
                {[
                  { domain: 'ads.doubleclick.net', category: 'Advertising', blocks: 4521 },
                  { domain: 'tracker.analytics.com', category: 'Advertising', blocks: 3847 },
                  { domain: 'facebook.com', category: 'Social Media', blocks: 2934 },
                  { domain: 'malware-site.bad.com', category: 'Malware', blocks: 2156 },
                  { domain: 'instagram.com', category: 'Social Media', blocks: 1892 },
                  { domain: 'tiktok.com', category: 'Social Media', blocks: 1654 },
                  { domain: 'phishing.fake.net', category: 'Phishing', blocks: 1432 },
                  { domain: 'ad-server.network', category: 'Advertising', blocks: 1287 },
                ].map((item) => (
                  <tr key={item.domain}>
                    <td className="py-2 text-sm font-mono text-gray-900">{item.domain}</td>
                    <td className="py-2 text-sm text-gray-500">{item.category}</td>
                    <td className="py-2 text-sm text-gray-900 text-right">{item.blocks.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Allowed Domains */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Allowed Domains</h3>
          <div className="overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Queries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { domain: 'google.com', queries: 125847 },
                  { domain: 'microsoft.com', queries: 98234 },
                  { domain: 'github.com', queries: 67432 },
                  { domain: 'slack.com', queries: 54321 },
                  { domain: 'zoom.us', queries: 43219 },
                  { domain: 'office365.com', queries: 38764 },
                  { domain: 'aws.amazon.com', queries: 32154 },
                  { domain: 'cloudflare.com', queries: 28976 },
                ].map((item) => (
                  <tr key={item.domain}>
                    <td className="py-2 text-sm font-mono text-gray-900">{item.domain}</td>
                    <td className="py-2 text-sm text-gray-900 text-right">{item.queries.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Location Performance */}
      <div className="mt-8">
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Location Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Queries</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Blocked</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Block Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Threats</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[
                  { name: 'Main Office', queries: 750000, blocked: 30000, blockRate: 4.0, threats: 2100, avgResponse: 11 },
                  { name: 'Branch Office', queries: 350000, blocked: 14000, blockRate: 4.0, threats: 850, avgResponse: 14 },
                  { name: 'Remote Workers', queries: 150000, blocked: 4500, blockRate: 3.0, threats: 250, avgResponse: 18 },
                ].map((loc) => (
                  <tr key={loc.name}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{loc.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{loc.queries.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{loc.blocked.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{loc.blockRate}%</td>
                    <td className="px-4 py-3 text-sm text-red-600 text-right">{loc.threats.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{loc.avgResponse}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

