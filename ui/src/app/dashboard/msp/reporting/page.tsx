// Nebula DNS - Cross-Client Reporting Page
// Aggregate analytics and reporting for MSP-managed clients
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { CrossClientReporting } from '@/components/msp/CrossClientReporting'
import { ChartBarIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CrossClientReportingPage() {
  const { user, isMsp } = useAuth()
  const router = useRouter()

  // Redirect non-MSP users
  useEffect(() => {
    if (user && !isMsp) {
      router.push('/dashboard')
    }
  }, [user, isMsp, router])

  if (!isMsp) {
    return null
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
