/**
 * Partner Portal Login Page
 * MSP/Reseller authentication
 */

'use client'

import { useState, useContext } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeContext } from '@/contexts/ThemeContext'
import { CSSStarField } from '@/components/StarField'
import { SunIcon, MoonIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'

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
        <SunIcon className="w-5 h-5 text-yellow-400" />
      ) : (
        <MoonIcon className="w-5 h-5 text-space-700" />
      )}
    </button>
  )
}

export default function PartnerLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Login failed')
      }

      if (data.requireMfa) {
        // TODO: Handle MFA
        setError('MFA is required but not yet implemented for partner portal')
        return
      }

      // Store token and partner info
      localStorage.setItem('partnerToken', data.access_token)
      localStorage.setItem('partnerUser', JSON.stringify(data.user))
      localStorage.setItem('partner', JSON.stringify(data.partner))

      router.push('/partner/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Cosmic Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <CSSStarField />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
              <BuildingOffice2Icon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Partner Portal</h1>
              <p className="text-emerald-300">Nebula DNS MSP</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            Manage your clients<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">with confidence</span>
          </h2>

          <p className="text-lg text-space-300 max-w-md mb-10">
            Complete visibility and control over all your managed DNS security deployments.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {[
              'Multi-organization management',
              'Aggregate reporting & analytics',
              'White-label customization',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-space-200">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <BuildingOffice2Icon className="h-7 w-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-space-900 dark:text-white">Partner Portal</span>
        </div>

        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-space-900 dark:text-white">Partner Sign In</h2>
            <p className="mt-2 text-space-500 dark:text-space-400">
              Access your MSP dashboard
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 ring-1 ring-danger-200 dark:ring-danger-800">
              <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
            </div>
          )}

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
                placeholder="partner@company.com"
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
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in to Partner Portal'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-space-200 dark:border-space-700">
            <p className="text-sm text-center text-space-500 dark:text-space-400">
              Not a partner?{' '}
              <Link href="/" className="text-primary-600 dark:text-primary-400 hover:underline">
                Sign in as a customer
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

