/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Dashboard Overview Page
 */

'use client'

import { useEffect, useState } from 'react'
import { StatsCard } from '@/components/StatsCard'
import { 
  ShieldCheckIcon, 
  NoSymbolIcon, 
  GlobeAltIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline'

interface SummaryStats {
  totalQueries: number
  blockedQueries: number
  threatBlocks: number
  locations: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<SummaryStats>({
    totalQueries: 0,
    blockedQueries: 0,
    threatBlocks: 0,
    locations: 0,
  })

  useEffect(() => {
    // Mock data for development
    setStats({
      totalQueries: 125000,
      blockedQueries: 5000,
      threatBlocks: 450,
      locations: 3,
    })
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      <div className="mt-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Queries"
            value={stats.totalQueries.toLocaleString()}
            icon={GlobeAltIcon}
            trend={{ value: 12, isUp: true }}
          />
          <StatsCard
            title="Blocked Queries"
            value={stats.blockedQueries.toLocaleString()}
            icon={NoSymbolIcon}
            trend={{ value: 5, isUp: false }}
            color="red"
          />
          <StatsCard
            title="Threats Blocked"
            value={stats.threatBlocks.toLocaleString()}
            icon={ExclamationTriangleIcon}
            trend={{ value: 8, isUp: false }}
            color="yellow"
          />
          <StatsCard
            title="Active Locations"
            value={stats.locations.toString()}
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
            <div className="space-y-3">
              {[
                { domain: 'malware-site.com', count: 450, category: 'Malware' },
                { domain: 'phishing-example.net', count: 320, category: 'Phishing' },
                { domain: 'ads.tracker.com', count: 280, category: 'Advertising' },
                { domain: 'social.media.net', count: 200, category: 'Social Media' },
                { domain: 'gambling-site.com', count: 150, category: 'Gambling' },
              ].map((item) => (
                <div key={item.domain} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.domain}</p>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {item.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Blocks by Category */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Blocks by Category
            </h3>
            <div className="space-y-3">
              {[
                { category: 'Malware', count: 1500, percentage: 30, color: 'bg-red-500' },
                { category: 'Phishing', count: 1000, percentage: 20, color: 'bg-orange-500' },
                { category: 'Advertising', count: 800, percentage: 16, color: 'bg-yellow-500' },
                { category: 'Social Media', count: 600, percentage: 12, color: 'bg-blue-500' },
                { category: 'Adult', count: 500, percentage: 10, color: 'bg-purple-500' },
              ].map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item.category}</span>
                    <span className="text-gray-500">{item.percentage}%</span>
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

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Recent Activity
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[
                    { time: '2 min ago', domain: 'google.com', location: 'Main Office', action: 'Allow', reason: 'Default' },
                    { time: '3 min ago', domain: 'malware.bad.com', location: 'Main Office', action: 'Block', reason: 'Threat: Malware' },
                    { time: '5 min ago', domain: 'facebook.com', location: 'Branch Office', action: 'Block', reason: 'Category: Social Media' },
                    { time: '7 min ago', domain: 'youtube.com', location: 'Main Office', action: 'Rewrite', reason: 'SafeSearch' },
                    { time: '10 min ago', domain: 'phishing.site.net', location: 'Remote Workers', action: 'Block', reason: 'Threat: Phishing' },
                  ].map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.time}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.domain}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.location}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.action === 'Allow' ? 'bg-green-100 text-green-800' :
                          item.action === 'Block' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
