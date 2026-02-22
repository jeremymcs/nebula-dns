/**
 * Nebula DNS - MSP Onboarding Success Confirmation
 * Displays created MSP details with action buttons
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { CheckCircleIcon } from '@heroicons/react/24/solid'
import type { MspTenantCreatedResponse } from '@/hooks/useApi'

/**
 * Props for SuccessConfirmation
 */
export interface SuccessConfirmationProps {
  msp: MspTenantCreatedResponse
  onViewDetails: (id: string) => void
  onCreateAnother: () => void
  onBackToList: () => void
}

/**
 * Format a date string for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

/**
 * Detail row component
 */
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1">
      <dt className="text-space-500 dark:text-space-400">{label}:</dt>
      <dd className="text-space-700 dark:text-space-300">{value}</dd>
    </div>
  )
}

/**
 * Success Confirmation
 *
 * Displayed after successfully creating an MSP account.
 * Shows MSP details and provides navigation options.
 */
export function SuccessConfirmation({
  msp,
  onViewDetails,
  onCreateAnother,
  onBackToList,
}: SuccessConfirmationProps) {
  return (
    <div className="bg-white dark:bg-space-800 rounded-2xl shadow-lg overflow-hidden">
      <div className="p-8 text-center">
        {/* Success Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-success-100 dark:bg-success-900/30">
          <CheckCircleIcon className="h-10 w-10 text-success-600 dark:text-success-400" />
        </div>

        {/* Heading */}
        <h3 className="mt-4 text-xl font-semibold text-space-900 dark:text-white">
          MSP Created Successfully
        </h3>
        <p className="mt-2 text-sm text-space-600 dark:text-space-400">
          {msp.name} has been created with admin {msp.adminEmail}
        </p>

        {/* Details Card */}
        <div className="mt-6 bg-space-50 dark:bg-space-900 rounded-xl p-4 text-left">
          <h4 className="font-medium text-space-900 dark:text-white mb-3">MSP Details</h4>
          <dl className="space-y-1 text-sm">
            <DetailRow
              label="ID"
              value={<span className="font-mono text-xs">{msp.id}</span>}
            />
            <DetailRow label="Slug" value={<span className="font-mono">{msp.slug}</span>} />
            <DetailRow
              label="Tier"
              value={
                <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs font-medium uppercase">
                  {msp.tier}
                </span>
              }
            />
            <DetailRow
              label="Status"
              value={
                <span className="px-2 py-0.5 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 rounded text-xs font-medium capitalize">
                  {msp.status}
                </span>
              }
            />
            <DetailRow
              label="Location Limit"
              value={
                msp.locationLimit !== null ? (
                  msp.locationLimit.toLocaleString()
                ) : (
                  <span className="text-success-600 dark:text-success-400">Unlimited</span>
                )
              }
            />
            <DetailRow
              label="Client Limit"
              value={
                msp.clientLimit !== null ? (
                  msp.clientLimit.toLocaleString()
                ) : (
                  <span className="text-success-600 dark:text-success-400">Unlimited</span>
                )
              }
            />
            <DetailRow
              label="Welcome Email"
              value={
                msp.welcomeEmailSent ? (
                  <span className="text-success-600 dark:text-success-400">Sent</span>
                ) : (
                  <span className="text-warning-600 dark:text-warning-400">Not sent</span>
                )
              }
            />
            <DetailRow label="Created" value={formatDate(msp.createdAt)} />
          </dl>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onBackToList}
            className="px-4 py-2 text-sm font-medium text-space-700 dark:text-space-300 bg-space-100 dark:bg-space-700 rounded-lg hover:bg-space-200 dark:hover:bg-space-600 transition-colors"
          >
            Back to MSPs
          </button>
          <button
            onClick={onCreateAnother}
            className="px-4 py-2 text-sm font-medium text-space-700 dark:text-space-300 bg-space-100 dark:bg-space-700 rounded-lg hover:bg-space-200 dark:hover:bg-space-600 transition-colors"
          >
            Create Another
          </button>
          <button
            onClick={() => onViewDetails(msp.id)}
            className="px-4 py-2 text-sm font-medium text-white bg-nebula-500 rounded-lg hover:bg-nebula-600 transition-colors"
          >
            View MSP Details
          </button>
        </div>
      </div>
    </div>
  )
}
