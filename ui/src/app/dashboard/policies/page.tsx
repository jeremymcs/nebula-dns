/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Policies Management Page - Cosmic Security Theme
 */

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePolicies } from '@/hooks/useApi'
import { api, API_URL } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { Button, Card, Badge, Modal, Input, Textarea, Select, SEARCH_ENGINE_LOGOS } from '@/components/ui'
import { PolicyTimeline, PolicyRollback, type PolicyVersion } from '@/components/policy-history'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ClockIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import clsx from 'clsx'

interface SafeSearchSettings {
  google: 'off' | 'moderate' | 'strict'
  bing: 'off' | 'moderate' | 'strict'
  youtube: 'off' | 'moderate' | 'strict'
  duckduckgo: 'off' | 'moderate' | 'strict'
}

interface PolicyConfig {
  blockCategories: string[]
  warnCategories?: string[]
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

// Demo policies for new tenants
function generateDemoPolicies(): Policy[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'demo-1',
      name: 'Default Policy',
      description: 'Baseline security policy with threat protection enabled',
      currentVersion: 1,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
      currentConfig: {
        blockCategories: ['malware', 'phishing', 'scam', 'cryptominer'],
        warnCategories: [],
        threatBlocking: { enabled: true, feeds: ['malware', 'phishing', 'c2', 'ransomware'] },
        safesearch: { enabled: false, services: [] },
      },
    },
    {
      id: 'demo-2',
      name: 'Family Safe',
      description: 'Block adult content, violence, and enforce safe search',
      currentVersion: 1,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      currentConfig: {
        blockCategories: ['adult', 'violence', 'drugs', 'weapons', 'gambling', 'dating', 'alcohol'],
        warnCategories: ['social_media', 'gaming', 'streaming'],
        threatBlocking: { enabled: true, feeds: ['malware', 'phishing', 'c2', 'ransomware'] },
        safesearch: {
          enabled: true,
          services: ['google', 'bing', 'youtube', 'duckduckgo'],
          settings: { google: 'strict', bing: 'strict', youtube: 'strict', duckduckgo: 'strict' },
        },
      },
    },
    {
      id: 'demo-3',
      name: 'Corporate Security',
      description: 'High security for business environments',
      currentVersion: 1,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      currentConfig: {
        blockCategories: ['malware', 'phishing', 'hacking', 'scam', 'adult', 'gambling', 'piracy', 'proxy', 'vpn', 'file_sharing', 'cryptominer'],
        warnCategories: ['social_media', 'streaming', 'gaming'],
        threatBlocking: { enabled: true, feeds: ['malware', 'phishing', 'c2', 'ransomware', 'botnet', 'cryptominer', 'spam'] },
        safesearch: {
          enabled: true,
          services: ['google', 'bing', 'youtube', 'duckduckgo'],
          settings: { google: 'moderate', bing: 'moderate', youtube: 'moderate', duckduckgo: 'moderate' },
        },
      },
    },
  ]
}

// Threat feed types - aligned with threat-feed-loader.py
const THREAT_FEEDS = [
  'malware', 'phishing', 'botnet', 'ransomware', 'cryptominer', 'c2', 'spam', 'malvertising'
]

