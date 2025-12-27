/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Onboarding Wizard - Device-first setup experience
 */

'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { OnboardingState, ONBOARDING_STEPS } from './types'
import { DeviceTypeSelector } from './DeviceTypeSelector'
import { PlatformSelector } from './PlatformSelector'
import { PolicyTemplateSelector } from './PolicyTemplateSelector'
import { SetupMethodSelector } from './SetupMethodSelector'
import { VerificationStep } from './VerificationStep'
import { ArrowLeftIcon, ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (state: OnboardingState) => void
}

export function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const [state, setState] = useState<OnboardingState>({
    step: 0,
    isComplete: false,
  })

  const currentStep = ONBOARDING_STEPS[state.step]
  const canGoBack = state.step > 0
  const canGoNext = state.step < ONBOARDING_STEPS.length - 1

  const updateState = useCallback((updates: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  const goNext = useCallback(() => {
    if (state.step === ONBOARDING_STEPS.length - 1) {
      updateState({ isComplete: true })
      onComplete(state)
    } else {
      updateState({ step: state.step + 1 })
    }
  }, [state, updateState, onComplete])

  const goBack = useCallback(() => {
    if (state.step > 0) {
      updateState({ step: state.step - 1 })
    }
  }, [state.step, updateState])

  const renderStep = () => {
    switch (currentStep?.component) {
      case 'DeviceTypeSelector':
        return <DeviceTypeSelector selected={state.deviceType} onSelect={(type) => { updateState({ deviceType: type }); goNext() }} />
      case 'PlatformSelector':
        return <PlatformSelector deviceType={state.deviceType} selected={state.platform} onSelect={(platform) => { updateState({ platform }); goNext() }} />
      case 'PolicyTemplateSelector':
        return <PolicyTemplateSelector selected={state.policyTemplate} onSelect={(template) => { updateState({ policyTemplate: template }); goNext() }} />
      case 'SetupMethodSelector':
        return <SetupMethodSelector platform={state.platform} selected={state.setupMethod} onSelect={(method) => { updateState({ setupMethod: method }); goNext() }} />
      case 'VerificationStep':
        return <VerificationStep onVerified={goNext} />
      default:
        return null
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-space-900 via-nebula-900 to-space-900 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-space-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-space-200 dark:border-space-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-space-900 dark:text-white">{currentStep?.title}</h2>
            <p className="text-sm text-space-500 mt-1">{currentStep?.description}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg">
            <XMarkIcon className="h-5 w-5 text-space-500" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 bg-space-50 dark:bg-space-900">
          <div className="flex items-center gap-2">
            {ONBOARDING_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  index < state.step ? 'bg-green-500 text-white' :
                  index === state.step ? 'bg-nebula-500 text-white' :
                  'bg-space-200 dark:bg-space-700 text-space-500'
                )}>
                  {index < state.step ? '✓' : index + 1}
                </div>
                {index < ONBOARDING_STEPS.length - 1 && (
                  <div className={clsx('w-8 h-0.5 mx-1', index < state.step ? 'bg-green-500' : 'bg-space-200 dark:bg-space-700')} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-space-200 dark:border-space-700 bg-space-50 dark:bg-space-900 flex justify-between">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              canGoBack ? 'text-space-700 dark:text-space-300 hover:bg-space-200 dark:hover:bg-space-700' : 'text-space-400 cursor-not-allowed'
            )}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={goNext}
            className="flex items-center gap-2 px-6 py-2 bg-nebula-500 text-white rounded-lg hover:bg-nebula-600 transition-colors"
          >
            {state.step === ONBOARDING_STEPS.length - 1 ? 'Complete' : 'Skip'}
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

