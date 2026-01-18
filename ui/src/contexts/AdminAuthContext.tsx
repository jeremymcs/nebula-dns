/**
 * Nebula DNS - Admin Authentication Context
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Authentication context for Mission Control admin users.
 * Uses separate localStorage keys from tenant auth to allow
 * admins to use Mission Control while also being logged into
 * the main tenant dashboard if needed.
 */

'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  AdminUser,
  adminLogin as apiLogin,
  adminLogout as apiLogout,
  getAdminProfile,
} from '@/lib/admin-api'

// localStorage keys - distinct from tenant auth
const ADMIN_TOKEN_KEY = 'admin_token'
const ADMIN_USER_KEY = 'admin_user'
const ADMIN_SESSION_EXPIRY_KEY = 'admin_session_expiry'

/**
 * Admin authentication context type
 */
interface AdminAuthContextType {
  admin: AdminUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  sessionExpiresAt: Date | null
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined
)

// Public paths that don't require admin authentication
const publicAdminPaths = ['/mission-control/login']

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const isPublicAdminPath = publicAdminPaths.some(
    (path) => pathname === path
  )

  // Set mounted state on client-side
  useEffect(() => {
    setMounted(true)
  }, [])

  /**
   * Clear all admin-specific localStorage keys and state
   */
  const clearAdminState = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADMIN_TOKEN_KEY)
      localStorage.removeItem(ADMIN_USER_KEY)
      localStorage.removeItem(ADMIN_SESSION_EXPIRY_KEY)
    }
    setAdmin(null)
    setSessionExpiresAt(null)
  }, [])

  /**
   * Logout the admin user
   */
  const logout = useCallback(() => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem(ADMIN_TOKEN_KEY)
        : null

    if (token) {
      // Fire and forget - we clear state regardless of API response
      apiLogout(token)
    }

    clearAdminState()
    router.push('/mission-control/login')
  }, [clearAdminState, router])

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string): Promise<void> => {
    const data = await apiLogin(email, password)

    // Calculate session expiry from expiresIn (seconds)
    const expiryDate = new Date(Date.now() + data.expiresIn * 1000)

    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.accessToken)
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin))
      localStorage.setItem(ADMIN_SESSION_EXPIRY_KEY, expiryDate.toISOString())
    }

    setAdmin(data.admin)
    setSessionExpiresAt(expiryDate)
    router.push('/mission-control')
  }

  /**
   * Initialize auth state from localStorage
   * Validates existing session by calling getAdminProfile
   */
  useEffect(() => {
    if (!mounted) return

    const initAdminAuth = async () => {
      try {
        const token = localStorage.getItem(ADMIN_TOKEN_KEY)
        const storedAdmin = localStorage.getItem(ADMIN_USER_KEY)
        const storedExpiry = localStorage.getItem(ADMIN_SESSION_EXPIRY_KEY)

        if (!token || !storedAdmin) {
          setLoading(false)
          return
        }

        // Check if session has expired locally first
        if (storedExpiry) {
          const expiryDate = new Date(storedExpiry)
          if (expiryDate <= new Date()) {
            // Session expired - clear state
            clearAdminState()
            setLoading(false)
            return
          }
          setSessionExpiresAt(expiryDate)
        }

        // Set admin from localStorage while we validate
        setAdmin(JSON.parse(storedAdmin))

        // Validate token with API
        try {
          const profile = await getAdminProfile(token)
          setAdmin(profile)
          localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(profile))
        } catch {
          // Token invalid - clear state
          clearAdminState()
        }
      } catch {
        // Error parsing stored data - clear state
        clearAdminState()
      } finally {
        setLoading(false)
      }
    }

    initAdminAuth()
  }, [mounted, clearAdminState])

  /**
   * Redirect unauthenticated users away from protected Mission Control routes
   */
  useEffect(() => {
    if (
      !loading &&
      !admin &&
      !isPublicAdminPath &&
      pathname?.startsWith('/mission-control')
    ) {
      router.push('/mission-control/login')
    }
  }, [loading, admin, isPublicAdminPath, pathname, router])

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        loading,
        login,
        logout,
        isAuthenticated: !!admin,
        sessionExpiresAt,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

/**
 * Hook to access admin auth context
 * @throws Error if used outside AdminAuthProvider
 */
export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}
