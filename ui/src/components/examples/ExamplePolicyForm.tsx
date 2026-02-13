// Nebula DNS - Example Policy Form with Full Validation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// This is a complete example showing:
// - Form validation with Zod
// - React Hook Form integration
// - Error handling with Toast notifications
// - API retry logic
// - Error boundaries

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { policySchema } from '@/lib/validations'
import { z } from 'zod'

// Use z.input for form data to handle defaults properly
type PolicyFormData = z.input<typeof policySchema>
import { FormField, Input, Select, Textarea, Checkbox } from '@/components/forms'
import { useToast } from '@/components/Toast'
import { useApiWithRetry } from '@/lib/hooks/useApiWithRetry'
import { ErrorBoundary, ApiErrorFallback } from '@/components/ErrorBoundary'
import { useState } from 'react'
import { API_URL } from '@/lib/api'

export function ExamplePolicyForm() {
  const { showToast } = useToast()
  const [submitError, setSubmitError] = useState<Error | null>(null)

  const api = useApiWithRetry<PolicyFormData>({
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    showErrorToast: false, // We'll handle toasts manually for this example
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<PolicyFormData>({
    resolver: zodResolver(policySchema),
    mode: 'onBlur',
    defaultValues: {
      priority: 50,
      enabled: true,
      logging: true,
      safesearch: false,
      action: 'block',
    },
  })

  const selectedAction = watch('action')

  const onSubmit = async (data: PolicyFormData) => {
    setSubmitError(null)

    const result = await api.execute(async () => {
      // Simulate API call
      const response = await fetch(`${API_URL}/api/v1/policies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create policy')
      }

      return response.json()
    })

    if (result) {
      showToast('success', 'Policy Created', `${data.name} has been created successfully.`)
      reset() // Reset form on success
    } else if (api.error) {
      setSubmitError(api.error)
      showToast(
        'error',
        'Failed to Create Policy',
        `${api.error.message}${api.retryCount > 0 ? ` (Attempted ${api.retryCount} retries)` : ''}`
      )
    }
  }

  return (
    <ErrorBoundary name="PolicyForm">
      <div className="max-w-2xl mx-auto bg-white dark:bg-space-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-6">
          Create DNS Policy
        </h2>

        {/* Show API error with retry option */}
        {submitError && (
          <div className="mb-6">
            <ApiErrorFallback
              error={submitError}
              retry={() => handleSubmit(onSubmit)()}
            />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">
              Basic Information
            </h3>

            <FormField
              label="Policy Name"
              error={errors.name?.message}
              hint="Use letters, numbers, spaces, hyphens, and underscores only"
              required
            >
              <Input
                {...register('name')}
                placeholder="Block Social Media"
                error={!!errors.name}
                disabled={api.loading}
              />
            </FormField>

            <FormField
              label="Description"
              error={errors.description?.message}
              hint="Optional description of what this policy does"
            >
              <Textarea
                {...register('description')}
                placeholder="Blocks access to social media sites during work hours"
                error={!!errors.description}
                disabled={api.loading}
              />
            </FormField>
          </div>

          {/* Policy Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">
              Configuration
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Action" error={errors.action?.message} required>
                <Select
                  {...register('action')}
                  error={!!errors.action}
                  disabled={api.loading}
                >
                  <option value="allow">Allow</option>
                  <option value="block">Block</option>
                  <option value="redirect">Redirect</option>
                </Select>
              </FormField>

              <FormField
                label="Priority"
                error={errors.priority?.message}
                hint="1-100 (higher = more important)"
                required
              >
                <Input
                  {...register('priority', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  max={100}
                  placeholder="50"
                  error={!!errors.priority}
                  disabled={api.loading}
                />
              </FormField>
            </div>

            {/* Conditional redirect URL field */}
            {selectedAction === 'redirect' && (
              <FormField
                label="Redirect URL"
                error={errors.redirectUrl?.message}
                hint="URL to redirect blocked requests to"
                required
              >
                <Input
                  {...register('redirectUrl')}
                  type="url"
                  placeholder="https://example.com"
                  error={!!errors.redirectUrl}
                  disabled={api.loading}
                />
              </FormField>
            )}
          </div>

          {/* Policy Options */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">
              Options
            </h3>

            <Checkbox
              {...register('enabled')}
              label="Enable this policy immediately"
              disabled={api.loading}
            />

            <Checkbox
              {...register('logging')}
              label="Log all queries matched by this policy"
              disabled={api.loading}
            />

            <Checkbox
              {...register('safesearch')}
              label="Enforce SafeSearch on search engines"
              disabled={api.loading}
            />
          </div>

          {/* Loading/Retry indicator */}
          {api.loading && api.retryCount > 0 && (
            <div className="p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
              <p className="text-sm text-warning-800 dark:text-warning-200">
                Request failed. Retrying... (Attempt {api.retryCount} of 3)
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-space-200 dark:border-space-700">
            <button
              type="button"
              onClick={() => reset()}
              className="px-4 py-2 border border-space-300 dark:border-space-600 text-space-700 dark:text-space-300 rounded-lg hover:bg-space-50 dark:hover:bg-space-700 transition-colors"
              disabled={api.loading}
            >
              Reset
            </button>

            <button
              type="submit"
              disabled={api.loading || isSubmitting}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {api.loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating Policy...
                </>
              ) : (
                'Create Policy'
              )}
            </button>
          </div>
        </form>

        {/* Development Mode: Show Form State */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-medium text-space-600 dark:text-space-400">
              Debug: Form State
            </summary>
            <pre className="mt-2 p-4 bg-space-50 dark:bg-space-900 rounded-lg text-xs overflow-auto">
              {JSON.stringify(
                {
                  values: watch(),
                  errors,
                  isSubmitting,
                  apiLoading: api.loading,
                  retryCount: api.retryCount,
                },
                null,
                2
              )}
            </pre>
          </details>
        )}
      </div>
    </ErrorBoundary>
  )
}
