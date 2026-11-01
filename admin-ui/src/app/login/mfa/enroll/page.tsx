'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QrCodeIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import {
  adminMfaEnrollStart,
  adminMfaEnrollVerify,
} from '@/lib/api'
import { ProductFooter } from '@/components/ProductFooter'
import { PrintBackupCodesButton } from '@/components/mfa/PrintBackupCodesButton'
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline'

export default function AdminMfaEnrollPage() {
  const router = useRouter()
  const { admin, completeMfaSession, logout } = useAuth()
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [setupLoading, setSetupLoading] = useState(true)
  const [copyNotice, setCopyNotice] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/login')
      return
    }
    if (admin?.mfaSetupComplete) {
      router.push('/login/mfa')
      return
    }

    adminMfaEnrollStart(token)
      .then((data) => {
        setQrCodeUrl(data.qrCodeUrl)
        setBackupCodes(data.backupCodes || [])
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to start MFA setup')
      })
      .finally(() => setSetupLoading(false))
  }, [admin, router])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        router.push('/login')
        return
      }
      const data = await adminMfaEnrollVerify(token, code.trim())
      completeMfaSession(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const accountLabel = admin?.email ?? 'Admin account'

  const copyAllBackupCodes = async () => {
    if (!backupCodes.length) return
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
      setCopyNotice('Backup codes copied to clipboard')
      setTimeout(() => setCopyNotice(''), 3000)
    } catch {
      setCopyNotice('Unable to copy codes')
    }
  }

  const qrImageUrl = qrCodeUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCodeUrl)}`
    : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-space-50 dark:bg-space-950 px-6 py-10">
      <div className="w-full max-w-lg bg-white dark:bg-space-900 rounded-2xl border border-space-200 dark:border-space-800 p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-accent-100 dark:bg-accent-900/20">
            <QrCodeIcon className="h-7 w-7 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-space-900 dark:text-white">
              Set up authenticator
            </h1>
            <p className="text-sm text-space-500 dark:text-space-400">
              Scan the QR code, then enter a verification code
            </p>
          </div>
        </div>

        {setupLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : (
          <>
            {qrImageUrl && (
              <div className="flex justify-center mb-6">
                <img
                  src={qrImageUrl}
                  alt="MFA QR code"
                  className="rounded-lg border border-space-200 dark:border-space-700"
                  width={220}
                  height={220}
                />
              </div>
            )}

            {backupCodes.length > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-space-50 dark:bg-space-800/50 border border-space-200 dark:border-space-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-space-500 mb-2">
                  Backup codes (save securely)
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-sm text-space-800 dark:text-space-200">
                  {backupCodes.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="btn-secondary inline-flex items-center"
                    onClick={copyAllBackupCodes}
                    aria-label="Copy all backup codes"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4 mr-2" aria-hidden />
                    Copy all
                  </button>
                  <PrintBackupCodesButton
                    codes={backupCodes}
                    accountLabel={accountLabel}
                    onError={(message) => setError(message)}
                  />
                </div>
                {copyNotice ? (
                  <p className="mt-2 text-xs text-success-600 dark:text-success-400" role="status">
                    {copyNotice}
                  </p>
                ) : null}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 text-sm text-danger-700 dark:text-danger-300">
                {error}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label htmlFor="enroll-code" className="label">
                  Verification code
                </label>
                <input
                  id="enroll-code"
                  inputMode="numeric"
                  className="input text-center tracking-widest text-lg"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={loading}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Enabling MFA…' : 'Verify and sign in'}
              </button>
            </form>
          </>
        )}

        <button
          type="button"
          onClick={logout}
          className="mt-4 w-full text-sm text-space-500 hover:text-primary-600"
        >
          Sign out
        </button>

        <ProductFooter variant="auth" className="mt-8" />
      </div>
    </div>
  )
}
