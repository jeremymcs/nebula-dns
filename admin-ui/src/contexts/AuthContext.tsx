/**
 * Flux Shield - Admin UI Authentication Context
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
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
  applyAdminSession,
  AdminLoginResponse,
} from '@/lib/api'
import { AdminRole } from '@/lib/admin-permissions'

const ADMIN_TOKEN_KEY = 'admin_token'
const ADMIN_USER_KEY = 'admin_user'
const ADMIN_SESSION_EXPIRY_KEY = 'admin_session_expiry'
const ADMIN_MFA_VERIFIED_KEY = 'admin_mfa_verified'

interface AuthContextType {
  admin: AdminUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  completeMfaSession: (data: AdminLoginResponse) => void
  logout: () => void
  isAuthenticated: boolean
  mfaVerified: boolean
  sessionExpiresAt: Date | null
  adminRole: AdminRole | undefined
  isSuperAdmin: boolean
  isAdmin: boolean
  isViewer: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const publicPaths = ['/login', '/login/mfa', '/login/mfa/enroll', '/invite/accept']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null)
  const [mfaVerified, setMfaVerified] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const isPublicPath = publicPaths.some((path) => pathname?.startsWith(path))

  useEffect(() => {
    setMounted(true)
  }, [])

  const clearAdminState = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADMIN_TOKEN_KEY)
      localStorage.removeItem(ADMIN_USER_KEY)
      localStorage.removeItem(ADMIN_SESSION_EXPIRY_KEY)
      localStorage.removeItem(ADMIN_MFA_VERIFIED_KEY)
    }
    setAdmin(null)
    setSessionExpiresAt(null)
    setMfaVerified(false)
  }, [])

  const logout = useCallback(() => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem(ADMIN_TOKEN_KEY)
        : null

    if (token) {
      apiLogout(token)
    }

    clearAdminState()
    router.push('/login')
  }, [clearAdminState, router])

  const completeMfaSession = useCallback(
    (data: AdminLoginResponse) => {
      applyAdminSession(data)
      setAdmin(data.admin)
      setMfaVerified(true)
      const expiryDate = new Date(Date.now() + data.expiresIn * 1000)
      setSessionExpiresAt(expiryDate)
      router.push('/')
    },
    [router],
  )

  const login = async (email: string, password: string): Promise<void> => {
    const data = await apiLogin(email, password)
    applyAdminSession(data)

    const expiryDate = new Date(Date.now() + data.expiresIn * 1000)
    setAdmin(data.admin)
    setSessionExpiresAt(expiryDate)
    setMfaVerified(!data.mfaRequired)

    if (data.mfaRequired) {
      if (data.mfaEnrollmentRequired) {
        router.push('/login/mfa/enroll')
      } else {
        router.push('/login/mfa')
      }
      return
    }

    router.push('/')
  }

  useEffect(() => {
    if (!mounted) return

    const initAuth = async () => {
      try {
        const token = localStorage.getItem(ADMIN_TOKEN_KEY)
        const storedAdmin = localStorage.getItem(ADMIN_USER_KEY)
        const storedExpiry = localStorage.getItem(ADMIN_SESSION_EXPIRY_KEY)
        const storedMfa = localStorage.getItem(ADMIN_MFA_VERIFIED_KEY)

        if (!token || !storedAdmin) {
          setLoading(false)
          return
        }

        if (storedExpiry) {
          const expiryDate = new Date(storedExpiry)
          if (expiryDate <= new Date()) {
            clearAdminState()
            setLoading(false)
            return
          }
          setSessionExpiresAt(expiryDate)
        }

        setAdmin(JSON.parse(storedAdmin))
        setMfaVerified(storedMfa === 'true')

        try {
          const profile = await getAdminProfile(token)
          setAdmin(profile)
          const verified = profile.mfaVerified === true
          setMfaVerified(verified)
          localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(profile))
          localStorage.setItem(ADMIN_MFA_VERIFIED_KEY, verified ? 'true' : 'false')

          if (!verified && !isPublicPath) {
            if (!profile.mfaSetupComplete) {
              router.push('/login/mfa/enroll')
            } else {
              router.push('/login/mfa')
            }
          }
        } catch {
          clearAdminState()
        }
      } catch {
        clearAdminState()
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [mounted, clearAdminState, isPublicPath, router])

  useEffect(() => {
    if (!loading && !admin && !isPublicPath) {
      router.push('/login')
    }
  }, [loading, admin, isPublicPath, router])

  useEffect(() => {
    if (!loading && admin && !mfaVerified && !isPublicPath) {
      if (!admin.mfaSetupComplete) {
        router.push('/login/mfa/enroll')
      } else {
        router.push('/login/mfa')
      }
    }
  }, [loading, admin, mfaVerified, isPublicPath, router])

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
        completeMfaSession,
        logout,
        isAuthenticated: !!admin && mfaVerified,
        mfaVerified,
        sessionExpiresAt,
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

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
