/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Reports & Analytics Page
 */

'use client'

import { useState } from 'react'
import { 
  CalendarIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  ShieldExclamationIcon,
  GlobeAltIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('7d')

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
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
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
              <GlobeAltIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Queries</p>
              <p className="text-2xl font-semibold text-gray-900">1.2M</p>
              <p className="text-sm text-green-600">+12% from last period</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldExclamationIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Blocked</p>
              <p className="text-2xl font-semibold text-gray-900">48.5K</p>
              <p className="text-sm text-red-600">4.0% of total</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldExclamationIcon className="h-8 w-8 text-orange-600" />
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
              <ClockIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Response</p>
              <p className="text-2xl font-semibold text-gray-900">12ms</p>
              <p className="text-sm text-green-600">-2ms from last period</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Query Trends Chart Placeholder */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Query Trends</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">Query trend chart</p>
              <p className="text-xs text-gray-400">Shows queries over time</p>
            </div>
          </div>
        </div>

        {/* Block Reasons Chart Placeholder */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Block Reasons</h3>
          <div className="space-y-4">
            {[
              { reason: 'Category: Adult', count: 15000, percentage: 31, color: 'bg-red-500' },
              { reason: 'Category: Social Media', count: 12000, percentage: 25, color: 'bg-blue-500' },
              { reason: 'Threat: Malware', count: 8000, percentage: 16, color: 'bg-orange-500' },
              { reason: 'Category: Advertising', count: 7500, percentage: 15, color: 'bg-yellow-500' },
              { reason: 'Threat: Phishing', count: 3500, percentage: 7, color: 'bg-purple-500' },
              { reason: 'Other', count: 2500, percentage: 6, color: 'bg-gray-500' },
            ].map((item) => (
              <div key={item.reason}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{item.reason}</span>
                  <span className="text-gray-500">{item.count.toLocaleString()} ({item.percentage}%)</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
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

