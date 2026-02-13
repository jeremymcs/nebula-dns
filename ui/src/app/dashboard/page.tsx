/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Dashboard - Shows tier-specific dashboard
 * Supports admin impersonation mode for viewing tenant dashboards
 */

'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { FullPageLoading } from '@/components/LoadingSpinner'
import { HomeDashboard } from '@/components/home/HomeDashboard'
import {
  HeroMetricsGrid,
  HeroMetric,
  QueryTrendsChart,
  CategoryBreakdownChart,
  TopBlockedList,
  ActivityFeed,
} from '@/components/dashboard'
import {
  MagnifyingGlassIcon,
  ShieldExclamationIcon,
  DocumentTextIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import { ADMIN_UI_URL } from '@/lib/api'

/**
 * Check if current session is an admin impersonation
 */
function useIsImpersonating(): boolean {
  const [isImpersonating, setIsImpersonating] = useState(false)

  useEffect(() => {
    const impersonationInfo = localStorage.getItem('impersonation_info')
    setIsImpersonating(!!impersonationInfo)
  }, [])

  return isImpersonating
}

/**
 * Enterprise/MSP Dashboard - Full-featured dashboard for business tiers
 */
function EnterpriseDashboard() {
  const { user } = useAuth()
  const isImpersonating = useIsImpersonating()

  return (
    <div className="space-y-6">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="bg-warning-100 dark:bg-warning-900/30 border border-warning-300 dark:border-warning-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-warning-600 dark:text-warning-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-warning-800 dark:text-warning-200">
                  Admin Impersonation Mode
                </p>
                <p className="text-sm text-warning-600 dark:text-warning-400">
                  You are viewing this tenant as an admin. Actions are logged.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                // Clear impersonation and return to Admin UI (separate app on port 4012)
                const adminUiUrl = ADMIN_UI_URL
                localStorage.removeItem('impersonation_token')
                localStorage.removeItem('impersonation_info')
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                window.location.href = adminUiUrl
              }}
              className="px-4 py-2 text-sm font-medium bg-warning-500 text-white rounded-lg hover:bg-warning-600 transition-colors"
            >
              End Impersonation
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-space-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-space-500 dark:text-space-400">
          {user?.tenantName || 'Overview'} - DNS security at a glance
        </p>
      </div>

      {/* Hero Metrics */}
      <HeroMetricsGrid>
        <HeroMetric
          title="Total Queries"
          value="--"
          icon={<MagnifyingGlassIcon className="w-6 h-6" />}
          trend={{ value: 0, isUp: true }}
          subtitle="Last 24 hours"
        />
        <HeroMetric
          title="Threats Blocked"
          value="--"
          icon={<ShieldExclamationIcon className="w-6 h-6" />}
          trend={{ value: 0, isUp: true }}
          subtitle="Last 24 hours"
          variant="danger"
        />
        <HeroMetric
          title="Policies Active"
          value="--"
          icon={<DocumentTextIcon className="w-6 h-6" />}
          subtitle="Across all locations"
          variant="primary"
        />
        <HeroMetric
          title="Locations"
          value="--"
          icon={<MapPinIcon className="w-6 h-6" />}
          subtitle="Protected networks"
          variant="success"
        />
      </HeroMetricsGrid>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QueryTrendsChart data={[]} isLoading={true} />
        <CategoryBreakdownChart data={[]} isLoading={true} />
      </div>

      {/* Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopBlockedList data={[]} isLoading={true} />
        <ActivityFeed data={[]} isLoading={true} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, loading, tier } = useAuth()
  const isImpersonating = useIsImpersonating()

  if (loading) {
    return <FullPageLoading />
  }

  // For home tier (and not impersonating), show simplified home dashboard
  if (tier === 'home' && !isImpersonating) {
    return <HomeDashboard />
  }

  // For enterprise/MSP tiers or admin impersonation, show full dashboard
  return <EnterpriseDashboard />
}
