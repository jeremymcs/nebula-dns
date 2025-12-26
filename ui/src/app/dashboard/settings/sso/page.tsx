/**
 * SSO Configuration Page
 */

'use client'

import { useState, useEffect } from 'react'
import { KeyIcon, BuildingOfficeIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

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
  const [config, setConfig] = useState<SsoConfig | null>(null)
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sso/config`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.data) {
          setConfig(data.data)
          setFormData(prev => ({
            ...prev,
            samlEntityId: data.data.samlEntityId || '',
            samlSsoUrl: data.data.samlSsoUrl || '',
            oidcIssuer: data.data.oidcIssuer || '',
            oidcClientId: data.data.oidcClientId || '',
            autoProvisionUsers: data.data.autoProvisionUsers ?? true,
            defaultRole: data.data.defaultRole || 'readonly',
            domainRestriction: data.data.domainRestriction || '',
          }))
          if (data.data.providerType) {
            setActiveTab(data.data.providerType)
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch SSO config')
    } finally {
      setLoading(false)
    }
  }

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
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sso/saml/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entityId: formData.samlEntityId,
          ssoUrl: formData.samlSsoUrl,
          sloUrl: formData.samlSloUrl,
          certificate: formData.samlCertificate,
          autoProvisionUsers: formData.autoProvisionUsers,
          defaultRole: formData.defaultRole,
          domainRestriction: formData.domainRestriction || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to save SAML configuration')

      setSuccess('SAML configuration saved successfully')
      fetchConfig()
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
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sso/oidc/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          issuer: formData.oidcIssuer,
          clientId: formData.oidcClientId,
          clientSecret: formData.oidcClientSecret,
          autoProvisionUsers: formData.autoProvisionUsers,
          defaultRole: formData.defaultRole,
          domainRestriction: formData.domainRestriction || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to save OIDC configuration')

      setSuccess('OIDC configuration saved successfully')
      fetchConfig()
    } catch (err) {
      setError('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const toggleSso = async (enable: boolean) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sso/${enable ? 'enable' : 'disable'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error(`Failed to ${enable ? 'enable' : 'disable'} SSO`)

      setSuccess(`SSO ${enable ? 'enabled' : 'disabled'} successfully`)
      fetchConfig()
    } catch (err) {
      setError(`Failed to ${enable ? 'enable' : 'disable'} SSO`)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Single Sign-On (SSO)</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Configure SAML or OIDC authentication for your organization</p>
        </div>
        {config?.providerType && (
          <div className="flex items-center space-x-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              config.isEnabled ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              {config.isEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <button
              onClick={() => toggleSso(!config.isEnabled)}
              className={`px-4 py-2 rounded-lg font-medium ${
                config.isEnabled
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {config.isEnabled ? 'Disable SSO' : 'Enable SSO'}
            </button>
          </div>
        )}
      </div>

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

      {/* Provider Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('saml')}
              className={`flex-1 px-6 py-4 text-center font-medium ${
                activeTab === 'saml'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
                  <div><span className="text-blue-600 dark:text-blue-400">Entity ID:</span> <code className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">{`safedns-sp`}</code></div>
                  <div><span className="text-blue-600 dark:text-blue-400">ACS URL:</span> <code className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">{process.env.NEXT_PUBLIC_API_URL}/sso/saml/callback</code></div>
                  <div><span className="text-blue-600 dark:text-blue-400">Metadata:</span> <a href={`${process.env.NEXT_PUBLIC_API_URL}/sso/saml/metadata`} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">Download XML</a></div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IdP Entity ID *
                </label>
                <input
                  type="text"
                  name="samlEntityId"
                  value={formData.samlEntityId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://idp.example.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IdP SSO URL *
                </label>
                <input
                  type="url"
                  name="samlSsoUrl"
                  value={formData.samlSsoUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://idp.example.com/sso/saml"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IdP SLO URL (Optional)
                </label>
                <input
                  type="url"
                  name="samlSloUrl"
                  value={formData.samlSloUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://idp.example.com/slo/saml"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IdP Certificate (X.509) *
                </label>
                <textarea
                  name="samlCertificate"
                  value={formData.samlCertificate}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                />
              </div>
            </div>
          )}

          {/* OIDC Configuration */}
          {activeTab === 'oidc' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Issuer URL *
                </label>
                <input
                  type="url"
                  name="oidcIssuer"
                  value={formData.oidcIssuer}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://login.example.com"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">The OIDC provider's issuer URL</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client ID *
                </label>
                <input
                  type="text"
                  name="oidcClientId"
                  value={formData.oidcClientId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="your-client-id"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client Secret *
                </label>
                <input
                  type="password"
                  name="oidcClientSecret"
                  value={formData.oidcClientSecret}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••••••"
                />
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Redirect URI</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Add this URL to your OIDC provider's allowed redirect URIs:
                </p>
                <code className="block bg-gray-100 dark:bg-gray-600 px-3 py-2 rounded text-sm dark:text-gray-200">
                  {process.env.NEXT_PUBLIC_API_URL}/sso/oidc/callback
                </code>
              </div>
            </div>
          )}

          {/* Common Settings */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">User Provisioning</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-700 dark:text-gray-300">Auto-provision users</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Automatically create accounts for new SSO users</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="autoProvisionUsers"
                    checked={formData.autoProvisionUsers}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Role for New Users
                </label>
                <select
                  name="defaultRole"
                  value={formData.defaultRole}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="readonly">Read Only</option>
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Domain Restriction (Optional)
                </label>
                <input
                  type="text"
                  name="domainRestriction"
                  value={formData.domainRestriction}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="@company.com"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Only allow users with emails from this domain</p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
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
