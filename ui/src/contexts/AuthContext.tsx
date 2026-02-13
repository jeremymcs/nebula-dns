/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Authentication Context Provider
 */

'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { logger } from '@/lib/logger'
import { API_URL } from '@/lib/api'

export type TenantTier = 'home' | 'enterprise' | 'msp'

interface User {
  id: string
  email: string
  name: string
  role: 'owner' | 'admin' | 'analyst' | 'readonly'
  tenantId: string
  tenantName?: string
  tenantTier?: TenantTier
  mfaEnabled?: boolean
}

interface Organization {
  id: string
  name: string
  slug: string
  status: string
}

interface MspInfo {
  isMsp: boolean
  partnerId: string | null
  currentOrg: Organization | null
  organizations: Organization[]
}

interface MfaChallenge {
  tempToken: string
  message: string
}

interface LoginResult {
  success: boolean
  mfaRequired?: boolean
  mfaChallenge?: MfaChallenge
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  verifyMfa: (tempToken: string, code: string) => Promise<void>
  logout: () => void
  refreshTokens: () => Promise<void>
  isAuthenticated: boolean
  // Tier-based access
  tier: TenantTier | undefined
  isHome: boolean
  isEnterprise: boolean
  isMspTier: boolean
  // MSP functionality
  mspInfo: MspInfo | null
  isMsp: boolean
  currentOrg: Organization | null
  organizations: Organization[]
  switchOrganization: (orgId: string) => Promise<void>
  refreshMspInfo: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Public paths that don't require authentication
const publicPaths = ['/', '/signup', '/landing', '/pricing', '/invite/accept']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [mspInfo, setMspInfo] = useState<MspInfo | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const isPublicPath = publicPaths.some(path =>
    pathname === path || pathname?.startsWith('/invite/') || pathname?.startsWith('/sso/')
  )

  // Set mounted state on client-side
  useEffect(() => {
    setMounted(true)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem('mspInfo')
    setUser(null)
    setMspInfo(null)
    router.push('/')
  }, [router])

  const refreshTokens = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        throw new Error('No refresh token')
      }

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!res.ok) {
        throw new Error('Token refresh failed')
      }

      const data = await res.json()
      localStorage.setItem('token', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
    } catch (error) {
      logout()
    }
  }, [logout])

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message || 'Invalid credentials')
    }

    const data = await res.json()

    // Check if MFA is required
    if (data.mfaRequired) {
      return {
        success: false,
        mfaRequired: true,
        mfaChallenge: {
          tempToken: data.tempToken,
          message: data.message,
        },
      }
    }

    // No MFA required - complete login
    localStorage.setItem('token', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    router.push('/dashboard')
    return { success: true }
  }

  const verifyMfa = async (tempToken: string, code: string): Promise<void> => {
    const res = await fetch(`${API_URL}/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken, code }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message || 'Invalid MFA code')
    }

    const data = await res.json()
    localStorage.setItem('token', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    router.push('/dashboard')
  }

  // Fetch MSP info (managed organizations)
  const refreshMspInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch(`${API_URL}/auth/organizations`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setMspInfo(data)
        localStorage.setItem('mspInfo', JSON.stringify(data))
      }
    } catch (error) {
      logger.error('Failed to fetch MSP info:', error)
    }
  }, [])

  // Switch to a different organization
  const switchOrganization = useCallback(async (orgId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')

      const res = await fetch(`${API_URL}/auth/switch-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantId: orgId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to switch organization')
      }

      const data = await res.json()
      localStorage.setItem('token', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)

      // Refresh MSP info to update current org
      await refreshMspInfo()

      // Reload the page to ensure all data is fresh for the new org
      window.location.href = '/dashboard'
    } catch (error) {
      logger.error('Failed to switch organization:', error)
      throw error
    }
  }, [refreshMspInfo])

  // Initialize auth state from localStorage (only after mount to avoid SSR issues)
  useEffect(() => {
    if (!mounted) return

    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')
        const storedMspInfo = localStorage.getItem('mspInfo')

        if (token && storedUser) {
          setUser(JSON.parse(storedUser))
          if (storedMspInfo) {
            setMspInfo(JSON.parse(storedMspInfo))
          }

          // Verify token is still valid by making a request
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })

          if (!res.ok) {
            // Try to refresh the token
            await refreshTokens()
          } else {
            const userData = await res.json()
            setUser(userData)
            localStorage.setItem('user', JSON.stringify(userData))

            // Also fetch MSP info
            await refreshMspInfo()
          }
        }
      } catch (error) {
        logger.error('Auth initialization failed:', error)
        logout()
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [mounted, logout, refreshTokens, refreshMspInfo])

  // Redirect unauthenticated users away from protected routes
  useEffect(() => {
    if (!loading && !user && !isPublicPath) {
      router.push('/')
    }
  }, [loading, user, isPublicPath, router])

  // Set up token refresh interval
  useEffect(() => {
    if (user) {
      // Refresh tokens every 14 minutes (tokens expire in 15 minutes)
      const interval = setInterval(refreshTokens, 14 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [user, refreshTokens])

  // Compute MSP convenience values
  const isMsp = mspInfo?.isMsp ?? false
  const currentOrg = mspInfo?.currentOrg ?? null
  const organizations = mspInfo?.organizations ?? []

  // Compute tier convenience values
  const tier = user?.tenantTier
  const isHome = tier === 'home'
  const isEnterprise = tier === 'enterprise'
  const isMspTier = tier === 'msp'

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        verifyMfa,
        logout,
        refreshTokens,
        isAuthenticated: !!user,
        // Tier-based access
        tier,
        isHome,
        isEnterprise,
        isMspTier,
        // MSP functionality
        mspInfo,
        isMsp,
        currentOrg,
        organizations,
        switchOrganization,
        refreshMspInfo,
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

// Higher-order component for protecting routes
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRoles?: User['role'][]
) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!loading && !user) {
        router.push('/')
      }
      if (user && requiredRoles && !requiredRoles.includes(user.role)) {
        router.push('/dashboard')
      }
    }, [loading, user, router])

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      )
    }

    if (!user) {
      return null
    }

    if (requiredRoles && !requiredRoles.includes(user.role)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white">Access Denied</h2>
            <p className="mt-2 text-space-600 dark:text-space-400">You don&apos;t have permission to view this page.</p>
          </div>
        </div>
      )
    }

    return <WrappedComponent {...props} />
  }
}

// Hook to check if user has specific role
export function useHasRole(roles: User['role'][]) {
  const { user } = useAuth()
  return user ? roles.includes(user.role) : false
}

// Hook to check if user can perform admin actions
export function useIsAdmin() {
  return useHasRole(['owner', 'admin'])
}
