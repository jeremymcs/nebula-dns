/**
 * Nebula DNS - Impersonation Hook
 * React hook for managing impersonation state
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ImpersonationInfo,
  getImpersonationInfo,
  getImpersonationToken,
  clearImpersonation,
  isImpersonating as checkIsImpersonating,
} from '@/lib/impersonation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

/**
 * End impersonation session via API
 * Blacklists the impersonation token on server
 */
async function endImpersonationApi(): Promise<void> {
  const token = getImpersonationToken()
  if (!token) return

  try {
    await fetch(`${API_URL}/admin/impersonate/end`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  } catch {
    // Continue with cleanup even if API fails
    console.warn('Failed to end impersonation via API')
  }
}

export function useImpersonation() {
  const [impersonationInfo, setImpersonationInfo] = useState<ImpersonationInfo | null>(null)
  const [isImpersonating, setIsImpersonating] = useState(false)

  // Read impersonation state on mount and storage changes
  useEffect(() => {
    const updateState = () => {
      setImpersonationInfo(getImpersonationInfo())
      setIsImpersonating(checkIsImpersonating())
    }

    updateState()

    // Listen for storage changes (e.g., from other tabs)
    window.addEventListener('storage', updateState)
    return () => window.removeEventListener('storage', updateState)
  }, [])

  /**
   * End impersonation session
   * - Calls API to blacklist token
   * - Clears local storage
   * - Redirects to Mission Control
   */
  const endImpersonation = useCallback(async () => {
    await endImpersonationApi()
    clearImpersonation()
    window.location.href = '/mission-control'
  }, [])

  return {
    impersonationInfo,
    isImpersonating,
    endImpersonation,
  }
}
