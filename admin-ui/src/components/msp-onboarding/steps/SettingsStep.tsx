/**
 * Nebula DNS - MSP Onboarding Step 3: Settings
 * Form fields for MSP limits and configuration
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import { Input } from '@/components/ui/Input'
import type { MspOnboardingFormData } from '@/lib/validations/msp-onboarding.schema'
import clsx from 'clsx'

/**
 * Props for step components
 */
export interface StepProps {
  register: UseFormRegister<MspOnboardingFormData>
  errors: FieldErrors<MspOnboardingFormData>
  watch: UseFormWatch<MspOnboardingFormData>
  setValue: UseFormSetValue<MspOnboardingFormData>
  isSubmitting: boolean
}

/**
 * Preset configurations for quick setup
 */
const PRESETS = [
  { label: 'Starter (50/10)', locationLimit: 50, clientLimit: 10 },
  { label: 'Growth (200/50)', locationLimit: 200, clientLimit: 50 },
  { label: 'Unlimited', locationLimit: null, clientLimit: null },
] as const

/**
 * Step 3: Settings
 *
 * Configures MSP limits:
 * - Location Limit (optional, 1-10,000)
 * - Client Limit (optional, 1-10,000)
 * - Preset buttons for quick configuration
 */
export function SettingsStep({ register, errors, watch, setValue, isSubmitting }: StepProps) {
  const locationLimit = watch('locationLimit')
  const clientLimit = watch('clientLimit')

  /**
   * Apply a preset configuration
   */
  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setValue('locationLimit', preset.locationLimit, { shouldValidate: true })
    setValue('clientLimit', preset.clientLimit, { shouldValidate: true })
  }

  /**
   * Check if current values match a preset
   */
  const isPresetActive = (preset: (typeof PRESETS)[number]): boolean => {
    return locationLimit === preset.locationLimit && clientLimit === preset.clientLimit
  }

  return (
    <div className="space-y-6">
      {/* Preset buttons */}
      <div>
        <label className="label mb-2">Quick Presets</label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              disabled={isSubmitting}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                isPresetActive(preset)
                  ? 'bg-nebula-500 text-white'
                  : 'bg-space-100 dark:bg-space-700 text-space-700 dark:text-space-300 hover:bg-space-200 dark:hover:bg-space-600',
                isSubmitting && 'opacity-50 cursor-not-allowed'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Location Limit */}
      <Input
        label="Location Limit"
        type="number"
        {...register('locationLimit', {
          setValueAs: (v) => (v === '' || v === undefined ? null : parseInt(v, 10)),
        })}
        error={errors.locationLimit?.message}
        disabled={isSubmitting}
        placeholder="Leave empty for unlimited"
        helperText="Maximum network locations this MSP can create (1-10,000)"
        min={1}
        max={10000}
      />

      {/* Client Limit */}
      <Input
        label="Client Limit"
        type="number"
        {...register('clientLimit', {
          setValueAs: (v) => (v === '' || v === undefined ? null : parseInt(v, 10)),
        })}
        error={errors.clientLimit?.message}
        disabled={isSubmitting}
        placeholder="Leave empty for unlimited"
        helperText="Maximum client organizations this MSP can manage (1-10,000)"
        min={1}
        max={10000}
      />
    </div>
  )
}
