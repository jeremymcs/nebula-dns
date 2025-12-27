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

interface SafeSearchSettings {
  google: 'off' | 'moderate' | 'strict'
  bing: 'off' | 'moderate' | 'strict'
  youtube: 'off' | 'moderate' | 'strict'
  duckduckgo: 'off' | 'moderate' | 'strict'
}

interface PolicyConfig {
  blockCategories: string[]
  threatBlocking: {
    enabled: boolean
    feeds: string[]
  }
  safesearch: {
    enabled: boolean
    services: string[]
    settings?: SafeSearchSettings
  }
}

// Search engine brand logos as SVG components
const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const BingLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 3v16.5l4.5 2.5 8-4.5v-5l-6-2.5-2.5 1.5V5.5L5 3zm4.5 11l4 1.5v2l-4 2.5V14z" fill="#00897B"/>
  </svg>
)

const YouTubeLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/>
  </svg>
)

const DuckDuckGoLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="#DE5833"/>
    <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" fill="#DE5833"/>
    <ellipse cx="9" cy="10" rx="2" ry="2.5" fill="#fff"/>
    <ellipse cx="15" cy="10" rx="2" ry="2.5" fill="#fff"/>
    <circle cx="9.5" cy="10" r="1" fill="#000"/>
    <circle cx="15.5" cy="10" r="1" fill="#000"/>
    <path d="M8 15c0 0 2 2 4 2s4-2 4-2" stroke="#fff" strokeWidth="1" fill="none" strokeLinecap="round"/>
  </svg>
)

const SEARCH_ENGINE_LOGOS: Record<string, React.FC> = {
  google: GoogleLogo,
  bing: BingLogo,
  youtube: YouTubeLogo,
  duckduckgo: DuckDuckGoLogo,
}

const SEARCH_ENGINES = [
  { id: 'google', name: 'Google' },
  { id: 'bing', name: 'Bing' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'duckduckgo', name: 'DuckDuckGo' },
] as const

