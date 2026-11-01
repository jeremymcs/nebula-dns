/**
 * Nebula DNS - Impersonation Handler Page
 * Receives impersonation token from Admin UI and sets up session
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  bootstrapImpersonationSession,
  parseImpersonationParams,
} from '@/lib/impersonation-session'
import { ADMIN_UI_URL } from '@/lib/api'

export default function ImpersonatePage() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const token = searchParams.get('token')
      const info = searchParams.get('info')

      const parsed = parseImpersonationParams(token, info)
      if ('error' in parsed) {
        if (!cancelled) {
          setError(parsed.error)
        }
        return
      }

      try {
        await bootstrapImpersonationSession(parsed.token, parsed.info)
        if (!cancelled) {
          window.location.href = '/dashboard'
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to set up impersonation session'
          setError(message)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-space-900">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-space-900 dark:text-white mb-2">
            Impersonation Failed
          </h1>
          <p className="text-space-500 dark:text-space-400">{error}</p>
          <a
            href={ADMIN_UI_URL}
            className="mt-4 inline-block text-primary-600 hover:text-primary-700"
          >
            Return to Admin Portal
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-space-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
        <p className="mt-4 text-space-500 dark:text-space-400">
          Setting up impersonation session...
        </p>
      </div>
    </div>
  )
}
