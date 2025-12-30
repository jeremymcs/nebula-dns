/**
 * SSO Configuration Page
 */

'use client'

import { useState, useEffect } from 'react'
import { KeyIcon, BuildingOfficeIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useSsoConfig } from '@/hooks/useApi'
import { api } from '@/lib/api'

interface SsoConfig {
  id?: string
  providerType: 'saml' | 'oidc' | null
  isEnabled: boolean
  samlEntityId?: string
  samlSsoUrl?: string
  hasCertificate?: boolean
  oidcIssuer?: string
  oidcClientId?: string
  autoProvisionUsers: boolean
  defaultRole: string
  domainRestriction?: string
}

export default function SsoSettingsPage() {
  const { data: ssoData, isLoading: loading, mutate } = useSsoConfig()
  const config: SsoConfig | null = ssoData?.data || null

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'saml' | 'oidc'>('saml')

  // Form state
  const [formData, setFormData] = useState({
    // SAML
    samlEntityId: '',
    samlSsoUrl: '',
    samlSloUrl: '',
    samlCertificate: '',
    // OIDC
    oidcIssuer: '',
    oidcClientId: '',
    oidcClientSecret: '',
    // Common
    autoProvisionUsers: true,
    defaultRole: 'readonly',
    domainRestriction: '',
  })

  // Sync form data when config loads
  useEffect(() => {
    if (config) {
      setFormData(prev => ({
        ...prev,
        samlEntityId: config.samlEntityId || '',
        samlSsoUrl: config.samlSsoUrl || '',
        oidcIssuer: config.oidcIssuer || '',
        oidcClientId: config.oidcClientId || '',
        autoProvisionUsers: config.autoProvisionUsers ?? true,
        defaultRole: config.defaultRole || 'readonly',
        domainRestriction: config.domainRestriction || '',
      }))
      if (config.providerType) {
        setActiveTab(config.providerType)
      }
    }
  }, [config])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const saveSamlConfig = async () => {
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      await api.post('/sso/saml/configure', {
        entityId: formData.samlEntityId,
        ssoUrl: formData.samlSsoUrl,
        sloUrl: formData.samlSloUrl,
        certificate: formData.samlCertificate,
        autoProvisionUsers: formData.autoProvisionUsers,
        defaultRole: formData.defaultRole,
        domainRestriction: formData.domainRestriction || undefined,
      })

      setSuccess('SAML configuration saved successfully')
      mutate()
    } catch (err) {
      setError('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const saveOidcConfig = async () => {
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      await api.post('/sso/oidc/configure', {
        issuer: formData.oidcIssuer,
        clientId: formData.oidcClientId,
        clientSecret: formData.oidcClientSecret,
        autoProvisionUsers: formData.autoProvisionUsers,
        defaultRole: formData.defaultRole,
        domainRestriction: formData.domainRestriction || undefined,
      })

      setSuccess('OIDC configuration saved successfully')
      mutate()
    } catch (err) {
      setError('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const toggleSso = async (enable: boolean) => {
    try {
      await api.post(`/sso/${enable ? 'enable' : 'disable'}`, {})

      setSuccess(`SSO ${enable ? 'enabled' : 'disabled'} successfully`)
      mutate()
    } catch (err) {
      setError(`Failed to ${enable ? 'enable' : 'disable'} SSO`)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-space-200 dark:bg-space-700 rounded"></div>
          <div className="h-64 bg-space-200 dark:bg-space-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Single Sign-On (SSO)</h1>
          <p className="text-space-600 dark:text-space-400 mt-1">Configure SAML or OIDC authentication for your organization</p>
        </div>
        {config?.providerType && (
          <div className="flex items-center space-x-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              config.isEnabled ? 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-200' : 'bg-space-100 dark:bg-space-700 text-space-700 dark:text-space-300'
            }`}>
              {config.isEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <button
              onClick={() => toggleSso(!config.isEnabled)}
              className={`px-4 py-2 rounded-lg font-medium ${
                config.isEnabled
                  ? 'bg-space-100 dark:bg-space-700 text-space-700 dark:text-space-300 hover:bg-space-200 dark:hover:bg-space-600'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {config.isEnabled ? 'Disable SSO' : 'Enable SSO'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-danger-50 dark:bg-danger-900/30 border border-red-200 dark:border-red-800 flex items-center text-danger-700 dark:text-danger-200">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-lg bg-success-50 dark:bg-success-900/30 border border-green-200 dark:border-green-800 flex items-center text-success-700 dark:text-success-200">
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {/* Provider Tabs */}
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 overflow-hidden">
        <div className="border-b border-space-200 dark:border-space-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('saml')}
              className={`flex-1 px-6 py-4 text-center font-medium ${
                activeTab === 'saml'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-space-500 dark:text-space-400 hover:text-space-700 dark:hover:text-space-300'
              }`}
            >
              <BuildingOfficeIcon className="h-5 w-5 inline mr-2" />
              SAML 2.0
            </button>
            <button
              onClick={() => setActiveTab('oidc')}
              className={`flex-1 px-6 py-4 text-center font-medium ${
                activeTab === 'oidc'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-space-500 dark:text-space-400 hover:text-space-700 dark:hover:text-space-300'
              }`}
            >
              <KeyIcon className="h-5 w-5 inline mr-2" />
              OpenID Connect
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* SAML Configuration */}
          {activeTab === 'saml' && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Service Provider Details</h3>
                <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                  Configure these values in your Identity Provider:
                </p>
                <div className="space-y-2 text-sm">
                  <div><span className="text-blue-600 dark:text-blue-400">Entity ID:</span> <code className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">{`nebuladns-sp`}</code></div>
                  <div><span className="text-blue-600 dark:text-blue-400">ACS URL:</span> <code className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">{process.env.NEXT_PUBLIC_API_URL}/sso/saml/callback</code></div>
                  <div><span className="text-blue-600 dark:text-blue-400">Metadata:</span> <a href={`${process.env.NEXT_PUBLIC_API_URL}/sso/saml/metadata`} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">Download XML</a></div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                  IdP Entity ID *
                </label>
                <input
                  type="text"
                  name="samlEntityId"
                  value={formData.samlEntityId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://idp.example.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                  IdP SSO URL *
                </label>
                <input
                  type="url"
                  name="samlSsoUrl"
                  value={formData.samlSsoUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://idp.example.com/sso/saml"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                  IdP SLO URL (Optional)
                </label>
                <input
                  type="url"
                  name="samlSloUrl"
                  value={formData.samlSloUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://idp.example.com/slo/saml"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                  IdP Certificate (X.509) *
                </label>
                <textarea
                  name="samlCertificate"
                  value={formData.samlCertificate}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-4 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                />
              </div>
            </div>
          )}

          {/* OIDC Configuration */}
          {activeTab === 'oidc' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                  Issuer URL *
                </label>
                <input
                  type="url"
                  name="oidcIssuer"
                  value={formData.oidcIssuer}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://login.example.com"
                />
                <p className="text-sm text-space-500 dark:text-space-400 mt-1">The OIDC provider's issuer URL</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                  Client ID *
                </label>
                <input
                  type="text"
                  name="oidcClientId"
                  value={formData.oidcClientId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="your-client-id"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                  Client Secret *
                </label>
                <input
                  type="password"
                  name="oidcClientSecret"
                  value={formData.oidcClientSecret}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••••••"
                />
              </div>

              <div className="bg-space-50 dark:bg-space-700 rounded-lg p-4">
                <h4 className="font-medium text-space-900 dark:text-white mb-2">Redirect URI</h4>
                <p className="text-sm text-space-600 dark:text-space-400 mb-2">
                  Add this URL to your OIDC provider's allowed redirect URIs:
                </p>
                <code className="block bg-space-100 dark:bg-space-600 px-3 py-2 rounded text-sm dark:text-space-200">
                  {process.env.NEXT_PUBLIC_API_URL}/sso/oidc/callback
                </code>
              </div>
            </div>
          )}

          {/* Common Settings */}
          <div className="mt-8 pt-6 border-t border-space-200 dark:border-space-700">
            <h3 className="font-medium text-space-900 dark:text-white mb-4">User Provisioning</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-space-700 dark:text-space-300">Auto-provision users</label>
                  <p className="text-sm text-space-500 dark:text-space-400">Automatically create accounts for new SSO users</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="autoProvisionUsers"
                    checked={formData.autoProvisionUsers}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-space-200 dark:bg-space-600 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                  Default Role for New Users
                </label>
                <select
                  name="defaultRole"
                  value={formData.defaultRole}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="readonly">Read Only</option>
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                  Domain Restriction (Optional)
                </label>
                <input
                  type="text"
                  name="domainRestriction"
                  value={formData.domainRestriction}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="@company.com"
                />
                <p className="text-sm text-space-500 dark:text-space-400 mt-1">Only allow users with emails from this domain</p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 pt-6 border-t border-space-200 dark:border-space-700 flex justify-end">
            <button
              onClick={activeTab === 'saml' ? saveSamlConfig : saveOidcConfig}
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
