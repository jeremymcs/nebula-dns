/**
 * Nebula DNS - MSP Global Templates Page
 * Allows MSP users to manage policy and list templates for all clients
 */

'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/Toast'
import {
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  ListBulletIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  BuildingOffice2Icon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
  NoSymbolIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

// Template types
interface PolicyTemplate {
  id: string
  name: string
  description: string
  categories: string[]
  safeSearch: boolean
  blockAds: boolean
  blockMalware: boolean
  createdAt: string
  deployedTo: number
}

interface ListTemplate {
  id: string
  name: string
  description: string
  type: 'allowlist' | 'blocklist'
  entries: number
  createdAt: string
  deployedTo: number
}

interface Client {
  id: string
  name: string
  slug: string
}

// Mock data - replace with API calls
const mockPolicyTemplates: PolicyTemplate[] = [
  {
    id: '1',
    name: 'K-12 Education',
    description: 'CIPA compliant filtering for schools',
    categories: ['adult', 'gambling', 'social-media', 'gaming'],
    safeSearch: true,
    blockAds: true,
    blockMalware: true,
    createdAt: '2024-01-15',
    deployedTo: 5,
  },
  {
    id: '2',
    name: 'Healthcare Secure',
    description: 'HIPAA compliant DNS security',
    categories: ['malware', 'phishing', 'cryptomining'],
    safeSearch: false,
    blockAds: false,
    blockMalware: true,
    createdAt: '2024-01-20',
    deployedTo: 3,
  },
  {
    id: '3',
    name: 'Small Business Standard',
    description: 'Balanced security for SMBs',
    categories: ['adult', 'malware', 'phishing'],
    safeSearch: true,
    blockAds: true,
    blockMalware: true,
    createdAt: '2024-02-01',
    deployedTo: 8,
  },
]

const mockListTemplates: ListTemplate[] = [
  {
    id: '1',
    name: 'Productivity Blocklist',
    description: 'Block social media and streaming during work hours',
    type: 'blocklist',
    entries: 150,
    createdAt: '2024-01-10',
    deployedTo: 6,
  },
  {
    id: '2',
    name: 'Internal Tools Allowlist',
    description: 'Allow access to common business tools',
    type: 'allowlist',
    entries: 45,
    createdAt: '2024-01-12',
    deployedTo: 10,
  },
]

export default function MspTemplatesPage() {
  const { isMsp, organizations } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<'policies' | 'lists'>('policies')
  const [policyTemplates, setPolicyTemplates] = useState<PolicyTemplate[]>(mockPolicyTemplates)
  const [listTemplates, setListTemplates] = useState<ListTemplate[]>(mockListTemplates)
  const [search, setSearch] = useState('')
  const [deployModal, setDeployModal] = useState<{ type: 'policy' | 'list'; template: PolicyTemplate | ListTemplate } | null>(null)
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [deploying, setDeploying] = useState(false)
  const [createModal, setCreateModal] = useState<'policy' | 'list' | null>(null)

  // Use organizations from auth context as clients
  const clients: Client[] = organizations.map(org => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
  }))

  // Filter templates based on search
  const filteredPolicies = policyTemplates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  )

  const filteredLists = listTemplates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  )

  const handleDeploy = async () => {
    if (!deployModal || selectedClients.length === 0) return
    setDeploying(true)

    try {
      // TODO: API call to deploy template to selected clients
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API call

      showToast('success', `Template deployed to ${selectedClients.length} client(s)`)
      setDeployModal(null)
      setSelectedClients([])
    } catch (err) {
      showToast('error', 'Failed to deploy template')
    } finally {
      setDeploying(false)
    }
  }

  const handleDelete = (type: 'policy' | 'list', id: string) => {
    if (type === 'policy') {
      setPolicyTemplates(prev => prev.filter(t => t.id !== id))
    } else {
      setListTemplates(prev => prev.filter(t => t.id !== id))
    }
    showToast('success', 'Template deleted')
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
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Global Templates</h1>
          <p className="text-space-500 dark:text-space-400">
            Create and deploy policy and list templates to all your clients
          </p>
        </div>
        <button
          onClick={() => setCreateModal(activeTab === 'policies' ? 'policy' : 'list')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25"
        >
          <PlusIcon className="h-5 w-5" />
          Create Template
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-space-100 dark:bg-space-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('policies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'policies'
              ? 'bg-white dark:bg-space-700 text-space-900 dark:text-white shadow-sm'
              : 'text-space-600 dark:text-space-400 hover:text-space-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheckIcon className="h-5 w-5" />
          Policy Templates ({policyTemplates.length})
        </button>
        <button
          onClick={() => setActiveTab('lists')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'lists'
              ? 'bg-white dark:bg-space-700 text-space-900 dark:text-white shadow-sm'
              : 'text-space-600 dark:text-space-400 hover:text-space-900 dark:hover:text-white'
          }`}
        >
          <ListBulletIcon className="h-5 w-5" />
          List Templates ({listTemplates.length})
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

      {/* Policy Templates */}
      {activeTab === 'policies' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPolicies.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-space-800 rounded-2xl">
              <ShieldCheckIcon className="h-12 w-12 text-space-300 mb-4" />
              <h3 className="text-lg font-medium text-space-900 dark:text-white mb-2">No policy templates</h3>
              <p className="text-space-500 dark:text-space-400 mb-4">Create your first policy template to deploy to clients</p>
              <button
                onClick={() => setCreateModal('policy')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Create Policy Template
              </button>
            </div>
          ) : (
            filteredPolicies.map((template) => (
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
                <p className="text-sm text-space-500 dark:text-space-400 mb-3">{template.description}</p>

                <div className="flex flex-wrap gap-1 mb-4">
                  {template.blockMalware && (
                    <span className="text-xs px-2 py-0.5 bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 rounded">
                      Malware
                    </span>
                  )}
                  {template.blockAds && (
                    <span className="text-xs px-2 py-0.5 bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 rounded">
                      Ads
                    </span>
                  )}
                  {template.safeSearch && (
                    <span className="text-xs px-2 py-0.5 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 rounded">
                      SafeSearch
                    </span>
                  )}
                  {template.categories.slice(0, 2).map((cat) => (
                    <span key={cat} className="text-xs px-2 py-0.5 bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-300 rounded">
                      {cat}
                    </span>
                  ))}
                  {template.categories.length > 2 && (
                    <span className="text-xs px-2 py-0.5 bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-300 rounded">
                      +{template.categories.length - 2}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDeployModal({ type: 'policy', template })}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    <ArrowUpTrayIcon className="h-4 w-4" />
                    Deploy
                  </button>
                  <button className="p-2 bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-300 rounded-xl hover:bg-space-200 dark:hover:bg-space-600 transition-colors">
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete('policy', template.id)}
                    className="p-2 bg-danger-50 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400 rounded-xl hover:bg-danger-100 dark:hover:bg-danger-900/50 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* List Templates */}
      {activeTab === 'lists' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLists.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-space-800 rounded-2xl">
              <ListBulletIcon className="h-12 w-12 text-space-300 mb-4" />
              <h3 className="text-lg font-medium text-space-900 dark:text-white mb-2">No list templates</h3>
              <p className="text-space-500 dark:text-space-400 mb-4">Create your first list template to deploy to clients</p>
              <button
                onClick={() => setCreateModal('list')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Create List Template
              </button>
            </div>
          ) : (
            filteredLists.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-space-800 rounded-2xl p-5 ring-1 ring-space-200 dark:ring-space-700 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    template.type === 'allowlist'
                      ? 'bg-gradient-to-br from-success-500 to-emerald-600'
                      : 'bg-gradient-to-br from-danger-500 to-rose-600'
                  }`}>
                    {template.type === 'allowlist' ? (
                      <GlobeAltIcon className="h-5 w-5 text-white" />
                    ) : (
                      <NoSymbolIcon className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                    {template.deployedTo} clients
                  </span>
                </div>

                <h3 className="font-semibold text-space-900 dark:text-white mb-1">{template.name}</h3>
                <p className="text-sm text-space-500 dark:text-space-400 mb-3">{template.description}</p>

                <div className="flex items-center gap-3 mb-4 text-sm">
                  <span className={`px-2 py-0.5 rounded ${
                    template.type === 'allowlist'
                      ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300'
                      : 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300'
                  }`}>
                    {template.type === 'allowlist' ? 'Allowlist' : 'Blocklist'}
                  </span>
                  <span className="text-space-500 dark:text-space-400">
                    {template.entries} entries
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDeployModal({ type: 'list', template })}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    <ArrowUpTrayIcon className="h-4 w-4" />
                    Deploy
                  </button>
                  <button className="p-2 bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-300 rounded-xl hover:bg-space-200 dark:hover:bg-space-600 transition-colors">
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete('list', template.id)}
                    className="p-2 bg-danger-50 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400 rounded-xl hover:bg-danger-100 dark:hover:bg-danger-900/50 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
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
                onClick={() => { setDeployModal(null); setSelectedClients([]); }}
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
                onClick={() => { setDeployModal(null); setSelectedClients([]); }}
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

      {/* Create Template Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-space-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-space-900 dark:text-white">
                Create {createModal === 'policy' ? 'Policy' : 'List'} Template
              </h3>
              <button
                onClick={() => setCreateModal(null)}
                className="p-2 rounded-lg hover:bg-space-100 dark:hover:bg-space-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-space-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  placeholder={createModal === 'policy' ? 'e.g., CIPA Compliant' : 'e.g., Social Media Block'}
                  className="w-full px-4 py-2.5 bg-white dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe what this template is for..."
                  className="w-full px-4 py-2.5 bg-white dark:bg-space-900 rounded-xl ring-1 ring-space-200 dark:ring-space-700 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="bg-space-50 dark:bg-space-900 rounded-xl p-4">
                <p className="text-sm text-space-600 dark:text-space-400">
                  <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                  Full template configuration will be available in the next update.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCreateModal(null)}
                className="flex-1 px-4 py-2.5 bg-space-100 dark:bg-space-700 text-space-700 dark:text-space-200 rounded-xl font-medium hover:bg-space-200 dark:hover:bg-space-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  showToast('info', 'Template creation coming soon')
                  setCreateModal(null)
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all"
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
