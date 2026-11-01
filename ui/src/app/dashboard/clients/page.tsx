// Nebula DNS - MSP Clients Dashboard Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState } from 'react'
import { ClientsList } from '@/components/msp/ClientsList'
import { CreateClientModal } from '@/components/msp/CreateClientModal'
import { useMspClients } from '@/hooks/useMspClients'
import { useAuth } from '@/contexts/AuthContext'
import { BuildingOffice2Icon, PlusIcon } from '@heroicons/react/24/outline'
import { Badge, Card, Button } from '@/components/ui'

export default function ClientsPage() {
  const { isMspTier, user } = useAuth()
  const { clients, loading, createClient } = useMspClients()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Show access denied if not MSP
  if (!loading && !isMspTier) {
    return (
      <div className="text-center py-20">
        <BuildingOffice2Icon className="mx-auto h-16 w-16 text-space-300 dark:text-space-600" />
        <h3 className="mt-6 text-xl font-bold text-space-900 dark:text-white">
          Access Denied
        </h3>
        <p className="mt-2 text-space-500 dark:text-space-400 max-w-sm mx-auto">
          This feature is only available for MSP tier accounts. Please contact support to upgrade your organization.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="pb-12 space-y-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-space-900 dark:text-white">Clients</h1>
              <Badge variant="primary" className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5">
                MSP
              </Badge>
            </div>
            <p className="text-lg text-space-500 dark:text-space-400">
              Manage your client organizations and their configurations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<PlusIcon className="w-5 h-5" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Add Client
            </Button>
          </div>
        </div>

        {/* Client Limit Indicator */}
        {!loading && (
          <Card 
            variant="glass" 
            padding="lg"
            className="relative overflow-hidden bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/10 dark:to-accent-900/10 border-primary-100 dark:border-primary-900/30"
          >
            {/* Decoration */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary-500/5 rounded-full blur-2xl" />
            
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <BuildingOffice2Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-space-900 dark:text-white">
                    Client Capacity
                  </h3>
                  <p className="text-sm font-medium text-space-600 dark:text-space-400 mt-0.5">
                    Using <span className="text-primary-600 dark:text-primary-400 font-bold">{clients.length}</span> of unlimited client slots
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 px-6 py-3 bg-white/50 dark:bg-space-900/50 rounded-2xl border border-white/20 dark:border-white/5 shadow-inner">
                <div className="text-right">
                  <p className="text-3xl font-black text-space-900 dark:text-white tracking-tighter">
                    {clients.length}
                  </p>
                  <p className="text-[10px] font-bold text-space-400 dark:text-space-500 uppercase tracking-widest">Active Clients</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Clients List */}
        <div className="space-y-6">
          <ClientsList
            clients={clients}
            loading={loading}
            onCreateClick={() => setIsCreateModalOpen(true)}
          />
        </div>
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
