/**
 * Nebula DNS - MSP Onboarding Step 4: Review
 * Read-only summary of all entered data with Edit buttons
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import { PencilIcon } from '@heroicons/react/24/outline'
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
 * Props for ReviewStep
 */
export interface ReviewStepProps extends StepProps {
  onJumpToStep: (step: number) => void
}

/**
 * Section component for grouping related fields
 */
function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-space-50 dark:bg-space-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-space-900 dark:text-white">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-xs text-nebula-600 dark:text-nebula-400 hover:text-nebula-700 dark:hover:text-nebula-300 transition-colors"
        >
          <PencilIcon className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>
      <dl className="space-y-2">{children}</dl>
    </div>
  )
}

/**
 * Row component for displaying a label/value pair
 */
function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start">
      <dt className="text-sm text-space-500 dark:text-space-400">{label}</dt>
      <dd className="text-sm text-space-900 dark:text-white text-right">{value}</dd>
    </div>
  )
}

/**
 * Step 4: Review
 *
 * Displays a read-only summary of all entered data organized by section.
 * Each section has an Edit button that jumps back to the relevant step.
 */
export function ReviewStep({ watch, onJumpToStep }: ReviewStepProps) {
  const name = watch('name')
  const slug = watch('slug')
  const contactEmail = watch('contactEmail')
  const contactPhone = watch('contactPhone')
  const adminEmail = watch('adminEmail')
  const adminName = watch('adminName')
  const locationLimit = watch('locationLimit')
  const clientLimit = watch('clientLimit')

  return (
    <div className="space-y-4">
      <p className="text-sm text-space-600 dark:text-space-400 mb-4">
        Please review the information below before creating the MSP account.
      </p>

      {/* Section 1: Company Information */}
      <ReviewSection title="Company Information" onEdit={() => onJumpToStep(0)}>
        <ReviewRow label="Name" value={name} />
        <ReviewRow
          label="Slug"
          value={
            slug ? (
              <span className="font-mono">{slug}</span>
            ) : (
              <span className="italic text-space-400 dark:text-space-500">Auto-generated</span>
            )
          }
        />
        <ReviewRow
          label="Contact Email"
          value={contactEmail || <span className="text-space-400 dark:text-space-500">-</span>}
        />
        <ReviewRow
          label="Contact Phone"
          value={contactPhone || <span className="text-space-400 dark:text-space-500">-</span>}
        />
      </ReviewSection>

      {/* Section 2: Admin User */}
      <ReviewSection title="Admin User" onEdit={() => onJumpToStep(1)}>
        <ReviewRow label="Email" value={adminEmail} />
        <ReviewRow
          label="Name"
          value={adminName || <span className="text-space-400 dark:text-space-500">-</span>}
        />
      </ReviewSection>

      {/* Section 3: Settings */}
      <ReviewSection title="Settings" onEdit={() => onJumpToStep(2)}>
        <ReviewRow
          label="Location Limit"
          value={
            locationLimit !== null && locationLimit !== undefined ? (
              locationLimit.toLocaleString()
            ) : (
              <span className="text-success-600 dark:text-success-400">Unlimited</span>
            )
          }
        />
        <ReviewRow
          label="Client Limit"
          value={
            clientLimit !== null && clientLimit !== undefined ? (
              clientLimit.toLocaleString()
            ) : (
              <span className="text-success-600 dark:text-success-400">Unlimited</span>
            )
          }
        />
      </ReviewSection>
    </div>
  )
}
