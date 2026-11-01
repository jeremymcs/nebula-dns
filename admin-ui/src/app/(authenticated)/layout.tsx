/**
 * Nebula DNS - Admin UI Authenticated Layout
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Protected layout for authenticated admin routes.
 * Uses AuthContext for authentication and route protection.
 * Includes session expiry warning modal.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { FullPageLoading } from '@/components/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'
import { SessionWarningModal, MobileNav } from '@/components/layout'
import { AdminAppSidebar } from '@/components/layout/AdminAppSidebar'
import { AdminShellBar } from '@/components/layout/AdminShellBar'
import { ProductFooter } from '@/components/ProductFooter'

// Session warning appears 5 minutes before expiry
const SESSION_WARNING_MINUTES = 5
// Check session status every 30 seconds
const SESSION_CHECK_INTERVAL = 30 * 1000

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { admin, loading, logout, isAuthenticated, sessionExpiresAt } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Session warning modal state
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [minutesRemaining, setMinutesRemaining] = useState(SESSION_WARNING_MINUTES)
  const [warningDismissed, setWarningDismissed] = useState(false)

  /**
   * Handle "Stay Logged In" - opens login in new tab
   * User can re-authenticate without losing current state
   */
  const handleStayLoggedIn = useCallback(() => {
    window.open('/login', '_blank')
    setWarningDismissed(true)
    setShowWarningModal(false)
  }, [])

  /**
   * Handle "Log Out Now" - immediate logout
   */
  const handleLogout = useCallback(() => {
    setShowWarningModal(false)
    logout()
  }, [logout])

  /**
   * Session expiry check effect
   * Runs every 30 seconds to check if session is about to expire
   */
  useEffect(() => {
    if (!sessionExpiresAt || !isAuthenticated) {
      return
    }

    const checkSession = () => {
      const now = new Date()
      const expiresAt = new Date(sessionExpiresAt)
      const msRemaining = expiresAt.getTime() - now.getTime()
      const minsRemaining = Math.ceil(msRemaining / (60 * 1000))

      // Update minutes remaining
      setMinutesRemaining(Math.max(0, minsRemaining))

      // Show warning if 5 minutes or less and not already dismissed
      if (minsRemaining <= SESSION_WARNING_MINUTES && minsRemaining > 0 && !warningDismissed) {
        setShowWarningModal(true)
      }

      // If session expired, logout
      if (msRemaining <= 0) {
        logout()
      }
    }

    // Initial check
    checkSession()

    // Set up interval
    const interval = setInterval(checkSession, SESSION_CHECK_INTERVAL)

    return () => clearInterval(interval)
  }, [sessionExpiresAt, isAuthenticated, warningDismissed, logout])

  /**
   * Reset warning dismissed state when session changes
   * (e.g., when user re-authenticates in new tab)
   */
  useEffect(() => {
    if (sessionExpiresAt) {
      const now = new Date()
      const expiresAt = new Date(sessionExpiresAt)
      const minsRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (60 * 1000))

      // If session has more than warning threshold, reset dismissed state
      if (minsRemaining > SESSION_WARNING_MINUTES) {
        setWarningDismissed(false)
      }
    }
  }, [sessionExpiresAt])

  /**
   * Route protection effect
   * Redirects unauthenticated users to login with return URL
   */
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname || '/')
      router.push(`/login?returnUrl=${returnUrl}`)
    }
  }, [loading, isAuthenticated, pathname, router])

  // Show loading state while checking auth
  if (loading) {
    return <FullPageLoading />
  }

  // For protected routes, show loading if not authenticated (will redirect)
  if (!isAuthenticated) {
    return <FullPageLoading />
  }

  return (
    <div className="min-h-screen bg-canvas dark:bg-space-950 flex flex-col lg:flex-row" data-flux-dashboard>
      <SessionWarningModal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        minutesRemaining={minutesRemaining}
        onStayLoggedIn={handleStayLoggedIn}
        onLogout={handleLogout}
      />

      <AdminAppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminShellBar />
        <MobileNav />

        <main className="mx-auto max-w-[1600px] w-full flex-1 px-4 sm:px-6 lg:px-7 py-5 lg:py-6">
          {children}
        </main>

        <ProductFooter variant="dashboard" className="pb-6 hidden lg:flex" />
      </div>
    </div>
  )
}
