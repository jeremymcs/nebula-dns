/**
 * Nebula DNS - Mission Control Login Page
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Admin authentication page for Mission Control.
 * Split-screen design with cosmic branding on left, login form on right.
 */

'use client'

import { useState, useEffect, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { ThemeContext } from '@/contexts/ThemeContext'
import { SunIcon, MoonIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

/**
 * Theme toggle button for light/dark mode
 */
function ThemeToggle() {
  const context = useContext(ThemeContext)
  if (!context) return null
  const { resolvedTheme, toggleTheme } = context

  return (
    <button
      onClick={toggleTheme}
      className="absolute top-6 right-6 z-20 p-2.5 rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 hover:bg-white/20 transition-all"
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? (
        <SunIcon className="w-5 h-5 text-warning-400" />
      ) : (
        <MoonIcon className="w-5 h-5 text-space-700" />
      )}
    </button>
  )
}

export default function AdminLoginPage() {
  const router = useRouter()
  const { login, admin, loading: authLoading } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect to mission control if already authenticated
  useEffect(() => {
    if (!authLoading && admin) {
      router.push('/mission-control')
    }
  }, [authLoading, admin, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      // login() handles redirect to /mission-control
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-space-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  // If already authenticated, show loading while redirecting
  if (admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-space-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Cosmic Gradient Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-space-900 via-primary-900 to-accent-900">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-warning-500 to-danger-500 flex items-center justify-center shadow-2xl shadow-warning-500/30">
              <ShieldCheckIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Nebula DNS</h1>
              <p className="text-warning-300 font-medium">Mission Control</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            Secure Operations<br />
            <span className="bg-gradient-to-r from-warning-400 to-danger-400 bg-clip-text text-transparent">
              Portal
            </span>
          </h2>

          <p className="text-lg text-space-300 max-w-md mb-10">
            Administrative access to manage tenants, MSPs, billing operations, and system health.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {[
              'Tenant management & impersonation',
              'MSP onboarding & billing',
              'System health monitoring',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-space-200">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-warning-500/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-warning-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12 xl:px-20 bg-white dark:bg-space-900 relative">
        <ThemeToggle />

        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-warning-500 to-danger-500 flex items-center justify-center shadow-lg shadow-warning-500/25">
            <ShieldCheckIcon className="h-7 w-7 text-white" />
          </div>
          <div>
            <span className="text-2xl font-bold text-space-900 dark:text-white">Nebula DNS</span>
            <span className="block text-sm text-warning-500 font-medium">Mission Control</span>
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto lg:mx-0">
          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white">
              Admin Login
            </h2>
            <p className="mt-2 text-space-500 dark:text-space-400">
              Sign in to access Mission Control
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 ring-1 ring-danger-200 dark:ring-danger-800">
              <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="admin@nebula-dns.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Security Notice */}
          <p className="mt-8 text-xs text-center text-space-500 dark:text-space-400">
            This is a restricted area. Unauthorized access attempts are logged and monitored.
          </p>
        </div>
      </div>
    </div>
  )
}
