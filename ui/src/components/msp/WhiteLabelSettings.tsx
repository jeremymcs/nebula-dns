// Nebula DNS - White Label Settings Component
// Allows MSPs to customize branding for client portals
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  PhotoIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'

interface WhiteLabelConfig {
  companyName: string
  logoUrl: string
  faviconUrl: string
  primaryColor: string
  accentColor: string
  customDomain: string
  supportEmail: string
  supportUrl: string
  termsUrl: string
  privacyUrl: string
  hideNebulaBranding: boolean
}

export function WhiteLabelSettings() {
  const [config, setConfig] = useState<WhiteLabelConfig>({
    companyName: '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#4F46E5',
    accentColor: '#06B6D4',
    customDomain: '',
    supportEmail: '',
    supportUrl: '',
    termsUrl: '',
    privacyUrl: '',
    hideNebulaBranding: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      // Fetch current tenant settings
      const response = await api.get('/tenants/current')
      const settings = response.settings?.whiteLabel || {}

      setConfig({
        companyName: settings.companyName || '',
        logoUrl: settings.logoUrl || '',
        faviconUrl: settings.faviconUrl || '',
        primaryColor: settings.primaryColor || '#4F46E5',
        accentColor: settings.accentColor || '#06B6D4',
        customDomain: settings.customDomain || '',
        supportEmail: settings.supportEmail || '',
        supportUrl: settings.supportUrl || '',
        termsUrl: settings.termsUrl || '',
        privacyUrl: settings.privacyUrl || '',
        hideNebulaBranding: settings.hideNebulaBranding || false,
      })
    } catch (error) {
      logger.error('Failed to load white label config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)
    try {
      await api.updateTenant({
        settings: {
          whiteLabel: config,
        },
      })

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      logger.info('White label settings saved')
    } catch (error) {
      logger.error('Failed to save white label config:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Branding Section */}
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <PaintBrushIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">
              Branding
            </h3>
            <p className="text-sm text-space-500 dark:text-space-400">
              Customize the appearance of client portals
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={config.companyName}
              onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
              placeholder="Your Company Name"
              className="block w-full rounded-xl border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 px-4 py-2.5 text-space-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                Logo URL
              </label>
              <input
                type="url"
                value={config.logoUrl}
                onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="block w-full rounded-xl border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 px-4 py-2.5 text-space-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <p className="text-xs text-space-500 dark:text-space-400 mt-1">
                Recommended: 200x50px PNG with transparent background
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                Favicon URL
              </label>
              <input
                type="url"
                value={config.faviconUrl}
                onChange={(e) => setConfig({ ...config, faviconUrl: e.target.value })}
                placeholder="https://example.com/favicon.ico"
                className="block w-full rounded-xl border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 px-4 py-2.5 text-space-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <p className="text-xs text-space-500 dark:text-space-400 mt-1">
                Recommended: 32x32px ICO or PNG
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                Primary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="h-10 w-20 rounded-lg border border-space-300 dark:border-space-600"
                />
                <input
                  type="text"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="flex-1 rounded-xl border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 px-4 py-2.5 text-space-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                Accent Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.accentColor}
                  onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                  className="h-10 w-20 rounded-lg border border-space-300 dark:border-space-600"
                />
                <input
                  type="text"
                  value={config.accentColor}
                  onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                  className="flex-1 rounded-xl border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 px-4 py-2.5 text-space-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="hideNebulaBranding"
              checked={config.hideNebulaBranding}
              onChange={(e) => setConfig({ ...config, hideNebulaBranding: e.target.checked })}
              className="h-4 w-4 rounded border-space-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="hideNebulaBranding" className="text-sm text-space-700 dark:text-space-300">
              Hide Nebula DNS branding (show only your branding)
            </label>
          </div>
        </div>
      </div>

      {/* Custom Domain Section */}
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <GlobeAltIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">
              Custom Domain
            </h3>
            <p className="text-sm text-space-500 dark:text-space-400">
              Host client portals on your own domain
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
            Custom Domain
          </label>
          <input
            type="text"
            value={config.customDomain}
            onChange={(e) => setConfig({ ...config, customDomain: e.target.value })}
            placeholder="portal.yourcompany.com"
            className="block w-full rounded-xl border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 px-4 py-2.5 text-space-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
          <p className="text-xs text-space-500 dark:text-space-400 mt-2">
            Configure DNS CNAME record: portal.yourcompany.com → app.shield.fluxlabs.net
          </p>
        </div>
      </div>

      {/* Support & Legal Links Section */}
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <PhotoIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">
              Support & Legal
            </h3>
            <p className="text-sm text-space-500 dark:text-space-400">
              Customize support and legal links
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                Support Email
              </label>
              <input
                type="email"
                value={config.supportEmail}
                onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                placeholder="support@yourcompany.com"
                className="block w-full rounded-xl border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 px-4 py-2.5 text-space-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                Support URL
              </label>
              <input
                type="url"
                value={config.supportUrl}
                onChange={(e) => setConfig({ ...config, supportUrl: e.target.value })}
                placeholder="https://support.yourcompany.com"
                className="block w-full rounded-xl border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 px-4 py-2.5 text-space-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                Terms of Service URL
              </label>
              <input
                type="url"
                value={config.termsUrl}
                onChange={(e) => setConfig({ ...config, termsUrl: e.target.value })}
                placeholder="https://yourcompany.com/terms"
                className="block w-full rounded-xl border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 px-4 py-2.5 text-space-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                Privacy Policy URL
              </label>
              <input
                type="url"
                value={config.privacyUrl}
                onChange={(e) => setConfig({ ...config, privacyUrl: e.target.value })}
                placeholder="https://yourcompany.com/privacy"
                className="block w-full rounded-xl border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 px-4 py-2.5 text-space-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-space-300 dark:border-space-600 text-space-700 dark:text-space-300 hover:bg-space-50 dark:hover:bg-space-800"
        >
          <EyeIcon className="h-5 w-5" />
          Preview
        </button>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 text-success-600 dark:text-success-400"
            >
              <CheckCircleIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Saved successfully!</span>
            </motion.div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      {/* Preview Modal (simplified) */}
      {showPreview && (
        <div className="fixed inset-0 bg-space-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-space-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-space-200 dark:border-space-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-space-900 dark:text-white">
                White Label Preview
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-space-500 hover:text-space-700 dark:hover:text-space-300"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              <div className="text-center text-space-500 dark:text-space-400">
                Preview functionality coming soon
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
