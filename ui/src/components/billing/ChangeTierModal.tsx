/**
 * Nebula DNS - Change Tier Modal
 * Modal for changing tenant subscription tier with feature comparison
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { adminBillingRequest, TierChangeResponse } from '@/hooks/useAdminBilling'

type Tier = 'home' | 'enterprise' | 'msp'
type Timing = 'immediate' | 'end_of_period'

interface ChangeTierModalProps {
  isOpen: boolean
  onClose: () => void
  tenantId: string
  tenantName: string
  currentTier: Tier
  onSuccess: (response: TierChangeResponse) => void
}

/**
 * Tier feature definitions
 * Hardcoded per research recommendation (can be made dynamic later)
 */
const TIER_FEATURES: Record<Tier, { name: string; features: Array<{ name: string; included: boolean }> }> = {
  home: {
    name: 'Home',
    features: [
      { name: 'Basic DNS filtering', included: true },
      { name: '1 location', included: true },
      { name: 'Family sharing', included: true },
      { name: 'Advanced filtering', included: false },
      { name: 'Unlimited locations', included: false },
      { name: 'API access', included: false },
      { name: 'SSO', included: false },
      { name: 'Multi-tenant management', included: false },
      { name: 'Client billing', included: false },
      { name: 'Templates', included: false },
    ],
  },
  enterprise: {
    name: 'Enterprise',
    features: [
      { name: 'Basic DNS filtering', included: true },
      { name: '1 location', included: true },
      { name: 'Family sharing', included: true },
      { name: 'Advanced filtering', included: true },
      { name: 'Unlimited locations', included: true },
      { name: 'API access', included: true },
      { name: 'SSO', included: true },
      { name: 'Multi-tenant management', included: false },
      { name: 'Client billing', included: false },
      { name: 'Templates', included: false },
    ],
  },
  msp: {
    name: 'MSP',
    features: [
      { name: 'Basic DNS filtering', included: true },
      { name: '1 location', included: true },
      { name: 'Family sharing', included: true },
      { name: 'Advanced filtering', included: true },
      { name: 'Unlimited locations', included: true },
      { name: 'API access', included: true },
      { name: 'SSO', included: true },
      { name: 'Multi-tenant management', included: true },
      { name: 'Client billing', included: true },
      { name: 'Templates', included: true },
    ],
  },
}

const TIERS: Tier[] = ['home', 'enterprise', 'msp']

/**
 * Feature list component
 */
function FeatureList({ features }: { features: Array<{ name: string; included: boolean }> }) {
  return (
    <ul className="space-y-2">
      {features.map((feature) => (
        <li key={feature.name} className="flex items-center gap-2 text-sm">
          {feature.included ? (
            <CheckIcon className="h-4 w-4 text-success-600 dark:text-success-400 flex-shrink-0" />
          ) : (
            <XMarkIcon className="h-4 w-4 text-space-400 flex-shrink-0" />
          )}
          <span
            className={clsx(
              feature.included
                ? 'text-space-700 dark:text-space-300'
                : 'text-space-400 line-through'
            )}
          >
            {feature.name}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Change Tier Modal Component
 * Side-by-side comparison for tier changes
 */
export function ChangeTierModal({
  isOpen,
  onClose,
  tenantId,
  tenantName,
  currentTier,
  onSuccess,
}: ChangeTierModalProps) {
  const [newTier, setNewTier] = useState<Tier>(currentTier)
  const [timing, setTiming] = useState<Timing>('immediate')
  const [reason, setReason] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = newTier !== currentTier && reason.length >= 5

  /**
   * Reset form state
   */
  const resetForm = () => {
    setNewTier(currentTier)
    setTiming('immediate')
    setReason('')
    setError(null)
  }

  /**
   * Handle modal close
   */
  const handleClose = () => {
    resetForm()
    onClose()
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await adminBillingRequest<TierChangeResponse>(
        'POST',
        `/admin/tenants/${tenantId}/billing/tier`,
        { newTier, timing, reason }
      )
      onSuccess(response)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change tier')
    } finally {
      setIsLoading(false)
    }
  }

  const currentTierInfo = TIER_FEATURES[currentTier]
  const newTierInfo = TIER_FEATURES[newTier]

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Subscription Tier"
      description={`Update the subscription tier for ${tenantName}`}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Tier */}
          <div className="p-4 rounded-lg border border-space-200 dark:border-space-700 bg-space-50 dark:bg-space-800/50">
            <h4 className="text-sm font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider mb-3">
              Current Tier
            </h4>
            <p className="text-xl font-bold text-space-900 dark:text-white mb-4">
              {currentTierInfo.name}
            </p>
            <FeatureList features={currentTierInfo.features} />
          </div>

          {/* New Tier */}
          <div className={clsx(
            'p-4 rounded-lg border',
            newTier !== currentTier
              ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20'
              : 'border-space-200 dark:border-space-700 bg-space-50 dark:bg-space-800/50'
          )}>
            <h4 className="text-sm font-semibold text-space-500 dark:text-space-400 uppercase tracking-wider mb-3">
              New Tier
            </h4>
            <select
              value={newTier}
              onChange={(e) => setNewTier(e.target.value as Tier)}
              className="w-full px-3 py-2 mb-4 rounded-lg border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 text-lg font-bold text-space-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {TIER_FEATURES[tier].name}
                </option>
              ))}
            </select>
            <FeatureList features={newTierInfo.features} />
          </div>
        </div>

        {/* Change indicator */}
        {newTier !== currentTier && (
          <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
            <p className="text-sm text-primary-700 dark:text-primary-300">
              {newTier === 'msp' || (newTier === 'enterprise' && currentTier === 'home')
                ? 'Upgrading'
                : 'Downgrading'}{' '}
              from <span className="font-semibold">{currentTierInfo.name}</span> to{' '}
              <span className="font-semibold">{newTierInfo.name}</span>
            </p>
          </div>
        )}

        {/* Timing selection */}
        <div>
          <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
            When should the change take effect?
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="timing"
                value="immediate"
                checked={timing === 'immediate'}
                onChange={() => setTiming('immediate')}
                className="w-4 h-4 text-primary-600 border-space-300 focus:ring-primary-500"
              />
              <span className="text-sm text-space-700 dark:text-space-300">Immediately</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="timing"
                value="end_of_period"
                checked={timing === 'end_of_period'}
                onChange={() => setTiming('end_of_period')}
                className="w-4 h-4 text-primary-600 border-space-300 focus:ring-primary-500"
              />
              <span className="text-sm text-space-700 dark:text-space-300">End of billing period</span>
            </label>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label
            htmlFor="tier-reason"
            className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1"
          >
            Reason for change
          </label>
          <textarea
            id="tier-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the reason for this tier change..."
            rows={2}
            minLength={5}
            maxLength={500}
            className="w-full px-4 py-2 rounded-lg border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white placeholder-space-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            required
          />
          <p className="mt-1 text-xs text-space-500 dark:text-space-400">
            {reason.length}/500 characters (minimum 5)
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
            <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!isValid} isLoading={isLoading}>
            Change Tier
          </Button>
        </div>
      </form>
    </Modal>
  )
}
