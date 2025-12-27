/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Keyboard Navigation Hook - Vim-style keyboard shortcuts for power users
 */

import { useEffect, useCallback, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface KeyboardNavigationConfig {
  enabled?: boolean
}

// Navigation shortcuts (G + key)
const NAVIGATION_SHORTCUTS: Record<string, string> = {
  'h': '/dashboard',           // Home/Mission Control
  'm': '/dashboard',           // Mission Control
  'p': '/dashboard/policies',  // Policies
  'z': '/dashboard/locations', // Zones
  'l': '/dashboard/lists',     // Lists
  'q': '/dashboard/logs',      // Query logs
  'r': '/dashboard/reports',   // Reports
  'a': '/dashboard/agents',    // Agents
  'u': '/dashboard/users',     // Users
  's': '/dashboard/settings',  // Settings
}

export function useKeyboardNavigation(config: KeyboardNavigationConfig = {}) {
  const { enabled = true } = config
  const router = useRouter()
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setPendingKey(null)
  }, [])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger if in input/textarea
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    // Don't trigger if modifier keys are pressed (except for specific shortcuts)
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return
    }

    const key = event.key.toLowerCase()

    // Handle G + key navigation
    if (pendingKey === 'g') {
      const destination = NAVIGATION_SHORTCUTS[key]
      if (destination) {
        event.preventDefault()
        router.push(destination)
      }
      clearPending()
      return
    }

    // Start G sequence
    if (key === 'g') {
      event.preventDefault()
      setPendingKey('g')
      // Clear pending after 1 second
      timeoutRef.current = setTimeout(clearPending, 1000)
      return
    }

    // Quick actions
    switch (key) {
      case '?':
        // Show keyboard shortcuts help
        event.preventDefault()
        // Could open a help modal
        break
      case '/':
        // Focus search / open command bar for domain blocking
        event.preventDefault()
        // Trigger command bar with block mode
        break
      case 'j':
        // Navigate down in lists
        event.preventDefault()
        navigateList('down')
        break
      case 'k':
        // Navigate up in lists
        event.preventDefault()
        navigateList('up')
        break
      case 'enter':
        // Select current item
        break
    }
  }, [enabled, pendingKey, router, clearPending])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [handleKeyDown])

  return { pendingKey }
}

// Helper to navigate lists with j/k
function navigateList(direction: 'up' | 'down') {
  const focusableSelector = '[data-keyboard-nav]'
  const items = Array.from(document.querySelectorAll<HTMLElement>(focusableSelector))
  
  if (items.length === 0) return

  const currentIndex = items.findIndex(item => item === document.activeElement)
  let nextIndex: number

  if (direction === 'down') {
    nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
  } else {
    nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
  }

  items[nextIndex]?.focus()
}

