/**
 * Nebula DNS - Trial Hook
 * Hook for managing tier upgrade trials (US-032, US-033)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import useSWR from 'swr'
import { useState, useCallback } from 'react'
import { api, ApiError } from '@/lib/api'

export type TenantTier = 'home' | 'enterprise' | 'msp'
export type TrialStatus = 'active' | 'converted' | 'expired' | 'cancelled'
export type BillingCycle = 'monthly' | 'yearly'

export interface TrialStatusData {
  hasActiveTrial: boolean
  trialTier?: TenantTier
  originalTier?: TenantTier
  startedAt?: string
  endsAt?: string
  daysRemaining?: number
  status?: TrialStatus
  availableTrials?: TenantTier[]
}

export interface TrialHistoryItem {
  id: string
  trialTier: TenantTier
  originalTier: TenantTier
  startedAt: string
  endsAt: string
  status: TrialStatus
  endedAt?: string | null
  convertedAt?: string | null
}

export interface StartTrialResult {
  success: boolean
  trialTier: TenantTier
  endsAt: string
  trialDays: number
  message?: string
}

export interface ConvertTrialResult {
  success: boolean
  checkoutUrl?: string
  sessionId?: string
  message?: string
}

// Fetcher for SWR
const fetcher = async (): Promise<TrialStatusData> => {
  const response = await api.getTrialStatus()
  return response.data
}

const historyFetcher = async (): Promise<TrialHistoryItem[]> => {
  const response = await api.getTrialHistory()
  return response.data
}

export function useTrial() {
  const [isStarting, setIsStarting] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch trial status with SWR
  const {
    data: trialStatus,
    isLoading,
    mutate: refreshStatus,
  } = useSWR<TrialStatusData>('/trials/status', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    errorRetryCount: 2,
  })

  // Start a trial for a specific tier
  const startTrial = useCallback(
    async (tier: TenantTier, billingCycle?: BillingCycle): Promise<StartTrialResult | null> => {
      setIsStarting(true)
      setError(null)

      try {
        const result = await api.startTrial(tier, billingCycle)
        // Refresh status after starting trial
        await refreshStatus()
        return result
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to start trial'
        setError(message)
        return null
      } finally {
        setIsStarting(false)
      }
    },
    [refreshStatus]
  )

  // Convert trial to paid subscription
  const convertTrial = useCallback(
    async (billingCycle?: BillingCycle): Promise<ConvertTrialResult | null> => {
      setIsConverting(true)
      setError(null)

      try {
        const result = await api.convertTrial(billingCycle)

        // If we got a checkout URL, redirect to it
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl
        } else {
          // Direct conversion (development mode)
          await refreshStatus()
        }

        return result
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to convert trial'
        setError(message)
        return null
      } finally {
        setIsConverting(false)
      }
    },
    [refreshStatus]
  )

  // Cancel the active trial
  const cancelTrial = useCallback(async (): Promise<boolean> => {
    setIsCancelling(true)
    setError(null)

    try {
      await api.cancelTrial()
      await refreshStatus()
      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to cancel trial'
      setError(message)
      return false
    } finally {
      setIsCancelling(false)
    }
  }, [refreshStatus])

  // Helper to check if a specific tier can be trialed
  const canTrialTier = useCallback(
    (tier: TenantTier): boolean => {
      if (!trialStatus) return false
      if (trialStatus.hasActiveTrial) return false
      return trialStatus.availableTrials?.includes(tier) ?? false
    },
    [trialStatus]
  )

  return {
    // Status
    trialStatus,
    isLoading,
    error,

    // State flags
    hasActiveTrial: trialStatus?.hasActiveTrial ?? false,
    trialTier: trialStatus?.trialTier,
    originalTier: trialStatus?.originalTier,
    daysRemaining: trialStatus?.daysRemaining,
    endsAt: trialStatus?.endsAt,
    availableTrials: trialStatus?.availableTrials ?? [],

    // Actions
    startTrial,
    convertTrial,
    cancelTrial,
    refreshStatus,

    // Helper
    canTrialTier,

    // Loading states
    isStarting,
    isConverting,
    isCancelling,
  }
}

// Separate hook for trial history
export function useTrialHistory() {
  const {
    data: history,
    isLoading,
    error,
    mutate: refresh,
  } = useSWR<TrialHistoryItem[]>('/trials/history', historyFetcher, {
    revalidateOnFocus: false,
  })

  return {
    history: history ?? [],
    isLoading,
    error,
    refresh,
  }
}

// Tier display names
export const TIER_NAMES: Record<TenantTier, string> = {
  home: 'Home',
  enterprise: 'Enterprise',
  msp: 'MSP',
}

// Tier descriptions
export const TIER_DESCRIPTIONS: Record<TenantTier, string> = {
  home: 'Perfect for personal and home use',
  enterprise: 'Advanced features for businesses',
  msp: 'Multi-tenant management for service providers',
}

// Tier features for display
export const TIER_FEATURES: Record<TenantTier, string[]> = {
  home: [
    'Basic DNS filtering',
    'Content categories',
    'Query logging',
    '1 location',
  ],
  enterprise: [
    'Everything in Home, plus:',
    'Advanced threat protection',
    'Custom block pages',
    'SIEM integration',
    'Multiple locations',
    'Priority support',
  ],
  msp: [
    'Everything in Enterprise, plus:',
    'Multi-tenant management',
    'Client billing & invoicing',
    'Policy templates',
    'White-label options',
    'API access',
    'Unlimited clients',
  ],
}
