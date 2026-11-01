/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Protection Zones Management Page - Cosmic Security Theme
 */

'use client'

import { useState, useMemo } from 'react'
import { useLocations, usePolicies } from '@/hooks/useApi'
import { api, API_URL } from '@/lib/api'
import { DNS1_HOST } from '@/lib/public-urls'
import { useToast } from '@/components/Toast'
import { Button, Card, Badge, Modal } from '@/components/ui'
import { ZoneEditorModal, ZoneFormData } from '@/components/zones'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  KeyIcon,
  GlobeAltIcon,
  SignalIcon,
  ClockIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface Location {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive'
  policyId: string
  policyName?: string
  ipRange?: string
  dyndns?: string
  siteIpUpdatedAt?: string | null
  createdAt: string
  updatedAt: string
}

interface LocationToken {
  id: string
  label: string
  createdAt: string
  expiresAt: string | null
  lastUsedAt: string | null
}

export default function LocationsPage() {
  const { data, isLoading, error, mutate } = useLocations()
  const { data: policiesData } = usePolicies()
  const { showToast } = useToast()

  const [showZoneEditor, setShowZoneEditor] = useState(false)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [generatedToken, setGeneratedToken] = useState<{ token: string; expiresAt: string | null } | null>(null)
  const [copiedToken, setCopiedToken] = useState(false)
  const [saving, setSaving] = useState(false)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [policyFilter, setPolicyFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'createdAt'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Token management state
  const [showTokenManagement, setShowTokenManagement] = useState(false)
  const [managingLocation, setManagingLocation] = useState<Location | null>(null)
  const [locationTokens, setLocationTokens] = useState<LocationToken[]>([])
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [revokingTokenId, setRevokingTokenId] = useState<string | null>(null)

  const locations: Location[] = data?.data || []
  const policies = policiesData?.data || []

  // Filter and sort locations
  const filteredLocations = useMemo(() => {
    let result = locations.filter(location => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (location.description?.toLowerCase().includes(searchQuery.toLowerCase()))

      // Status filter
      const matchesStatus = statusFilter === 'all' || location.status === statusFilter

      // Policy filter
      const matchesPolicy = policyFilter === '' || location.policyId === policyFilter

      return matchesSearch && matchesStatus && matchesPolicy
    })

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status)
      } else if (sortBy === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [locations, searchQuery, statusFilter, policyFilter, sortBy, sortOrder])

  const openCreateModal = () => {
    setEditingLocation(null)
    setShowZoneEditor(true)
  }

  const openEditModal = (location: Location) => {
    setEditingLocation(location)
    setShowZoneEditor(true)
  }

  const handleSave = async (formData: ZoneFormData) => {
    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        policyId: formData.policyId || undefined,
        ipRange: formData.ipRanges.join(', ') || undefined,
        dyndns: formData.dyndns.trim() || undefined,
        status: formData.status,
      }

      if (editingLocation) {
        const token = localStorage.getItem('token')
        await fetch(`${API_URL}/locations/${editingLocation.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })
        showToast('success', 'Zone updated successfully')
      } else {
        await api.createLocation(payload)
        showToast('success', 'Zone created successfully')
      }

      mutate()
      setShowZoneEditor(false)
      setEditingLocation(null)
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save zone')
    } finally {
      setSaving(false)
    }
  }

  const getInitialFormData = (): Partial<ZoneFormData> | undefined => {
    if (!editingLocation) return undefined
    return {
      name: editingLocation.name,
      description: editingLocation.description || '',
      policyId: editingLocation.policyId || '',
      ipRanges: editingLocation.ipRange ? editingLocation.ipRange.split(',').map(ip => ip.trim()) : [''],
      dyndns: editingLocation.dyndns || '',
      status: editingLocation.status || 'active',
    }
  }

  const handleDelete = async (location: Location) => {
    if (!confirm(`Are you sure you want to delete "${location.name}"?`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/locations/${location.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!res.ok) throw new Error('Failed to delete')
      
      showToast('success', 'Location deleted')
      mutate()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete location')
    }
  }

  const generateToken = async (location: Location) => {
    try {
      const result = await api.createLocationToken(location.id, {
        label: 'DoH Access Token',
        expiresInDays: 365,
      })
      setGeneratedToken({
        token: result.token,
        expiresAt: result.expiresAt,
      })
      setEditingLocation(location)
      setShowTokenModal(true)
    } catch (err: any) {
      showToast('error', err.message || 'Failed to generate token')
    }
  }

  const copyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken.token)
      setCopiedToken(true)
      setTimeout(() => setCopiedToken(false), 2000)
    }
  }

  // Bulk selection handlers
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    if (selectedIds.size === filteredLocations.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredLocations.map(l => l.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedIds.size} location(s)? This action cannot be undone.`)) {
      return
    }

    setBulkDeleting(true)
    try {
      const token = localStorage.getItem('token')
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch(`${API_URL}/locations/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      )

      await Promise.all(deletePromises)
      showToast('success', `Successfully deleted ${selectedIds.size} location(s)`)
      setSelectedIds(new Set())
      mutate()
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete some locations')
    } finally {
      setBulkDeleting(false)
    }
  }

  // Token management handlers
  const openTokenManagement = async (location: Location) => {
    setManagingLocation(location)
    setShowTokenManagement(true)
    setLoadingTokens(true)
    try {
      const result = await api.getLocationTokens(location.id)
      setLocationTokens(result.data || [])
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load tokens')
      setLocationTokens([])
    } finally {
      setLoadingTokens(false)
    }
  }

  const handleRevokeToken = async (tokenId: string) => {
    if (!managingLocation) return
    if (!confirm('Are you sure you want to revoke this token? Any devices using it will lose access.')) return

    setRevokingTokenId(tokenId)
    try {
      await api.revokeLocationToken(managingLocation.id, tokenId)
      setLocationTokens(prev => prev.filter(t => t.id !== tokenId))
      showToast('success', 'Token revoked successfully')
    } catch (err: any) {
      showToast('error', err.message || 'Failed to revoke token')
    } finally {
      setRevokingTokenId(null)
    }
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 ring-1 ring-danger-200 dark:ring-danger-800">
        <p className="text-danger-800 dark:text-danger-200">Failed to load locations. Make sure the API is running.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Protection Zones</h1>
          <p className="mt-1 text-space-500 dark:text-space-400">
            Manage network locations and their DNS filtering settings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={openCreateModal} leftIcon={<PlusIcon className="h-5 w-5" />}>
            Add Zone
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-space-400" />
          <input
            type="text"
            placeholder="Search zones by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-space-800 border border-space-200 dark:border-space-700 text-space-900 dark:text-white placeholder-space-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-white dark:bg-space-800 border border-space-200 dark:border-space-700 text-space-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <FunnelIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-space-400 pointer-events-none" />
          </div>

          {/* Policy Filter */}
          <div className="relative">
            <select
              value={policyFilter}
              onChange={(e) => setPolicyFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-white dark:bg-space-800 border border-space-200 dark:border-space-700 text-space-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="">All Policies</option>
              {policies.map((policy: any) => (
                <option key={policy.id} value={policy.id}>{policy.name}</option>
              ))}
            </select>
            <FunnelIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-space-400 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-') as ['name' | 'status' | 'createdAt', 'asc' | 'desc']
                setSortBy(newSortBy)
                setSortOrder(newSortOrder)
              }}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-white dark:bg-space-800 border border-space-200 dark:border-space-700 text-space-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="status-asc">Status A-Z</option>
              <option value="status-desc">Status Z-A</option>
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
            </select>
            <ArrowsUpDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-space-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Results count and bulk selection */}
      {!isLoading && locations.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Select All Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filteredLocations.length > 0 && selectedIds.size === filteredLocations.length}
                onChange={selectAll}
                className="h-4 w-4 rounded border-space-300 dark:border-space-600 text-primary-600 focus:ring-primary-500 dark:bg-space-800"
              />
              <span className="text-sm text-space-600 dark:text-space-400">
                Select All
              </span>
            </label>
            {selectedIds.size > 0 && (
              <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                {selectedIds.size} selected
              </span>
            )}
          </div>
          <div className="text-sm text-space-500 dark:text-space-400">
            Showing {filteredLocations.length} of {locations.length} zones
            {(searchQuery || statusFilter !== 'all' || policyFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                  setPolicyFilter('')
                }}
                className="ml-2 text-primary-600 dark:text-primary-400 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      ) : locations.length === 0 ? (
        <Card variant="glass" padding="lg" className="text-center">
          <div className="flex flex-col items-center py-8">
            <div className="p-4 rounded-2xl bg-primary-100 dark:bg-primary-900/30 mb-4">
              <GlobeAltIcon className="h-10 w-10 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">No locations yet</h3>
            <p className="mt-2 text-space-500 dark:text-space-400 max-w-sm">
              Add your first location to start filtering DNS traffic for your network.
            </p>
            <Button onClick={openCreateModal} className="mt-6" leftIcon={<PlusIcon className="h-5 w-5" />}>
              Add Location
            </Button>
          </div>
        </Card>
      ) : filteredLocations.length === 0 ? (
        <Card variant="glass" padding="lg" className="text-center">
          <div className="flex flex-col items-center py-8">
            <div className="p-4 rounded-2xl bg-space-100 dark:bg-space-800 mb-4">
              <MagnifyingGlassIcon className="h-10 w-10 text-space-400" />
            </div>
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">No matching zones</h3>
            <p className="mt-2 text-space-500 dark:text-space-400 max-w-sm">
              No zones match your current filters. Try adjusting your search or filters.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setPolicyFilter('')
              }}
              className="mt-6"
            >
              Clear Filters
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLocations.map((location) => (
            <Card
              key={location.id}
              variant="interactive"
              padding="none"
              className="group overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-4 relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(location.id)}
                      onChange={() => toggleSelection(location.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-space-300 dark:border-space-600 text-primary-600 focus:ring-primary-500 dark:bg-space-800 cursor-pointer"
                    />
                    <div className={clsx(
                      'p-3 rounded-xl',
                      location.status === 'active'
                        ? 'bg-success-100 dark:bg-success-900/30'
                        : 'bg-space-100 dark:bg-space-800'
                    )}>
                      <MapPinIcon className={clsx(
                        'h-6 w-6',
                        location.status === 'active'
                          ? 'text-success-600 dark:text-success-400'
                          : 'text-space-500 dark:text-space-400'
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-space-900 dark:text-white">{location.name}</h3>
                      <p className="text-sm text-space-500 dark:text-space-400 line-clamp-1">
                        {location.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={location.status === 'active' ? 'success' : 'neutral'}>
                    <span className="flex items-center gap-1">
                      <SignalIcon className="h-3 w-3" />
                      {location.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </Badge>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-space-500 dark:text-space-400">Policy</span>
                  <Badge variant="primary">
                    {policies.find(p => p.id === location.policyId)?.name || location.policyName || 'Default'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-space-500 dark:text-space-400">
                    {location.dyndns ? 'DynDNS' : 'IP Range'}
                  </span>
                  {location.ipRange ? (
                    <span className="font-mono text-xs text-space-600 dark:text-space-300">
                      {location.ipRange}
                    </span>
                  ) : location.dyndns ? (
                    <span className="font-mono text-xs text-space-600 dark:text-space-300">
                      {location.dyndns}
                    </span>
                  ) : (
                    <span className="text-xs text-space-400">Not set</span>
                  )}
                </div>

                {location.siteIpUpdatedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-space-500 dark:text-space-400">Site IP</span>
                    <span className="text-xs text-space-600 dark:text-space-300">
                      Updated by agent · {new Date(location.siteIpUpdatedAt).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Token Buttons */}
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => generateToken(location)}
                    leftIcon={<KeyIcon className="h-4 w-4" />}
                  >
                    Generate Token
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openTokenManagement(location)}
                    title="Manage Tokens"
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-4 py-3 flex items-center justify-end gap-1 border-t border-space-100 dark:border-space-700 bg-space-50/50 dark:bg-space-900/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(location)}
                  leftIcon={<PencilIcon className="h-4 w-4" />}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(location)}
                  className="text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                  leftIcon={<TrashIcon className="h-4 w-4" />}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Zone Editor Modal */}
      <ZoneEditorModal
        isOpen={showZoneEditor}
        onClose={() => {
          setShowZoneEditor(false)
          setEditingLocation(null)
        }}
        onSave={handleSave}
        initialData={getInitialFormData()}
        policies={policies}
        isEditing={!!editingLocation}
        isSaving={saving}
      />

      {/* Token Modal - Redesigned */}
      <Modal
        isOpen={showTokenModal && !!generatedToken}
        onClose={() => setShowTokenModal(false)}
        size="lg"
      >
        {/* Header with icon */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-shrink-0 p-3 rounded-2xl bg-gradient-to-br from-nebula-500/20 to-cosmic-500/20 ring-1 ring-nebula-500/30">
            <KeyIcon className="h-8 w-8 text-nebula-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-space-900 dark:text-white">
              DoH Access Token
            </h2>
            <p className="text-sm text-space-500 dark:text-space-400">
              {editingLocation?.name}
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-warning-500/10 to-orange-500/10 ring-1 ring-warning-500/30 mb-6">
          <div className="flex-shrink-0 p-1.5 rounded-lg bg-warning-500/20">
            <svg className="h-5 w-5 text-warning-600 dark:text-warning-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-warning-800 dark:text-warning-200 text-sm">
              Save this token now
            </p>
            <p className="text-sm text-warning-700/80 dark:text-warning-300/80 mt-0.5">
              This token will only be shown once and cannot be retrieved later.
            </p>
          </div>
        </div>

        {/* Token Display Card */}
        <div className="rounded-xl bg-space-100 dark:bg-space-900 p-4 ring-1 ring-space-200 dark:ring-space-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-space-500 dark:text-space-400 uppercase tracking-wider">
              Access Token
            </span>
            {generatedToken?.expiresAt && (
              <span className="flex items-center gap-1 text-xs text-space-500 dark:text-space-400">
                <ClockIcon className="h-3.5 w-3.5" />
                Expires {new Date(generatedToken.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-sm text-nebula-600 dark:text-nebula-400 break-all select-all leading-relaxed">
              {generatedToken?.token}
            </code>
            <button
              onClick={copyToken}
              className={clsx(
                'flex-shrink-0 p-2.5 rounded-lg transition-all duration-200',
                copiedToken
                  ? 'bg-success-500 text-white scale-95'
                  : 'bg-space-200 dark:bg-space-700 hover:bg-space-300 dark:hover:bg-space-600 text-space-600 dark:text-space-300 hover:text-space-900 dark:hover:text-white'
              )}
              title={copiedToken ? 'Copied!' : 'Copy to clipboard'}
            >
              {copiedToken ? (
                <CheckIcon className="h-5 w-5" />
              ) : (
                <ClipboardDocumentIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {copiedToken && (
            <p className="mt-2 text-xs text-success-400 flex items-center gap-1">
              <CheckIcon className="h-3.5 w-3.5" />
              Token copied to clipboard
            </p>
          )}
        </div>

        {/* Usage Instructions */}
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-space-700 dark:text-space-300 flex items-center gap-2">
            <DocumentTextIcon className="h-4 w-4" />
            How to use this token
          </h3>

          {/* DoH Endpoint */}
          <div className="rounded-xl bg-space-50 dark:bg-space-800/50 p-4 ring-1 ring-space-200 dark:ring-space-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-space-500 dark:text-space-400 uppercase tracking-wider">
                DoH Endpoint URL
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://${DNS1_HOST}/dns-query?token=${generatedToken?.token}`)
                  showToast('success', 'Endpoint URL copied')
                }}
                className="text-xs text-nebula-500 hover:text-nebula-400 font-medium flex items-center gap-1"
              >
                <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                Copy URL
              </button>
            </div>
            <code className="text-sm font-mono text-space-800 dark:text-space-200 break-all block">
              https://${DNS1_HOST}/dns-query?token=<span className="text-nebula-500">{generatedToken?.token.substring(0, 16)}...</span>
            </code>
          </div>

          {/* Browser/OS Setup hint */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-accent-50 dark:bg-accent-900/20 ring-1 ring-accent-200 dark:ring-accent-800">
            <GlobeAltIcon className="h-5 w-5 text-accent-600 dark:text-accent-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-accent-800 dark:text-accent-200">
              <p className="font-medium">Configure your devices</p>
              <p className="text-accent-700 dark:text-accent-300 mt-0.5">
                Use this endpoint in your browser, OS, or router&apos;s DNS-over-HTTPS settings.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-between pt-4 border-t border-space-200 dark:border-space-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const text = `DoH Token: ${generatedToken?.token}\nEndpoint: https://${DNS1_HOST}/dns-query?token=${generatedToken?.token}`
              navigator.clipboard.writeText(text)
              showToast('success', 'All details copied')
            }}
          >
            <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
            Copy All Details
          </Button>
          <Button onClick={() => setShowTokenModal(false)}>
            Done
          </Button>
        </div>
      </Modal>

      {/* Token Management Modal */}
      <Modal
        isOpen={showTokenManagement}
        onClose={() => {
          setShowTokenManagement(false)
          setManagingLocation(null)
          setLocationTokens([])
        }}
        size="lg"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-shrink-0 p-3 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 ring-1 ring-primary-500/30">
            <DocumentTextIcon className="h-8 w-8 text-primary-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-space-900 dark:text-white">
              Manage Tokens
            </h2>
            <p className="text-sm text-space-500 dark:text-space-400">
              {managingLocation?.name}
            </p>
          </div>
        </div>

        {loadingTokens ? (
          <div className="py-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-space-500 dark:text-space-400">Loading tokens...</p>
          </div>
        ) : locationTokens.length === 0 ? (
          <div className="py-8 text-center">
            <div className="p-4 rounded-2xl bg-space-100 dark:bg-space-800 inline-block mb-4">
              <KeyIcon className="h-8 w-8 text-space-400" />
            </div>
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">No active tokens</h3>
            <p className="mt-2 text-sm text-space-500 dark:text-space-400">
              Generate a new token to enable DoH access for this location.
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                setShowTokenManagement(false)
                if (managingLocation) generateToken(managingLocation)
              }}
              leftIcon={<KeyIcon className="h-4 w-4" />}
            >
              Generate Token
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {locationTokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between p-4 rounded-xl bg-space-50 dark:bg-space-800 ring-1 ring-space-200 dark:ring-space-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-space-900 dark:text-white truncate">
                      {token.label || 'Unnamed Token'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-space-500 dark:text-space-400">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="h-3.5 w-3.5" />
                      Created {new Date(token.createdAt).toLocaleDateString()}
                    </span>
                    {token.expiresAt && (
                      <span className="flex items-center gap-1">
                        Expires {new Date(token.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                    {token.lastUsedAt && (
                      <span>
                        Last used {new Date(token.lastUsedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRevokeToken(token.id)}
                  disabled={revokingTokenId === token.id}
                  leftIcon={<TrashIcon className="h-4 w-4" />}
                >
                  {revokingTokenId === token.id ? 'Revoking...' : 'Revoke'}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-between pt-4 border-t border-space-200 dark:border-space-700">
          {locationTokens.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                setShowTokenManagement(false)
                if (managingLocation) generateToken(managingLocation)
              }}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Generate New Token
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              setShowTokenManagement(false)
              setManagingLocation(null)
              setLocationTokens([])
            }}
            className={locationTokens.length === 0 ? 'ml-auto' : ''}
          >
            Close
          </Button>
        </div>
      </Modal>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-space-900 dark:bg-space-800 shadow-2xl ring-1 ring-space-700">
            <span className="text-sm font-medium text-white">
              {selectedIds.size} zone{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="h-4 w-px bg-space-600" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-space-300 hover:text-white hover:bg-space-700"
            >
              Clear
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              leftIcon={<TrashIcon className="h-4 w-4" />}
            >
              {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
