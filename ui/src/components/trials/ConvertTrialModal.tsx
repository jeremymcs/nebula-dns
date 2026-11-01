/**
 * Nebula DNS - Convert Trial Modal Component
 * Modal for converting a trial to a paid subscription (US-033)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState } from 'react'
import {
  CreditCardIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  useTrial,
  TenantTier,
  BillingCycle,
  TIER_NAMES,
  TIER_FEATURES,
} from '@/hooks/useTrial'

interface ConvertTrialModalProps {
  isOpen: boolean
  onClose: () => void
}

// Placeholder prices - in production these would come from the API
const TIER_PRICES: Record<TenantTier, { monthly: number; yearly: number }> = {
  home: { monthly: 0, yearly: 0 },
  enterprise: { monthly: 29, yearly: 290 },
  msp: { monthly: 99, yearly: 990 },
}

export function ConvertTrialModal({ isOpen, onClose }: ConvertTrialModalProps) {
  const {
    hasActiveTrial,
    trialTier,
    daysRemaining,
    convertTrial,
    isConverting,
    error,
  } = useTrial()

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [localError, setLocalError] = useState<string | null>(null)

  // Safety check
  if (!hasActiveTrial || !trialTier) {
    return null
  }

  const prices = TIER_PRICES[trialTier]
  const currentPrice = billingCycle === 'yearly' ? prices.yearly : prices.monthly
  const yearlyDiscount = Math.round(
    ((prices.monthly * 12 - prices.yearly) / (prices.monthly * 12)) * 100
  )

  const handleConvert = async () => {
    setLocalError(null)
    const result = await convertTrial(billingCycle)

    if (!result?.success) {
      setLocalError(error || 'Failed to convert trial')
    }
    // If successful with checkout URL, the hook will redirect
    // If successful without URL (dev mode), we close the modal
    if (result?.success && !result.checkoutUrl) {
      onClose()
    }
  }

  const handleClose = () => {
    setLocalError(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Upgrade to ${TIER_NAMES[trialTier]}`}
      size="lg"
    >
      {/* Current trial info */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 mb-6">
        <SparklesIcon className="w-5 h-5 text-accent-500" />
        <div>
          <p className="text-sm font-medium text-accent-700 dark:text-accent-300">
            You have {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left on your trial
          </p>
          <p className="text-xs text-accent-600 dark:text-accent-400">
            Convert now to keep all your settings and continue using {TIER_NAMES[trialTier]} features
          </p>
        </div>
      </div>

      {/* Billing cycle selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-3">
          Select billing cycle
        </label>
        <div className="grid grid-cols-2 gap-4">
          <BillingOption
            cycle="monthly"
            price={prices.monthly}
            isSelected={billingCycle === 'monthly'}
            onSelect={() => setBillingCycle('monthly')}
          />
          <BillingOption
            cycle="yearly"
            price={prices.yearly}
            isSelected={billingCycle === 'yearly'}
            onSelect={() => setBillingCycle('yearly')}
            discount={yearlyDiscount}
          />
        </div>
      </div>

      {/* Features included */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-space-700 dark:text-space-300 mb-3">
          What's included in {TIER_NAMES[trialTier]}
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {TIER_FEATURES[trialTier].map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-2 text-sm text-space-600 dark:text-space-400"
            >
              <CheckCircleIcon className="w-4 h-4 text-success-500 flex-shrink-0 mt-0.5" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Error message */}
      {(localError || error) && (
        <div className="mb-4 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
          <p className="text-sm text-danger-700 dark:text-danger-400">
            {localError || error}
          </p>
        </div>
      )}

      {/* Summary and actions */}
      <div className="flex items-center justify-between pt-4 border-t border-space-200 dark:border-space-700">
        <div>
          <p className="text-sm text-space-500 dark:text-space-400">Total today</p>
          <p className="text-2xl font-bold text-space-900 dark:text-white">
            ${currentPrice}
            <span className="text-sm font-normal text-space-500">
              /{billingCycle === 'yearly' ? 'year' : 'month'}
            </span>
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={isConverting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConvert}
            isLoading={isConverting}
            leftIcon={<CreditCardIcon className="w-4 h-4" />}
          >
            Subscribe Now
          </Button>
        </div>
      </div>

      {/* Money-back guarantee */}
      <p className="mt-4 text-xs text-center text-space-500 dark:text-space-400">
        30-day money-back guarantee. Cancel anytime.
      </p>
    </Modal>
  )
}

interface BillingOptionProps {
  cycle: BillingCycle
  price: number
  isSelected: boolean
  onSelect: () => void
  discount?: number
}

function BillingOption({
  cycle,
  price,
  isSelected,
  onSelect,
  discount,
}: BillingOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'relative p-4 rounded-lg border-2 text-left transition-all',
        isSelected
          ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
          : 'border-space-200 dark:border-space-700 hover:border-accent-300 dark:hover:border-accent-700'
      )}
    >
      {discount && discount > 0 && (
        <span className="absolute -top-2 right-3 px-2 py-0.5 text-xs font-semibold rounded-full bg-success-500 text-white">
          Save {discount}%
        </span>
      )}

      <div className="flex items-center gap-2 mb-2">
        <div
          className={clsx(
            'w-4 h-4 rounded-full border-2 flex items-center justify-center',
            isSelected
              ? 'border-accent-500 bg-accent-500'
              : 'border-space-300 dark:border-space-600'
          )}
        >
          {isSelected && (
            <div className="w-2 h-2 rounded-full bg-panel" />
          )}
        </div>
        <span
          className={clsx(
            'text-sm font-medium',
            isSelected
              ? 'text-accent-700 dark:text-accent-300'
              : 'text-space-700 dark:text-space-300'
          )}
        >
          {cycle === 'yearly' ? 'Annual' : 'Monthly'}
        </span>
      </div>

      <p className="text-lg font-bold text-space-900 dark:text-white">
        ${price}
        <span className="text-sm font-normal text-space-500">
          /{cycle === 'yearly' ? 'year' : 'month'}
        </span>
      </p>

      {cycle === 'yearly' && (
        <p className="text-xs text-space-500 dark:text-space-400 mt-1">
          ${(price / 12).toFixed(0)}/month billed annually
        </p>
      )}
    </button>
  )
}

// Inline convert button for use in other components
interface ConvertTrialButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children?: React.ReactNode
}

export function ConvertTrialButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
}: ConvertTrialButtonProps) {
  const { hasActiveTrial } = useTrial()
  const [isOpen, setIsOpen] = useState(false)

  if (!hasActiveTrial) {
    return null
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={className}
        leftIcon={<CreditCardIcon className="w-4 h-4" />}
      >
        {children || 'Convert to Paid'}
      </Button>

      <ConvertTrialModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
