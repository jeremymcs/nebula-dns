/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Domain Lists Management Page (Allowlists / Blocklists)
 */

'use client'

import { useState, useCallback } from 'react'
import { useLists, useListEntries } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  QueueListIcon,
  ArrowPathIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

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

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Failed to load lists. Make sure the API is running.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Domain Lists</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage custom allowlists and blocklists for fine-grained control
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button 
            onClick={() => openCreateModal('allowlist')} 
            className="btn-secondary inline-flex items-center"
          >
            <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" />
            New Allowlist
          </button>
          <button 
            onClick={() => openCreateModal('blocklist')} 
            className="btn-primary inline-flex items-center"
          >
            <NoSymbolIcon className="h-5 w-5 mr-2" />
            New Blocklist
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['all', 'allowlist', 'blocklist'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as typeof filter)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm capitalize ${
                filter === tab 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'all' ? 'All Lists' : `${tab}s`}
            </button>
          ))}
        </nav>
      </div>

      {isLoading ? (
        <div className="mt-8 flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <div 
              key={list.id} 
              className="card p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openEntriesModal(list)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    list.type === 'allowlist' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {list.type === 'allowlist' ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    ) : (
                      <NoSymbolIcon className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">{list.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      list.type === 'allowlist' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {list.type === 'allowlist' ? 'Allowlist' : 'Blocklist'}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditModal(list)
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(list)
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="mt-3 text-sm text-gray-500 line-clamp-2">
                {list.description || 'No description'}
              </p>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  <span className="font-medium text-gray-900">{list.entryCount}</span> domains
                </span>
                <span className="text-gray-400 text-xs">
                  Updated {new Date(list.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}

          {lists.length === 0 && (
            <div className="col-span-full text-center py-12">
              <QueueListIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No lists</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a blocklist or allowlist.</p>
              <div className="mt-6 flex justify-center space-x-3">
                <button onClick={() => openCreateModal('allowlist')} className="btn-secondary inline-flex items-center">
                  <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" />
                  New Allowlist
                </button>
                <button onClick={() => openCreateModal('blocklist')} className="btn-primary inline-flex items-center">
                  <NoSymbolIcon className="h-5 w-5 mr-2" />
                  New Blocklist
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
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingList ? 'Edit List' : `Create ${form.type === 'allowlist' ? 'Allowlist' : 'Blocklist'}`}
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">List Name *</label>
                  <input 
                    type="text" 
                    className="input mt-1" 
                    placeholder="e.g., Company Allowed Domains"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea 
                    className="input mt-1" 
                    rows={2}
                    placeholder="Purpose of this list"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                {!editingList && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">List Type</label>
                    <div className="mt-2 flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="type"
                          value="blocklist"
                          checked={form.type === 'blocklist'}
                          onChange={(e) => setForm({ ...form, type: e.target.value as 'blocklist' })}
                          className="h-4 w-4 text-primary-600"
                        />
                        <span className="ml-2 text-sm text-gray-700">Blocklist</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="type"
                          value="allowlist"
                          checked={form.type === 'allowlist'}
                          onChange={(e) => setForm({ ...form, type: e.target.value as 'allowlist' })}
                          className="h-4 w-4 text-primary-600"
                        />
                        <span className="ml-2 text-sm text-gray-700">Allowlist</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
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
                  {saving ? 'Saving...' : editingList ? 'Save Changes' : 'Create List'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entries Modal */}
      {showEntriesModal && selectedList && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowEntriesModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{selectedList.name}</h3>
                  <p className="text-sm text-gray-500">{selectedList.entryCount} domains</p>
                </div>
                <button onClick={() => setShowEntriesModal(false)} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                {/* Search and Actions */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      className="input pl-10"
                      placeholder="Search domains..."
                      value={searchEntries}
                      onChange={(e) => setSearchEntries(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => setShowBulkImport(!showBulkImport)}
                    className="btn-secondary inline-flex items-center"
                  >
                    <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                    Bulk Import
                  </button>
                </div>

                {/* Bulk Import */}
                {showBulkImport && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paste domains (one per line)
                    </label>
                    <textarea
                      className="input"
                      rows={5}
                      placeholder="example.com&#10;subdomain.example.com&#10;# Comments starting with # are ignored"
                      value={bulkDomains}
                      onChange={(e) => setBulkDomains(e.target.value)}
                    />
                    <div className="mt-2 flex justify-end space-x-2">
                      <button
                        className="btn-secondary text-sm"
                        onClick={() => setShowBulkImport(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-primary text-sm"
                        onClick={handleBulkImport}
                        disabled={saving}
                      >
                        {saving ? 'Importing...' : 'Import Domains'}
                      </button>
                    </div>
                  </div>
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
                  <input
                    type="text"
                    name="domain"
                    className="input flex-1"
                    placeholder="Add domain (e.g., example.com)"
                  />
                  <button type="submit" className="btn-primary">
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </form>

                {/* Entries List */}
                {entriesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {filteredEntries.map((entry: ListEntry) => (
                      <div key={entry.id} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                        <span className="text-sm font-mono text-gray-900">{entry.domain}</span>
                        <button
                          onClick={() => removeDomain(entry.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {filteredEntries.length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-gray-500">
                        {searchEntries ? 'No domains match your search' : 'No domains in this list yet'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
                <button onClick={() => setShowEntriesModal(false)} className="btn-primary w-full">
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
