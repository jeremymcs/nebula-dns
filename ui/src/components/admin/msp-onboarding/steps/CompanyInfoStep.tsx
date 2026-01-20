// Nebula DNS - MSP Onboarding Step 1: Company Info
// Form fields for MSP organization details
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useMemo } from 'react'
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
 * Generate a slug from a company name
 * - Lowercase
 * - Replace spaces with hyphens
 * - Remove special characters
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Step 1: Company Information
 *
 * Collects basic MSP organization details:
 * - Name (required)
 * - Slug (optional, auto-generated preview)
 * - Contact Email (optional)
 * - Contact Phone (optional)
 */
export function CompanyInfoStep({ register, errors, watch, isSubmitting }: StepProps) {
  const nameValue = watch('name')
  const slugValue = watch('slug')

  // Generate slug preview from name if slug is empty
  const slugPreview = useMemo(() => {
    if (slugValue) return null
    if (!nameValue) return null
    return slugify(nameValue)
  }, [nameValue, slugValue])

  return (
    <div className="space-y-4">
      <Input
        label="MSP Organization Name"
        {...register('name')}
        error={errors.name?.message}
        disabled={isSubmitting}
        placeholder="Acme Managed Services"
      />

      <div>
        <Input
          label="URL Slug (optional)"
          {...register('slug')}
          error={errors.slug?.message}
          disabled={isSubmitting}
          placeholder="acme-managed-services"
          helperText="Auto-generated from name if empty. Lowercase letters, numbers, hyphens only."
        />
        {slugPreview && (
          <p className="mt-1 text-xs text-space-500 dark:text-space-400">
            Preview: <span className="font-mono text-nebula-600 dark:text-nebula-400">{slugPreview}</span>
          </p>
        )}
      </div>

      <Input
        label="Contact Email (optional)"
        type="email"
        {...register('contactEmail')}
        error={errors.contactEmail?.message}
        disabled={isSubmitting}
        placeholder="support@company.com"
      />

      <Input
        label="Contact Phone (optional)"
        type="tel"
        {...register('contactPhone')}
        error={errors.contactPhone?.message}
        disabled={isSubmitting}
        placeholder="+1-555-123-4567"
      />
    </div>
  )
}
