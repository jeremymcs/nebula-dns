// Nebula DNS - MSP Clients Dashboard Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState } from 'react'
import { ClientsList } from '@/components/msp/ClientsList'
import { CreateClientModal } from '@/components/msp/CreateClientModal'
import { useMspClients } from '@/hooks/useMspClients'
import { useAuth } from '@/contexts/AuthContext'
import { BuildingOffice2Icon } from '@heroicons/react/24/outline'
import { Badge } from '@/components/ui/Badge'

export default function ClientsPage() {
  const { isMsp, user } = useAuth()
  const { clients, loading, createClient } = useMspClients()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Show access denied if not MSP
  if (!loading && !isMsp) {
    return (
      <div className="text-center py-12">
        <BuildingOffice2Icon className="mx-auto h-12 w-12 text-space-400 dark:text-space-500" />
        <h3 className="mt-4 text-sm font-semibold text-space-900 dark:text-white">
          Access Denied
        </h3>
        <p className="mt-2 text-sm text-space-500 dark:text-space-400">
          This feature is only available for MSP tier accounts.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-space-900 dark:text-white">Clients</h1>
            <p className="mt-1 text-sm text-space-500 dark:text-space-400">
              Manage your client organizations and their configurations
            </p>
          </div>
          <Badge variant="primary" size="sm">
            MSP
          </Badge>
        </div>

        {/* Client Limit Indicator */}
        {!loading && (
          <div className="card bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-space-900 dark:text-white">
                  Client Capacity
                </p>
                <p className="text-xs text-space-600 dark:text-space-400 mt-1">
                  Using {clients.length} of unlimited clients
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-2xl font-bold text-space-900 dark:text-white">
                    {clients.length}
                  </p>
                  <p className="text-xs text-space-500 dark:text-space-400">Active Clients</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clients List */}
        <ClientsList
          clients={clients}
          loading={loading}
          onCreateClick={() => setIsCreateModalOpen(true)}
        />
      </div>

      {/* Create Client Modal */}
      <CreateClientModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateClient={createClient}
        onClientCreated={(client) => {
          console.log('Client created:', client)
        }}
      />
    </>
  )
}
