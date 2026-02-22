// Nebula DNS - MSP Clients List Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { SearchInput } from '@/components/ui/Input'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useClientContext } from '@/hooks/useClientContext'
import {
  BuildingOffice2Icon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { MspClient } from '@/hooks/useMspClients'
import { formatDistanceToNow } from 'date-fns'

interface ClientsListProps {
  clients: MspClient[]
  onCreateClick: () => void
  loading?: boolean
}

export function ClientsList({ clients, onCreateClick, loading }: ClientsListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { switchToClient } = useClientContext()

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients

    const query = searchQuery.toLowerCase()
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.slug.toLowerCase().includes(query) ||
        client.contactEmail?.toLowerCase().includes(query)
    )
  }, [clients, searchQuery])

  const handleSwitchToClient = (client: MspClient) => {
    switchToClient(client.id, client.name)
    // Reload to update context throughout the app
    window.location.href = '/dashboard'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl bg-space-100 dark:bg-space-800 h-24"
          />
        ))}
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={<BuildingOffice2Icon className="w-12 h-12" />}
        title="No Clients Yet"
        description="Create your first client organization to get started with multi-tenant management."
        action={
          <Button
            variant="primary"
            leftIcon={<PlusIcon className="w-5 h-5" />}
            onClick={onCreateClick}
          >
            Create Client
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SearchInput
            placeholder="Search clients by name, slug, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="primary"
          leftIcon={<PlusIcon className="w-5 h-5" />}
          onClick={onCreateClick}
        >
          Add Client
        </Button>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <EmptyState
          icon={<MagnifyingGlassIcon className="w-12 h-12" />}
          title="No Matching Clients"
          description="Try adjusting your search query to find what you're looking for."
        />
      ) : (
        <div className="grid gap-4">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="card hover:ring-2 hover:ring-primary-500/50 dark:hover:ring-primary-400/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                      <BuildingOffice2Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-space-900 dark:text-white truncate">
                        {client.name}
                      </h3>
                      <p className="text-sm text-space-500 dark:text-space-400">
                        {client.slug}
                      </p>
                    </div>
                    <StatusBadge status={client.status === 'suspended' ? 'inactive' : client.status} />
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-space-500 dark:text-space-400">Locations</p>
                      <p className="text-sm font-semibold text-space-900 dark:text-white">
                        {client.locationCount || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-space-500 dark:text-space-400">Users</p>
                      <p className="text-sm font-semibold text-space-900 dark:text-white">
                        {client.userCount || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-space-500 dark:text-space-400">Created</p>
                      <p className="text-sm font-semibold text-space-900 dark:text-white">
                        {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {client.plan && (
                    <div className="mt-3">
                      <Badge variant="accent" size="sm">
                        {client.plan}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-6">
                  <Link href={`/dashboard/clients/${client.id}`}>
                    <Button variant="secondary" size="sm">
                      View Details
                    </Button>
                  </Link>
                  <Button
                    variant="primary"
                    size="sm"
                    rightIcon={<ArrowRightIcon className="w-4 h-4" />}
                    onClick={() => handleSwitchToClient(client)}
                  >
                    Switch to Client
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Footer */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-space-100 dark:bg-space-800">
        <p className="text-sm text-space-600 dark:text-space-400">
          Showing {filteredClients.length} of {clients.length} client{clients.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
