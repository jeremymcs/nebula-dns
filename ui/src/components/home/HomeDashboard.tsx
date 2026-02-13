// Nebula DNS - Home Tier Dashboard
// Simplified family-friendly dashboard for residential users
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ShieldCheckIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserGroupIcon,
  ClockIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { FamilyStats } from './FamilyStats'
import { PolicyPresets } from './PolicyPresets'
import { API_URL } from '@/lib/api'

interface DashboardStats {
  threatsBlockedToday: number
  threatsBlockedThisWeek: number
  activeNetworks: number
  topBlockedCategories: Array<{ category: string; count: number }>
  protectionStatus: 'active' | 'warning' | 'inactive'
}

export function HomeDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    threatsBlockedToday: 0,
    threatsBlockedThisWeek: 0,
    activeNetworks: 0,
    topBlockedCategories: [],
    protectionStatus: 'active',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${API_URL}/reports/dashboard/home`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statusConfig = {
    active: {
      color: 'text-success-600 dark:text-success-400',
      bg: 'bg-success-50 dark:bg-success-900/20',
      icon: ShieldCheckIcon,
      message: 'Your family is protected',
    },
    warning: {
      color: 'text-warning-600 dark:text-warning-400',
      bg: 'bg-warning-50 dark:bg-warning-900/20',
      icon: ExclamationTriangleIcon,
      message: 'Some networks need attention',
    },
    inactive: {
      color: 'text-danger-600 dark:text-danger-400',
      bg: 'bg-danger-50 dark:bg-danger-900/20',
      icon: ExclamationTriangleIcon,
      message: 'Protection is not active',
    },
  }

  const currentStatus = statusConfig[stats.protectionStatus]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-space-900 dark:text-white">
          Family Protection
        </h1>
        <p className="mt-2 text-space-600 dark:text-space-400">
          Keep your family safe online with simple, powerful protection
        </p>
      </div>

      {/* Protection Status Card */}
      <div className={`rounded-2xl p-6 ${currentStatus.bg} border border-${stats.protectionStatus === 'active' ? 'success' : stats.protectionStatus === 'warning' ? 'warning' : 'danger'}-200 dark:border-${stats.protectionStatus === 'active' ? 'success' : stats.protectionStatus === 'warning' ? 'warning' : 'danger'}-800/30`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${currentStatus.bg}`}>
            <currentStatus.icon className={`h-8 w-8 ${currentStatus.color}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${currentStatus.color}`}>
              {currentStatus.message}
            </h3>
            <p className="text-sm text-space-600 dark:text-space-400 mt-1">
              {stats.activeNetworks} {stats.activeNetworks === 1 ? 'network' : 'networks'} actively monitored
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Threats Blocked Today */}
        <div className="bg-white dark:bg-space-800 rounded-xl p-6 border border-space-200 dark:border-space-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-space-600 dark:text-space-400">
                Blocked Today
              </p>
              <p className="text-3xl font-bold text-space-900 dark:text-white mt-2">
                {loading ? '...' : stats.threatsBlockedToday.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-danger-50 dark:bg-danger-900/20">
              <ShieldCheckIcon className="h-6 w-6 text-danger-600 dark:text-danger-400" />
            </div>
          </div>
          <p className="text-xs text-space-500 dark:text-space-500 mt-4">
            Threats stopped in the last 24 hours
          </p>
        </div>

        {/* This Week */}
        <div className="bg-white dark:bg-space-800 rounded-xl p-6 border border-space-200 dark:border-space-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-space-600 dark:text-space-400">
                This Week
              </p>
              <p className="text-3xl font-bold text-space-900 dark:text-white mt-2">
                {loading ? '...' : stats.threatsBlockedThisWeek.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20">
              <ChartBarIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <p className="text-xs text-space-500 dark:text-space-500 mt-4">
            Total threats blocked this week
          </p>
        </div>

        {/* Active Networks */}
        <div className="bg-white dark:bg-space-800 rounded-xl p-6 border border-space-200 dark:border-space-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-space-600 dark:text-space-400">
                Networks
              </p>
              <p className="text-3xl font-bold text-space-900 dark:text-white mt-2">
                {loading ? '...' : stats.activeNetworks}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-success-50 dark:bg-success-900/20">
              <WifiIcon className="h-6 w-6 text-success-600 dark:text-success-400" />
            </div>
          </div>
          <p className="text-xs text-space-500 dark:text-space-500 mt-4">
            Protected home and roaming devices
          </p>
        </div>
      </div>

      {/* Family Stats Section */}
      <FamilyStats stats={stats} loading={loading} />

      {/* Policy Presets Section */}
      <PolicyPresets />

      {/* Quick Actions */}
      <div className="bg-white dark:bg-space-800 rounded-xl p-6 border border-space-200 dark:border-space-700">
        <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/policies"
            className="flex items-center gap-3 p-4 rounded-xl bg-space-50 dark:bg-space-900 hover:bg-space-100 dark:hover:bg-space-700 transition-colors border border-space-200 dark:border-space-700"
          >
            <ShieldCheckIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <span className="text-sm font-medium text-space-900 dark:text-white">
              Manage Policies
            </span>
          </Link>

          <Link
            href="/dashboard/locations"
            className="flex items-center gap-3 p-4 rounded-xl bg-space-50 dark:bg-space-900 hover:bg-space-100 dark:hover:bg-space-700 transition-colors border border-space-200 dark:border-space-700"
          >
            <WifiIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
            <span className="text-sm font-medium text-space-900 dark:text-white">
              View Networks
            </span>
          </Link>

          <Link
            href="/dashboard/reports"
            className="flex items-center gap-3 p-4 rounded-xl bg-space-50 dark:bg-space-900 hover:bg-space-100 dark:hover:bg-space-700 transition-colors border border-space-200 dark:border-space-700"
          >
            <ChartBarIcon className="h-5 w-5 text-accent-600 dark:text-accent-400" />
            <span className="text-sm font-medium text-space-900 dark:text-white">
              View Reports
            </span>
          </Link>

          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 p-4 rounded-xl bg-space-50 dark:bg-space-900 hover:bg-space-100 dark:hover:bg-space-700 transition-colors border border-space-200 dark:border-space-700"
          >
            <Cog6ToothIcon className="h-5 w-5 text-space-600 dark:text-space-400" />
            <span className="text-sm font-medium text-space-900 dark:text-white">
              Settings
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
