// Nebula DNS - Client Context Management Hook
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface ClientContext {
  clientId: string | null
  clientName: string | null
  isManagingClient: boolean
}

const CLIENT_CONTEXT_KEY = 'msp_client_context'

export function useClientContext() {
  const { user, isMsp } = useAuth()
  const [context, setContext] = useState<ClientContext>(() => {
    if (typeof window === 'undefined') {
      return { clientId: null, clientName: null, isManagingClient: false }
    }

    try {
      const stored = localStorage.getItem(CLIENT_CONTEXT_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (err) {
      console.error('Failed to parse client context:', err)
    }

    return { clientId: null, clientName: null, isManagingClient: false }
  })

  // Sync context to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CLIENT_CONTEXT_KEY, JSON.stringify(context))
    }
  }, [context])

  const switchToClient = useCallback((clientId: string, clientName: string) => {
    setContext({
      clientId,
      clientName,
      isManagingClient: true,
    })
  }, [])

  const switchBackToMsp = useCallback(() => {
    setContext({
      clientId: null,
      clientName: null,
      isManagingClient: false,
    })
  }, [])

  const clearContext = useCallback(() => {
    setContext({
      clientId: null,
      clientName: null,
      isManagingClient: false,
    })
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CLIENT_CONTEXT_KEY)
    }
  }, [])

  // Clear context if user is not MSP
  useEffect(() => {
    if (!isMsp && context.isManagingClient) {
      clearContext()
    }
  }, [isMsp, context.isManagingClient, clearContext])

  return {
    ...context,
    switchToClient,
    switchBackToMsp,
    clearContext,
  }
}
