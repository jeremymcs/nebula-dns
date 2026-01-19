/**
 * Nebula DNS - Apply Credit Modal
 * Modal for applying billing credits to tenant accounts
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { adminBillingRequest, CreditAppliedResponse } from '@/hooks/useAdminBilling'

interface ApplyCreditModalProps {
  isOpen: boolean
  onClose: () => void
  tenantId: string
  tenantName: string
  onSuccess: (response: CreditAppliedResponse) => void
}

/**
 * Apply Credit Modal Component
 * Allows admin to apply billing credits with amount and reason
 */
export function ApplyCreditModal({
  isOpen,
  onClose,
  tenantId,
  tenantName,
  onSuccess,
}: ApplyCreditModalProps) {
  const [amount, setAmount] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // Convert amount to cents
  const amountCents = Math.round(parseFloat(amount || '0') * 100)
  const isValid = amountCents >= 100 && amountCents <= 1000000 && reason.length >= 5

  /**
   * Reset form state
   */
  const resetForm = () => {
    setAmount('')
    setReason('')
    setError(null)
    setShowConfirm(false)
  }

  /**
   * Handle modal close
   */
  const handleClose = () => {
    resetForm()
    onClose()
  }

  /**
   * Handle form submission - show confirmation
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setShowConfirm(true)
  }

  /**
   * Handle confirmed credit application
   */
  const handleConfirm = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await adminBillingRequest<CreditAppliedResponse>(
        'POST',
        `/admin/tenants/${tenantId}/billing/credits`,
        { amountCents, reason }
      )
      onSuccess(response)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply credit')
      setShowConfirm(false)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Format amount for display
   */
  const formatAmount = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Apply Credit"
      description={`Add billing credit to ${tenantName}`}
      size="md"
    >
      {showConfirm ? (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
            <p className="text-sm text-space-700 dark:text-space-300">
              Apply <span className="font-semibold text-primary-700 dark:text-primary-300">{formatAmount(amountCents)}</span> credit to <span className="font-semibold">{tenantName}</span>?
            </p>
            <p className="mt-2 text-xs text-space-500 dark:text-space-400">
              Reason: {reason}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
              <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowConfirm(false)}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              isLoading={isLoading}
            >
              Confirm Credit
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="credit-amount"
              className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1"
            >
              Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-space-500">$</span>
              <input
                id="credit-amount"
                type="number"
                step="0.01"
                min="1"
                max="10000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-4 py-2 rounded-lg border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white placeholder-space-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <p className="mt-1 text-xs text-space-500 dark:text-space-400">
              Minimum $1.00, maximum $10,000.00
            </p>
          </div>

          <div>
            <label
              htmlFor="credit-reason"
              className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1"
            >
              Reason
            </label>
            <textarea
              id="credit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter the reason for applying this credit..."
              rows={3}
              minLength={5}
              maxLength={500}
              className="w-full px-4 py-2 rounded-lg border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white placeholder-space-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              required
            />
            <p className="mt-1 text-xs text-space-500 dark:text-space-400">
              {reason.length}/500 characters (minimum 5)
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
              <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!isValid}>
              Continue
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
