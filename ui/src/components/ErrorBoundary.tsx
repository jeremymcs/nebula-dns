/**
 * Nebula DNS - UI Error Handling
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Error Boundary Component with Enhanced Error Tracking
 */

'use client'

import { Component, ReactNode } from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  name?: string
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showReload?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error(`Error caught by ErrorBoundary${this.props.name ? ` (${this.props.name})` : ''}:`, {
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
    })

    // Update state with error info
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }))

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Send to error logging service (e.g., Sentry, LogRocket, etc.)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error tracking service
      // Example: Sentry.captureException(error, { extra: errorInfo })
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard'
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isDevelopment = process.env.NODE_ENV === 'development'
      const tooManyErrors = this.state.errorCount > 3

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-2xl">
            <div className="mx-auto w-16 h-16 bg-danger-100 dark:bg-danger-900/50 rounded-full flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="h-8 w-8 text-danger-600 dark:text-danger-400" />
            </div>

            <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-2">
              {tooManyErrors ? 'Persistent Error Detected' : 'Something went wrong'}
            </h2>

            <p className="text-sm text-space-600 dark:text-space-400 mb-4">
              {tooManyErrors
                ? 'Multiple errors occurred. Please reload the page or return to the dashboard.'
                : this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>

            {/* Development-only error details */}
            {isDevelopment && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="bg-danger-50 dark:bg-danger-900/20 rounded-lg p-4 text-xs font-mono overflow-auto max-h-60">
                  <p className="text-danger-800 dark:text-danger-300 mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <p className="text-danger-700 dark:text-danger-400 whitespace-pre-wrap">
                      <strong>Stack:</strong><br />
                      {this.state.error.stack}
                    </p>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <p className="text-danger-700 dark:text-danger-400 whitespace-pre-wrap mt-2">
                      <strong>Component Stack:</strong><br />
                      {this.state.errorInfo.componentStack}
                    </p>
                  )}
                </div>
              </details>
            )}

            <div className="flex items-center justify-center gap-3 mt-6">
              {!tooManyErrors && (
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <ArrowPathIcon className="h-5 w-5 mr-2" />
                  Try Again
                </button>
              )}

              {(this.props.showReload || tooManyErrors) && (
                <button
                  onClick={this.handleReload}
                  className="inline-flex items-center px-4 py-2 bg-space-600 text-white rounded-lg hover:bg-space-700 transition-colors"
                >
                  <ArrowPathIcon className="h-5 w-5 mr-2" />
                  Reload Page
                </button>
              )}

              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center px-4 py-2 border border-space-300 dark:border-space-700 text-space-700 dark:text-space-300 rounded-lg hover:bg-space-50 dark:hover:bg-space-800 transition-colors"
              >
                <HomeIcon className="h-5 w-5 mr-2" />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components
export function useErrorHandler() {
  return (error: Error) => {
    console.error('Error handled:', error)
    throw error
  }
}

// Error fallback component for API errors
export function ApiErrorFallback({
  error,
  retry
}: {
  error?: Error | null
  retry?: () => void
}) {
  return (
    <div className="p-6 bg-danger-50 dark:bg-danger-900/30 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-start">
        <ExclamationTriangleIcon className="h-5 w-5 text-danger-600 dark:text-danger-400 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-danger-800 dark:text-danger-200">Failed to load data</h3>
          <p className="mt-1 text-sm text-danger-700 dark:text-danger-300">
            {error?.message || 'Unable to connect to the server. Please check your connection and try again.'}
          </p>
          {retry && (
            <button
              onClick={retry}
              className="mt-3 inline-flex items-center text-sm font-medium text-danger-700 dark:text-danger-300 hover:text-danger-800 dark:hover:text-danger-200"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Empty state component
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-space-400 dark:text-space-500" />
      <h3 className="mt-2 text-sm font-medium text-space-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-space-500 dark:text-space-400">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
