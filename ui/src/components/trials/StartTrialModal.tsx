/**
 * Nebula DNS - Start Trial Modal Component
 * Modal for starting a tier trial with feature preview (US-032)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState } from 'react'
import {
  SparklesIcon,
  CheckIcon,
  BuildingOfficeIcon,
  HomeIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  useTrial,
  TenantTier,
  TIER_NAMES,
  TIER_DESCRIPTIONS,
  TIER_FEATURES,
} from '@/hooks/useTrial'

interface StartTrialModalProps {
  isOpen: boolean
  onClose: () => void
  tier?: TenantTier // Pre-selected tier
}

const TIER_ICONS: Record<TenantTier, typeof HomeIcon> = {
  home: HomeIcon,
  enterprise: BuildingOfficeIcon,
  msp: ServerStackIcon,
}

const TRIAL_DAYS = 14

export function StartTrialModal({ isOpen, onClose, tier: preselectedTier }: StartTrialModalProps) {
  const { availableTrials, startTrial, isStarting, canTrialTier, error } = useTrial()
  const [selectedTier, setSelectedTier] = useState<TenantTier | null>(preselectedTier ?? null)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleStartTrial = async () => {
    if (!selectedTier) return

    setLocalError(null)
    const result = await startTrial(selectedTier)

    if (result?.success) {
      onClose()
    } else if (error) {
      setLocalError(error)
    }
  }

  const handleClose = () => {
    setLocalError(null)
    setSelectedTier(preselectedTier ?? null)
    onClose()
  }

  // If no tiers available for trial
  if (availableTrials.length === 0 && isOpen) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Trial Not Available" size="md">
        <div className="text-center py-6">
          <div className="mx-auto w-12 h-12 rounded-xl bg-space-100 dark:bg-space-800 flex items-center justify-center mb-4">
            <SparklesIcon className="w-6 h-6 text-space-400" />
          </div>
          <p className="text-space-600 dark:text-space-400">
            You've already tried all available tiers, or you're on the highest tier.
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Start Your Free Trial"
      description={`Try a higher tier for ${TRIAL_DAYS} days with no commitment.`}
      size="lg"
    >
      {/* Tier Selection */}
      <div className="space-y-3 mt-4">
        {availableTrials.map((tier) => {
          const TierIcon = TIER_ICONS[tier]
          const isSelected = selectedTier === tier
          const canTrial = canTrialTier(tier)

          return (
            <button
              key={tier}
              type="button"
              onClick={() => canTrial && setSelectedTier(tier)}
              disabled={!canTrial}
              className={clsx(
                'w-full p-4 rounded-xl text-left transition-all',
                'border-2',
                isSelected
                  ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                  : canTrial
                    ? 'border-space-200 dark:border-space-700 hover:border-accent-300 dark:hover:border-accent-700'
                    : 'border-space-100 dark:border-space-800 opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={clsx(
                    'flex-shrink-0 p-3 rounded-xl',
                    isSelected
                      ? 'bg-accent-500 text-white'
                      : 'bg-space-100 dark:bg-space-800 text-space-500 dark:text-space-400'
                  )}
                >
                  <TierIcon className="w-6 h-6" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className={clsx(
                        'font-semibold',
                        isSelected
                          ? 'text-accent-700 dark:text-accent-300'
                          : 'text-space-900 dark:text-white'
                      )}
                    >
                      {TIER_NAMES[tier]}
                    </h3>
                    {!canTrial && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-space-100 dark:bg-space-800 text-space-500">
                        Already trialed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-space-500 dark:text-space-400 mt-0.5">
                    {TIER_DESCRIPTIONS[tier]}
                  </p>

                  {/* Features list */}
                  <ul className="mt-3 space-y-1">
                    {TIER_FEATURES[tier].map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-space-600 dark:text-space-400"
                      >
                        <CheckIcon className="w-4 h-4 text-success-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Selection indicator */}
                <div
                  className={clsx(
                    'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    isSelected
                      ? 'border-accent-500 bg-accent-500'
                      : 'border-space-300 dark:border-space-600'
                  )}
                >
                  {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Error message */}
      {(localError || error) && (
        <div className="mt-4 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
          <p className="text-sm text-danger-700 dark:text-danger-400">
            {localError || error}
          </p>
        </div>
      )}

      {/* Trial info */}
      <div className="mt-4 p-4 rounded-lg bg-space-50 dark:bg-space-800/50">
        <div className="flex items-center gap-2 text-sm text-space-600 dark:text-space-400">
          <SparklesIcon className="w-4 h-4" />
          <span>
            <strong>{TRIAL_DAYS}-day free trial</strong> - no credit card required.
            After the trial, you'll return to your current tier unless you upgrade.
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={handleClose} disabled={isStarting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleStartTrial}
          disabled={!selectedTier || isStarting}
          isLoading={isStarting}
          leftIcon={<SparklesIcon className="w-4 h-4" />}
        >
          Start {TRIAL_DAYS}-Day Trial
        </Button>
      </div>
    </Modal>
  )
}

// Button that opens the trial modal
interface StartTrialButtonProps {
  tier?: TenantTier
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children?: React.ReactNode
}

export function StartTrialButton({
  tier,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: StartTrialButtonProps) {
  const { canTrialTier, availableTrials } = useTrial()
  const [isOpen, setIsOpen] = useState(false)

  // Check if this tier (or any tier) can be trialed
  const canStartTrial = tier ? canTrialTier(tier) : availableTrials.length > 0

  if (!canStartTrial) {
    return null
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={className}
        leftIcon={<SparklesIcon className="w-4 h-4" />}
      >
        {children || 'Start 14-Day Free Trial'}
      </Button>

      <StartTrialModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tier={tier}
      />
    </>
  )
}
