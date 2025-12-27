/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Playbook Builder - Visual playbook editor
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Playbook, PlaybookStep, PlaybookActionType } from './types'
import {
  PlusIcon,
  TrashIcon,
  ArrowDownIcon,
  BoltIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  TicketIcon,
  BellAlertIcon,
  GlobeAltIcon,
  ClockIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline'

interface PlaybookBuilderProps {
  playbook?: Playbook
  onSave: (playbook: Partial<Playbook>) => void
  onCancel: () => void
}

const ACTION_TYPES: Array<{
  type: PlaybookActionType
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = [
  { type: 'block_domain', name: 'Block Domain', icon: BoltIcon, description: 'Add domain to blocklist' },
  { type: 'block_ip', name: 'Block IP', icon: BoltIcon, description: 'Block source IP address' },
  { type: 'notify_email', name: 'Send Email', icon: EnvelopeIcon, description: 'Send email notification' },
  { type: 'notify_slack', name: 'Slack Alert', icon: ChatBubbleLeftIcon, description: 'Post to Slack channel' },
  { type: 'create_ticket', name: 'Create Ticket', icon: TicketIcon, description: 'Create incident ticket' },
  { type: 'pagerduty_alert', name: 'PagerDuty', icon: BellAlertIcon, description: 'Trigger PagerDuty alert' },
  { type: 'webhook', name: 'Webhook', icon: GlobeAltIcon, description: 'Call external webhook' },
  { type: 'wait', name: 'Wait', icon: ClockIcon, description: 'Pause execution' },
  { type: 'log', name: 'Log Event', icon: CodeBracketIcon, description: 'Log to audit trail' },
]

export function PlaybookBuilder({ playbook, onSave, onCancel }: PlaybookBuilderProps) {
  const [name, setName] = useState(playbook?.name || '')
  const [description, setDescription] = useState(playbook?.description || '')
  const [steps, setSteps] = useState<PlaybookStep[]>(playbook?.steps || [])
  const [showActionPicker, setShowActionPicker] = useState(false)

  const addStep = (type: PlaybookActionType) => {
    const actionInfo = ACTION_TYPES.find((a) => a.type === type)
    const newStep: PlaybookStep = {
      id: `step-${Date.now()}`,
      type,
      name: actionInfo?.name || type,
      config: {},
    }
    setSteps([...steps, newStep])
    setShowActionPicker(false)
  }

  const removeStep = (stepId: string) => {
    setSteps(steps.filter((s) => s.id !== stepId))
  }

  const handleSave = () => {
    onSave({
      ...playbook,
      name,
      description,
      steps,
    })
  }

  return (
    <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-space-200 dark:border-space-700">
        <h2 className="text-lg font-semibold text-space-900 dark:text-white">
          {playbook ? 'Edit Playbook' : 'Create Playbook'}
        </h2>
      </div>

      {/* Form */}
      <div className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Ransomware Response"
            className="w-full px-4 py-2 rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 text-space-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this playbook does..."
            rows={2}
            className="w-full px-4 py-2 rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 text-space-900 dark:text-white"
          />
        </div>

        {/* Steps */}
        <div>
          <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Steps</label>
          <div className="space-y-2">
            {steps.map((step, index) => {
              const actionInfo = ACTION_TYPES.find((a) => a.type === step.type)
              const Icon = actionInfo?.icon || BoltIcon
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 bg-space-50 dark:bg-space-900 rounded-lg"
                >
                  <span className="w-6 h-6 rounded-full bg-nebula-500 text-white text-xs flex items-center justify-center">
                    {index + 1}
                  </span>
                  <Icon className="h-5 w-5 text-space-500" />
                  <span className="flex-1 text-space-900 dark:text-white">{step.name}</span>
                  <button onClick={() => removeStep(step.id)} className="p-1 hover:bg-space-200 dark:hover:bg-space-700 rounded">
                    <TrashIcon className="h-4 w-4 text-red-500" />
                  </button>
                </motion.div>
              )
            })}
          </div>

          {/* Add step button */}
          <button
            onClick={() => setShowActionPicker(!showActionPicker)}
            className="mt-3 w-full p-3 border-2 border-dashed border-space-300 dark:border-space-600 rounded-lg text-space-500 hover:border-nebula-500 hover:text-nebula-500 transition-colors flex items-center justify-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add Step
          </button>

          {/* Action picker */}
          {showActionPicker && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 grid grid-cols-3 gap-2">
              {ACTION_TYPES.map((action) => (
                <button
                  key={action.type}
                  onClick={() => addStep(action.type)}
                  className="p-3 bg-space-50 dark:bg-space-900 rounded-lg hover:bg-nebula-50 dark:hover:bg-nebula-900/20 text-left"
                >
                  <action.icon className="h-5 w-5 text-nebula-500 mb-1" />
                  <p className="text-sm font-medium text-space-900 dark:text-white">{action.name}</p>
                  <p className="text-xs text-space-500">{action.description}</p>
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-space-200 dark:border-space-700 bg-space-50 dark:bg-space-900 flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-space-600 dark:text-space-400 hover:bg-space-100 dark:hover:bg-space-800 rounded-lg">
          Cancel
        </button>
        <button onClick={handleSave} disabled={!name || steps.length === 0} className="px-4 py-2 bg-nebula-500 text-white rounded-lg hover:bg-nebula-600 disabled:opacity-50">
          Save Playbook
        </button>
      </div>
    </div>
  )
}

