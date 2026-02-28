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
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { ADMIN_UI_URL } from '@/lib/api'
import { Button } from '@/components/ui'

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
    <div className="pb-12 space-y-12">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="relative overflow-hidden bg-warning-100 dark:bg-warning-900/30 border border-warning-300 dark:border-warning-700 rounded-2xl p-6 shadow-lg shadow-warning-500/10">
          {/* Decoration */}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-warning-500/10 rounded-full blur-2xl" />
          
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-warning-500/20 flex items-center justify-center">
                <EyeIcon className="w-6 h-6 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <h3 className="font-bold text-warning-900 dark:text-warning-100">
                  Admin Impersonation Mode
                </h3>
                <p className="text-sm text-warning-700 dark:text-warning-300">
                  You are viewing this tenant as an administrator. All actions performed are logged and monitored.
                </p>
              </div>
            </div>
            <Button
              variant="accent"
              className="bg-warning-600 hover:bg-warning-700 text-white border-0 shadow-warning-600/20"
              leftIcon={<XMarkIcon className="w-5 h-5" />}
              onClick={() => {
                // Clear impersonation and return to Admin UI (separate app on port 4012)
                const adminUiUrl = ADMIN_UI_URL
                localStorage.removeItem('impersonation_token')
                localStorage.removeItem('impersonation_info')
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                window.location.href = adminUiUrl
              }}
            >
              End Impersonation
            </Button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-space-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-lg text-space-500 dark:text-space-400">
          {user?.tenantName || 'Overview'} <span className="mx-2 text-space-300 dark:text-space-700">•</span> DNS security at a glance
        </p>
      </div>

      {/* Hero Metrics */}
      <HeroMetricsGrid columns={4}>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <QueryTrendsChart data={[]} isLoading={true} />
        <CategoryBreakdownChart data={[]} isLoading={true} />
      </div>

      {/* Activity Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
          <TopBlockedList data={[]} isLoading={true} />
        </div>
        <div className="xl:col-span-2">
          <ActivityFeed data={[]} isLoading={true} />
        </div>
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
