/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * API Keys Management Page
 */

'use client'

import { useState } from 'react'
import { useApiKeys } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { 
  KeyIcon,
  PlusIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  rateLimit: number
  isActive: boolean
  lastUsedAt?: string
  expiresAt?: string
  createdAt: string
}

const SCOPES = [
  { value: 'read', label: 'Read', description: 'Read-only access to all resources' },
  { value: 'write', label: 'Write', description: 'Create and modify resources' },
  { value: 'admin', label: 'Admin', description: 'Full administrative access' },
]

export default function ApiKeysPage() {
  const { data, isLoading, error, mutate } = useApiKeys()
  const { showToast } = useToast()
  
  const [showModal, setShowModal] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({
    name: '',
    scopes: ['read'] as string[],
    rateLimit: 1000,
    expiresIn: '',
  })

  const keys: ApiKey[] = data?.data || []

  const resetForm = () => {
    setForm({
      name: '',
      scopes: ['read'],
      rateLimit: 1000,
      expiresIn: '',
    })
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      showToast('error', 'API key name is required')
      return
    }

    if (form.scopes.length === 0) {
      showToast('error', 'At least one scope is required')
      return
    }

    setSaving(true)
    try {
      const expiresAt = form.expiresIn 
        ? new Date(Date.now() + parseDuration(form.expiresIn)).toISOString()
        : undefined

      const result = await api.createApiKey({
        name: form.name,
        scopes: form.scopes,
        rateLimit: form.rateLimit,
        expiresAt,
      })
      
      setNewKeyValue(result.key)
      mutate()
      showToast('success', 'API key created successfully')
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create API key')
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async (key: ApiKey) => {
    if (!confirm(`Are you sure you want to revoke "${key.name}"? This cannot be undone.`)) {
      return
    }

    try {
      await api.revokeApiKey(key.id)
      showToast('success', 'API key revoked')
      mutate()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to revoke API key')
    }
  }

  const handleCopyKey = () => {
    if (newKeyValue) {
      navigator.clipboard.writeText(newKeyValue)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  const toggleScope = (scope: string) => {
    if (form.scopes.includes(scope)) {
      setForm({ ...form, scopes: form.scopes.filter(s => s !== scope) })
    } else {
      setForm({ ...form, scopes: [...form.scopes, scope] })
    }
  }

  const parseDuration = (duration: string): number => {
    const match = duration.match(/^(\d+)(d|y)$/)
    if (!match) return 0
    const value = parseInt(match[1])
    const unit = match[2]
    return unit === 'd' ? value * 24 * 60 * 60 * 1000 : value * 365 * 24 * 60 * 60 * 1000
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">Failed to load API keys. Make sure the API is running.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Keys</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage API keys for programmatic access to Nebula DNS</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn-primary inline-flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create API Key
        </button>
      </div>

      {/* API Keys Documentation */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex gap-3">
          <KeyIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">Using API Keys</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Include your API key in the <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">Authorization</code> header:
              <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded ml-1">Bearer sk_live_xxx</code>
            </p>
          </div>
        </div>
      </div>

      {/* API Keys Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Key</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Scopes</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rate Limit</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Used</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{key.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Created {new Date(key.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded dark:text-gray-300">
                      {key.keyPrefix}...
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {key.scopes.map((scope) => (
                        <span
                          key={scope}
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            scope === 'admin'
                              ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                              : scope === 'write'
                              ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {key.rateLimit}/min
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleString()
                      : 'Never'
                    }
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      key.isActive
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>
                      {key.isActive ? 'Active' : 'Revoked'}
                    </span>
                    {key.expiresAt && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Expires {new Date(key.expiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {key.isActive && (
                      <button
                        onClick={() => handleRevoke(key)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        title="Revoke"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No API keys</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create your first API key to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create API Key Modal */}
      {showModal && !newKeyValue && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 dark:bg-black bg-opacity-75 dark:bg-opacity-70" onClick={() => setShowModal(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6">
              <h2 className="text-xl font-semibold mb-4 dark:text-white">Create API Key</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input"
                    placeholder="e.g., Production Integration"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scopes *</label>
                  <div className="space-y-2">
                    {SCOPES.map((scope) => (
                      <label key={scope.value} className="flex items-start gap-3 p-3 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.scopes.includes(scope.value)}
                          onChange={() => toggleScope(scope.value)}
                          className="mt-1 rounded"
                        />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{scope.label}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{scope.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate Limit (requests/minute)</label>
                  <input
                    type="number"
                    value={form.rateLimit}
                    onChange={(e) => setForm({ ...form, rateLimit: parseInt(e.target.value) || 1000 })}
                    className="input"
                    min={10}
                    max={10000}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiration (optional)</label>
                  <select
                    value={form.expiresIn}
                    onChange={(e) => setForm({ ...form, expiresIn: e.target.value })}
                    className="input"
                  >
                    <option value="">Never expires</option>
                    <option value="30d">30 days</option>
                    <option value="90d">90 days</option>
                    <option value="180d">180 days</option>
                    <option value="1y">1 year</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Creating...' : 'Create Key'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show New Key Modal */}
      {newKeyValue && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 dark:bg-black bg-opacity-75 dark:bg-opacity-70" />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6">
              <h2 className="text-xl font-semibold text-green-700 dark:text-green-400 mb-4">API Key Created!</h2>

              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Make sure to copy your API key now. You won't be able to see it again!
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your API Key</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyValue}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 font-mono text-sm dark:text-white"
                    />
                    <button
                      onClick={handleCopyKey}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center"
                    >
                      {copiedKey ? (
                        <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowModal(false)
                    setNewKeyValue(null)
                    resetForm()
                  }}
                  className="btn-primary"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
