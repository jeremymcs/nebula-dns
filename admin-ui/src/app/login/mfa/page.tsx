'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { adminMfaVerifyChallenge } from '@/lib/api'
import {
  AdminAuthShell,
  AdminAuthHeadingAccent,
  AdminAuthErrorBanner,
} from '@/components/auth/AdminAuthShell'

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
    <AdminAuthShell
      eyebrow="Security"
      title={
        <>
          Verify with <AdminAuthHeadingAccent>MFA</AdminAuthHeadingAccent>
        </>
      }
      subtitle="Enter the 6-digit code from your authenticator app."
    >
      {error && <AdminAuthErrorBanner message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="mfa-code" className="fs-label">
            Authentication code
          </label>
          <input
            id="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="fs-input text-center tracking-[0.3em] text-lg font-semibold"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading} className="fs-btn fs-btn-primary w-full fs-btn-lg">
          {loading ? 'Verifying…' : 'Verify and continue'}
        </button>
        <button type="button" onClick={() => logout()} className="fs-btn w-full">
          Cancel and sign out
        </button>
      </form>
    </AdminAuthShell>
  )
}
