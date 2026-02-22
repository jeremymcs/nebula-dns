/**
 * Nebula DNS - MSP Onboarding Step 2: Admin User
 * Form fields for initial admin user setup
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import { Input } from '@/components/ui/Input'
import type { MspOnboardingFormData } from '@/lib/validations/msp-onboarding.schema'

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
 * Step 2: Admin User
 *
 * Collects initial administrator details:
 * - Admin Email (required)
 * - Admin Name (optional)
 */
export function AdminUserStep({ register, errors, isSubmitting }: StepProps) {
  return (
    <div className="space-y-4">
      <Input
        label="Admin Email"
        type="email"
        {...register('adminEmail')}
        error={errors.adminEmail?.message}
        disabled={isSubmitting}
        placeholder="admin@company.com"
        helperText="A welcome email with login credentials will be sent to this address"
      />

      <Input
        label="Admin Name (optional)"
        {...register('adminName')}
        error={errors.adminName?.message}
        disabled={isSubmitting}
        placeholder="John Smith"
      />
    </div>
  )
}
