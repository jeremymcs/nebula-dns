// Nebula DNS - Tier Features Hook
// React hook for checking tier-based feature access in components
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { hasFeature, canAccessRoute, getUpgradeMessage, type FeatureKey } from '@/lib/tier-features'

/**
 * Hook for checking tier-based feature access in components
 *
 * @example
 * ```tsx
 * const { hasAccess, canAccess, upgradeMessage, tier } = useTierFeatures()
 *
 * if (hasAccess('siem')) {
 *   return <SiemIntegrations />
 * }
 *
 * return <UpgradePrompt message={upgradeMessage('siem')} />
 * ```
 */
export function useTierFeatures() {
  const { tier, isHome, isEnterprise, isMspTier } = useAuth()

  /**
   * Check if current tier has access to a specific feature
   */
  const hasAccess = (feature: FeatureKey): boolean => {
    return hasFeature(tier, feature)
  }

  /**
   * Check if current tier can access a specific route
   */
  const canAccess = (route: string): boolean => {
    return canAccessRoute(tier, route)
  }

  /**
   * Get upgrade message for a feature
   */
  const upgradeMessage = (feature: FeatureKey): string => {
    if (!tier) return 'Please login to access this feature'
    return getUpgradeMessage(tier, feature)
  }

  /**
   * Check if current tier is at or above a required tier level
   */
  const meetsMinimumTier = (requiredTier: 'home' | 'enterprise' | 'msp'): boolean => {
    if (!tier) return false

    const tierLevels = {
      home: 1,
      enterprise: 2,
      msp: 3,
    }

    return tierLevels[tier] >= tierLevels[requiredTier]
  }

  return {
    // Tier info
    tier,
    isHome,
    isEnterprise,
    isMsp: isMspTier,

    // Feature checks
    hasAccess,
    canAccess,
    upgradeMessage,
    meetsMinimumTier,
  }
}

/**
 * Hook for requiring a specific feature in a component
 * Redirects to dashboard if access is denied
 *
 * @example
 * ```tsx
 * function SiemPage() {
 *   useRequireFeature('siem')
 *   // Component only renders if user has SIEM access
 * }
 * ```
 */
export function useRequireFeature(feature: FeatureKey) {
  const { hasAccess } = useTierFeatures()
  const { push } = useRouter()

  useEffect(() => {
    if (!hasAccess(feature)) {
      push('/dashboard')
    }
  }, [hasAccess, feature, push])

  return hasAccess(feature)
}

/**
 * Hook for requiring a minimum tier level
 * Shows upgrade prompt if tier is insufficient
 *
 * @example
 * ```tsx
 * function EnterprisePage() {
 *   const { hasAccess, UpgradePrompt } = useRequireTier('enterprise')
 *
 *   if (!hasAccess) {
 *     return <UpgradePrompt />
 *   }
 *
 *   return <EnterpriseContent />
 * }
 * ```
 */
export function useRequireTier(requiredTier: 'home' | 'enterprise' | 'msp') {
  const { tier, meetsMinimumTier } = useTierFeatures()
  const hasAccess = meetsMinimumTier(requiredTier)

  const UpgradePrompt = () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
          <svg
            className="h-8 w-8 text-primary-600 dark:text-primary-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-2">
          Upgrade Required
        </h2>
        <p className="text-space-600 dark:text-space-400 mb-6">
          This feature requires {requiredTier === 'enterprise' ? 'Enterprise' : 'MSP'} tier.
          {tier === 'home' && ' Upgrade to unlock advanced security features.'}
        </p>
        <a
          href="/dashboard/billing"
          className="inline-flex items-center px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
        >
          Upgrade to {requiredTier === 'enterprise' ? 'Enterprise' : 'MSP'}
        </a>
      </div>
    </div>
  )

  return {
    hasAccess,
    tier,
    requiredTier,
    UpgradePrompt,
  }
}

// Re-export for convenience
export { type FeatureKey } from '@/lib/tier-features'
