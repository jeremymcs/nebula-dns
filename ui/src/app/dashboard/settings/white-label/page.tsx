// Nebula DNS - White Label Settings Page
// Custom branding configuration for MSP client portals
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { WhiteLabelSettings } from '@/components/msp/WhiteLabelSettings'
import { PaintBrushIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function WhiteLabelSettingsPage() {
  const { user, isMsp } = useAuth()
  const router = useRouter()

  // Redirect non-MSP users
  useEffect(() => {
    if (user && !isMsp) {
      router.push('/dashboard/settings')
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
            <div className="p-3 bg-primary-600 rounded-xl shadow-lg shadow-primary-500/25">
              <PaintBrushIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-space-900 dark:text-white">
                White Label Settings
              </h1>
              <p className="text-space-600 dark:text-space-400 mt-1">
                Customize branding for client portals with your company identity
              </p>
            </div>
          </div>
        </div>

        {/* MSP Badge */}
        <div className="bg-success-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <PaintBrushIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">MSP Feature</div>
              <div className="text-sm text-white/90">
                Present a seamless branded experience to your clients
              </div>
            </div>
          </div>
        </div>

        {/* White Label Settings Component */}
        <WhiteLabelSettings />
    </div>
  )
}