const DEFAULT_SAFESEARCH_SETTINGS: SafeSearchSettings = {
  google: 'off',
  bing: 'off',
  youtube: 'off',
  duckduckgo: 'off',
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

// Category groups for organized display
const CATEGORY_GROUPS = {
  'Security Threats': {
    icon: '🛡️',
    categories: ['malware', 'phishing', 'hacking', 'scam', 'cryptominer'],
    color: 'danger',
  },
  'Adult & Mature': {
    icon: '🔞',
    categories: ['adult', 'violence', 'drugs', 'weapons', 'alcohol', 'gambling', 'dating'],
    color: 'danger',
  },
  'Social & Entertainment': {
    icon: '💬',
    categories: ['social_media', 'streaming', 'gaming', 'chat', 'forums'],
    color: 'warning',
  },
  'Productivity': {
    icon: '⏰',
    categories: ['advertising', 'ads', 'tracking', 'news', 'shopping'],
    color: 'warning',
  },
  'Privacy & Anonymity': {
    icon: '🕵️',
    categories: ['proxy', 'vpn', 'dynamic_dns', 'url_shorteners', 'remote_access'],
    color: 'accent',
  },
  'File Sharing': {
    icon: '📁',
    categories: ['piracy', 'downloads', 'file_sharing'],
    color: 'warning',
  },
}

// Policy presets for quick setup
const POLICY_PRESETS = {
  'Family Safe': {
    description: 'Block adult content, violence, and enforce safe search',
    blockCategories: ['adult', 'violence', 'drugs', 'weapons', 'gambling', 'dating', 'alcohol'],
    warnCategories: ['social_media', 'gaming', 'streaming'],
    threatBlocking: { enabled: true, feeds: ['malware', 'phishing', 'c2', 'ransomware'] },
    safesearch: {
      enabled: true,
      services: ['google', 'bing', 'youtube', 'duckduckgo'],
      settings: { google: 'strict', bing: 'strict', youtube: 'strict', duckduckgo: 'strict' } as SafeSearchSettings,
    },
  },
  'Corporate Security': {
    description: 'High security for business environments',
    blockCategories: ['malware', 'phishing', 'hacking', 'scam', 'adult', 'gambling', 'piracy', 'proxy', 'vpn', 'file_sharing', 'cryptominer'],
    warnCategories: ['social_media', 'streaming', 'gaming'],
    threatBlocking: { enabled: true, feeds: ['malware', 'phishing', 'c2', 'ransomware', 'botnet', 'cryptominer', 'spam'] },
    safesearch: {
      enabled: true,
      services: ['google', 'bing', 'youtube', 'duckduckgo'],
      settings: { google: 'moderate', bing: 'moderate', youtube: 'moderate', duckduckgo: 'moderate' } as SafeSearchSettings,
    },
  },
  'Education K-12': {
    description: 'Safe browsing for schools',
    blockCategories: ['adult', 'violence', 'drugs', 'weapons', 'gambling', 'dating', 'alcohol', 'hacking', 'proxy', 'vpn', 'piracy'],
    warnCategories: ['social_media', 'gaming', 'streaming', 'chat'],
    threatBlocking: { enabled: true, feeds: ['malware', 'phishing', 'c2'] },
    safesearch: {
      enabled: true,
      services: ['google', 'bing', 'youtube', 'duckduckgo'],
      settings: { google: 'strict', bing: 'strict', youtube: 'strict', duckduckgo: 'strict' } as SafeSearchSettings,
    },
  },
  'Minimal Blocking': {
    description: 'Only block security threats',
    blockCategories: ['malware', 'phishing', 'scam', 'cryptominer'],
    warnCategories: [],
    threatBlocking: { enabled: true, feeds: ['malware', 'phishing', 'c2', 'ransomware'] },
    safesearch: {
      enabled: false,
      services: [],
      settings: { google: 'off', bing: 'off', youtube: 'off', duckduckgo: 'off' } as SafeSearchSettings,
    },
  },
}

// All categories flat list for backwards compatibility
const CATEGORIES = Object.values(CATEGORY_GROUPS).flatMap(g => g.categories)

// Threat feed types - aligned with threat-feed-loader.py
const THREAT_FEEDS = [
  'malware', 'phishing', 'botnet', 'ransomware', 'cryptominer', 'c2', 'spam', 'malvertising'
]

export default function PoliciesPage() {
  const { data, isLoading, error, mutate } = usePolicies()
  const { showToast } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    blockCategories: [] as string[],
    warnCategories: [] as string[],
    threatBlocking: { enabled: true, feeds: ['malware', 'phishing', 'c2'] as string[] },
    safesearch: {
      enabled: false,
      services: [] as string[],
      settings: { ...DEFAULT_SAFESEARCH_SETTINGS } as SafeSearchSettings,
    },
    isDefault: false,
  })

  const policies: Policy[] = data?.data || []

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      blockCategories: [],
      warnCategories: [],
      threatBlocking: { enabled: true, feeds: ['malware', 'phishing', 'c2'] },
      safesearch: {
        enabled: false,
        services: [],
        settings: { ...DEFAULT_SAFESEARCH_SETTINGS },
      },
      isDefault: false,
    })
  }

  const applyPreset = (presetName: string) => {
    const preset = POLICY_PRESETS[presetName as keyof typeof POLICY_PRESETS]
    if (preset) {
      setForm(prev => ({
        ...prev,
        blockCategories: [...preset.blockCategories],
        warnCategories: [...preset.warnCategories],
        threatBlocking: { ...preset.threatBlocking },
        safesearch: {
          enabled: preset.safesearch.enabled,
          services: [...preset.safesearch.services],
          settings: { ...preset.safesearch.settings },
        },
      }))
      showToast('success', `Applied "${presetName}" preset`)
    }
  }

  const openCreateModal = () => {
    resetForm()
    setEditingPolicy(null)
    setShowCreateModal(true)
  }

  const openEditModal = (policy: Policy) => {
    setEditingPolicy(policy)
    const existingSettings = policy.currentConfig?.safesearch?.settings || DEFAULT_SAFESEARCH_SETTINGS
    setForm({
      name: policy.name,
      description: policy.description || '',
      blockCategories: policy.currentConfig?.blockCategories || [],
      warnCategories: (policy.currentConfig as any)?.warnCategories || [],
      threatBlocking: policy.currentConfig?.threatBlocking || { enabled: true, feeds: ['malware', 'phishing', 'c2'] },
      safesearch: {
        enabled: policy.currentConfig?.safesearch?.enabled || false,
        services: policy.currentConfig?.safesearch?.services || [],
        settings: { ...existingSettings },
      },
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
          blockCategories: form.blockCategories,
          warnCategories: form.warnCategories,
          threatBlocking: form.threatBlocking,
          safesearch: form.safesearch,
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

  // Cycle through: none -> block -> warn -> none
  const cycleCategory = (category: string) => {
    setForm(prev => {
      const isBlocked = prev.blockCategories.includes(category)
      const isWarned = prev.warnCategories.includes(category)

      if (!isBlocked && !isWarned) {
        // None -> Block
        return { ...prev, blockCategories: [...prev.blockCategories, category] }
      } else if (isBlocked) {
        // Block -> Warn
        return {
          ...prev,
          blockCategories: prev.blockCategories.filter(c => c !== category),
          warnCategories: [...prev.warnCategories, category],
        }
      } else {
        // Warn -> None
        return { ...prev, warnCategories: prev.warnCategories.filter(c => c !== category) }
      }
    })
  }

  const getCategoryState = (category: string): 'none' | 'block' | 'warn' => {
    if (form.blockCategories.includes(category)) return 'block'
    if (form.warnCategories.includes(category)) return 'warn'
    return 'none'
  }

  const toggleGroupCategories = (groupName: string, action: 'block' | 'warn' | 'none') => {
    const group = CATEGORY_GROUPS[groupName as keyof typeof CATEGORY_GROUPS]
    if (!group) return

    setForm(prev => {
      let blockCategories = prev.blockCategories.filter(c => !group.categories.includes(c))
      let warnCategories = prev.warnCategories.filter(c => !group.categories.includes(c))

      if (action === 'block') {
        blockCategories = [...blockCategories, ...group.categories]
      } else if (action === 'warn') {
        warnCategories = [...warnCategories, ...group.categories]
      }

      return { ...prev, blockCategories, warnCategories }
    })
  }

  const toggleThreatFeed = (feed: string) => {
    setForm(prev => ({
      ...prev,
      threatBlocking: {
        ...prev.threatBlocking,
        feeds: prev.threatBlocking.feeds.includes(feed)
          ? prev.threatBlocking.feeds.filter(f => f !== feed)
          : [...prev.threatBlocking.feeds, feed]
      }
    }))
  }

  // Update individual search engine SafeSearch setting
  const updateSearchEngineSafety = (engine: keyof SafeSearchSettings, level: 'off' | 'moderate' | 'strict') => {
    setForm(prev => {
      const newSettings = { ...prev.safesearch.settings, [engine]: level }
      // Update services array based on which engines are enabled
      const enabledServices = SEARCH_ENGINES
        .filter(e => newSettings[e.id as keyof SafeSearchSettings] !== 'off')
        .map(e => e.id)

      return {
        ...prev,
        safesearch: {
          ...prev.safesearch,
          enabled: enabledServices.length > 0,
          services: enabledServices,
          settings: newSettings,
        }
      }
    })
  }

  // Set all engines to a specific level
  const setAllEngines = (level: 'off' | 'moderate' | 'strict') => {
    const newSettings: SafeSearchSettings = {
      google: level,
      bing: level,
      youtube: level,
      duckduckgo: level,
    }
    const enabledServices = level !== 'off' ? SEARCH_ENGINES.map(e => e.id) : []

    setForm(prev => ({
      ...prev,
      safesearch: {
        enabled: level !== 'off',
        services: enabledServices,
        settings: newSettings,
      }
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
                  <Badge variant={policy.currentConfig?.threatBlocking?.enabled ? 'success' : 'neutral'}>
                    {policy.currentConfig?.threatBlocking?.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-space-500 dark:text-space-400">SafeSearch</span>
                  <Badge variant={policy.currentConfig?.safesearch?.enabled ? 'success' : 'neutral'}>
                    {policy.currentConfig?.safesearch?.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                <div>
                  <span className="text-sm text-space-500 dark:text-space-400">Blocked Categories</span>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(policy.currentConfig?.blockCategories || []).slice(0, 3).map((cat) => (
                      <Badge key={cat} variant="danger" size="sm">
                        {cat.replace('_', ' ')}
                      </Badge>
                    ))}
                    {(policy.currentConfig?.blockCategories?.length || 0) > 3 && (
                      <Badge variant="neutral" size="sm">
                        +{(policy.currentConfig?.blockCategories?.length || 0) - 3}
                      </Badge>
                    )}
                    {(policy.currentConfig?.blockCategories?.length || 0) === 0 && (
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

      {/* Create/Edit Modal - Wide layout */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingPolicy ? 'Edit Policy' : 'Create New Policy'}
        size="5xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Basic Info & Settings */}
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

            {/* Quick Presets */}
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-3">
                Quick Presets
              </label>
              <div className="space-y-2">
                {Object.entries(POLICY_PRESETS).map(([name, preset]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => applyPreset(name)}
                    className="w-full text-left p-3 rounded-xl border-2 border-space-200 dark:border-space-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
                  >
                    <span className="text-sm font-medium text-space-900 dark:text-white">{name}</span>
                    <p className="text-xs text-space-500 dark:text-space-400 mt-0.5">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Threat Protection */}
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-3">
                Threat Protection
              </label>
              <div className="grid grid-cols-2 gap-2">
                {THREAT_FEEDS.map((feed) => (
                  <label
                    key={feed}
                    className={clsx(
                      'flex items-center p-2.5 rounded-lg cursor-pointer transition-all text-xs',
                      'border',
                      form.threatBlocking.feeds.includes(feed)
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-space-200 dark:border-space-700 hover:border-space-300'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={form.threatBlocking.feeds.includes(feed)}
                      onChange={() => toggleThreatFeed(feed)}
                      className="h-3.5 w-3.5 text-primary-600 rounded border-space-300 focus:ring-primary-500"
                    />
                    <span className="ml-2 font-medium text-space-700 dark:text-space-300 capitalize">
                      {feed}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* SafeSearch Per-Engine Controls */}
            <div className="p-4 rounded-xl bg-space-50 dark:bg-space-800/50 ring-1 ring-space-200 dark:ring-space-700">
              <div className="flex flex-col gap-3 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-space-900 dark:text-white">🔒 SafeSearch</h4>
                  <p className="text-xs text-space-500 dark:text-space-400">Per-engine content filtering</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setAllEngines('strict')}
                    className="px-2 py-1 text-xs rounded bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400 hover:bg-danger-200 dark:hover:bg-danger-900/50"
                    title="Set all to Strict"
                  >
                    All Strict
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllEngines('moderate')}
                    className="px-2 py-1 text-xs rounded bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400 hover:bg-warning-200 dark:hover:bg-warning-900/50"
                    title="Set all to Moderate"
                  >
                    All Moderate
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllEngines('off')}
                    className="px-2 py-1 text-xs rounded bg-space-200 text-space-600 dark:bg-space-700 dark:text-space-400 hover:bg-space-300 dark:hover:bg-space-600"
                    title="Turn all off"
                  >
                    All Off
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {SEARCH_ENGINES.map((engine) => {
                  const currentLevel = form.safesearch.settings[engine.id as keyof SafeSearchSettings]
                  const LogoComponent = SEARCH_ENGINE_LOGOS[engine.id]
                  return (
                    <div
                      key={engine.id}
                      className="flex flex-col gap-2 py-2 px-3 rounded-lg bg-white dark:bg-space-800 border border-space-200 dark:border-space-700"
                    >
                      <div className="flex items-center gap-2">
                        {LogoComponent && <LogoComponent />}
                        <span className="text-sm font-medium text-space-900 dark:text-white">{engine.name}</span>
                      </div>
                      <div className="flex rounded-lg overflow-hidden border border-space-200 dark:border-space-600 w-full">
                        <button
                          type="button"
                          onClick={() => updateSearchEngineSafety(engine.id as keyof SafeSearchSettings, 'off')}
                          className={clsx(
                            'flex-1 px-2 py-1.5 text-xs font-medium transition-colors text-center',
                            currentLevel === 'off'
                              ? 'bg-space-600 text-white dark:bg-space-500'
                              : 'bg-space-100 text-space-600 dark:bg-space-800 dark:text-space-400 hover:bg-space-200 dark:hover:bg-space-700'
                          )}
                        >
                          Off
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSearchEngineSafety(engine.id as keyof SafeSearchSettings, 'moderate')}
                          className={clsx(
                            'flex-1 px-2 py-1.5 text-xs font-medium transition-colors border-l border-r border-space-200 dark:border-space-600 text-center',
                            currentLevel === 'moderate'
                              ? 'bg-warning-500 text-white'
                              : 'bg-space-100 text-space-600 dark:bg-space-800 dark:text-space-400 hover:bg-warning-100 dark:hover:bg-warning-900/20'
                          )}
                        >
                          Moderate
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSearchEngineSafety(engine.id as keyof SafeSearchSettings, 'strict')}
                          className={clsx(
                            'flex-1 px-2 py-1.5 text-xs font-medium transition-colors text-center',
                            currentLevel === 'strict'
                              ? 'bg-danger-500 text-white'
                              : 'bg-space-100 text-space-600 dark:bg-space-800 dark:text-space-400 hover:bg-danger-100 dark:hover:bg-danger-900/20'
                          )}
                        >
                          Strict
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Columns - Categories Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-space-700 dark:text-space-300">
                Content Categories
              </label>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-danger-500"></span>
                  <span className="text-space-600 dark:text-space-400">Block</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-warning-500"></span>
                  <span className="text-space-600 dark:text-space-400">Warn</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-space-300 dark:bg-space-600"></span>
                  <span className="text-space-600 dark:text-space-400">Allow</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Object.entries(CATEGORY_GROUPS).map(([groupName, group]) => (
                <div
                  key={groupName}
                  className="p-4 rounded-xl border border-space-200 dark:border-space-700 bg-space-50/50 dark:bg-space-800/30"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-space-900 dark:text-white flex items-center gap-2">
                      <span>{group.icon}</span>
                      {groupName}
                    </h4>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => toggleGroupCategories(groupName, 'block')}
                        className="p-1 rounded text-xs text-danger-600 hover:bg-danger-100 dark:hover:bg-danger-900/30"
                        title="Block all"
                      >
                        🚫
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleGroupCategories(groupName, 'warn')}
                        className="p-1 rounded text-xs text-warning-600 hover:bg-warning-100 dark:hover:bg-warning-900/30"
                        title="Warn all"
                      >
                        ⚠️
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleGroupCategories(groupName, 'none')}
                        className="p-1 rounded text-xs text-space-600 hover:bg-space-100 dark:hover:bg-space-700"
                        title="Allow all"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {group.categories.map((category) => {
                      const state = getCategoryState(category)
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => cycleCategory(category)}
                          className={clsx(
                            'w-full flex items-center justify-between p-2 rounded-lg text-sm transition-all',
                            state === 'block' && 'bg-danger-100 dark:bg-danger-900/30 text-danger-800 dark:text-danger-200',
                            state === 'warn' && 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-200',
                            state === 'none' && 'bg-white dark:bg-space-800 text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700'
                          )}
                        >
                          <span className="capitalize">{category.replace(/_/g, ' ')}</span>
                          <span className="text-xs font-medium">
                            {state === 'block' && '🚫'}
                            {state === 'warn' && '⚠️'}
                            {state === 'none' && '—'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-space-100 dark:bg-space-800 text-xs">
              <span className="text-space-600 dark:text-space-400">
                <strong className="text-danger-600">{form.blockCategories.length}</strong> blocked
              </span>
              <span className="text-space-400">•</span>
              <span className="text-space-600 dark:text-space-400">
                <strong className="text-warning-600">{form.warnCategories.length}</strong> warned
              </span>
              <span className="text-space-400">•</span>
              <span className="text-space-600 dark:text-space-400">
                <strong className="text-primary-600">{form.threatBlocking.feeds.length}</strong> threat feeds
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-space-200 dark:border-space-700">
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
