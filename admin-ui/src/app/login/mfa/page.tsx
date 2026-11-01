'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import { adminMfaVerifyChallenge } from '@/lib/api'
import { ProductFooter } from '@/components/ProductFooter'
import { ADMIN_PORTAL_NAME } from '@/lib/branding'

export default function AdminMfaChallengePage() {
  const router = useRouter()
  const { completeMfaSession, logout } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        router.push('/login')
        return
      }
      const data = await adminMfaVerifyChallenge(token, code.trim())
      completeMfaSession(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-space-50 dark:bg-space-950 px-6">
      <div className="w-full max-w-md bg-white dark:bg-space-900 rounded-2xl border border-space-200 dark:border-space-800 p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30">
            <ShieldCheckIcon className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-space-900 dark:text-white">
              Multi-factor authentication
            </h1>
            <p className="text-sm text-space-500 dark:text-space-400">
              Enter the code from your authenticator app
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 text-sm text-danger-700 dark:text-danger-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="mfa-code" className="label">
              Authentication code
            </label>
            <input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="input text-center tracking-widest text-lg"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Verifying…' : 'Verify and continue'}
          </button>
        </form>

        <button
          type="button"
          onClick={logout}
          className="mt-4 w-full text-sm text-space-500 hover:text-primary-600"
        >
          Sign out
        </button>

        <ProductFooter variant="auth" className="mt-8" />
        <p className="mt-2 text-xs text-center text-space-400">{ADMIN_PORTAL_NAME}</p>
      </div>
    </div>
  )
}
