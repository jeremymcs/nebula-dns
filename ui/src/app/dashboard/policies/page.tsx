/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Policies Management Page
 */

'use client'

import { useState } from 'react'
import { usePolicies } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ShieldCheckIcon,
  EyeIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface PolicyConfig {
  blockedCategories: string[]
  threatFeeds: string[]
  safeSearchEnabled: boolean
  blockResponseType: string
}

interface Policy {
  id: string
  name: string
  description: string
  currentVersion: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
  currentConfig?: PolicyConfig
}

const CATEGORIES = [
  'adult', 'advertising', 'malware', 'phishing', 'gambling', 
  'social_media', 'streaming', 'gaming', 'drugs', 'weapons'
]

const THREAT_FEEDS = ['malware', 'phishing', 'c2', 'cryptomining']

export default function PoliciesPage() {
  const { data, isLoading, error, mutate } = usePolicies()
  const { showToast } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    blockedCategories: [] as string[],
    threatFeeds: ['malware', 'phishing', 'c2'] as string[],
    safeSearchEnabled: false,
    blockResponseType: 'NXDOMAIN',
    isDefault: false,
  })

  const policies: Policy[] = data?.data || []

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      blockedCategories: [],
      threatFeeds: ['malware', 'phishing', 'c2'],
      safeSearchEnabled: false,
      blockResponseType: 'NXDOMAIN',
      isDefault: false,
    })
  }

  const openCreateModal = () => {
    resetForm()
    setEditingPolicy(null)
    setShowCreateModal(true)
  }

  const openEditModal = (policy: Policy) => {
    setEditingPolicy(policy)
    setForm({
      name: policy.name,
      description: policy.description || '',
      blockedCategories: policy.currentConfig?.blockedCategories || [],
      threatFeeds: policy.currentConfig?.threatFeeds || ['malware', 'phishing', 'c2'],
      safeSearchEnabled: policy.currentConfig?.safeSearchEnabled || false,
      blockResponseType: policy.currentConfig?.blockResponseType || 'NXDOMAIN',
      isDefault: policy.isDefault,
    })
    setShowCreateModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('error', 'Policy name is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        isDefault: form.isDefault,
        config: {
          blockedCategories: form.blockedCategories,
          threatFeeds: form.threatFeeds,
          safeSearchEnabled: form.safeSearchEnabled,
          blockResponseType: form.blockResponseType,
        },
      }

      if (editingPolicy) {
        await api.updatePolicy(editingPolicy.id, payload)
        showToast('success', 'Policy updated successfully')
      } else {
        await api.createPolicy(payload)
        showToast('success', 'Policy created successfully')
      }

      mutate()
      setShowCreateModal(false)
      resetForm()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save policy')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (policy: Policy) => {
    if (policy.isDefault) {
      showToast('error', 'Cannot delete the default policy')
      return
    }

    if (!confirm(`Are you sure you want to delete "${policy.name}"?`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/policies/${policy.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!res.ok) throw new Error('Failed to delete')
      
      showToast('success', 'Policy deleted')
      mutate()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete policy')
    }
  }

  const toggleCategory = (category: string) => {
    setForm(prev => ({
      ...prev,
      blockedCategories: prev.blockedCategories.includes(category)
        ? prev.blockedCategories.filter(c => c !== category)
        : [...prev.blockedCategories, category]
    }))
  }

  const toggleThreatFeed = (feed: string) => {
    setForm(prev => ({
      ...prev,
      threatFeeds: prev.threatFeeds.includes(feed)
        ? prev.threatFeeds.filter(f => f !== feed)
        : [...prev.threatFeeds, feed]
    }))
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Failed to load policies. Make sure the API is running.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Policies</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage DNS filtering policies for your locations
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button onClick={openCreateModal} className="btn-primary inline-flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Policy
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {policies.map((policy) => (
            <div key={policy.id} className="card p-6 relative">
              {policy.isDefault && (
                <span className="absolute top-4 right-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  Default
                </span>
              )}
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <ShieldCheckIcon className="h-6 w-6 text-primary-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{policy.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{policy.description || 'No description'}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Version</span>
                  <span className="font-medium text-gray-900">v{policy.currentVersion}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Threat Protection</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    (policy.currentConfig?.threatFeeds?.length || 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {(policy.currentConfig?.threatFeeds?.length || 0) > 0 ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">SafeSearch</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    policy.currentConfig?.safeSearchEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {policy.currentConfig?.safeSearchEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div>
                  <span className="text-sm text-gray-500">Blocked Categories</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(policy.currentConfig?.blockedCategories || []).slice(0, 3).map((cat) => (
                      <span key={cat} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 capitalize">
                        {cat.replace('_', ' ')}
                      </span>
                    ))}
                    {(policy.currentConfig?.blockedCategories?.length || 0) > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                        +{(policy.currentConfig?.blockedCategories?.length || 0) - 3} more
                      </span>
                    )}
                    {(policy.currentConfig?.blockedCategories?.length || 0) === 0 && (
                      <span className="text-xs text-gray-400">None</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                <span className="text-xs text-gray-500">
                  Updated {new Date(policy.updatedAt).toLocaleDateString()}
                </span>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => openEditModal(policy)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Edit"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  {!policy.isDefault && (
                    <button 
                      onClick={() => handleDelete(policy)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {policies.length === 0 && (
            <div className="col-span-full text-center py-12">
              <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No policies</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new policy.</p>
              <div className="mt-6">
                <button onClick={openCreateModal} className="btn-primary inline-flex items-center">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Policy
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingPolicy ? 'Edit Policy' : 'Create New Policy'}
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Policy Name *</label>
                    <input 
                      type="text" 
                      className="input mt-1" 
                      placeholder="e.g., Corporate Security Policy"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea 
                      className="input mt-1" 
                      rows={2} 
                      placeholder="Policy description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* Threat Feeds */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Threat Protection</label>
                  <div className="grid grid-cols-2 gap-2">
                    {THREAT_FEEDS.map((feed) => (
                      <label key={feed} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={form.threatFeeds.includes(feed)}
                          onChange={() => toggleThreatFeed(feed)}
                          className="h-4 w-4 text-primary-600 rounded"
                        />
                        <span className="ml-3 text-sm text-gray-700 capitalize">{feed}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Blocked Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Blocked Categories</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CATEGORIES.map((category) => (
                      <label key={category} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={form.blockedCategories.includes(category)}
                          onChange={() => toggleCategory(category)}
                          className="h-4 w-4 text-primary-600 rounded"
                        />
                        <span className="ml-3 text-sm text-gray-700 capitalize">{category.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* SafeSearch */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">SafeSearch Enforcement</h4>
                    <p className="text-sm text-gray-500">Force safe search on Google, Bing, YouTube</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, safeSearchEnabled: !form.safeSearchEnabled })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      form.safeSearchEnabled ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      form.safeSearchEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Block Response Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Block Response Type</label>
                  <select
                    className="input"
                    value={form.blockResponseType}
                    onChange={(e) => setForm({ ...form, blockResponseType: e.target.value })}
                  >
                    <option value="NXDOMAIN">NXDOMAIN (Domain not found)</option>
                    <option value="REFUSED">REFUSED (Query refused)</option>
                    <option value="NODATA">NODATA (Empty response)</option>
                    <option value="BLOCK_PAGE">Redirect to block page</option>
                  </select>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingPolicy ? 'Save Changes' : 'Create Policy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
