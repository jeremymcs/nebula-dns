/**
 * Security Settings - MFA Configuration
 */

'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ShieldCheckIcon, KeyIcon, DevicePhoneMobileIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon, ClipboardDocumentIcon } from '@heroicons/react/24/solid'

interface MfaStatus {
  enabled: boolean
  backupCodes?: {
    total: number
    remaining: number
  }
}

interface SetupData {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
}

export default function SecuritySettingsPage() {
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null)
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchMfaStatus()
  }, [])

  const fetchMfaStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mfa/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMfaStatus(data)
      }
    } catch (err) {
      console.error('Failed to fetch MFA status')
    } finally {
      setLoading(false)
    }
  }

  const initiateSetup = async () => {
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mfa/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!res.ok) throw new Error('Failed to initiate MFA setup')
      
      const data = await res.json()
      setSetupData(data.data)
      setShowSetup(true)
    } catch (err) {
      setError('Failed to start MFA setup')
    }
  }

  const verifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setError('')
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mfa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: verificationCode }),
      })
      
      if (!res.ok) throw new Error('Invalid verification code')
      
      setSuccess('MFA has been enabled successfully!')
      setShowSetup(false)
      setSetupData(null)
      fetchMfaStatus()
    } catch (err) {
      setError('Invalid verification code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  if (loading && !showSetup) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Security Settings</h1>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center text-red-700 dark:text-red-200">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 flex items-center text-green-700 dark:text-green-200">
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {/* MFA Status Card */}
      {!showSetup && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg ${mfaStatus?.enabled ? 'bg-green-100 dark:bg-green-900/50' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <ShieldCheckIcon className={`h-6 w-6 ${mfaStatus?.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Add an extra layer of security to your account by requiring a verification code in addition to your password.
                </p>
                {mfaStatus?.enabled && mfaStatus.backupCodes && (
                  <div className="mt-3 flex items-center text-sm">
                    <KeyIcon className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Backup codes remaining: <span className="font-medium">{mfaStatus.backupCodes.remaining}</span> of {mfaStatus.backupCodes.total}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div>
              {mfaStatus?.enabled ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Enabled
                </span>
              ) : (
                <button
                  onClick={initiateSetup}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                >
                  Enable MFA
                </button>
              )}
            </div>
          </div>

          {mfaStatus?.enabled && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-4">
                <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600">
                  Regenerate Backup Codes
                </button>
                <button className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg font-medium">
                  Disable MFA
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MFA Setup Flow */}
      {showSetup && setupData && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Set Up Two-Factor Authentication</h2>

          <div className="space-y-6">
            {/* Step 1: Scan QR Code */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-semibold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Scan QR Code</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Open your authenticator app (Google Authenticator, Authy, 1Password, etc.) and scan this QR code:
                </p>
                <div className="bg-white p-4 rounded-lg inline-block shadow-sm border border-gray-200">
                  <QRCodeSVG
                    value={setupData.qrCodeUrl}
                    size={192}
                    level="M"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                  Can't scan? Enter this code manually: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{setupData.secret}</code>
                </p>
              </div>
            </div>

            {/* Step 2: Enter Code */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-semibold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Enter Verification Code</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Enter the 6-digit code from your authenticator app:
                </p>
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="w-40 px-4 py-3 text-2xl tracking-widest text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="000000"
                  />
                  <button
                    onClick={verifyAndEnable}
                    disabled={verificationCode.length !== 6 || loading}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enable'}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: Save Backup Codes */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-semibold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Save Backup Codes</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Save these backup codes in a secure place. You can use them to access your account if you lose your authenticator device.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                    These codes will only be shown once. Make sure to save them!
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded font-mono text-sm dark:text-gray-200"
                    >
                      <span>{code}</span>
                      <button
                        onClick={() => copyToClipboard(code, index)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      >
                        {copiedIndex === index ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <ClipboardDocumentIcon className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setShowSetup(false)
                setSetupData(null)
                setVerificationCode('')
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel Setup
            </button>
          </div>
        </div>
      )}

      {/* Additional Security Settings */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Additional Security</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Session Timeout</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Automatically log out after period of inactivity</p>
            </div>
            <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white">
              <option>30 minutes</option>
              <option>1 hour</option>
              <option>4 hours</option>
              <option>8 hours</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Login Notifications</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get notified of new logins to your account</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Active Sessions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">View and manage your active sessions</p>
            </div>
            <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">
              View Sessions
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
