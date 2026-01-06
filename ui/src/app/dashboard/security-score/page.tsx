/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Security Score - Gamified security posture dashboard
 */

'use client'

import { useRouter } from 'next/navigation'
import {
  SecurityScore,
  Achievements,
  Recommendations,
} from '@/components/security-score'
import { useSecurityScore } from '@/hooks/useApi'
import { ShieldCheckIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

// Map factor IDs to navigation routes and actions
const FACTOR_ACTIONS: Record<string, { route: string; tab?: string }> = {
  'mfa': { route: '/dashboard/settings/security', tab: 'mfa' },
  'threat-blocking': { route: '/dashboard/policies', tab: 'threats' },
  'policy-coverage': { route: '/dashboard/locations' },
  'nrd-blocking': { route: '/dashboard/policies', tab: 'nrd' },
  'backup-zones': { route: '/dashboard/locations' },
  'logging': { route: '/dashboard/settings/security', tab: 'logging' },
  'alerts': { route: '/dashboard/settings/integrations', tab: 'webhooks' },
  'safesearch': { route: '/dashboard/policies', tab: 'safesearch' },
  'api-security': { route: '/dashboard/settings/api-keys' },
}

export default function SecurityScorePage() {
  const router = useRouter()
  const { data: securityScoreData, error, isLoading, mutate } = useSecurityScore()

  const handleActionClick = (factorId: string) => {
    const action = FACTOR_ACTIONS[factorId]
    if (action) {
      const url = action.tab ? `${action.route}?tab=${action.tab}` : action.route
      router.push(url)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nebula-500"></div>
          <p className="text-space-500">Loading security score...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !securityScoreData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="p-4 rounded-full bg-danger-100 dark:bg-danger-900/30">
            <ExclamationTriangleIcon className="h-12 w-12 text-danger-500" />
          </div>
          <h2 className="text-xl font-semibold text-space-900 dark:text-white">Failed to Load Security Score</h2>
          <p className="text-space-500">
            {error?.message || 'Unable to fetch security score. Please try again later.'}
          </p>
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 px-4 py-2 bg-nebula-500 text-white rounded-lg hover:bg-nebula-600"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-nebula-500 to-purple-500">
          <ShieldCheckIcon className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Security Score</h1>
          <p className="text-space-500">Track and improve your security posture</p>
        </div>
      </div>

      {/* Main Score Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SecurityScore score={securityScoreData.totalScore} data={securityScoreData} />
        <Recommendations
          factors={securityScoreData.factors}
          onAction={handleActionClick}
          className="lg:col-span-2"
        />
      </div>

      {/* Achievements */}
      <Achievements achievements={securityScoreData.achievements || []} />
    </div>
  )
}

