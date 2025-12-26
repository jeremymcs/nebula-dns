/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Policies Management Page - Cosmic Security Theme
 */

'use client'

import { useState } from 'react'
import { usePolicies } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { Button, Card, Badge, Modal, Input, Textarea, Select } from '@/components/ui'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

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
      <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 ring-1 ring-danger-200 dark:ring-danger-800">
        <p className="text-danger-800 dark:text-danger-200">Failed to load policies. Make sure the API is running.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Policies</h1>
          <p className="mt-1 text-space-500 dark:text-space-400">
            Manage DNS filtering policies for your locations
          </p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
          Create Policy
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-64 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {policies.map((policy) => (
            <Card
              key={policy.id}
              variant="interactive"
              padding="none"
              className="group overflow-hidden"
            >
              {/* Card Header with gradient */}
              <div className={clsx(
                'p-4 relative overflow-hidden',
                policy.isDefault
                  ? 'bg-gradient-to-br from-primary-600 to-accent-600'
                  : 'bg-gradient-to-br from-space-100 to-space-50 dark:from-space-800 dark:to-space-900'
              )}>
                {/* Background decoration */}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />

                <div className="relative flex items-start justify-between">
                  <div className={clsx(
                    'p-3 rounded-xl',
                    policy.isDefault ? 'bg-white/20' : 'bg-white dark:bg-space-700 shadow-sm'
                  )}>
                    <ShieldCheckIcon className={clsx(
                      'h-6 w-6',
                      policy.isDefault ? 'text-white' : 'text-primary-600 dark:text-primary-400'
                    )} />
                  </div>
                  {policy.isDefault && (
                    <Badge variant="primary" className="bg-white/20 text-white border-0">
                      Default
                    </Badge>
                  )}
                </div>

                <h3 className={clsx(
                  'mt-4 text-lg font-semibold',
                  policy.isDefault ? 'text-white' : 'text-space-900 dark:text-white'
                )}>
                  {policy.name}
                </h3>
                <p className={clsx(
                  'mt-1 text-sm line-clamp-2',
                  policy.isDefault ? 'text-white/80' : 'text-space-500 dark:text-space-400'
                )}>
                  {policy.description || 'No description'}
                </p>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-space-500 dark:text-space-400">Version</span>
                  <Badge variant="neutral">v{policy.currentVersion}</Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-space-500 dark:text-space-400">Threat Protection</span>
                  <Badge variant={(policy.currentConfig?.threatFeeds?.length || 0) > 0 ? 'success' : 'neutral'}>
                    {(policy.currentConfig?.threatFeeds?.length || 0) > 0 ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-space-500 dark:text-space-400">SafeSearch</span>
                  <Badge variant={policy.currentConfig?.safeSearchEnabled ? 'success' : 'neutral'}>
                    {policy.currentConfig?.safeSearchEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                <div>
                  <span className="text-sm text-space-500 dark:text-space-400">Blocked Categories</span>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(policy.currentConfig?.blockedCategories || []).slice(0, 3).map((cat) => (
                      <Badge key={cat} variant="danger" size="sm">
                        {cat.replace('_', ' ')}
                      </Badge>
                    ))}
                    {(policy.currentConfig?.blockedCategories?.length || 0) > 3 && (
                      <Badge variant="neutral" size="sm">
                        +{(policy.currentConfig?.blockedCategories?.length || 0) - 3}
                      </Badge>
                    )}
                    {(policy.currentConfig?.blockedCategories?.length || 0) === 0 && (
                      <span className="text-xs text-space-400">None configured</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-4 py-3 flex items-center justify-between border-t border-space-100 dark:border-space-700 bg-space-50/50 dark:bg-space-900/50">
                <span className="text-xs text-space-500 dark:text-space-400">
                  Updated {new Date(policy.updatedAt).toLocaleDateString()}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(policy)}
                    leftIcon={<PencilIcon className="h-4 w-4" />}
                  >
                    Edit
                  </Button>
                  {!policy.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(policy)}
                      className="text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                      leftIcon={<TrashIcon className="h-4 w-4" />}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {policies.length === 0 && (
            <div className="col-span-full">
              <Card variant="glass" padding="lg" className="text-center">
                <div className="flex flex-col items-center py-8">
                  <div className="p-4 rounded-2xl bg-primary-100 dark:bg-primary-900/30 mb-4">
                    <ShieldExclamationIcon className="h-10 w-10 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-space-900 dark:text-white">No policies yet</h3>
                  <p className="mt-2 text-space-500 dark:text-space-400 max-w-sm">
                    Create your first policy to start filtering DNS traffic and protecting your network.
                  </p>
                  <Button onClick={openCreateModal} className="mt-6" leftIcon={<PlusIcon className="h-5 w-5" />}>
                    Create Policy
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingPolicy ? 'Edit Policy' : 'Create New Policy'}
        size="lg"
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <Input
              label="Policy Name"
              required
              placeholder="e.g., Corporate Security Policy"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Textarea
              label="Description"
              rows={2}
              placeholder="Policy description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Threat Feeds */}
          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-3">
              Threat Protection
            </label>
            <div className="grid grid-cols-2 gap-2">
              {THREAT_FEEDS.map((feed) => (
                <label
                  key={feed}
                  className={clsx(
                    'flex items-center p-3 rounded-xl cursor-pointer transition-all',
                    'border-2',
                    form.threatFeeds.includes(feed)
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-space-200 dark:border-space-700 hover:border-space-300 dark:hover:border-space-600'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={form.threatFeeds.includes(feed)}
                    onChange={() => toggleThreatFeed(feed)}
                    className="h-4 w-4 text-primary-600 rounded border-space-300 focus:ring-primary-500"
                  />
                  <span className="ml-3 text-sm font-medium text-space-700 dark:text-space-300 capitalize">
                    {feed}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Blocked Categories */}
          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-3">
              Blocked Categories
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((category) => (
                <label
                  key={category}
                  className={clsx(
                    'flex items-center p-3 rounded-xl cursor-pointer transition-all',
                    'border-2',
                    form.blockedCategories.includes(category)
                      ? 'border-danger-500 bg-danger-50 dark:bg-danger-900/20'
                      : 'border-space-200 dark:border-space-700 hover:border-space-300 dark:hover:border-space-600'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={form.blockedCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="h-4 w-4 text-danger-600 rounded border-space-300 focus:ring-danger-500"
                  />
                  <span className="ml-3 text-sm font-medium text-space-700 dark:text-space-300 capitalize">
                    {category.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* SafeSearch Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-space-50 dark:bg-space-800/50 ring-1 ring-space-200 dark:ring-space-700">
            <div>
              <h4 className="text-sm font-medium text-space-900 dark:text-white">SafeSearch Enforcement</h4>
              <p className="text-sm text-space-500 dark:text-space-400">Force safe search on Google, Bing, YouTube</p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, safeSearchEnabled: !form.safeSearchEnabled })}
              className={clsx(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200',
                form.safeSearchEnabled ? 'bg-primary-600' : 'bg-space-300 dark:bg-space-600'
              )}
            >
              <span className={clsx(
                'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200',
                form.safeSearchEnabled ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </button>
          </div>

          {/* Block Response Type */}
          <Select
            label="Block Response Type"
            value={form.blockResponseType}
            onChange={(e) => setForm({ ...form, blockResponseType: e.target.value })}
            options={[
              { value: 'NXDOMAIN', label: 'NXDOMAIN (Domain not found)' },
              { value: 'REFUSED', label: 'REFUSED (Query refused)' },
              { value: 'NODATA', label: 'NODATA (Empty response)' },
              { value: 'BLOCK_PAGE', label: 'Redirect to block page' },
            ]}
          />
        </div>

        {/* Modal Footer */}
        <div className="mt-8 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowCreateModal(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            isLoading={saving}
          >
            {editingPolicy ? 'Save Changes' : 'Create Policy'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
