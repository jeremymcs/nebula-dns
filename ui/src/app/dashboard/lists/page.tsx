/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Domain Lists Management Page - Cosmic Security Theme
 */

'use client'

import { useState } from 'react'
import { useLists, useListEntries } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  QueueListIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'
import { Button, Card, Badge, Input, Modal, EmptyState, Tabs } from '@/components/ui'

interface DomainList {
  id: string
  name: string
  description: string
  type: 'allowlist' | 'blocklist'
  entryCount: number
  createdAt: string
  updatedAt: string
}

interface ListEntry {
  id: string
  domain: string
  comment?: string
  createdAt: string
}

export default function ListsPage() {
  const [filter, setFilter] = useState<'all' | 'allowlist' | 'blocklist'>('all')
  const { data, isLoading, error, mutate } = useLists(filter === 'all' ? undefined : filter)
  const { showToast } = useToast()
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEntriesModal, setShowEntriesModal] = useState(false)
  const [editingList, setEditingList] = useState<DomainList | null>(null)
  const [selectedList, setSelectedList] = useState<DomainList | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchEntries, setSearchEntries] = useState('')

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'blocklist' as 'allowlist' | 'blocklist',
  })

  const [bulkDomains, setBulkDomains] = useState('')
  const [showBulkImport, setShowBulkImport] = useState(false)

  const { data: entriesData, isLoading: entriesLoading, mutate: mutateEntries } = useListEntries(selectedList?.id || null)
  const lists: DomainList[] = data?.data || []
  const entries: ListEntry[] = entriesData?.data || []

  const filteredEntries = entries.filter((entry: ListEntry) => 
    entry.domain.toLowerCase().includes(searchEntries.toLowerCase())
  )

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      type: 'blocklist',
    })
  }

  const openCreateModal = (type: 'allowlist' | 'blocklist' = 'blocklist') => {
    resetForm()
    setForm(prev => ({ ...prev, type }))
    setEditingList(null)
    setShowCreateModal(true)
  }

  const openEditModal = (list: DomainList) => {
    setEditingList(list)
    setForm({
      name: list.name,
      description: list.description || '',
      type: list.type,
    })
    setShowCreateModal(true)
  }

  const openEntriesModal = (list: DomainList) => {
    setSelectedList(list)
    setShowEntriesModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('error', 'List name is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        type: form.type,
      }

      if (editingList) {
        const token = localStorage.getItem('token')
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lists/${editingList.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })
        showToast('success', 'List updated successfully')
      } else {
        await api.createList(payload)
        showToast('success', 'List created successfully')
      }

      mutate()
      setShowCreateModal(false)
      resetForm()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save list')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (list: DomainList) => {
    if (!confirm(`Are you sure you want to delete "${list.name}"? This will remove all ${list.entryCount} entries.`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lists/${list.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!res.ok) throw new Error('Failed to delete')
      
      showToast('success', 'List deleted')
      mutate()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete list')
    }
  }

  const addDomain = async (domain: string) => {
    if (!selectedList || !domain.trim()) return

    try {
      await api.addListEntry(selectedList.id, { domain: domain.trim() })
      showToast('success', 'Domain added')
      mutateEntries()
      mutate()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to add domain')
    }
  }

  const removeDomain = async (entryId: string) => {
    if (!selectedList) return

    try {
      const token = localStorage.getItem('token')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lists/${selectedList.id}/entries/${entryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      showToast('success', 'Domain removed')
      mutateEntries()
      mutate()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to remove domain')
    }
  }

  const handleBulkImport = async () => {
    if (!selectedList || !bulkDomains.trim()) return

    const domains = bulkDomains
      .split('\n')
      .map(d => d.trim())
      .filter(d => d && !d.startsWith('#'))

    if (domains.length === 0) {
      showToast('error', 'No valid domains found')
      return
    }

    setSaving(true)
    try {
      await api.bulkAddListEntries(selectedList.id, domains)
      showToast('success', `Imported ${domains.length} domains`)
      mutateEntries()
      mutate()
      setBulkDomains('')
      setShowBulkImport(false)
    } catch (err: any) {
      showToast('error', err.message || 'Failed to import domains')
    } finally {
      setSaving(false)
    }
  }

  const tabItems = [
    { id: 'all', label: 'All Lists' },
    { id: 'allowlist', label: 'Allowlists' },
    { id: 'blocklist', label: 'Blocklists' },
  ]

  if (error) {
    return (
      <div className="space-y-8">
        <Card variant="solid" padding="lg" className="border-red-500/50 bg-danger-500/10">
          <p className="text-danger-600 dark:text-danger-400">Failed to load lists. Make sure the API is running.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Domain Lists</h1>
          <p className="mt-1 text-space-500 dark:text-space-400">
            Manage custom allowlists and blocklists for fine-grained control
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => openCreateModal('allowlist')}
            leftIcon={<CheckCircleIcon className="h-5 w-5 text-success-500" />}
          >
            New Allowlist
          </Button>
          <Button
            variant="primary"
            onClick={() => openCreateModal('blocklist')}
            leftIcon={<NoSymbolIcon className="h-5 w-5" />}
          >
            New Blocklist
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs
        tabs={tabItems}
        activeTab={filter}
        onChange={(id) => setFilter(id as typeof filter)}
      />

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-48 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <Card
              key={list.id}
              variant="interactive"
              padding="lg"
              className="cursor-pointer"
              onClick={() => openEntriesModal(list)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                    list.type === 'allowlist'
                      ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30'
                      : 'bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30'
                  }`}>
                    {list.type === 'allowlist' ? (
                      <CheckCircleIcon className="h-6 w-6 text-success-500" />
                    ) : (
                      <NoSymbolIcon className="h-6 w-6 text-danger-500" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-space-900 dark:text-white">{list.name}</h3>
                    <Badge variant={list.type === 'allowlist' ? 'success' : 'danger'} size="sm">
                      {list.type === 'allowlist' ? 'Allowlist' : 'Blocklist'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditModal(list)
                    }}
                    className="p-2 rounded-lg text-space-400 hover:text-space-600 dark:hover:text-space-300 hover:bg-space-100 dark:hover:bg-space-700 transition-colors"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(list)
                    }}
                    className="p-2 rounded-lg text-space-400 hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="mt-3 text-sm text-space-500 dark:text-space-400 line-clamp-2">
                {list.description || 'No description'}
              </p>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-space-500 dark:text-space-400">
                  <span className="font-semibold text-space-900 dark:text-white">{list.entryCount}</span> domains
                </span>
                <span className="text-space-400 text-xs">
                  Updated {new Date(list.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}

          {lists.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                icon={<QueueListIcon className="h-12 w-12" />}
                title="No lists"
                description="Get started by creating a blocklist or allowlist."
                action={
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => openCreateModal('allowlist')}
                      leftIcon={<CheckCircleIcon className="h-5 w-5 text-success-500" />}
                    >
                      New Allowlist
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => openCreateModal('blocklist')}
                      leftIcon={<NoSymbolIcon className="h-5 w-5" />}
                    >
                      New Blocklist
                    </Button>
                  </div>
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingList ? 'Edit List' : `Create ${form.type === 'allowlist' ? 'Allowlist' : 'Blocklist'}`}
      >
        <div className="space-y-4">
          <Input
            label="List Name *"
            placeholder="e.g., Company Allowed Domains"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">Description</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-space-200 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white placeholder-space-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
              rows={2}
              placeholder="Purpose of this list"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {!editingList && (
            <div>
              <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">List Type</label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="blocklist"
                    checked={form.type === 'blocklist'}
                    onChange={(e) => setForm({ ...form, type: e.target.value as 'blocklist' })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-space-700 dark:text-space-300">Blocklist</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="allowlist"
                    checked={form.type === 'allowlist'}
                    onChange={(e) => setForm({ ...form, type: e.target.value as 'allowlist' })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-space-700 dark:text-space-300">Allowlist</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-space-200 dark:border-space-700">
          <Button
            variant="secondary"
            onClick={() => setShowCreateModal(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            isLoading={saving}
          >
            {editingList ? 'Save Changes' : 'Create List'}
          </Button>
        </div>
      </Modal>

      {/* Entries Modal */}
      <Modal
        isOpen={showEntriesModal && !!selectedList}
        onClose={() => setShowEntriesModal(false)}
        title={selectedList?.name || 'List Entries'}
        size="lg"
      >
        {selectedList && (
          <>
            <p className="text-sm text-space-500 dark:text-space-400 mb-4">{selectedList.entryCount} domains</p>

            {/* Search and Actions */}
            <div className="flex items-center gap-4 mb-4">
              <Input
                placeholder="Search domains..."
                value={searchEntries}
                onChange={(e) => setSearchEntries(e.target.value)}
                leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
                className="flex-1"
              />
              <Button
                variant="secondary"
                onClick={() => setShowBulkImport(!showBulkImport)}
                leftIcon={<ArrowUpTrayIcon className="h-5 w-5" />}
              >
                Bulk Import
              </Button>
            </div>

            {/* Bulk Import */}
            {showBulkImport && (
              <Card variant="solid" padding="md" className="mb-4">
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
                  Paste domains (one per line)
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-space-200 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white placeholder-space-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  rows={5}
                  placeholder="example.com&#10;subdomain.example.com&#10;# Comments starting with # are ignored"
                  value={bulkDomains}
                  onChange={(e) => setBulkDomains(e.target.value)}
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowBulkImport(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleBulkImport} isLoading={saving}>
                    Import Domains
                  </Button>
                </div>
              </Card>
            )}

            {/* Add single domain */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const input = e.currentTarget.elements.namedItem('domain') as HTMLInputElement
                if (input.value) {
                  addDomain(input.value)
                  input.value = ''
                }
              }}
              className="flex gap-2 mb-4"
            >
              <Input
                name="domain"
                placeholder="Add domain (e.g., example.com)"
                className="flex-1"
              />
              <Button type="submit" variant="primary">
                <PlusIcon className="h-5 w-5" />
              </Button>
            </form>

            {/* Entries List */}
            {entriesLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton h-10 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="border border-space-200 dark:border-space-700 rounded-xl divide-y divide-space-200 dark:divide-space-700 max-h-96 overflow-y-auto">
                {filteredEntries.map((entry: ListEntry) => (
                  <div key={entry.id} className="flex items-center justify-between px-4 py-3 hover:bg-space-50 dark:hover:bg-space-700/50 transition-colors">
                    <span className="text-sm font-mono text-space-900 dark:text-white">{entry.domain}</span>
                    <button
                      onClick={() => removeDomain(entry.id)}
                      className="p-2 rounded-lg text-space-400 hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {filteredEntries.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-space-500 dark:text-space-400">
                    {searchEntries ? 'No domains match your search' : 'No domains in this list yet'}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-space-200 dark:border-space-700">
              <Button variant="primary" onClick={() => setShowEntriesModal(false)} className="w-full">
                Done
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
