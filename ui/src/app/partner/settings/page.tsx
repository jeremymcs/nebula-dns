/**
 * Partner Settings
 * Branding, customization, and partner configuration
 */

'use client'

import { useEffect, useState } from 'react'
import {
  Cog6ToothIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  PhotoIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'

interface PartnerSettings {
  name: string
  slug: string
  plan: string
  branding: {
    logoUrl: string
    faviconUrl: string
    primaryColor: string
    accentColor: string
    customDomain: string
    companyName: string
    supportEmail: string
    supportUrl: string
  }
  settings: {
    maxOrganizations: number
    allowCustomDomains: boolean
    whitelabelEnabled: boolean
  }
}

export default function PartnerSettingsPage() {
  const [settings, setSettings] = useState<PartnerSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    const token = localStorage.getItem('partnerToken')
    if (!token) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner-dashboard/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Failed to fetch settings')

      const data = await res.json()
      setSettings({
        ...data.data,
        branding: data.data.branding || {
          logoUrl: '',
          faviconUrl: '',
          primaryColor: '#10b981',
          accentColor: '#14b8a6',
          customDomain: '',
          companyName: data.data.name,
          supportEmail: '',
          supportUrl: '',
        },
        settings: data.data.settings || {
          maxOrganizations: 100,
          allowCustomDomains: false,
          whitelabelEnabled: false,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setError('')
    setSuccess('')

    const token = localStorage.getItem('partnerToken')
    if (!token) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner-dashboard/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branding: settings.branding,
        }),
      })

      if (!res.ok) throw new Error('Failed to save settings')

      setSuccess('Settings saved successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateBranding = (field: string, value: string) => {
    if (!settings) return
    setSettings({
      ...settings,
      branding: { ...settings.branding, [field]: value },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="bg-danger-50 dark:bg-danger-900/20 rounded-xl p-6 text-center">
        <p className="text-danger-700 dark:text-danger-300">{error || 'Failed to load settings'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Partner Settings</h1>
          <p className="text-space-500 dark:text-space-400">Configure branding and customization</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="bg-danger-50 dark:bg-danger-900/20 rounded-xl p-4">
          <p className="text-danger-700 dark:text-danger-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 flex items-center gap-2">
          <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-green-700 dark:text-green-300">{success}</p>
        </div>
      )}

      {/* Branding Section */}
      <div className="bg-white dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-800 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <PaintBrushIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-space-900 dark:text-white">Branding</h2>
            <p className="text-sm text-space-500 dark:text-space-400">Customize the look and feel</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={settings.branding.companyName}
              onChange={(e) => updateBranding('companyName', e.target.value)}
              className="w-full px-4 py-2 bg-space-50 dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
              Logo URL
            </label>
            <input
              type="url"
              value={settings.branding.logoUrl}
              onChange={(e) => updateBranding('logoUrl', e.target.value)}
              className="w-full px-4 py-2 bg-space-50 dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.branding.primaryColor}
                onChange={(e) => updateBranding('primaryColor', e.target.value)}
                className="h-10 w-16 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={settings.branding.primaryColor}
                onChange={(e) => updateBranding('primaryColor', e.target.value)}
                className="flex-1 px-4 py-2 bg-space-50 dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.branding.accentColor}
                onChange={(e) => updateBranding('accentColor', e.target.value)}
                className="h-10 w-16 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={settings.branding.accentColor}
                onChange={(e) => updateBranding('accentColor', e.target.value)}
                className="flex-1 px-4 py-2 bg-space-50 dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Support Section */}
      <div className="bg-white dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-800 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
            <GlobeAltIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-space-900 dark:text-white">Support & Contact</h2>
            <p className="text-sm text-space-500 dark:text-space-400">Configure support information</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
              Support Email
            </label>
            <input
              type="email"
              value={settings.branding.supportEmail}
              onChange={(e) => updateBranding('supportEmail', e.target.value)}
              className="w-full px-4 py-2 bg-space-50 dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500"
              placeholder="support@yourcompany.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
              Support URL
            </label>
            <input
              type="url"
              value={settings.branding.supportUrl}
              onChange={(e) => updateBranding('supportUrl', e.target.value)}
              className="w-full px-4 py-2 bg-space-50 dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500"
              placeholder="https://support.yourcompany.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
              Custom Domain
            </label>
            <input
              type="text"
              value={settings.branding.customDomain}
              onChange={(e) => updateBranding('customDomain', e.target.value)}
              className="w-full px-4 py-2 bg-space-50 dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500"
              placeholder="dns.yourcompany.com"
            />
            <p className="mt-1 text-xs text-space-500 dark:text-space-400">
              Configure a custom domain for your partner portal
            </p>
          </div>
        </div>
      </div>

      {/* Plan Info */}
      <div className="bg-white dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Cog6ToothIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-space-900 dark:text-white">Partner Plan</h2>
              <p className="text-sm text-space-500 dark:text-space-400">Your current subscription</p>
            </div>
          </div>
          <span className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl font-medium capitalize">
            {settings.plan}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-space-50 dark:bg-space-800 rounded-xl">
            <p className="text-2xl font-bold text-space-900 dark:text-white">{settings.settings.maxOrganizations}</p>
            <p className="text-sm text-space-500 dark:text-space-400">Max Organizations</p>
          </div>
          <div className="p-4 bg-space-50 dark:bg-space-800 rounded-xl">
            <p className="text-2xl font-bold text-space-900 dark:text-white">{settings.settings.whitelabelEnabled ? 'Yes' : 'No'}</p>
            <p className="text-sm text-space-500 dark:text-space-400">White-label</p>
          </div>
          <div className="p-4 bg-space-50 dark:bg-space-800 rounded-xl">
            <p className="text-2xl font-bold text-space-900 dark:text-white">{settings.settings.allowCustomDomains ? 'Yes' : 'No'}</p>
            <p className="text-sm text-space-500 dark:text-space-400">Custom Domains</p>
          </div>
        </div>
      </div>
    </div>
  )
}

