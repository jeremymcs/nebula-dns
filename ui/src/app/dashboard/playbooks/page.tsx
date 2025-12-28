/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Playbooks - Incident Response Automation
 */

'use client'

import { useState } from 'react'
import {
  PlaybookList,
  PlaybookBuilder,
  Playbook,
  generateDemoPlaybooks,
} from '@/components/playbooks'
import { BoltIcon, PlusIcon } from '@heroicons/react/24/outline'

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>(generateDemoPlaybooks())
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | undefined>()

  const handleToggle = (id: string, enabled: boolean) => {
    setPlaybooks(playbooks.map((p) => (p.id === id ? { ...p, isEnabled: enabled } : p)))
  }

  const handleEdit = (playbook: Playbook) => {
    setEditingPlaybook(playbook)
    setIsBuilderOpen(true)
  }

  const handleRun = (_playbook: Playbook) => {
    // TODO: Implement manual playbook execution via API
  }

  const handleSave = (data: Partial<Playbook>) => {
    if (editingPlaybook) {
      setPlaybooks(playbooks.map((p) => (p.id === editingPlaybook.id ? { ...p, ...data } : p)))
    } else {
      const newPlaybook: Playbook = {
        id: `pb-${Date.now()}`,
        name: data.name || 'New Playbook',
        description: data.description || '',
        trigger: { type: 'manual', conditions: [] },
        steps: data.steps || [],
        isEnabled: false,
        isBuiltIn: false,
        triggerCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setPlaybooks([...playbooks, newPlaybook])
    }
    setIsBuilderOpen(false)
    setEditingPlaybook(undefined)
  }

  const handleCancel = () => {
    setIsBuilderOpen(false)
    setEditingPlaybook(undefined)
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

