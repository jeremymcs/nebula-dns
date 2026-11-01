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
      <div className="grid gap-6">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl bg-space-100 dark:bg-space-800/50 h-32"
          />
        ))}
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={<BuildingOffice2Icon className="w-16 h-16 text-space-300 dark:text-space-600" />}
        title="No Clients Yet"
        description="Create your first client organization to get started with multi-tenant management."
        action={
          <Button
            variant="primary"
            size="lg"
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
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="max-w-2xl">
        <SearchInput
          placeholder="Search clients by name, slug, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 text-base"
        />
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <EmptyState
          icon={<MagnifyingGlassIcon className="w-16 h-16 text-space-300 dark:text-space-600" />}
          title="No Matching Clients"
          description={`No results found for "${searchQuery}". Try adjusting your search query.`}
        />
      ) : (
        <div className="grid gap-6">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              onClick={() => handleSwitchToClient(client)}
              className="card bg-white dark:bg-space-900 rounded-2xl p-6 ring-1 ring-space-200 dark:ring-space-800 hover:ring-2 hover:ring-primary-500/50 dark:hover:ring-primary-400/50 hover:shadow-xl transition-all cursor-pointer group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-110 transition-transform duration-300">
                      <BuildingOffice2Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-space-900 dark:text-white truncate">
                          {client.name}
                        </h3>
                        <StatusBadge status={client.status === 'suspended' ? 'inactive' : client.status} />
                      </div>
                      <p className="text-sm font-medium text-space-500 dark:text-space-400 font-mono">
                        {client.slug}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-space-400 dark:text-space-500 uppercase tracking-widest">Locations</p>
                      <p className="text-lg font-black text-space-900 dark:text-white">
                        {client.locationCount || 0}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-space-400 dark:text-space-500 uppercase tracking-widest">Users</p>
                      <p className="text-lg font-black text-space-900 dark:text-white">
                        {client.userCount || 0}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-space-400 dark:text-space-500 uppercase tracking-widest">Created</p>
                      <p className="text-sm font-bold text-space-700 dark:text-space-300">
                        {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {client.plan && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-space-400 dark:text-space-500 uppercase tracking-widest">Plan</p>
                        <Badge variant="accent" className="font-bold uppercase tracking-wide text-[10px]">
                          {client.plan}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch lg:items-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-space-100 dark:border-space-800">
                  <Link href={`/dashboard/clients/${client.id}`} onClick={(e) => e.stopPropagation()}>
                    <Button variant="secondary" size="md" className="w-full">
                      View Details
                    </Button>
                  </Link>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full shadow-lg shadow-primary-500/20"
                    rightIcon={<ArrowRightIcon className="w-4 h-4" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSwitchToClient(client);
                    }}
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
      <div className="flex items-center justify-between px-6 py-4 rounded-2xl bg-space-100/50 dark:bg-space-900/50 border border-space-200 dark:border-space-800">
        <p className="text-xs font-bold text-space-500 dark:text-space-400 uppercase tracking-widest">
          Showing {filteredClients.length} of {clients.length} client{clients.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
