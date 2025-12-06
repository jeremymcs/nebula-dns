/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Custom Lists Management Page
 */

'use client'

import { useState } from 'react'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ListBulletIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface CustomList {
  id: string
  name: string
  description: string
  type: 'allowlist' | 'blocklist'
  entryCount: number
  isEnabled: boolean
  updatedAt: string
}

const mockLists: CustomList[] = [
  {
    id: '1',
    name: 'Corporate Blocklist',
    description: 'Additional domains blocked by policy',
    type: 'blocklist',
    entryCount: 156,
    isEnabled: true,
    updatedAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Approved Exceptions',
    description: 'Domains explicitly allowed',
    type: 'allowlist',
    entryCount: 23,
    isEnabled: true,
    updatedAt: '2024-01-12',
  },
  {
    id: '3',
    name: 'Marketing Tools',
    description: 'Allow marketing analytics domains',
    type: 'allowlist',
    entryCount: 45,
    isEnabled: true,
    updatedAt: '2024-01-10',
  },
  {
    id: '4',
    name: 'Legacy Blocklist',
    description: 'Old blocklist - disabled',
    type: 'blocklist',
    entryCount: 89,
    isEnabled: false,
    updatedAt: '2023-12-01',
  },
]

export default function ListsPage() {
  const [lists] = useState<CustomList[]>(mockLists)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedList, setSelectedList] = useState<CustomList | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'allowlist' | 'blocklist'>('all')

  const filteredLists = activeTab === 'all' 
    ? lists 
    : lists.filter(l => l.type === activeTab)

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Custom Lists</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage allowlists and blocklists for custom domain filtering
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create List
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'all', name: 'All Lists' },
            { id: 'allowlist', name: 'Allowlists' },
            { id: 'blocklist', name: 'Blocklists' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredLists.map((list) => (
          <div 
            key={list.id} 
            className={`card p-6 cursor-pointer hover:shadow-md transition-shadow ${
              !list.isEnabled ? 'opacity-60' : ''
            }`}
            onClick={() => setSelectedList(list)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  list.type === 'allowlist' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {list.type === 'allowlist' ? (
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircleIcon className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">{list.name}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    list.type === 'allowlist' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {list.type === 'allowlist' ? 'Allowlist' : 'Blocklist'}
                  </span>
                </div>
              </div>
              {!list.isEnabled && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  Disabled
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-gray-500">{list.description}</p>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-500">
                <ListBulletIcon className="h-5 w-5 mr-1" />
                {list.entryCount} entries
              </div>
              <span className="text-xs text-gray-400">Updated {list.updatedAt}</span>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
              <button 
                className="p-1 text-gray-400 hover:text-gray-600"
                onClick={(e) => { e.stopPropagation(); }}
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button 
                className="p-1 text-gray-400 hover:text-red-600"
                onClick={(e) => { e.stopPropagation(); }}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* List Details Modal */}
      {selectedList && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setSelectedList(null)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{selectedList.name}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedList.type === 'allowlist' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedList.type === 'allowlist' ? 'Allowlist' : 'Blocklist'}
                </span>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">{selectedList.description}</p>

              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Add Domain</label>
                </div>
                <div className="mt-1 flex">
                  <input type="text" className="input flex-1" placeholder="example.com" />
                  <button className="btn-primary ml-2">Add</button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <span className="text-sm font-medium text-gray-700">Domains ({selectedList.entryCount})</span>
                </div>
                <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                  {['example.com', 'test.domain.net', 'blocked-site.org', 'another-domain.io'].map((domain) => (
                    <div key={domain} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
                      <span className="text-sm text-gray-900 font-mono">{domain}</span>
                      <button className="text-gray-400 hover:text-red-600">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button className="btn-secondary" onClick={() => setSelectedList(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New List</h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">List Name</label>
                  <input type="text" className="input mt-1" placeholder="Enter list name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input type="text" className="input mt-1" placeholder="Brief description" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">List Type</label>
                  <select className="input mt-1">
                    <option value="blocklist">Blocklist</option>
                    <option value="allowlist">Allowlist</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create List
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

