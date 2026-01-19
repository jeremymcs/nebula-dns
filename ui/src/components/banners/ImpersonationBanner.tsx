/**
 * Nebula DNS - Impersonation Banner Component
 * Persistent amber banner shown when admin is viewing as tenant
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { EyeIcon } from '@heroicons/react/24/outline'
import { ImpersonationInfo } from '@/lib/impersonation'

interface ImpersonationBannerProps {
  impersonationInfo: ImpersonationInfo
  onEndImpersonation: () => void
}

/**
 * Get display label for tenant tier
 */
function getTierLabel(tier: ImpersonationInfo['tenantTier']): string {
  switch (tier) {
    case 'msp':
      return 'MSP'
    case 'enterprise':
      return 'Business'
    case 'home':
      return 'Home'
    default:
      return tier
  }
}

/**
 * ImpersonationBanner - Always visible during impersonation
 *
 * Per CONTEXT.md:
 * - Full-width amber/yellow banner at top of screen
 * - Always visible - cannot be dismissed during impersonation
 * - Shows: "Viewing as: [Tenant Name] (MSP/Business/Home)" with End Impersonation button
 */
export function ImpersonationBanner({
  impersonationInfo,
  onEndImpersonation,
}: ImpersonationBannerProps) {
  const tierLabel = getTierLabel(impersonationInfo.tenantTier)

  return (
    <div
      className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between"
      role="alert"
      aria-live="polite"
    >
      <span className="text-sm font-medium flex items-center gap-2">
        <EyeIcon className="h-4 w-4 flex-shrink-0" />
        <span>
          Viewing as: <strong>{impersonationInfo.tenantName}</strong> ({tierLabel})
        </span>
      </span>
      <button
        onClick={onEndImpersonation}
        className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors font-medium"
      >
        End Impersonation
      </button>
    </div>
  )
}

export default ImpersonationBanner
