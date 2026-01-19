/**
 * Nebula DNS - Extend Trial Modal
 * Modal for extending tenant trial periods
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { adminBillingRequest, ExtensionResponse } from '@/hooks/useAdminBilling'

interface ExtendTrialModalProps {
  isOpen: boolean
  onClose: () => void
  tenantId: string
  tenantName: string
  currentTrialEnd?: string
  onSuccess: (response: ExtensionResponse) => void
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Calculate new end date given days to add
 */
function calculateNewEndDate(currentEndDate: string, days: number): Date {
  const date = new Date(currentEndDate)
  date.setDate(date.getDate() + days)
  return date
}

/**
 * Extend Trial Modal Component
 * Allows admin to extend trial period with days and reason
 */
export function ExtendTrialModal({
  isOpen,
  onClose,
  tenantId,
  tenantName,
  currentTrialEnd,
  onSuccess,
}: ExtendTrialModalProps) {
  const [days, setDays] = useState<number>(7)
  const [reason, setReason] = useState<string>('')
  const [notifyTenant, setNotifyTenant] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = days >= 1 && days <= 30 && reason.length >= 5

  /**
   * Reset form state
   */
  const resetForm = () => {
    setDays(7)
    setReason('')
    setNotifyTenant(false)
    setError(null)
  }

  /**
   * Handle modal close
   */
  const handleClose = () => {
    resetForm()
    onClose()
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await adminBillingRequest<ExtensionResponse>(
        'POST',
        `/admin/tenants/${tenantId}/billing/trial/extend`,
        { days, reason, notifyTenant }
      )
      onSuccess(response)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extend trial')
    } finally {
      setIsLoading(false)
    }
  }

  const newEndDate = currentTrialEnd
    ? calculateNewEndDate(currentTrialEnd, days)
    : null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Extend Trial Period"
      description={`Extend the trial period for ${tenantName}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current trial info */}
        {currentTrialEnd && (
          <div className="p-4 rounded-lg bg-space-50 dark:bg-space-800/50 border border-space-200 dark:border-space-700">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-space-500 dark:text-space-400">Current Trial Ends</p>
                <p className="text-sm font-medium text-space-900 dark:text-white mt-1">
                  {formatDate(currentTrialEnd)}
                </p>
              </div>
              {newEndDate && (
                <div>
                  <p className="text-xs text-space-500 dark:text-space-400">New End Date</p>
                  <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mt-1">
                    {formatDate(newEndDate.toISOString())}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Days to extend */}
        <div>
          <label
            htmlFor="trial-days"
            className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1"
          >
            Days to extend
          </label>
          <input
            id="trial-days"
            type="number"
            min={1}
            max={30}
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10) || 0)}
            className="w-full px-4 py-2 rounded-lg border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          />
          <p className="mt-1 text-xs text-space-500 dark:text-space-400">
            Minimum 1 day, maximum 30 days
          </p>
        </div>

        {/* Reason */}
        <div>
          <label
            htmlFor="trial-reason"
            className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1"
          >
            Reason for extension
          </label>
          <textarea
            id="trial-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the reason for extending the trial..."
            rows={2}
            minLength={5}
            maxLength={500}
            className="w-full px-4 py-2 rounded-lg border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white placeholder-space-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            required
          />
          <p className="mt-1 text-xs text-space-500 dark:text-space-400">
            {reason.length}/500 characters (minimum 5)
          </p>
        </div>

        {/* Notify tenant checkbox */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyTenant}
              onChange={(e) => setNotifyTenant(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-space-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-space-700 dark:text-space-300">
              Notify tenant via email
            </span>
          </label>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
            <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!isValid} isLoading={isLoading}>
            Extend Trial
          </Button>
        </div>
      </form>
    </Modal>
  )
}
