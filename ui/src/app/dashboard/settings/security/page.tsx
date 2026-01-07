/**
 * Nebula DNS - Security Settings
 * Comprehensive security configuration including MFA, sessions, password, and audit
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Card, Button, Input, Badge, Modal, Tabs } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { useSessions, useAuditLogs } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { exportArrayToCsv } from '@/lib/export'
import {
  ShieldCheckIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  ClockIcon,
  LockClosedIcon,
  FingerPrintIcon,
  BellAlertIcon,
  DocumentTextIcon,
  TrashIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  MapPinIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon, ClipboardDocumentIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'

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

interface Session {
  id: string
  device: string
  browser: string
  location: string
  ip: string
  lastActive: string
  isCurrent: boolean
}

interface AuditLog {
  id: string
  action: string
  details: string
  ip: string
  timestamp: string
  success: boolean
}

export default function SecuritySettingsPage() {
  const { showToast } = useToast()

  // API hooks for sessions and audit logs
  const { data: sessionsData, error: sessionsError, isLoading: sessionsLoading, mutate: mutateSessions } = useSessions()
  const { data: auditLogsData, error: auditLogsError, isLoading: auditLogsLoading } = useAuditLogs({ limit: 50 })

  const [activeTab, setActiveTab] = useState('mfa')
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null)
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [changingPassword, setChangingPassword] = useState(false)

  // MFA operations state
  const [disablingMfa, setDisablingMfa] = useState(false)
  const [regeneratingCodes, setRegeneratingCodes] = useState(false)
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false)
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([])
  const [showDisableMfaModal, setShowDisableMfaModal] = useState(false)
  const [disableMfaForm, setDisableMfaForm] = useState({ password: '', code: '' })

  // Sessions state - use API data
  const sessions: Session[] = sessionsData?.data || []
  const [revokingSession, setRevokingSession] = useState<string | null>(null)

  // Audit logs state - use API data
  const auditLogs: AuditLog[] = auditLogsData?.data || []

  // Audit log filter state
  const [auditActionFilter, setAuditActionFilter] = useState<string>('')
  const [auditDateFilter, setAuditDateFilter] = useState<string>('all')

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Action filter
      if (auditActionFilter && !log.action.toLowerCase().includes(auditActionFilter.toLowerCase())) {
        return false
      }

      // Date filter
      if (auditDateFilter !== 'all') {
        const logDate = new Date(log.timestamp)
        const now = new Date()
        let cutoffDate: Date

        switch (auditDateFilter) {
          case 'today':
            cutoffDate = new Date(now.setHours(0, 0, 0, 0))
            break
          case '7days':
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '30days':
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          default:
            cutoffDate = new Date(0)
        }

        if (logDate < cutoffDate) {
          return false
        }
      }

      return true
    })
  }, [auditLogs, auditActionFilter, auditDateFilter])

  // Get unique actions for filter dropdown
  const uniqueActions = useMemo(() => {
    const actions = new Set(auditLogs.map(log => log.action))
    return Array.from(actions).sort()
  }, [auditLogs])

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: '60',
    loginNotifications: true,
    suspiciousActivityAlerts: true,
    requireMfaForApiKeys: false,
    ipWhitelistEnabled: false,
    passwordExpiry: '90',
  })

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

  const handleDisableMfa = async () => {
    if (!disableMfaForm.password || !disableMfaForm.code) {
      setError('Password and verification code are required')
      return
    }

    setDisablingMfa(true)
    setError('')
    try {
      await api.disableMfa(disableMfaForm.password, disableMfaForm.code)
      setMfaStatus({ enabled: false })
      setSuccess('Two-factor authentication has been disabled')
      showToast('success', 'MFA disabled successfully')
      setShowDisableMfaModal(false)
      setDisableMfaForm({ password: '', code: '' })
    } catch (err: any) {
      setError(err.message || 'Failed to disable MFA')
      showToast('error', err.message || 'Failed to disable MFA')
    } finally {
      setDisablingMfa(false)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    if (!confirm('This will invalidate your current backup codes. Make sure to save the new ones. Continue?')) {
      return
    }

    setRegeneratingCodes(true)
    setError('')
    try {
      const result = await api.regenerateBackupCodes()
      setNewBackupCodes(result.backupCodes)
      setShowBackupCodesModal(true)
      fetchMfaStatus() // Refresh MFA status to update remaining codes count
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate backup codes')
      showToast('error', err.message || 'Failed to regenerate backup codes')
    } finally {
      setRegeneratingCodes(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      showToast('error', 'All fields are required')
      return
    }
    if (passwordForm.new !== passwordForm.confirm) {
      showToast('error', 'New passwords do not match')
      return
    }
    if (passwordForm.new.length < 8) {
      showToast('error', 'Password must be at least 8 characters')
      return
    }

    setChangingPassword(true)
    try {
      await api.changePassword(passwordForm.current, passwordForm.new)
      showToast('success', 'Password changed successfully')
      setShowPasswordModal(false)
      setPasswordForm({ current: '', new: '', confirm: '' })
    } catch (err: any) {
      showToast('error', err.message || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId)
    try {
      await api.revokeSession(sessionId)
      mutateSessions()
      showToast('success', 'Session revoked successfully')
    } catch (err) {
      showToast('error', 'Failed to revoke session')
    } finally {
      setRevokingSession(null)
    }
  }

  const handleRevokeAllSessions = async () => {
    if (!confirm('This will log you out of all other devices. Continue?')) return
    try {
      await api.revokeAllSessions()
      mutateSessions()
      showToast('success', 'All other sessions revoked')
    } catch (err) {
      showToast('error', 'Failed to revoke sessions')
    }
  }

  const tabs = [
    { id: 'mfa', label: 'Two-Factor Auth', icon: ShieldCheckIcon },
    { id: 'password', label: 'Password', icon: LockClosedIcon },
    { id: 'sessions', label: 'Sessions', icon: ComputerDesktopIcon },
    { id: 'alerts', label: 'Alerts', icon: BellAlertIcon },
    { id: 'audit', label: 'Audit Log', icon: DocumentTextIcon },
  ]

  if (loading && !showSetup) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-space-200 dark:bg-space-700 rounded-xl"></div>
          <div className="h-32 bg-space-200 dark:bg-space-700 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-space-900 dark:text-white flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-nebula-500 to-cosmic-500">
            <ShieldCheckIcon className="h-6 w-6 text-white" />
          </div>
          Security Settings
        </h1>
        <p className="mt-2 text-space-600 dark:text-space-400">
          Manage your account security, authentication methods, and access controls
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-danger-50 dark:bg-danger-900/30 ring-1 ring-danger-200 dark:ring-danger-800 flex items-center text-danger-700 dark:text-danger-200">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-success-50 dark:bg-success-900/30 ring-1 ring-success-200 dark:ring-success-800 flex items-center text-success-700 dark:text-success-200">
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          {success}
          <button onClick={() => setSuccess('')} className="ml-auto">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-nebula-500 text-white shadow-lg shadow-nebula-500/25'
                : 'bg-white dark:bg-space-800 text-space-600 dark:text-space-400 hover:bg-space-50 dark:hover:bg-space-700 ring-1 ring-space-200 dark:ring-space-700'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* MFA Tab */}
      {activeTab === 'mfa' && !showSetup && (
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={clsx(
                'p-3 rounded-xl',
                mfaStatus?.enabled
                  ? 'bg-success-100 dark:bg-success-900/30'
                  : 'bg-space-100 dark:bg-space-700'
              )}>
                <ShieldCheckIcon className={clsx(
                  'h-6 w-6',
                  mfaStatus?.enabled
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-space-500 dark:text-space-400'
                )} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-space-900 dark:text-white">Two-Factor Authentication</h2>
                <p className="text-space-600 dark:text-space-400 mt-1">
                  Add an extra layer of security by requiring a verification code in addition to your password.
                </p>
                {mfaStatus?.enabled && mfaStatus.backupCodes && (
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <KeyIcon className="h-4 w-4 text-space-400" />
                    <span className="text-space-600 dark:text-space-400">
                      Backup codes: <span className="font-medium text-space-900 dark:text-white">{mfaStatus.backupCodes.remaining}</span> of {mfaStatus.backupCodes.total} remaining
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div>
              {mfaStatus?.enabled ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircleIcon className="h-4 w-4" />
                  Enabled
                </Badge>
              ) : (
                <Button onClick={initiateSetup}>
                  Enable MFA
                </Button>
              )}
            </div>
          </div>

          {mfaStatus?.enabled && (
            <div className="mt-6 pt-6 border-t border-space-200 dark:border-space-700">
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRegenerateBackupCodes}
                  disabled={regeneratingCodes}
                  isLoading={regeneratingCodes}
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Regenerate Backup Codes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDisableMfaModal(true)}
                  className="text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/30"
                >
                  Disable MFA
                </Button>
              </div>
            </div>
          )}

          {/* Security Tips */}
          <div className="mt-6 p-4 rounded-xl bg-nebula-50 dark:bg-nebula-900/20 ring-1 ring-nebula-200 dark:ring-nebula-800">
            <h3 className="font-medium text-nebula-900 dark:text-nebula-100 mb-2">Security Tips</h3>
            <ul className="text-sm text-nebula-700 dark:text-nebula-300 space-y-1">
              <li>• Use an authenticator app like Google Authenticator, Authy, or 1Password</li>
              <li>• Store your backup codes in a secure location</li>
              <li>• Never share your authentication codes with anyone</li>
            </ul>
          </div>
        </Card>
      )}

      {/* MFA Setup Flow */}
      {activeTab === 'mfa' && showSetup && setupData && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-6">Set Up Two-Factor Authentication</h2>

          <div className="space-y-8">
            {/* Step 1: Scan QR Code */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-nebula-500 to-cosmic-500 text-white flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-space-900 dark:text-white mb-2">Scan QR Code</h3>
                <p className="text-sm text-space-600 dark:text-space-400 mb-4">
                  Open your authenticator app and scan this QR code:
                </p>
                <div className="bg-white p-4 rounded-xl inline-block shadow-lg ring-1 ring-space-200">
                  <QRCodeSVG
                    value={setupData.qrCodeUrl}
                    size={180}
                    level="M"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <p className="text-sm text-space-500 dark:text-space-400 mt-4">
                  Can't scan? Enter this code manually:
                </p>
                <code className="mt-2 inline-block bg-space-100 dark:bg-space-800 px-4 py-2 rounded-lg font-mono text-sm text-space-900 dark:text-space-100 ring-1 ring-space-200 dark:ring-space-700">
                  {setupData.secret}
                </code>
              </div>
            </div>

            {/* Step 2: Enter Code */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-nebula-500 to-cosmic-500 text-white flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-space-900 dark:text-white mb-2">Enter Verification Code</h3>
                <p className="text-sm text-space-600 dark:text-space-400 mb-4">
                  Enter the 6-digit code from your authenticator app:
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="w-44 px-4 py-3 text-2xl tracking-[0.5em] text-center rounded-xl bg-white dark:bg-space-800 text-space-900 dark:text-white ring-1 ring-space-300 dark:ring-space-600 focus:ring-2 focus:ring-nebula-500 focus:outline-none"
                    placeholder="000000"
                  />
                  <Button
                    onClick={verifyAndEnable}
                    disabled={verificationCode.length !== 6 || loading}
                    isLoading={loading}
                  >
                    Verify & Enable
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 3: Save Backup Codes */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-nebula-500 to-cosmic-500 text-white flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-space-900 dark:text-white mb-2">Save Backup Codes</h3>
                <p className="text-sm text-space-600 dark:text-space-400 mb-4">
                  Store these backup codes securely. Use them to access your account if you lose your authenticator device.
                </p>
                <div className="p-4 rounded-xl bg-warning-50 dark:bg-warning-900/20 ring-1 ring-warning-200 dark:ring-warning-800 mb-4">
                  <p className="text-sm text-warning-800 dark:text-warning-200 flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                    These codes will only be shown once. Make sure to save them!
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-space-50 dark:bg-space-800 px-4 py-2.5 rounded-lg font-mono text-sm text-space-900 dark:text-space-100 ring-1 ring-space-200 dark:ring-space-700"
                    >
                      <span>{code}</span>
                      <button
                        onClick={() => copyToClipboard(code, index)}
                        className="p-1.5 hover:bg-space-200 dark:hover:bg-space-600 rounded-lg transition-colors"
                      >
                        {copiedIndex === index ? (
                          <CheckCircleIcon className="h-4 w-4 text-success-500" />
                        ) : (
                          <ClipboardDocumentIcon className="h-4 w-4 text-space-400" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-space-200 dark:border-space-700">
            <Button
              variant="ghost"
              onClick={() => {
                setShowSetup(false)
                setSetupData(null)
                setVerificationCode('')
              }}
            >
              Cancel Setup
            </Button>
          </div>
        </Card>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-space-100 dark:bg-space-700">
                <LockClosedIcon className="h-6 w-6 text-space-600 dark:text-space-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-space-900 dark:text-white">Password</h2>
                <p className="text-space-600 dark:text-space-400 mt-1">
                  Keep your account secure with a strong password. We recommend using a password manager.
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="text-sm text-space-500 dark:text-space-400">
                    Last changed: <span className="font-medium text-space-700 dark:text-space-300">30 days ago</span>
                  </div>
                </div>
              </div>
              <Button onClick={() => setShowPasswordModal(true)}>
                Change Password
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-space-900 dark:text-white mb-4">Password Requirements</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Minimum 8 characters', met: true },
                { label: 'One uppercase letter', met: true },
                { label: 'One lowercase letter', met: true },
                { label: 'One number', met: true },
                { label: 'One special character', met: false },
                { label: 'No common patterns', met: true },
              ].map((req, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className={clsx(
                    'w-5 h-5 rounded-full flex items-center justify-center',
                    req.met ? 'bg-success-100 dark:bg-success-900/30' : 'bg-space-100 dark:bg-space-700'
                  )}>
                    {req.met ? (
                      <CheckCircleIcon className="h-3.5 w-3.5 text-success-600 dark:text-success-400" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-space-400" />
                    )}
                  </div>
                  <span className={clsx(
                    req.met ? 'text-space-700 dark:text-space-300' : 'text-space-500 dark:text-space-400'
                  )}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-space-900 dark:text-white">Password Expiry</h3>
                <p className="text-sm text-space-600 dark:text-space-400 mt-1">
                  Require password change after a period of time
                </p>
              </div>
              <select
                value={securitySettings.passwordExpiry}
                onChange={(e) => setSecuritySettings({ ...securitySettings, passwordExpiry: e.target.value })}
                className="px-4 py-2 rounded-xl bg-white dark:bg-space-800 text-space-900 dark:text-white ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-nebula-500"
              >
                <option value="never">Never</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
              </select>
            </div>
          </Card>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-space-900 dark:text-white">Active Sessions</h2>
                <p className="text-sm text-space-600 dark:text-space-400 mt-1">
                  Manage devices that are currently logged into your account
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleRevokeAllSessions} disabled={sessions.length === 0}>
                <TrashIcon className="h-4 w-4 mr-2" />
                Revoke All Other Sessions
              </Button>
            </div>

            {sessionsLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nebula-500"></div>
              </div>
            )}

            {sessionsError && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-danger-500 mb-2" />
                <p className="text-space-500">{sessionsError?.message || 'Failed to load sessions'}</p>
                <Button variant="secondary" size="sm" onClick={() => mutateSessions()} className="mt-4">
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}

            {!sessionsLoading && !sessionsError && sessions.length === 0 && (
              <div className="text-center py-8 text-space-500">
                No active sessions found.
              </div>
            )}

            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={clsx(
                    'flex items-center justify-between p-4 rounded-xl ring-1',
                    session.isCurrent
                      ? 'bg-nebula-50 dark:bg-nebula-900/20 ring-nebula-200 dark:ring-nebula-800'
                      : 'bg-space-50 dark:bg-space-800/50 ring-space-200 dark:ring-space-700'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={clsx(
                      'p-2.5 rounded-xl',
                      session.device.includes('iPhone') || session.device.includes('Android')
                        ? 'bg-cosmic-100 dark:bg-cosmic-900/30'
                        : 'bg-space-100 dark:bg-space-700'
                    )}>
                      {session.device.includes('iPhone') || session.device.includes('Android') ? (
                        <DevicePhoneMobileIcon className="h-5 w-5 text-cosmic-600 dark:text-cosmic-400" />
                      ) : (
                        <ComputerDesktopIcon className="h-5 w-5 text-space-600 dark:text-space-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-space-900 dark:text-white">{session.device}</span>
                        {session.isCurrent && (
                          <Badge variant="primary" size="sm">Current</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-space-500 dark:text-space-400 mt-1">
                        <span>{session.browser}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPinIcon className="h-3.5 w-3.5" />
                          {session.location}
                        </span>
                        <span>•</span>
                        <span>{session.ip}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-space-500 dark:text-space-400">
                      <ClockIcon className="h-4 w-4 inline mr-1" />
                      {session.lastActive}
                    </span>
                    {!session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeSession(session.id)}
                        isLoading={revokingSession === session.id}
                        className="text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/30"
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-space-900 dark:text-white">Session Timeout</h3>
                <p className="text-sm text-space-600 dark:text-space-400 mt-1">
                  Automatically log out after period of inactivity
                </p>
              </div>
              <select
                value={securitySettings.sessionTimeout}
                onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                className="px-4 py-2 rounded-xl bg-white dark:bg-space-800 text-space-900 dark:text-white ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-nebula-500"
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="240">4 hours</option>
                <option value="480">8 hours</option>
                <option value="1440">24 hours</option>
              </select>
            </div>
          </Card>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-6">Security Alerts</h2>

            <div className="space-y-6">
              {[
                {
                  id: 'loginNotifications',
                  icon: GlobeAltIcon,
                  title: 'Login Notifications',
                  description: 'Get notified when someone logs into your account from a new device or location',
                  enabled: securitySettings.loginNotifications
                },
                {
                  id: 'suspiciousActivityAlerts',
                  icon: ExclamationTriangleIcon,
                  title: 'Suspicious Activity Alerts',
                  description: 'Get alerted about unusual account activity or potential security threats',
                  enabled: securitySettings.suspiciousActivityAlerts
                },
                {
                  id: 'requireMfaForApiKeys',
                  icon: KeyIcon,
                  title: 'MFA for API Key Creation',
                  description: 'Require two-factor authentication when creating new API keys',
                  enabled: securitySettings.requireMfaForApiKeys
                },
              ].map((setting) => (
                <div key={setting.id} className="flex items-start justify-between p-4 rounded-xl bg-space-50 dark:bg-space-800/50 ring-1 ring-space-200 dark:ring-space-700">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-space-700 ring-1 ring-space-200 dark:ring-space-600">
                      <setting.icon className="h-5 w-5 text-space-600 dark:text-space-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-space-900 dark:text-white">{setting.title}</h3>
                      <p className="text-sm text-space-600 dark:text-space-400 mt-1">{setting.description}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={setting.enabled}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        [setting.id]: e.target.checked
                      })}
                    />
                    <div className="w-11 h-6 bg-space-200 dark:bg-space-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-nebula-300 dark:peer-focus:ring-nebula-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-space-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nebula-500"></div>
                  </label>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-warning-100 dark:bg-warning-900/30">
                <ExclamationTriangleIcon className="h-6 w-6 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <h3 className="font-semibold text-space-900 dark:text-white">IP Whitelist</h3>
                <p className="text-sm text-space-600 dark:text-space-400 mt-1">
                  Restrict account access to specific IP addresses. Enable with caution as this may lock you out.
                </p>
                <div className="mt-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={securitySettings.ipWhitelistEnabled}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, ipWhitelistEnabled: e.target.checked })}
                      className="w-4 h-4 rounded border-space-300 text-nebula-500 focus:ring-nebula-500"
                    />
                    <span className="text-sm font-medium text-space-700 dark:text-space-300">
                      Enable IP whitelist (advanced)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-space-900 dark:text-white">Security Audit Log</h2>
              <p className="text-sm text-space-600 dark:text-space-400 mt-1">
                Recent security-related events on your account
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={filteredAuditLogs.length === 0}
              onClick={() => exportArrayToCsv(filteredAuditLogs, 'security-audit-log')}
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Export Log
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-xl bg-space-50 dark:bg-space-800/50 ring-1 ring-space-200 dark:ring-space-700">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-space-500 dark:text-space-400 mb-1">Action Type</label>
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-space-700 text-space-900 dark:text-white text-sm ring-1 ring-space-200 dark:ring-space-600 focus:ring-2 focus:ring-nebula-500 focus:outline-none"
              >
                <option value="">All Actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-space-500 dark:text-space-400 mb-1">Date Range</label>
              <select
                value={auditDateFilter}
                onChange={(e) => setAuditDateFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-space-700 text-space-900 dark:text-white text-sm ring-1 ring-space-200 dark:ring-space-600 focus:ring-2 focus:ring-nebula-500 focus:outline-none"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>
            {(auditActionFilter || auditDateFilter !== 'all') && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setAuditActionFilter('')
                    setAuditDateFilter('all')
                  }}
                  className="px-3 py-2 text-sm text-nebula-600 dark:text-nebula-400 hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Results count */}
          {!auditLogsLoading && auditLogs.length > 0 && (
            <div className="text-sm text-space-500 dark:text-space-400 mb-4">
              Showing {filteredAuditLogs.length} of {auditLogs.length} events
            </div>
          )}

          {auditLogsLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nebula-500"></div>
            </div>
          )}

          {auditLogsError && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-danger-500 mb-2" />
              <p className="text-space-500">{auditLogsError?.message || 'Failed to load audit logs'}</p>
            </div>
          )}

          {!auditLogsLoading && !auditLogsError && auditLogs.length === 0 && (
            <div className="text-center py-8 text-space-500">
              No audit logs found.
            </div>
          )}

          {!auditLogsLoading && !auditLogsError && auditLogs.length > 0 && filteredAuditLogs.length === 0 && (
            <div className="text-center py-8 text-space-500">
              No events match the current filters.
            </div>
          )}

          {!auditLogsLoading && !auditLogsError && filteredAuditLogs.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-space-200 dark:border-space-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-space-500 dark:text-space-400">Action</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-space-500 dark:text-space-400">Details</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-space-500 dark:text-space-400">IP Address</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-space-500 dark:text-space-400">Timestamp</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-space-500 dark:text-space-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-space-100 dark:divide-space-700">
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-space-50 dark:hover:bg-space-800/50">
                        <td className="py-3 px-4">
                          <span className="font-medium text-space-900 dark:text-white">{log.action}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-space-600 dark:text-space-400">{log.details}</td>
                        <td className="py-3 px-4 text-sm font-mono text-space-600 dark:text-space-400">{log.ip}</td>
                        <td className="py-3 px-4 text-sm text-space-600 dark:text-space-400">{log.timestamp}</td>
                        <td className="py-3 px-4">
                          <Badge variant={log.success ? 'success' : 'danger'} size="sm">
                            {log.success ? 'Success' : 'Failed'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-center">
                <Button variant="ghost" size="sm">
                  Load More
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setPasswordForm({ current: '', new: '', confirm: '' })
        }}
        title="Change Password"
      >
        <div className="space-y-4">
          <div className="relative">
            <Input
              type={showPasswords.current ? 'text' : 'password'}
              label="Current Password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
              className="absolute right-3 top-9 text-space-400 hover:text-space-600"
            >
              {showPasswords.current ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>

          <div className="relative">
            <Input
              type={showPasswords.new ? 'text' : 'password'}
              label="New Password"
              value={passwordForm.new}
              onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
              className="absolute right-3 top-9 text-space-400 hover:text-space-600"
            >
              {showPasswords.new ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>

          <div className="relative">
            <Input
              type={showPasswords.confirm ? 'text' : 'password'}
              label="Confirm New Password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
              className="absolute right-3 top-9 text-space-400 hover:text-space-600"
            >
              {showPasswords.confirm ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowPasswordModal(false)} disabled={changingPassword}>
            Cancel
          </Button>
          <Button onClick={handlePasswordChange} isLoading={changingPassword}>
            Change Password
          </Button>
        </div>
      </Modal>

      {/* Backup Codes Modal */}
      <Modal
        isOpen={showBackupCodesModal}
        onClose={() => {
          setShowBackupCodesModal(false)
          setNewBackupCodes([])
        }}
        title="New Backup Codes"
        size="lg"
      >
        <div className="space-y-4">
          {/* Warning */}
          <div className="p-4 rounded-xl bg-warning-50 dark:bg-warning-900/20 ring-1 ring-warning-200 dark:ring-warning-800">
            <p className="text-sm text-warning-800 dark:text-warning-200 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
              Your previous backup codes have been invalidated. Save these new codes securely!
            </p>
          </div>

          {/* Backup Codes Grid */}
          <div className="grid grid-cols-2 gap-2">
            {newBackupCodes.map((code, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-space-50 dark:bg-space-800 px-4 py-2.5 rounded-lg font-mono text-sm text-space-900 dark:text-space-100 ring-1 ring-space-200 dark:ring-space-700"
              >
                <span>{code}</span>
                <button
                  onClick={() => copyToClipboard(code, index)}
                  className="p-1.5 hover:bg-space-200 dark:hover:bg-space-600 rounded-lg transition-colors"
                >
                  {copiedIndex === index ? (
                    <CheckCircleIcon className="h-4 w-4 text-success-500" />
                  ) : (
                    <ClipboardDocumentIcon className="h-4 w-4 text-space-400" />
                  )}
                </button>
              </div>
            ))}
          </div>

          <p className="text-sm text-space-500 dark:text-space-400">
            Each backup code can only be used once. Store them in a safe place.
          </p>
        </div>

        <div className="mt-6 flex justify-between">
          <Button
            variant="secondary"
            onClick={() => {
              const codesText = newBackupCodes.join('\n')
              navigator.clipboard.writeText(codesText)
              showToast('success', 'All codes copied to clipboard')
            }}
          >
            <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
            Copy All Codes
          </Button>
          <Button
            onClick={() => {
              setShowBackupCodesModal(false)
              setNewBackupCodes([])
            }}
          >
            Done
          </Button>
        </div>
      </Modal>

      {/* Disable MFA Modal */}
      <Modal
        isOpen={showDisableMfaModal}
        onClose={() => {
          setShowDisableMfaModal(false)
          setDisableMfaForm({ password: '', code: '' })
        }}
        title="Disable Two-Factor Authentication"
      >
        <div className="space-y-4">
          {/* Warning */}
          <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 ring-1 ring-danger-200 dark:ring-danger-800">
            <p className="text-sm text-danger-800 dark:text-danger-200 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
              Disabling MFA will make your account less secure. Please confirm by entering your password and current verification code.
            </p>
          </div>

          <Input
            type="password"
            label="Password"
            value={disableMfaForm.password}
            onChange={(e) => setDisableMfaForm({ ...disableMfaForm, password: e.target.value })}
            placeholder="Enter your password"
            required
          />

          <Input
            type="text"
            label="Verification Code"
            value={disableMfaForm.code}
            onChange={(e) => setDisableMfaForm({ ...disableMfaForm, code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            placeholder="Enter 6-digit code from your authenticator"
            maxLength={6}
            required
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setShowDisableMfaModal(false)
              setDisableMfaForm({ password: '', code: '' })
            }}
            disabled={disablingMfa}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDisableMfa}
            isLoading={disablingMfa}
            disabled={!disableMfaForm.password || disableMfaForm.code.length !== 6}
          >
            Disable MFA
          </Button>
        </div>
      </Modal>
    </div>
  )
}
