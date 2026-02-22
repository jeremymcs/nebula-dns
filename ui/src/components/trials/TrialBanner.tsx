/**
 * Nebula DNS - Trial Banner Component
 * Displays trial status banner with days remaining and conversion option (US-032, US-033)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState } from 'react'
import { ClockIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useTrial, TIER_NAMES } from '@/hooks/useTrial'
import { Button } from '@/components/ui/Button'
import { ConvertTrialModal } from './ConvertTrialModal'

interface TrialBannerProps {
  className?: string
  onClose?: () => void
  dismissible?: boolean
}

export function TrialBanner({ className, onClose, dismissible = false }: TrialBannerProps) {
  const { hasActiveTrial, trialTier, daysRemaining, endsAt, isConverting } = useTrial()
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Don't render if no active trial or dismissed
  if (!hasActiveTrial || !trialTier || dismissed) {
    return null
  }

  const isUrgent = daysRemaining !== undefined && daysRemaining <= 3
  const formattedEndDate = endsAt
    ? new Date(endsAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const handleDismiss = () => {
    setDismissed(true)
    onClose?.()
  }

  return (
    <>
      <div
        className={clsx(
          'relative px-4 py-3 rounded-lg',
          isUrgent
            ? 'bg-gradient-to-r from-warning-500/10 to-danger-500/10 border border-warning-500/20'
            : 'bg-gradient-to-r from-accent-500/10 to-primary-500/10 border border-accent-500/20',
          className
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isUrgent ? (
              <div className="flex-shrink-0 p-2 rounded-lg bg-warning-500/20">
                <ClockIcon className="w-5 h-5 text-warning-500" />
              </div>
            ) : (
              <div className="flex-shrink-0 p-2 rounded-lg bg-accent-500/20">
                <SparklesIcon className="w-5 h-5 text-accent-500" />
              </div>
            )}

            <div className="flex-1">
              <p className="text-sm font-medium text-space-900 dark:text-white">
                {isUrgent ? (
                  <>
                    Your {TIER_NAMES[trialTier]} trial ends in{' '}
                    <span className="text-warning-600 dark:text-warning-400 font-bold">
                      {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                    </span>
                  </>
                ) : (
                  <>
                    You're trying {TIER_NAMES[trialTier]} -{' '}
                    <span className="text-accent-600 dark:text-accent-400 font-bold">
                      {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                    </span>
                  </>
                )}
              </p>
              {formattedEndDate && (
                <p className="text-xs text-space-500 dark:text-space-400 mt-0.5">
                  Trial ends on {formattedEndDate}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isUrgent ? 'primary' : 'accent'}
              size="sm"
              onClick={() => setShowConvertModal(true)}
              isLoading={isConverting}
            >
              Convert to Paid
            </Button>

            {dismissible && (
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-md text-space-400 hover:text-space-600 dark:hover:text-space-300 hover:bg-space-100 dark:hover:bg-space-700 transition-colors"
                aria-label="Dismiss trial banner"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <ConvertTrialModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
      />
    </>
  )
}

// Minimal banner for tight spaces (e.g., sidebar)
export function TrialBannerCompact({ className }: { className?: string }) {
  const { hasActiveTrial, trialTier, daysRemaining } = useTrial()
  const [showConvertModal, setShowConvertModal] = useState(false)

  if (!hasActiveTrial || !trialTier) {
    return null
  }

  const isUrgent = daysRemaining !== undefined && daysRemaining <= 3

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConvertModal(true)}
        className={clsx(
          'w-full px-3 py-2 rounded-lg text-left transition-colors',
          isUrgent
            ? 'bg-warning-500/10 hover:bg-warning-500/20 border border-warning-500/20'
            : 'bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/20',
          className
        )}
      >
        <div className="flex items-center gap-2">
          {isUrgent ? (
            <ClockIcon className="w-4 h-4 text-warning-500 flex-shrink-0" />
          ) : (
            <SparklesIcon className="w-4 h-4 text-accent-500 flex-shrink-0" />
          )}
          <span
            className={clsx(
              'text-xs font-medium truncate',
              isUrgent ? 'text-warning-600 dark:text-warning-400' : 'text-accent-600 dark:text-accent-400'
            )}
          >
            {TIER_NAMES[trialTier]} Trial - {daysRemaining}d left
          </span>
        </div>
      </button>

      <ConvertTrialModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
      />
    </>
  )
}
