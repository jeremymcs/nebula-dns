/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Locations Management Page
 */

'use client'

import { useState } from 'react'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MapPinIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

interface Location {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive'
  policyName: string
  ipRange: string | null
  queriesLast24h: number
  blockedLast24h: number
  createdAt: string
}

const mockLocations: Location[] = [
  {
    id: '1',
    name: 'Main Office',
    description: 'Primary office network',
    status: 'active',
    policyName: 'Default Security Policy',
    ipRange: '192.168.1.0/24',
    queriesLast24h: 75000,
    blockedLast24h: 3000,
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'Branch Office',
    description: 'Remote branch location',
    status: 'active',
    policyName: 'Default Security Policy',
    ipRange: '10.0.0.0/16',
    queriesLast24h: 35000,
    blockedLast24h: 1500,
    createdAt: '2024-01-05',
  },
  {
    id: '3',
    name: 'Remote Workers',
    description: 'DoH endpoint for remote employees',
    status: 'active',
    policyName: 'Strict Policy',
    ipRange: null,
    queriesLast24h: 15000,
    blockedLast24h: 500,
    createdAt: '2024-01-10',
  },
]

export default function LocationsPage() {
  const [locations] = useState<Location[]>(mockLocations)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const copyToken = (locationId: string) => {
    navigator.clipboard.writeText(`doh-token-${locationId}-xxxx`)
    setCopiedToken(locationId)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Locations</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage network locations and their DNS filtering settings
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Location
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Policy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Queries (24h)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Blocked (24h)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DoH Token
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {locations.map((location) => (
                <tr key={location.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                        <MapPinIcon className="h-6 w-6 text-primary-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{location.name}</div>
                        <div className="text-sm text-gray-500">{location.description}</div>
                        {location.ipRange && (
                          <div className="text-xs text-gray-400 font-mono">{location.ipRange}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      location.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {location.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.policyName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.queriesLast24h.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.blockedLast24h.toLocaleString()}
                    <span className="text-gray-500 ml-1">
                      ({((location.blockedLast24h / location.queriesLast24h) * 100).toFixed(1)}%)
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => copyToken(location.id)}
                      className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200"
                    >
                      {copiedToken === location.id ? (
                        <>
                          <CheckIcon className="h-4 w-4 mr-1 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                          Copy Token
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-red-600">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Location Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Location</h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location Name</label>
                  <input type="text" className="input mt-1" placeholder="e.g., Main Office" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input type="text" className="input mt-1" placeholder="Brief description" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">IP Range (optional)</label>
                  <input type="text" className="input mt-1" placeholder="e.g., 192.168.1.0/24" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Policy</label>
                  <select className="input mt-1">
                    <option>Default Security Policy</option>
                    <option>Strict Policy</option>
                    <option>Guest Network</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Location
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

