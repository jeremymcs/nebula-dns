// Nebula DNS - MSP Onboarding Wizard Component
// Multi-step wizard for creating new MSP accounts
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

import { WIZARD_STEPS, INITIAL_STATE } from './types'
import type { MspOnboardingState } from './types'
import {
  mspOnboardingSchema,
  STEP_FIELDS,
  type MspOnboardingFormData,
} from '@/lib/validations/msp-onboarding.schema'
import { createMspTenant } from '@/hooks/useAdminApi'
import type { MspTenantCreatedResponse } from '@/hooks/useAdminApi'
import { CompanyInfoStep, AdminUserStep, SettingsStep, ReviewStep } from './steps'
import { SuccessConfirmation } from './SuccessConfirmation'
import { useToast } from '@/components/Toast'

// localStorage draft persistence constants
const STORAGE_KEY = 'msp-onboarding-draft'
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Default form values
 */
const defaultValues: MspOnboardingFormData = {
  name: '',
  slug: '',
  contactEmail: '',
  contactPhone: '',
  adminEmail: '',
  adminName: '',
  locationLimit: null,
  clientLimit: null,
}

/**
 * MSP Onboarding Wizard
 *
 * 4-step wizard for creating new MSP accounts:
 * 1. Company Info - Organization name, slug, contact details
 * 2. Admin User - Initial admin email and name
 * 3. Settings - Location and client limits
 * 4. Review - Confirmation before creation
 */