export default function PoliciesPage() {
  const searchParams = useSearchParams()
  const { data, isLoading, error, mutate } = usePolicies()
  const { showToast } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [saving, setSaving] = useState(false)

  // Version history state
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyPolicy, setHistoryPolicy] = useState<Policy | null>(null)
  const [policyVersions, setPolicyVersions] = useState<PolicyVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<PolicyVersion | null>(null)
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false)
  const [rollingBack, setRollingBack] = useState(false)
  const [importing, setImporting] = useState(false)

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

  // Use API data or fallback to demo data for new tenants/errors
  const apiPolicies = data?.data || []
  const usingDemoData = error || apiPolicies.length === 0
  const policies: Policy[] = usingDemoData ? generateDemoPolicies() : apiPolicies

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

  // Check for template data from URL params
  useEffect(() => {
    const action = searchParams.get('action')
    const fromTemplate = searchParams.get('fromTemplate')

    if (action === 'new') {
      // Check if coming from template selection
      if (fromTemplate === 'true') {
        try {
          const templateData = sessionStorage.getItem('policyTemplate')
          if (templateData) {
            const template = JSON.parse(templateData)
            setForm(prev => ({
              ...prev,
              name: template.name || '',
              description: template.description || '',
              blockCategories: template.config?.blockCategories || [],
              warnCategories: template.config?.warnCategories || [],
              threatBlocking: template.config?.threatBlocking || { enabled: true, feeds: ['malware', 'phishing', 'c2'] },
              safesearch: template.config?.safesearch || { enabled: false, services: [], settings: { ...DEFAULT_SAFESEARCH_SETTINGS } },
            }))
            sessionStorage.removeItem('policyTemplate')
            showToast('success', 'Template loaded! Customize and save your policy.')
          }
        } catch (e) {
          console.error('Failed to parse template data:', e)
        }
      }
      setShowCreateModal(true)
    }
  }, [searchParams, showToast])

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
      // No toast for preset selection - changes are visible immediately in the UI
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
      warnCategories: policy.currentConfig?.warnCategories || [],
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
      const isEditing = !!editingPolicy

      const config = {
        blockCategories: form.blockCategories,
        warnCategories: form.warnCategories,
        threatBlocking: form.threatBlocking,
        safesearch: form.safesearch,
      }

      if (isEditing) {
        // UpdatePolicyDto doesn't allow isDefault
        await api.updatePolicy(editingPolicy.id, {
          name: form.name,
          description: form.description,
          config,
        })
      } else {
        // CreatePolicyDto allows isDefault
        await api.createPolicy({
          name: form.name,
          description: form.description,
          config,
        })
      }

      // Close modal first, then show toast after modal animation
      setShowCreateModal(false)
      resetForm()
      setEditingPolicy(null)

      // Refresh data
      await mutate()

      // Show success toast after modal closes
      setTimeout(() => {
        showToast('success', isEditing ? 'Policy updated successfully' : 'Policy created successfully')
      }, 150)
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
      const res = await fetch(`${API_URL}/policies/${policy.id}`, {
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

  const openHistoryModal = async (policy: Policy) => {
    setHistoryPolicy(policy)
    setShowHistoryModal(true)
    setLoadingVersions(true)
    setPolicyVersions([])
    setSelectedVersion(null)

    try {
      const versions = await api.getPolicyVersions(policy.id)
      setPolicyVersions(versions)
    } catch (err: any) {
      showToast('error', 'Failed to load version history')
    } finally {
      setLoadingVersions(false)
    }
  }

  const handleRollback = async () => {
    if (!historyPolicy || !selectedVersion) return

    setRollingBack(true)
    try {
      await api.rollbackPolicy(historyPolicy.id, selectedVersion.id)
      showToast('success', `Rolled back to version ${selectedVersion.version}`)
      setShowRollbackConfirm(false)
      setShowHistoryModal(false)
      mutate()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to rollback policy')
    } finally {
      setRollingBack(false)
    }
  }

  const handleImportSamples = async () => {
    setImporting(true)
    try {
      const demoPolicies = generateDemoPolicies()
      for (const policy of demoPolicies) {
        await api.createPolicy({
          name: policy.name,
          description: policy.description,
          config: policy.currentConfig,
        })
      }
      showToast('success', 'Sample policies imported successfully')
      mutate()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to import sample policies')
    } finally {
      setImporting(false)
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

  return (
    <div className="pb-12 space-y-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-space-900 dark:text-white">Policies</h1>
          <p className="text-lg text-space-500 dark:text-space-400">
            Manage DNS filtering policies for your locations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/policy-builder">
            <Button variant="secondary" size="lg" leftIcon={<Squares2X2Icon className="h-5 w-5" />}>
              Visual Builder
            </Button>
          </Link>
          <Button variant="primary" size="lg" onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
            Create Policy
          </Button>
        </div>
      </div>

      {/* Demo Data Notice */}
      {usingDemoData && !isLoading && (
        <div className="flex items-center justify-between gap-6 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <ShieldCheckIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-100">
                Sample Policies
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Showing sample policies. Import them to use as starting templates for your organization.
              </p>
            </div>
          </div>
          <Button
            variant="accent"
            size="md"
            onClick={handleImportSamples}
            disabled={importing}
            leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
            className="bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-amber-500/20 whitespace-nowrap"
          >
            {importing ? 'Importing...' : 'Import Samples'}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-80 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {policies.map((policy) => (
            <Card
              key={policy.id}
              variant="interactive"
              padding="none"
              className="group overflow-hidden flex flex-col h-full"
            >
              {/* Card Header with gradient */}
              <div className={clsx(
                'p-6 relative overflow-hidden',
                policy.isDefault
                  ? 'bg-primary-600'
                  : 'bg-space-100 dark:from-space-800 dark:to-space-900'
              )}>
                {/* Background decoration */}
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

                <div className="relative flex items-start justify-between">
                  <div className={clsx(
                    'p-3.5 rounded-xl transition-transform group-hover:scale-110 duration-300',
                    policy.isDefault ? 'bg-white/20' : 'bg-white dark:bg-space-700 shadow-sm'
                  )}>
                    <ShieldCheckIcon className={clsx(
                      'h-6 w-6',
                      policy.isDefault ? 'text-white' : 'text-primary-600 dark:text-primary-400'
                    )} />
                  </div>
                  {policy.isDefault && (
                    <Badge variant="primary" className="bg-white/20 text-white border-0 font-bold uppercase tracking-wider text-[10px]">
                      Default
                    </Badge>
                  )}
                </div>

                <h3 className={clsx(
                  'mt-6 text-xl font-bold leading-tight',
                  policy.isDefault ? 'text-white' : 'text-space-900 dark:text-white'
                )}>
                  {policy.name}
                </h3>
                <p className={clsx(
                  'mt-2 text-sm line-clamp-2 leading-relaxed',
                  policy.isDefault ? 'text-white/80' : 'text-space-500 dark:text-space-400'
                )}>
                  {policy.description || 'Baseline security policy with threat protection enabled'}
                </p>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4 flex-1">
                <div className="flex items-center justify-between py-1 border-b border-space-100 dark:border-space-800">
                  <span className="text-sm font-medium text-space-500 dark:text-space-400">Version</span>
                  <Badge variant="neutral" className="font-mono">v{policy.currentVersion}</Badge>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-space-100 dark:border-space-800">
                  <span className="text-sm font-medium text-space-500 dark:text-space-400">Threat Protection</span>
                  <Badge variant={policy.currentConfig?.threatBlocking?.enabled ? 'success' : 'neutral'} className="font-bold">
                    {policy.currentConfig?.threatBlocking?.enabled ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-space-100 dark:border-space-800">
                  <span className="text-sm font-medium text-space-500 dark:text-space-400">SafeSearch</span>
                  <Badge variant={policy.currentConfig?.safesearch?.enabled ? 'success' : 'neutral'} className="font-bold">
                    {policy.currentConfig?.safesearch?.enabled ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>

                <div className="pt-2">
                  <span className="text-xs font-bold text-space-400 dark:text-space-500 uppercase tracking-widest">Blocked Categories</span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(policy.currentConfig?.blockCategories || []).slice(0, 3).map((cat) => (
                      <Badge key={cat} variant="danger" size="sm" className="font-semibold px-2">
                        {cat.replace('_', ' ')}
                      </Badge>
                    ))}
                    {(policy.currentConfig?.blockCategories?.length || 0) > 3 && (
                      <Badge variant="neutral" size="sm" className="font-bold">
                        +{(policy.currentConfig?.blockCategories?.length || 0) - 3}
                      </Badge>
                    )}
                    {(policy.currentConfig?.blockCategories?.length || 0) === 0 && (
                      <span className="text-sm text-space-400 dark:text-space-600 italic">None configured</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 py-4 flex items-center justify-between border-t border-space-100 dark:border-space-700 bg-space-50/50 dark:bg-space-900/50">
                <span className="text-[11px] font-medium text-space-400 dark:text-space-500 uppercase tracking-wider">
                  Modified {new Date(policy.updatedAt).toLocaleDateString()}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => openHistoryModal(policy)}
                    leftIcon={<ClockIcon className="h-4 w-4" />}
                  >
                    History
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => openEditModal(policy)}
                    leftIcon={<PencilIcon className="h-4 w-4" />}
                  >
                    Edit
                  </Button>
                  {!policy.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                      onClick={() => handleDelete(policy)}
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

      {/* Create/Edit Modal - Full screen optimized layout */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingPolicy ? 'Edit Policy' : 'Create New Policy'}
        size="full"
      >
        <div className="flex flex-col -mx-6 -mb-6" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>
          {/* Main Content - Horizontal Split */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Settings */}
            <div className="w-80 flex-shrink-0 border-r border-space-200 dark:border-space-700 overflow-y-auto p-6 space-y-8 bg-space-50/50 dark:bg-space-900/30">
              {/* Basic Info */}
              <div className="space-y-4">
                <Input
                  label="Policy Name"
                  required
                  placeholder="e.g., Corporate Security"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Textarea
                  label="Description"
                  rows={3}
                  placeholder="Policy description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Quick Presets - Compact */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-space-400 dark:text-space-500 uppercase tracking-widest">
                  Quick Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(POLICY_PRESETS).map(([name, preset]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => applyPreset(name)}
                      className="text-left p-3 rounded-xl border border-space-200 dark:border-space-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-white dark:hover:bg-space-800 hover:shadow-md transition-all group"
                    >
                      <span className="text-xs font-bold text-space-700 dark:text-space-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 block truncate">{name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Threat Protection - Compact */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-space-400 dark:text-space-500 uppercase tracking-widest">
                  Threat Protection
                </label>
                <div className="flex flex-wrap gap-2">
                  {THREAT_FEEDS.map((feed) => (
                    <button
                      key={feed}
                      type="button"
                      onClick={() => toggleThreatFeed(feed)}
                      className={clsx(
                        'px-3 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wide',
                        form.threatBlocking.feeds.includes(feed)
                          ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                          : 'bg-white dark:bg-space-800 text-space-600 dark:text-space-400 border border-space-200 dark:border-space-700 hover:bg-space-50 dark:hover:bg-space-700'
                      )}
                    >
                      {feed}
                    </button>
                  ))}
                </div>
              </div>

              {/* SafeSearch - Compact */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-space-400 dark:text-space-500 uppercase tracking-widest">
                    SafeSearch
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAllEngines('strict')}
                      className="px-2 py-1 text-[10px] font-bold rounded-md bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400 uppercase tracking-wider"
                    >
                      MAX
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllEngines('off')}
                      className="px-2 py-1 text-[10px] font-bold rounded-md bg-space-200 text-space-600 dark:bg-space-700 dark:text-space-400 uppercase tracking-wider"
                    >
                      OFF
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
                        className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-space-800 border border-space-200 dark:border-space-700 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-5 h-5 flex-shrink-0">
                            {LogoComponent && <LogoComponent />}
                          </div>
                          <span className="text-xs font-bold text-space-700 dark:text-space-300">{engine.name}</span>
                        </div>
                        <div className="flex rounded-lg overflow-hidden border border-space-200 dark:border-space-600">
                          {(['off', 'moderate', 'strict'] as const).map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => updateSearchEngineSafety(engine.id as keyof SafeSearchSettings, level)}
                              className={clsx(
                                'px-2.5 py-1.5 text-[10px] font-bold transition-all uppercase tracking-wider',
                                level !== 'off' && 'border-l border-space-200 dark:border-space-600',
                                currentLevel === level
                                  ? level === 'strict' ? 'bg-danger-600 text-white'
                                    : level === 'moderate' ? 'bg-warning-600 text-white'
                                    : 'bg-space-700 text-white dark:bg-space-500'
                                  : 'bg-space-50 text-space-400 dark:bg-space-900 dark:text-space-500 hover:bg-space-100 dark:hover:bg-space-700'
                              )}
                            >
                              {level === 'off' ? 'Off' : level === 'moderate' ? 'Med' : 'Max'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right Panel - Categories */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-space-950">
              {/* Categories Header */}
              <div className="flex items-center justify-between px-8 py-4 border-b border-space-200 dark:border-space-700 bg-white dark:bg-space-900/50 backdrop-blur-md">
                <div className="flex items-center gap-6">
                  <h3 className="text-base font-bold text-space-900 dark:text-white">Content Categories</h3>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="w-3 h-3 rounded-md bg-danger-500 shadow-lg shadow-danger-500/20"></span>
                      <span className="text-space-500 uppercase tracking-widest">Block</span>
                    </span>
                    <span className="flex items-center gap-2 font-medium">
                      <span className="w-3 h-3 rounded-md bg-warning-500 shadow-lg shadow-warning-500/20"></span>
                      <span className="text-space-500 uppercase tracking-widest">Warn</span>
                    </span>
                    <span className="flex items-center gap-2 font-medium">
                      <span className="w-3 h-3 rounded-md bg-space-200 dark:bg-space-700"></span>
                      <span className="text-space-500 uppercase tracking-widest">Allow</span>
                    </span>
                  </div>
                </div>
                {/* Summary Stats */}
                <div className="flex items-center gap-4 text-xs">
                  <span className="px-3 py-1.5 rounded-full bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 font-bold uppercase tracking-wide">
                    {form.blockCategories.length} blocked
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 font-bold uppercase tracking-wide">
                    {form.warnCategories.length} warned
                  </span>
                </div>
              </div>

              {/* Categories Grid - Scrollable */}
              <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                  {Object.entries(CATEGORY_GROUPS).map(([groupName, group]) => (
                    <div
                      key={groupName}
                      className="flex flex-col rounded-2xl border border-space-200 dark:border-space-800 bg-white dark:bg-space-900 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-space-300 dark:hover:border-space-700"
                    >
                      <div className="px-4 py-3 border-b border-space-100 dark:border-space-800 bg-space-50/50 dark:bg-space-800/50 flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-space-900 dark:text-white flex items-center gap-2 uppercase tracking-widest">
                          <span className="text-base">{group.icon}</span>
                          {groupName}
                        </h4>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => toggleGroupCategories(groupName, 'block')}
                            className="p-1.5 rounded-md hover:bg-danger-100 dark:hover:bg-danger-900/30 transition-colors"
                            title="Block all"
                          >
                            <ShieldExclamationIcon className="w-3.5 h-3.5 text-danger-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleGroupCategories(groupName, 'none')}
                            className="p-1.5 rounded-md hover:bg-space-100 dark:hover:bg-space-700 transition-colors"
                            title="Allow all"
                          >
                            <ShieldCheckIcon className="w-3.5 h-3.5 text-space-400" />
                          </button>
                        </div>
                      </div>
                      <div className="p-3 space-y-1.5">
                        {group.categories.map((category) => {
                          const state = getCategoryState(category)
                          return (
                            <button
                              key={category}
                              type="button"
                              onClick={() => cycleCategory(category)}
                              className={clsx(
                                'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wide',
                                state === 'block' && 'bg-danger-600 text-white shadow-lg shadow-danger-500/20',
                                state === 'warn' && 'bg-warning-500 text-white shadow-lg shadow-warning-500/20',
                                state === 'none' && 'bg-white dark:bg-space-900 text-space-600 dark:text-space-400 border border-space-100 dark:border-space-800 hover:border-space-300 dark:hover:border-space-600'
                              )}
                            >
                              <span className="truncate">{category.replace(/_/g, ' ')}</span>
                              <span className="flex-shrink-0 ml-2">
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
              </div>
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="flex items-center justify-end gap-4 px-8 py-5 border-t border-space-200 dark:border-space-700 bg-space-50 dark:bg-space-900/80 backdrop-blur-md">
            <Button
              variant="secondary"
              size="lg"
              className="px-8"
              onClick={() => setShowCreateModal(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="px-8 shadow-xl"
              onClick={handleSave}
              isLoading={saving}
            >
              {editingPolicy ? 'Save Changes' : 'Create Policy'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Version History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`Version History: ${historyPolicy?.name || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          {loadingVersions ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : (
            <PolicyTimeline
              versions={policyVersions}
              currentVersion={historyPolicy?.currentVersion || 1}
              selectedVersion={selectedVersion?.version}
              onSelectVersion={(version) => setSelectedVersion(version)}
              onRollback={(version) => {
                setSelectedVersion(version)
                setShowRollbackConfirm(true)
              }}
            />
          )}

          {selectedVersion && (
            <div className="p-4 bg-space-50 dark:bg-space-900 rounded-xl">
              <h4 className="font-medium text-space-900 dark:text-white mb-3">
                Version {selectedVersion.version} Configuration
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-space-500">Blocked Categories:</span>
                  <p className="font-medium text-space-900 dark:text-white">
                    {selectedVersion.config.blockCategories?.length || 0}
                  </p>
                </div>
                <div>
                  <span className="text-space-500">Warn Categories:</span>
                  <p className="font-medium text-space-900 dark:text-white">
                    {selectedVersion.config.warnCategories?.length || 0}
                  </p>
                </div>
                <div>
                  <span className="text-space-500">Threat Blocking:</span>
                  <p className="font-medium text-space-900 dark:text-white">
                    {selectedVersion.config.threatBlocking?.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <span className="text-space-500">SafeSearch:</span>
                  <p className="font-medium text-space-900 dark:text-white">
                    {selectedVersion.config.safesearch?.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              {selectedVersion.config.blockCategories && selectedVersion.config.blockCategories.length > 0 && (
                <div className="mt-3">
                  <span className="text-sm text-space-500">Categories:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedVersion.config.blockCategories.slice(0, 10).map((cat) => (
                      <Badge key={cat} variant="danger" size="sm">{cat}</Badge>
                    ))}
                    {selectedVersion.config.blockCategories.length > 10 && (
                      <Badge variant="neutral" size="sm">+{selectedVersion.config.blockCategories.length - 10} more</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Rollback Confirmation */}
      {selectedVersion && historyPolicy && (
        <PolicyRollback
          isOpen={showRollbackConfirm}
          targetVersion={selectedVersion}
          currentVersionNumber={historyPolicy.currentVersion}
          onConfirm={handleRollback}
          onCancel={() => setShowRollbackConfirm(false)}
          isLoading={rollingBack}
        />
      )}
    </div>
  )
}
