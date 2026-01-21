/**
 * Nebula DNS - Admin UI Authentication Context
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Authentication context for Mission Control admin users.
 * Uses separate localStorage keys from tenant auth.
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
} from '@/lib/api'
import { AdminRole } from '@/lib/admin-permissions'

// localStorage keys - distinct from tenant auth
const ADMIN_TOKEN_KEY = 'admin_token'
const ADMIN_USER_KEY = 'admin_user'
const ADMIN_SESSION_EXPIRY_KEY = 'admin_session_expiry'

/**
 * Admin authentication context type
 */
interface AuthContextType {
  admin: AdminUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  sessionExpiresAt: Date | null
  // Role convenience helpers
  adminRole: AdminRole | undefined
  isSuperAdmin: boolean
  isAdmin: boolean
  isViewer: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Public paths that don't require admin authentication
const publicPaths = ['/login']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const isPublicPath = publicPaths.some((path) => pathname === path)

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
    router.push('/login')
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
    router.push('/')
  }

  /**
   * Initialize auth state from localStorage
   * Validates existing session by calling getAdminProfile
   */
  useEffect(() => {
    if (!mounted) return

    const initAuth = async () => {
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

    initAuth()
  }, [mounted, clearAdminState])

  /**
   * Redirect unauthenticated users away from protected routes
   */
  useEffect(() => {
    if (!loading && !admin && !isPublicPath) {
      router.push('/login')
    }
  }, [loading, admin, isPublicPath, router])

  // Compute role convenience helpers
  const adminRole = admin?.role
  const isSuperAdmin = adminRole === 'super_admin'
  const isAdmin = adminRole === 'admin' || isSuperAdmin
  const isViewer = adminRole === 'viewer'

  return (
    <AuthContext.Provider
      value={{
        admin,
        loading,
        login,
        logout,
        isAuthenticated: !!admin,
        sessionExpiresAt,
        // Role helpers
        adminRole,
        isSuperAdmin,
        isAdmin,
        isViewer,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access admin auth context
 * @throws Error if used outside AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
