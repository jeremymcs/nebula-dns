// Nebula DNS - MSP Clients Hooks
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'

export interface MspClient {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended' | 'pending'
  plan: string
  locationCount: number
  userCount: number
  createdAt: string
  contactEmail?: string
  contactPhone?: string
  industry?: string
  companySize?: string
}

export interface CreateClientData {
  name: string
  adminEmail: string
  adminName?: string
  initialLocation?: {
    name: string
    type: string
  }
  applyTemplateId?: string
  contactEmail?: string
  contactPhone?: string
  industry?: string
  companySize?: string
}

export interface ClientDetailStats {
  totalQueries: number
  blockedQueries: number
  threatCount: number
  uptime: number
  locations: any[]
  policies: any[]
  users: any[]
}

export function useMspClients() {
  const [clients, setClients] = useState<MspClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.getMspClients()
      setClients(response.clients || [])
    } catch (err: any) {
      logger.error('Failed to fetch MSP clients:', err)
      setError(err.message || 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const createClient = async (data: CreateClientData) => {
    const response = await api.createMspClient({
      name: data.name,
      contactEmail: data.adminEmail,
      contactPhone: data.contactPhone,
      industry: data.industry,
      companySize: data.companySize,
    })

    // Refresh the clients list
    await fetchClients()

    return response
  }

  const updateClient = async (id: string, data: Partial<MspClient>) => {
    const response = await api.updateMspClient(id, data)

    // Update local state
    setClients(prev => prev.map(client =>
      client.id === id ? { ...client, ...data } : client
    ))

    return response
  }

  const deleteClient = async (id: string) => {
    await api.deleteMspClient(id)

    // Remove from local state
    setClients(prev => prev.filter(client => client.id !== id))
  }

  return {
    clients,
    loading,
    error,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
  }
}

export function useMspClient(clientId: string) {
  const [client, setClient] = useState<MspClient | null>(null)
  const [stats, setStats] = useState<ClientDetailStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [clientData, statsData] = await Promise.all([
        api.getMspClient(clientId),
        api.getClientStats(clientId),
      ])

      setClient(clientData)
      setStats(statsData)
    } catch (err: any) {
      logger.error('Failed to fetch MSP client:', err)
      setError(err.message || 'Failed to load client')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    if (clientId) {
      fetchClient()
    }
  }, [clientId, fetchClient])

  return {
    client,
    stats,
    loading,
    error,
    refetch: fetchClient,
  }
}

export function useMspTemplates() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await api.getMspTemplates()
        setTemplates(response.templates || [])
      } catch (err: any) {
        logger.error('Failed to fetch MSP templates:', err)
        setError(err.message || 'Failed to load templates')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  return { templates, loading, error }
}
