/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Playbooks - Incident Response Automation
 */

'use client'

import { useState, useEffect } from 'react'
import {
  PlaybookList,
  PlaybookBuilder,
  Playbook,
} from '@/components/playbooks'
import { usePlaybooks } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { BoltIcon, PlusIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export default function PlaybooksPage() {
  const { data: playbooksData, error, isLoading, mutate } = usePlaybooks()
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | undefined>()

  // Sync with API data
  useEffect(() => {
    if (playbooksData?.data) {
      setPlaybooks(playbooksData.data)
    }
  }, [playbooksData])

  const handleToggle = async (id: string, enabled: boolean) => {
    // Optimistic update
    setPlaybooks(playbooks.map((p) => (p.id === id ? { ...p, isEnabled: enabled } : p)))
    try {
      await api.updatePlaybook(id, { isEnabled: enabled })
      mutate()
    } catch (err) {
      // Revert on error
      setPlaybooks(playbooks.map((p) => (p.id === id ? { ...p, isEnabled: !enabled } : p)))
    }
  }

  const handleEdit = (playbook: Playbook) => {
    setEditingPlaybook(playbook)
    setIsBuilderOpen(true)
  }

  const handleRun = async (playbook: Playbook) => {
    try {
      await api.runPlaybook(playbook.id)
    } catch (err) {
      console.error('Failed to run playbook:', err)
    }
  }

  const handleSave = async (data: Partial<Playbook>) => {
    try {
      if (editingPlaybook) {
        await api.updatePlaybook(editingPlaybook.id, data)
      } else {
        await api.createPlaybook({
          name: data.name || 'New Playbook',
          description: data.description || '',
          trigger: data.trigger || { type: 'manual', conditions: [] },
          steps: data.steps || [],
          isEnabled: false,
        })
      }
      mutate()
    } catch (err: any) {
      console.error('Failed to save playbook:', err?.message || err)
    }
    setIsBuilderOpen(false)
    setEditingPlaybook(undefined)
  }

  const handleCancel = () => {
    setIsBuilderOpen(false)
    setEditingPlaybook(undefined)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          <p className="text-space-500">Loading playbooks...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="p-4 rounded-full bg-danger-100 dark:bg-danger-900/30">
            <ExclamationTriangleIcon className="h-12 w-12 text-danger-500" />
          </div>
          <h2 className="text-xl font-semibold text-space-900 dark:text-white">Failed to Load Playbooks</h2>
          <p className="text-space-500">
            {error?.message || 'Unable to fetch playbooks. Please try again later.'}
          </p>
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
            <BoltIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-space-900 dark:text-white">Incident Playbooks</h1>
            <p className="text-space-500">Automated response workflows for security incidents</p>
          </div>
        </div>
        <button
          onClick={() => setIsBuilderOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-nebula-500 text-white rounded-lg hover:bg-nebula-600"
        >
          <PlusIcon className="h-5 w-5" />
          Create Playbook
        </button>
      </div>

      {/* Builder or List */}
      {isBuilderOpen ? (
        <PlaybookBuilder
          playbook={editingPlaybook}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <PlaybookList
          playbooks={playbooks}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onRun={handleRun}
        />
      )}
    </div>
  )
}

