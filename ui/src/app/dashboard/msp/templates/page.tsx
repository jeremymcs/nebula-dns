/**
 * Nebula DNS - MSP Global Templates Page
 * Allows MSP users to manage policy templates for all clients
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/Toast'
import { useMspTemplates, MspTemplate, MspTemplateConfig } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { mutate } from 'swr'
import {
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  BuildingOffice2Icon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

interface Client {
  id: string
  name: string
  slug: string
}

export default function MspTemplatesPage() {
  const { isMsp, organizations } = useAuth()
  const { showToast } = useToast()
  const { data: templatesData, isLoading } = useMspTemplates()
  const [search, setSearch] = useState('')
  const [deployModal, setDeployModal] = useState<{ template: MspTemplate } | null>(null)
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [deploying, setDeploying] = useState(false)
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState<MspTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    tags: [] as string[],
    config: {
      blockCategories: [] as string[],
      warnCategories: [] as string[],
      threatBlocking: { enabled: true, feeds: ['malware', 'phishing'] },
      safesearch: { enabled: false, services: [], settings: {} },
      schedules: [],
    } as MspTemplateConfig,
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Use organizations from auth context as clients
  const clients: Client[] = organizations.map(org => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
  }))

  const templates = templatesData?.templates || []

  // Filter templates based on search
  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  // Category options
  const categoryOptions = [
    'Business',
    'Education',
    'Healthcare',
    'Government',
    'Home',
    'Security',
    'Compliance',
    'Basic',
  ]

  // Common blocked categories
  const blockedCategoryOptions = [
    'adult',
    'gambling',
    'malware',
    'phishing',
    'social-media',
    'streaming',
    'gaming',
    'drugs',
    'weapons',
    'violence',
    'hate-speech',
    'dating',
    'cryptomining',
    'proxy-vpn',
    'file-sharing',
    'newly-registered',
  ]

  const handleDeploy = async () => {
    if (!deployModal || selectedClients.length === 0) return
    setDeploying(true)

    try {
      const result = await api.deployMspTemplate(deployModal.template.id, {
        tenantIds: selectedClients,
        mode: 'overlay',
      })

      if (result.success) {
        showToast('success', `Template deployed to ${result.successfulDeployments} client(s)`)
      } else {
        showToast('warning', `Deployed to ${result.successfulDeployments} clients, ${result.failedDeployments} failed`)
      }

      setDeployModal(null)
      setSelectedClients([])
      mutate('/msp/templates')
    } catch (err: any) {
      showToast('error', err.message || 'Failed to deploy template')
    } finally {
      setDeploying(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      showToast('error', 'Template name is required')
      return
    }
    setSaving(true)

    try {
      await api.createMspTemplate({
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        config: formData.config,
      })

      showToast('success', 'Template created successfully')
      setCreateModal(false)
      resetForm()
      mutate('/msp/templates')
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create template')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editModal || !formData.name.trim()) {
      showToast('error', 'Template name is required')
      return
    }
    setSaving(true)

    try {
      await api.updateMspTemplate(editModal.id, {
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        config: formData.config,
      })

      showToast('success', 'Template updated successfully')
      setEditModal(null)
      resetForm()
      mutate('/msp/templates')
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update template')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (template: MspTemplate) => {
    if (!confirm(`Delete template "${template.name}"? This action cannot be undone.`)) return
    setDeleting(template.id)

    try {
      await api.deleteMspTemplate(template.id)
      showToast('success', 'Template deleted')
      mutate('/msp/templates')
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete template')
    } finally {
      setDeleting(null)
    }
  }

  const openEditModal = (template: MspTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category || '',
      tags: template.tags || [],
      config: template.config,
    })
    setEditModal(template)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      tags: [],
      config: {
        blockCategories: [],
        warnCategories: [],
        threatBlocking: { enabled: true, feeds: ['malware', 'phishing'] },
        safesearch: { enabled: false, services: [], settings: {} },
        schedules: [],
      },
    })
  }

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  const selectAllClients = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([])
    } else {
      setSelectedClients(clients.map(c => c.id))
    }
  }

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        blockCategories: prev.config.blockCategories.includes(category)
          ? prev.config.blockCategories.filter(c => c !== category)
          : [...prev.config.blockCategories, category],
      },
    }))
  }

  // Redirect non-MSP users
  if (!isMsp) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <DocumentDuplicateIcon className="h-12 w-12 text-space-400 mb-4" />
        <h2 className="text-xl font-semibold text-space-900 dark:text-white mb-2">
          MSP Feature Only
        </h2>
        <p className="text-space-500 dark:text-space-400 max-w-md">
          Global templates are only available for MSP accounts managing multiple clients.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Policy Templates</h1>
          <p className="text-space-500 dark:text-space-400">
            Create and deploy policy templates to all your clients
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setCreateModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25"
        >
          <PlusIcon className="h-5 w-5" />
          Create Template
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-space-400" />
        <input
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-space-800 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500 outline-none"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Templates Grid */}
      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-space-800 rounded-2xl">
              <ShieldCheckIcon className="h-12 w-12 text-space-300 mb-4" />
              <h3 className="text-lg font-medium text-space-900 dark:text-white mb-2">No templates</h3>
              <p className="text-space-500 dark:text-space-400 mb-4">Create your first policy template to deploy to clients</p>
              <button
                onClick={() => { resetForm(); setCreateModal(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Create Template
              </button>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-space-800 rounded-2xl p-5 ring-1 ring-space-200 dark:ring-space-700 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <ShieldCheckIcon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                    {template.deployedTo} clients
                  </span>
                </div>

                <h3 className="font-semibold text-space-900 dark:text-white mb-1">{template.name}</h3>
                <p className="text-sm text-space-500 dark:text-space-400 mb-3 line-clamp-2">
                  {template.description || 'No description'}
                </p>

                <div className="flex flex-wrap gap-1 mb-4">
                  {template.config.threatBlocking?.enabled && (
                    <span className="text-xs px-2 py-0.5 bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 rounded">
                      Threat Blocking
                    </span>
                  )}
                  {template.config.safesearch?.enabled && (
                    <span className="text-xs px-2 py-0.5 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 rounded">
                      SafeSearch
                    </span>
                  )}
                  {template.config.blockCategories?.slice(0, 2).map((cat) => (
                    <span key={cat} className="text-xs px-2 py-0.5 bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-300 rounded">
                      {cat}
                    </span>
                  ))}
                  {(template.config.blockCategories?.length || 0) > 2 && (
                    <span className="text-xs px-2 py-0.5 bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-300 rounded">
                      +{template.config.blockCategories.length - 2}
                    </span>
                  )}
                </div>

                <div className="text-xs text-space-500 dark:text-space-400 mb-3">
                  Version {template.version} • {template.category || 'Uncategorized'}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDeployModal({ template })}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    <ArrowUpTrayIcon className="h-4 w-4" />
                    Deploy
                  </button>
                  <button
                    onClick={() => openEditModal(template)}
                    className="p-2 bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-300 rounded-xl hover:bg-space-200 dark:hover:bg-space-600 transition-colors"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    disabled={deleting === template.id}
                    className="p-2 bg-danger-50 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400 rounded-xl hover:bg-danger-100 dark:hover:bg-danger-900/50 transition-colors disabled:opacity-50"
                  >
                    {deleting === template.id ? (
                      <div className="h-4 w-4 border-2 border-danger-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Deploy Modal */}
      {deployModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-space-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-space-900 dark:text-white">
                  Deploy Template
                </h3>
                <p className="text-sm text-space-500 dark:text-space-400 mt-1">
                  Select clients to deploy &quot;{deployModal.template.name}&quot;
                </p>
              </div>
              <button
                onClick={() => { setDeployModal(null); setSelectedClients([]) }}
                className="p-2 rounded-lg hover:bg-space-100 dark:hover:bg-space-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-space-500" />
              </button>
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-space-200 dark:border-space-700">
              <button
                onClick={selectAllClients}
                className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                {selectedClients.length === clients.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-space-500 dark:text-space-400">
                {selectedClients.length} selected
              </span>
            </div>

            {/* Client List */}
            <div className="max-h-64 overflow-y-auto space-y-2 mb-6">
              {clients.length === 0 ? (
                <div className="text-center py-8 text-space-500 dark:text-space-400">
                  <BuildingOffice2Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No clients available</p>
                </div>
              ) : (
                clients.map((client) => (
                  <label
                    key={client.id}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      selectedClients.includes(client.id)
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 ring-1 ring-emerald-500'
                        : 'bg-space-50 dark:bg-space-700/50 hover:bg-space-100 dark:hover:bg-space-700'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-md flex items-center justify-center transition-all ${
                      selectedClients.includes(client.id)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-space-600 ring-1 ring-space-300 dark:ring-space-500'
                    }`}>
                      {selectedClients.includes(client.id) && (
                        <CheckIcon className="h-3 w-3" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client.id)}
                      onChange={() => toggleClientSelection(client.id)}
                      className="sr-only"
                    />
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <BuildingOffice2Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-space-900 dark:text-white">{client.name}</span>
                      <span className="text-sm text-space-500 dark:text-space-400 ml-2">{client.slug}</span>
                    </div>
                  </label>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeployModal(null); setSelectedClients([]) }}
                className="flex-1 px-4 py-2.5 bg-space-100 dark:bg-space-700 text-space-700 dark:text-space-200 rounded-xl font-medium hover:bg-space-200 dark:hover:bg-space-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeploy}
                disabled={selectedClients.length === 0 || deploying}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deploying ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="h-4 w-4" />
                    Deploy to {selectedClients.length} Client{selectedClients.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Template Modal */}
      {(createModal || editModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-space-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-space-900 dark:text-white">
                {editModal ? 'Edit Template' : 'Create Template'}
              </h3>
              <button
                onClick={() => { setCreateModal(false); setEditModal(null); resetForm() }}
                className="p-2 rounded-lg hover:bg-space-100 dark:hover:bg-space-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-space-500" />
              </button>
            </div>

            <div className="space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                  Template Name <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., K-12 Education"
                  className="w-full px-4 py-2.5 bg-white dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this template is for..."
                  className="w-full px-4 py-2.5 bg-white dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Select category...</option>
                  {categoryOptions.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Blocked Categories */}
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                  Blocked Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {blockedCategoryOptions.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        formData.config.blockCategories.includes(category)
                          ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 ring-1 ring-danger-300 dark:ring-danger-700'
                          : 'bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-300 hover:bg-space-200 dark:hover:bg-space-600'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Threat Blocking */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="threatBlocking"
                  checked={formData.config.threatBlocking?.enabled ?? true}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      threatBlocking: { ...prev.config.threatBlocking, enabled: e.target.checked },
                    },
                  }))}
                  className="h-4 w-4 rounded border-space-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="threatBlocking" className="text-sm font-medium text-space-700 dark:text-space-300">
                  Enable Threat Blocking (malware, phishing)
                </label>
              </div>

              {/* SafeSearch */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="safesearch"
                  checked={formData.config.safesearch?.enabled ?? false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      safesearch: { ...prev.config.safesearch, enabled: e.target.checked },
                    },
                  }))}
                  className="h-4 w-4 rounded border-space-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="safesearch" className="text-sm font-medium text-space-700 dark:text-space-300">
                  Enable SafeSearch Enforcement
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-space-200 dark:border-space-700">
              <button
                onClick={() => { setCreateModal(false); setEditModal(null); resetForm() }}
                className="flex-1 px-4 py-2.5 bg-space-100 dark:bg-space-700 text-space-700 dark:text-space-200 rounded-xl font-medium hover:bg-space-200 dark:hover:bg-space-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editModal ? handleUpdate : handleCreate}
                disabled={saving || !formData.name.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  editModal ? 'Update Template' : 'Create Template'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
