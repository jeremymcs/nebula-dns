// Nebula DNS - MSP Onboarding Wizard Component
// Multi-step wizard for creating new MSP accounts
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState, useCallback } from 'react'
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
  const [state, setState] = useState<MspOnboardingState>(INITIAL_STATE)

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
    getValues,
  } = useForm<MspOnboardingFormData>({
    resolver: zodResolver(mspOnboardingSchema),
    mode: 'onBlur',
    defaultValues,
  })

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

      updateState({
        isSubmitting: false,
        isComplete: true,
        createdMsp: result,
      })
    } catch (error) {
      updateState({ isSubmitting: false })
      // Error will be handled by toast or inline error display in Plan 02
      console.error('Failed to create MSP:', error)
    }
  }

  /**
   * Render step content
   */
  const renderStepContent = () => {
    switch (state.step) {
      case 0:
        return (
          <div className="space-y-4">
            <p className="text-space-600 dark:text-space-400">
              Step 1 content coming in Plan 02 - Company Info form fields
            </p>
          </div>
        )
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-space-600 dark:text-space-400">
              Step 2 content coming in Plan 02 - Admin User form fields
            </p>
          </div>
        )
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-space-600 dark:text-space-400">
              Step 3 content coming in Plan 02 - Settings form fields
            </p>
          </div>
        )
      case 3:
        return (
          <div className="space-y-4">
            <p className="text-space-600 dark:text-space-400">
              Step 4 content coming in Plan 02 - Review and confirmation
            </p>
          </div>
        )
      default:
        return null
    }
  }

  // Show success state if completed
  if (state.isComplete && state.createdMsp) {
    return (
      <div className="bg-white dark:bg-space-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-success-100 dark:bg-success-900/30">
            <CheckIcon className="h-10 w-10 text-success-600 dark:text-success-400" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-space-900 dark:text-white">
            MSP Created Successfully
          </h3>
          <p className="mt-2 text-sm text-space-600 dark:text-space-400">
            {state.createdMsp.name} has been created with admin {state.createdMsp.adminEmail}
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={() => router.push('/mission-control/msps')}
              className="px-4 py-2 text-sm font-medium text-space-700 dark:text-space-300 bg-space-100 dark:bg-space-700 rounded-lg hover:bg-space-200 dark:hover:bg-space-600 transition-colors"
            >
              Back to MSPs
            </button>
            <button
              onClick={() => router.push(`/mission-control/msps/${state.createdMsp?.id}`)}
              className="px-4 py-2 text-sm font-medium text-white bg-nebula-500 rounded-lg hover:bg-nebula-600 transition-colors"
            >
              View MSP Details
            </button>
          </div>
        </div>
      </div>
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
