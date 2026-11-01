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
import { EnterpriseDashboardView } from '@/components/dashboard/EnterpriseDashboardView'
import { EyeIcon, XMarkIcon } from '@heroicons/react/24/outline'
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
  const isImpersonating = useIsImpersonating()

  return (
    <div className="space-y-4">
      {isImpersonating && (
        <div className="fs-card border-l-4 border-l-warning-500 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <EyeIcon className="w-5 h-5 text-warning-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-ink">Admin impersonation mode</h3>
              <p className="text-sm text-mut">Actions on this tenant are audited.</p>
            </div>
          </div>
          <Button
            variant="secondary"
            leftIcon={<XMarkIcon className="w-5 h-5" />}
            onClick={() => {
              const adminUiUrl = ADMIN_UI_URL
              localStorage.removeItem('impersonation_token')
              localStorage.removeItem('impersonation_info')
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              window.location.href = adminUiUrl
            }}
          >
            End impersonation
          </Button>
        </div>
      )}
      <EnterpriseDashboardView />
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
