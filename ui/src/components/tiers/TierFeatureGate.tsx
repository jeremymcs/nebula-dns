'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useTierFeatures } from '@/hooks/useTierFeatures'
import type { FeatureKey } from '@/lib/tier-features'

interface TierFeatureGateProps {
  feature: FeatureKey
  children: ReactNode
}

/**
 * Renders children when the current tenant tier includes `feature`;
 * otherwise shows an inline upgrade prompt (used by E2E tier access tests).
 */
export function TierFeatureGate({ feature, children }: TierFeatureGateProps) {
  const { hasAccess, upgradeMessage } = useTierFeatures()

  if (hasAccess(feature)) {
    return <>{children}</>
  }

  const message = upgradeMessage(feature)
  const needsMsp = message.toLowerCase().includes('msp')

  return (
    <div className="flex items-center justify-center min-h-[400px] px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-2">Upgrade Required</h2>
        <p className="text-space-600 dark:text-space-400 mb-6">{message}</p>
        <Link
          href="/dashboard/billing"
          className="inline-flex items-center px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
        >
          {needsMsp ? 'Upgrade to MSP' : 'Upgrade to Enterprise'}
        </Link>
      </div>
    </div>
  )
}
