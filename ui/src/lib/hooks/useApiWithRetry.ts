// Nebula DNS - UI API Hook with Retry Logic
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/components/Toast'

interface UseApiOptions {
  maxRetries?: number
  retryDelay?: number
  exponentialBackoff?: boolean
  showErrorToast?: boolean
  showSuccessToast?: boolean
  successMessage?: string
}

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  retryCount: number
}

export function useApiWithRetry<T = any>(
  options: UseApiOptions = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    showErrorToast = true,
    showSuccessToast = false,
    successMessage,
  } = options

  const { showToast } = useToast()

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0,
  })

  const execute = useCallback(
    async (apiCall: () => Promise<T>, customRetries?: number): Promise<T | null> => {
      const maxAttempts = customRetries !== undefined ? customRetries : maxRetries

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }))

      for (let attempt = 0; attempt <= maxAttempts; attempt++) {
        try {
          const result = await apiCall()

          setState({
            data: result,
            loading: false,
            error: null,
            retryCount: attempt,
          })

          if (showSuccessToast && successMessage) {
            showToast('success', successMessage)
          }

          return result
        } catch (error) {
          const err = error as Error
          const isLastAttempt = attempt === maxAttempts

          if (isLastAttempt) {
            setState({
              data: null,
              loading: false,
              error: err,
              retryCount: attempt,
            })

            if (showErrorToast) {
              showToast(
                'error',
                'Request Failed',
                err.message || 'An unexpected error occurred. Please try again.'
              )
            }

            return null
          }

          // Calculate delay with exponential backoff
          const delay = exponentialBackoff
            ? retryDelay * Math.pow(2, attempt)
            : retryDelay

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay))

          // Update retry count
          setState(prev => ({
            ...prev,
            retryCount: attempt + 1,
          }))
        }
      }

      return null
    },
    [maxRetries, retryDelay, exponentialBackoff, showErrorToast, showSuccessToast, successMessage, showToast]
  )

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      retryCount: 0,
    })
  }, [])

  return {
    ...state,
    execute,
    reset,
  }
}

// Simplified hook for single API call with automatic retry
export function useApiCall<T = any>(
  apiCall: () => Promise<T>,
  options: UseApiOptions = {}
) {
  const api = useApiWithRetry<T>(options)

  const call = useCallback(() => {
    return api.execute(apiCall)
  }, [api, apiCall])

  return {
    ...api,
    call,
  }
}
