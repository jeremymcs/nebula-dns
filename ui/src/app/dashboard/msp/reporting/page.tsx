// Nebula DNS - Cross-Client Reporting Page
// Aggregate analytics and reporting for MSP-managed clients
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { CrossClientReporting } from '@/components/msp/CrossClientReporting'
import { ChartBarIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'

export default function CrossClientReportingPage() {
  const { isMspTier, loading } = useAuth()

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl bg-space-100 dark:bg-space-800/50 h-64" />
    )
  }

  if (!isMspTier) {
    return (
      <div className="text-center py-20">
        <ChartBarIcon className="mx-auto h-16 w-16 text-space-300 dark:text-space-600" />
        <h2 className="mt-6 text-xl font-bold text-space-900 dark:text-white">Access Denied</h2>
        <p className="mt-2 text-space-500 dark:text-space-400 max-w-sm mx-auto">
          Cross-client reporting is only available for MSP tier accounts. Please contact support to upgrade your organization.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25">
            <ChartBarIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-space-900 dark:text-white">
              Cross-Client Reporting
            </h1>
            <p className="text-space-600 dark:text-space-400 mt-1">
              Aggregate analytics across all managed client organizations
            </p>
          </div>
        </div>
      </div>

      {/* Cross-Client Reporting Component */}
      <CrossClientReporting />
    </div>
  )
}
