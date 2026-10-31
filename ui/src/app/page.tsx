/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Login Page Component - Cosmic Security Theme
 */

'use client'

import { useState, useEffect, useContext, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeContext } from '@/contexts/ThemeContext'
import { CSSStarField } from '@/components/StarField'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { ProductFooter } from '@/components/ui/ProductFooter'
import { ShieldMark } from '@/components/ui/ShieldMark'
import {
  PRODUCT_LOGIN_HERO_ACCENT,
  PRODUCT_MODULE_DNS_FILTER,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
} from '@/lib/branding'

// Theme toggle button component
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

export default function LoginPage() {
  const router = useRouter()
  const { login, verifyMfa, user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaTempToken, setMfaTempToken] = useState('')
  const [mfaCode, setMfaCode] = useState('')

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard')
    }
  }, [authLoading, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await login(email, password)

      if (result.mfaRequired && result.mfaChallenge) {
        // MFA is required - show MFA input
        setMfaRequired(true)
        setMfaTempToken(result.mfaChallenge.tempToken)
      }
      // If success, login function handles redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await verifyMfa(mfaTempToken, mfaCode)
      // verifyMfa handles redirect to /dashboard
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid MFA code')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setMfaRequired(false)
    setMfaTempToken('')
    setMfaCode('')
    setError('')
  }

  const handleDemoLogin = async () => {
    setError('')
    setLoading(true)
    setEmail('admin@demo.local')
    setPassword('Admin@12345!')

    try {
      const result = await login('admin@demo.local', 'Admin@12345!')

      if (result.mfaRequired && result.mfaChallenge) {
        setMfaRequired(true)
        setMfaTempToken(result.mfaChallenge.tempToken)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Cosmic Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <CSSStarField />

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-8">
            <ShieldMark className="h-14 w-14 rounded-2xl shadow-2xl shadow-primary-700/30" iconClassName="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold text-white">{PRODUCT_NAME}</h1>
              <p className="text-primary-200">{PRODUCT_TAGLINE}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-300 mt-1">{PRODUCT_MODULE_DNS_FILTER}</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            Protect your network<br />
            <span className="text-gradient-light">{PRODUCT_LOGIN_HERO_ACCENT}</span>
          </h2>

          <p className="text-lg text-space-300 max-w-md mb-10">
            Advanced DNS security, threat intelligence, and content filtering for modern enterprises.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {[
              'Real-time threat blocking',
              'AI-powered categorization',
              'Zero-latency filtering',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-space-200">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-success-500/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <ShieldMark className="h-12 w-12 rounded-xl shadow-lg shadow-primary-700/25" iconClassName="h-7 w-7" />
          <span className="text-2xl font-bold text-space-900 dark:text-white">{PRODUCT_NAME}</span>
        </div>

        <div className="w-full max-w-sm mx-auto lg:mx-0">
          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white">
              {mfaRequired ? 'Two-Factor Authentication' : 'Welcome back'}
            </h2>
            <p className="mt-2 text-space-500 dark:text-space-400">
              {mfaRequired
                ? 'Enter the 6-digit code from your authenticator app'
                : 'Sign in to your account to continue'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 ring-1 ring-danger-200 dark:ring-danger-800">
              <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
            </div>
          )}

          {!mfaRequired ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="label">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="label">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
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
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign in'}
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-space-200 dark:border-space-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white dark:bg-space-900 text-space-500">or</span>
                </div>
              </div>

              {/* Demo Login Button */}
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="btn-accent w-full py-3 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">Try Demo Account</span>
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleMfaSubmit}>
              <MFAInput value={mfaCode} onChange={setMfaCode} />

              <p className="text-xs text-center text-space-500 dark:text-space-400">
                You can also use a backup code (8 characters)
              </p>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || mfaCode.length < 6}
                  className="btn-primary w-full py-3"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="btn-ghost w-full"
                >
                  ← Back to login
                </button>
              </div>
            </form>
          )}

          <ProductFooter variant="auth" />
        </div>
      </div>
    </div>
  )
}

// MFA Individual Digit Input Component
function MFAInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(6, '').slice(0, 6).split('')

  const handleChange = (index: number, newValue: string) => {
    const digit = newValue.replace(/\D/g, '').slice(-1)
    const newCode = digits.map((d, i) => (i === index ? digit : d)).join('')
    onChange(newCode.replace(/ /g, ''))

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  return (
    <div className="flex justify-center gap-2">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-2xl font-bold rounded-xl bg-space-50 dark:bg-space-800 ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-all"
          autoFocus={index === 0}
        />
      ))}
    </div>
  )
}
