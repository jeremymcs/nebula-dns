/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Policies Management Page
 */

'use client'

import { useState } from 'react'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ShieldCheckIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface Policy {
  id: string
  name: string
  description: string
  locations: number
  categories: string[]
  threatProtection: boolean
  safeSearch: boolean
  isDefault: boolean
  updatedAt: string
}

const mockPolicies: Policy[] = [
  {
    id: '1',
    name: 'Default Security Policy',
    description: 'Standard security policy for new locations',
    locations: 2,
    categories: ['Malware', 'Phishing', 'C2', 'Adult'],
    threatProtection: true,
    safeSearch: false,
    isDefault: true,
    updatedAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Strict Policy',
    description: 'Maximum protection with content filtering',
    locations: 1,
    categories: ['Malware', 'Phishing', 'C2', 'Adult', 'Social Media', 'Gambling', 'Streaming'],
    threatProtection: true,
    safeSearch: true,
    isDefault: false,
    updatedAt: '2024-01-10',
  },
  {
    id: '3',
    name: 'Guest Network',
    description: 'Basic protection for guest users',
    locations: 0,
    categories: ['Malware', 'Phishing'],
    threatProtection: true,
    safeSearch: false,
    isDefault: false,
    updatedAt: '2024-01-05',
  },
]

export default function PoliciesPage() {
  const [policies] = useState<Policy[]>(mockPolicies)
  const [showCreateModal, setShowCreateModal] = useState(false)

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
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Policy
          </button>
        </div>
      </div>

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
                <p className="mt-1 text-sm text-gray-500">{policy.description}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Locations</span>
                <span className="font-medium text-gray-900">{policy.locations}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Threat Protection</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  policy.threatProtection ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {policy.threatProtection ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">SafeSearch</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  policy.safeSearch ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {policy.safeSearch ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div>
                <span className="text-sm text-gray-500">Blocked Categories</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {policy.categories.slice(0, 3).map((cat) => (
                    <span key={cat} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {cat}
                    </span>
                  ))}
                  {policy.categories.length > 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      +{policy.categories.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <span className="text-xs text-gray-500">Updated {policy.updatedAt}</span>
              <div className="flex space-x-2">
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <EyeIcon className="h-5 w-5" />
                </button>
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <PencilIcon className="h-5 w-5" />
                </button>
                {!policy.isDefault && (
                  <button className="p-1 text-gray-400 hover:text-red-600">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Policy Modal would go here */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Policy</h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Policy Name</label>
                  <input type="text" className="input mt-1" placeholder="Enter policy name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea className="input mt-1" rows={3} placeholder="Enter description" />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Policy
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