export function MspOnboardingWizard() {
  const router = useRouter()
  const { showToast } = useToast()
  const [state, setState] = useState<MspOnboardingState>(INITIAL_STATE)
  const [createdMsp, setCreatedMsp] = useState<MspTenantCreatedResponse | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
    getValues,
    watch,
    setValue,
    reset,
  } = useForm<MspOnboardingFormData>({
    resolver: zodResolver(mspOnboardingSchema),
    mode: 'onBlur',
    defaultValues,
  })

  // Watch all form values for draft persistence
  const watchedValues = watch()

  // Restore draft from localStorage on mount
  useEffect(() => {
    if (draftRestored) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const { formData, step, savedAt } = JSON.parse(saved)
        if (Date.now() - savedAt < DRAFT_EXPIRY_MS) {
          reset(formData)
          setState((prev) => ({ ...prev, step }))
          showToast('info', 'Draft restored from previous session')
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setDraftRestored(true)
  }, [draftRestored, reset, showToast])

  // Save draft to localStorage when form changes (debounced)
  useEffect(() => {
    if (!draftRestored) return // Don't save until initial restore is done

    const timeoutId = setTimeout(() => {
      if (watchedValues.name) {
        // Only save if meaningful data exists
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            formData: watchedValues,
            step: state.step,
            savedAt: Date.now(),
          })
        )
      }
    }, 500) // Debounce 500ms

    return () => clearTimeout(timeoutId)
  }, [watchedValues, state.step, draftRestored])

  const currentStep = WIZARD_STEPS[state.step]
  const canGoBack = state.step > 0
  const isLastStep = state.step === WIZARD_STEPS.length - 1

  /**
   * Update wizard state
   */
  const updateState = useCallback((updates: Partial<MspOnboardingState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  /**
   * Navigate to next step with validation
   */
  const goNext = useCallback(async () => {
    // Validate current step fields
    const stepFields = STEP_FIELDS[state.step]
    if (stepFields && stepFields.length > 0) {
      const isValid = await trigger(stepFields)
      if (!isValid) return
    }

    if (state.step < WIZARD_STEPS.length - 1) {
      updateState({ step: state.step + 1 })
    }
  }, [state.step, trigger, updateState])

  /**
   * Navigate to previous step
   */
  const goBack = useCallback(() => {
    if (state.step > 0) {
      updateState({ step: state.step - 1 })
    }
  }, [state.step, updateState])

  /**
   * Jump to a completed step
   */
  const jumpToStep = useCallback((stepIndex: number) => {
    // Only allow jumping to completed steps or current step
    if (stepIndex <= state.step) {
      updateState({ step: stepIndex })
    }
  }, [state.step, updateState])

  /**
   * Submit the form (on final step)
   */
  const onSubmit = async (data: MspOnboardingFormData) => {
    if (state.isSubmitting) return

    updateState({ isSubmitting: true })

    try {
      const result = await createMspTenant({
        name: data.name,
        slug: data.slug || undefined,
        adminEmail: data.adminEmail,
        adminName: data.adminName || undefined,
        contactEmail: data.contactEmail || undefined,
        contactPhone: data.contactPhone || undefined,
        locationLimit: data.locationLimit,
        clientLimit: data.clientLimit,
      })

      // Clear draft on success
      localStorage.removeItem(STORAGE_KEY)

      setCreatedMsp(result)
      setIsComplete(true)
      updateState({ isSubmitting: false })
    } catch (error) {
      updateState({ isSubmitting: false })
      showToast('error', error instanceof Error ? error.message : 'Failed to create MSP')
    }
  }

  /**
   * Render step content
   */
  const renderStepContent = () => {
    const stepProps = {
      register,
      errors,
      watch,
      setValue,
      isSubmitting: state.isSubmitting,
    }

    switch (state.step) {
      case 0:
        return <CompanyInfoStep {...stepProps} />
      case 1:
        return <AdminUserStep {...stepProps} />
      case 2:
        return <SettingsStep {...stepProps} />
      case 3:
        return <ReviewStep {...stepProps} onJumpToStep={jumpToStep} />
      default:
        return null
    }
  }

  /**
   * Reset wizard for creating another MSP
   */
  const handleCreateAnother = () => {
    reset(defaultValues)
    setState(INITIAL_STATE)
    setCreatedMsp(null)
    setIsComplete(false)
  }

  // Show success state if completed
  if (isComplete && createdMsp) {
    return (
      <SuccessConfirmation
        msp={createdMsp}
        onViewDetails={(id) => router.push(`/mission-control/msps/${id}`)}
        onCreateAnother={handleCreateAnother}
        onBackToList={() => router.push('/mission-control/msps')}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="bg-white dark:bg-space-800 rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-space-200 dark:border-space-700">
          <h2 className="text-xl font-bold text-space-900 dark:text-white">
            {currentStep?.title}
          </h2>
          <p className="text-sm text-space-500 mt-1">
            {currentStep?.description}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 bg-space-50 dark:bg-space-900">
          <div className="flex items-center gap-2">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => jumpToStep(index)}
                  disabled={index > state.step}
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    index < state.step
                      ? 'bg-success-500 text-white cursor-pointer hover:bg-success-600'
                      : index === state.step
                        ? 'bg-nebula-500 text-white'
                        : 'bg-space-200 dark:bg-space-700 text-space-500 cursor-not-allowed'
                  )}
                >
                  {index < state.step ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </button>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={clsx(
                      'w-8 h-0.5 mx-1',
                      index < state.step
                        ? 'bg-success-500'
                        : 'bg-space-200 dark:bg-space-700'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => (
              <span
                key={step.id}
                className={clsx(
                  'text-xs',
                  index === state.step
                    ? 'text-nebula-600 dark:text-nebula-400 font-medium'
                    : 'text-space-500'
                )}
              >
                {step.title}
              </span>
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
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-space-200 dark:border-space-700 bg-space-50 dark:bg-space-900 flex justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={!canGoBack}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              canGoBack
                ? 'text-space-700 dark:text-space-300 hover:bg-space-200 dark:hover:bg-space-700'
                : 'text-space-400 cursor-not-allowed'
            )}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>
          {isLastStep ? (
            <button
              type="submit"
              disabled={state.isSubmitting}
              className={clsx(
                'flex items-center gap-2 px-6 py-2 rounded-lg transition-colors',
                state.isSubmitting
                  ? 'bg-nebula-400 cursor-not-allowed'
                  : 'bg-nebula-500 hover:bg-nebula-600',
                'text-white'
              )}
            >
              {state.isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  Create MSP
                  <CheckIcon className="h-4 w-4" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center gap-2 px-6 py-2 bg-nebula-500 text-white rounded-lg hover:bg-nebula-600 transition-colors"
            >
              Next
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
