/**
 * Nebula DNS - Add Payment Method Modal
 * Stripe Elements form for secure card collection
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { Modal, Button, Skeleton } from '@/components/ui'
import { stripePromise } from '@/lib/stripe'
import { adminBillingRequest, CreateSetupIntentResponse } from '@/hooks/useAdminBilling'

interface AddPaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  tenantId: string
  tenantName: string
  onSuccess: () => void
}

/**
 * Inner payment form component that uses Stripe hooks
 */
interface PaymentFormProps {
  tenantName: string
  onSuccess: () => void
  onError: (error: string) => void
}

function PaymentForm({ tenantName, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          // No redirect - we handle success/error inline
          return_url: window.location.href,
        },
        redirect: 'if_required',
      })

      if (error) {
        // Card validation or setup error
        setErrorMessage(error.message || 'Failed to add payment method')
        onError(error.message || 'Failed to add payment method')
      } else {
        // Success - payment method was attached
        onSuccess()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setErrorMessage(message)
      onError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-sm text-space-600 dark:text-space-400 mb-4">
        Adding payment method for <span className="font-semibold text-space-900 dark:text-white">{tenantName}</span>
      </div>

      {/* Stripe PaymentElement */}
      <div className="rounded-lg border border-space-200 dark:border-space-700 p-4 bg-white dark:bg-space-900">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
          <ExclamationCircleIcon className="h-5 w-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700 dark:text-danger-300">{errorMessage}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-space-200 dark:border-space-700">
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={() => {
            // Parent will handle close
            onError('')
          }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={!stripe || !elements}
        >
          Add Payment Method
        </Button>
      </div>
    </form>
  )
}

/**
 * Loading state while fetching SetupIntent
 */
function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-48" />
      <div className="rounded-lg border border-space-200 dark:border-space-700 p-4">
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-10 w-full mb-4" />
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  )
}

/**
 * Error state when SetupIntent creation fails
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-8">
      <ExclamationCircleIcon className="mx-auto h-12 w-12 text-danger-500" />
      <h3 className="mt-4 text-lg font-semibold text-space-900 dark:text-white">
        Unable to load payment form
      </h3>
      <p className="mt-2 text-sm text-space-500 dark:text-space-400 max-w-sm mx-auto">
        {message}
      </p>
      <Button variant="primary" onClick={onRetry} className="mt-6">
        Try Again
      </Button>
    </div>
  )
}

/**
 * Warning when Stripe is not configured
 */
function StripeNotConfiguredState() {
  return (
    <div className="text-center py-8">
      <ExclamationCircleIcon className="mx-auto h-12 w-12 text-warning-500" />
      <h3 className="mt-4 text-lg font-semibold text-space-900 dark:text-white">
        Payment system unavailable
      </h3>
      <p className="mt-2 text-sm text-space-500 dark:text-space-400 max-w-sm mx-auto">
        Stripe is not configured. Please set the NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable.
      </p>
    </div>
  )
}

export function AddPaymentMethodModal({
  isOpen,
  onClose,
  tenantId,
  tenantName,
  onSuccess,
}: AddPaymentMethodModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingSecret, setIsLoadingSecret] = useState(false)

  /**
   * Fetch SetupIntent client secret from backend
   */
  const fetchSetupIntent = async () => {
    setIsLoadingSecret(true)
    setError(null)

    try {
      const response = await adminBillingRequest<CreateSetupIntentResponse>(
        'POST',
        `/admin/tenants/${tenantId}/billing/payment-methods`
      )
      setClientSecret(response.clientSecret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize payment form')
    } finally {
      setIsLoadingSecret(false)
    }
  }

  // Fetch SetupIntent when modal opens
  useEffect(() => {
    if (isOpen && !clientSecret && !isLoadingSecret && !error) {
      fetchSetupIntent()
    }
  }, [isOpen, clientSecret, isLoadingSecret, error])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setClientSecret(null)
      setError(null)
      setIsLoadingSecret(false)
    }
  }, [isOpen])

  /**
   * Handle successful payment method addition
   */
  const handleSuccess = () => {
    onSuccess()
    onClose()
  }

  /**
   * Handle error from payment form (empty string means cancel)
   */
  const handleError = (errorMsg: string) => {
    if (errorMsg === '') {
      onClose()
    }
    // Other errors are displayed inline in the form
  }

  // Check if Stripe publishable key is configured
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const isStripeConfigured = stripeKey && stripeKey.length > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Payment Method"
      size="md"
    >
      {!isStripeConfigured ? (
        <StripeNotConfiguredState />
      ) : isLoadingSecret ? (
        <LoadingState />
      ) : error && !clientSecret ? (
        <ErrorState message={error} onRetry={fetchSetupIntent} />
      ) : clientSecret ? (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#6366f1',
                colorBackground: '#ffffff',
                colorText: '#1f2937',
                fontFamily: 'Inter, system-ui, sans-serif',
                borderRadius: '8px',
              },
            },
          }}
        >
          <PaymentForm
            tenantName={tenantName}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </Elements>
      ) : null}
    </Modal>
  )
}
