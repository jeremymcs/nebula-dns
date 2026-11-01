/**
 * Admin login — Design C
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  AdminAuthShell,
  AdminAuthHeadingAccent,
  AdminAuthErrorBanner,
} from '@/components/auth/AdminAuthShell'
import { FullPageLoading } from '@/components/LoadingSpinner'
import { ADMIN_PORTAL_NAME } from '@/lib/branding'

export default function AdminLoginPage() {
  const router = useRouter()
  const { login, admin, loading: authLoading, mfaVerified } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && admin && mfaVerified) {
      router.push('/')
    }
  }, [authLoading, admin, mfaVerified, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || (admin && mfaVerified)) {
    return <FullPageLoading />
  }

  return (
    <AdminAuthShell
      eyebrow="Mission Control"
      title={
        <>
          Admin <AdminAuthHeadingAccent>access</AdminAuthHeadingAccent>
        </>
      }
      subtitle={`Sign in to ${ADMIN_PORTAL_NAME}. All sessions are audited.`}
    >
      {error && <AdminAuthErrorBanner message={error} />}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="fs-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="fs-input"
            placeholder="admin@example.com"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="password" className="fs-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="fs-input"
            placeholder="••••••••••••••"
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading} className="fs-btn fs-btn-primary w-full fs-btn-lg">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 pt-5 border-t fs-hairline">
          <p className="text-[11px] text-center text-mut mb-3">Development demo</p>
          <button
            type="button"
            onClick={() => {
              setEmail('admin@nebula.local')
              setPassword('Admin@123456789!')
            }}
            className="fs-btn w-full text-xs"
          >
            Fill super admin credentials
          </button>
        </div>
      )}
    </AdminAuthShell>
  )
}
