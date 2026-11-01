/**
 * Flux Shield — tenant login (Design C)
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import {
  AuthShell,
  AuthHeadingAccent,
  AuthErrorBanner,
} from '@/components/auth/AuthShell'

export default function LoginPage() {
  const router = useRouter()
  const { login, verifyMfa, user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaTempToken, setMfaTempToken] = useState('')
  const [mfaCode, setMfaCode] = useState('')

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
        setMfaRequired(true)
        setMfaTempToken(result.mfaChallenge.tempToken)
      }
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
    <AuthShell
      eyebrow={mfaRequired ? 'Security' : undefined}
      title={
        mfaRequired ? (
          <>
            Verify with <AuthHeadingAccent>MFA</AuthHeadingAccent>
          </>
        ) : (
          <>
            Welcome <AuthHeadingAccent>back</AuthHeadingAccent>
          </>
        )
      }
      subtitle={
        mfaRequired
          ? 'Enter the 6-digit code from your authenticator app or a backup code.'
          : 'Sign in to manage DNS security for your organization.'
      }
    >
      {error && <AuthErrorBanner message={error} />}

      {!mfaRequired ? (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="fs-label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="fs-input"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="fs-label">
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
              className="fs-input"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className="fs-btn fs-btn-primary w-full fs-btn-lg">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t fs-hairline" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[var(--fs-panel)] px-2 text-mut">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="fs-btn w-full fs-btn-lg disabled:opacity-50"
          >
            Try demo account
          </button>

          <p className="text-center text-sm text-mut pt-1">
            New to Flux Shield?{' '}
            <Link href="/signup" className="font-medium text-[var(--fs-blue)] hover:underline">
              Create account
            </Link>
          </p>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={handleMfaSubmit}>
          <MFAInput value={mfaCode} onChange={setMfaCode} />
          <p className="text-xs text-center text-mut">Backup codes are 8 characters.</p>
          <button
            type="submit"
            disabled={loading || mfaCode.length < 6}
            className="fs-btn fs-btn-primary w-full fs-btn-lg disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Verify code'}
          </button>
          <button type="button" onClick={handleBackToLogin} className="fs-btn w-full">
            ← Back to login
          </button>
        </form>
      )}
    </AuthShell>
  )
}

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
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="fs-input h-12 w-11 text-center text-lg font-semibold p-0"
          autoFocus={index === 0}
        />
      ))}
    </div>
  )
}
