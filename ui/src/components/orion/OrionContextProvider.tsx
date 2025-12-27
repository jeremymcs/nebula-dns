/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Orion Context Provider - Gathers context for AI prompts
 */

'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { OrionContext, OrionActivityItem, OrionAlert } from './types'

interface OrionContextValue {
  context: OrionContext
  addActivity: (activity: Omit<OrionActivityItem, 'timestamp'>) => void
  addAlert: (alert: Omit<OrionAlert, 'id' | 'timestamp'>) => void
  dismissAlert: (alertId: string) => void
  setSelectedZone: (zoneId: string | undefined) => void
  setSelectedPolicy: (policyId: string | undefined) => void
}

const OrionContextContext = createContext<OrionContextValue | null>(null)

export function useOrionContext() {
  const context = useContext(OrionContextContext)
  if (!context) {
    throw new Error('useOrionContext must be used within OrionContextProvider')
  }
  return context
}

interface OrionContextProviderProps {
  children: ReactNode
}

export function OrionContextProvider({ children }: OrionContextProviderProps) {
  const pathname = usePathname()
  const [context, setContext] = useState<OrionContext>({
    currentPage: pathname,
    recentActivity: [],
    pendingAlerts: [],
  })

  // Update current page when pathname changes
  useEffect(() => {
    setContext((prev) => ({ ...prev, currentPage: pathname }))
  }, [pathname])

  const addActivity = useCallback((activity: Omit<OrionActivityItem, 'timestamp'>) => {
    setContext((prev) => ({
      ...prev,
      recentActivity: [
        { ...activity, timestamp: new Date() },
        ...prev.recentActivity.slice(0, 49), // Keep last 50 activities
      ],
    }))
  }, [])

  const addAlert = useCallback((alert: Omit<OrionAlert, 'id' | 'timestamp'>) => {
    const newAlert: OrionAlert = {
      ...alert,
      id: `alert-${Date.now()}`,
      timestamp: new Date(),
    }
    setContext((prev) => ({
      ...prev,
      pendingAlerts: [newAlert, ...prev.pendingAlerts],
    }))
  }, [])

  const dismissAlert = useCallback((alertId: string) => {
    setContext((prev) => ({
      ...prev,
      pendingAlerts: prev.pendingAlerts.filter((a) => a.id !== alertId),
    }))
  }, [])

  const setSelectedZone = useCallback((zoneId: string | undefined) => {
    setContext((prev) => ({ ...prev, selectedZone: zoneId }))
  }, [])

  const setSelectedPolicy = useCallback((policyId: string | undefined) => {
    setContext((prev) => ({ ...prev, selectedPolicy: policyId }))
  }, [])

  // Simulate proactive alerts (in production, these would come from backend)
  useEffect(() => {
    const checkForAlerts = () => {
      // Demo: Add a proactive alert after 30 seconds
      const timer = setTimeout(() => {
        addAlert({
          severity: 'warning',
          title: 'Unusual Activity Detected',
          message: 'I noticed a 300% increase in blocked queries from the Guest WiFi zone in the last hour. Would you like me to investigate?',
          actionable: true,
          suggestedAction: {
            id: 'investigate-guest',
            type: 'investigate',
            label: 'Investigate',
            data: { zone: 'guest-wifi' },
          },
        })
      }, 30000)

      return () => clearTimeout(timer)
    }

    return checkForAlerts()
  }, [addAlert])

  return (
    <OrionContextContext.Provider
      value={{
        context,
        addActivity,
        addAlert,
        dismissAlert,
        setSelectedZone,
        setSelectedPolicy,
      }}
    >
      {children}
    </OrionContextContext.Provider>
  )
}

// Hook to build context string for AI prompts
export function useOrionPromptContext(): string {
  const { context } = useOrionContext()

  const buildContextString = useCallback(() => {
    const parts: string[] = []

    // Current page context
    parts.push(`User is currently on: ${context.currentPage}`)

    // Selected items
    if (context.selectedZone) {
      parts.push(`Selected zone: ${context.selectedZone}`)
    }
    if (context.selectedPolicy) {
      parts.push(`Selected policy: ${context.selectedPolicy}`)
    }

    // Recent activity summary
    if (context.recentActivity.length > 0) {
      const recentBlocks = context.recentActivity.filter((a) => a.type === 'block').length
      const recentPolicyChanges = context.recentActivity.filter((a) => a.type === 'policy-change').length
      parts.push(`Recent activity: ${recentBlocks} blocks, ${recentPolicyChanges} policy changes`)
    }

    // Pending alerts
    if (context.pendingAlerts.length > 0) {
      const criticalAlerts = context.pendingAlerts.filter((a) => a.severity === 'critical').length
      parts.push(`Pending alerts: ${context.pendingAlerts.length} (${criticalAlerts} critical)`)
    }

    return parts.join('\n')
  }, [context])

  return buildContextString()
}

