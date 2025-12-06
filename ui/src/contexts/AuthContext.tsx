/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Authentication Context Provider
 */

'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  role: 'owner' | 'admin' | 'analyst' | 'readonly'
  tenantId: string
  tenantName?: string
  mfaEnabled?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshTokens: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Public paths that don't require authentication
const publicPaths = ['/', '/signup', '/landing', '/pricing', '/invite/accept']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname?.startsWith('/invite/') || pathname?.startsWith('/sso/')
  )

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
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

  const login = async (email: string, password: string) => {
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
    localStorage.setItem('token', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    router.push('/dashboard')
  }

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')

        if (token && storedUser) {
          setUser(JSON.parse(storedUser))
          
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
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        logout()
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [logout, refreshTokens])

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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshTokens,
        isAuthenticated: !!user,
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
            <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
            <p className="mt-2 text-gray-600">You don&apos;t have permission to view this page.</p>
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
