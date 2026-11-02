/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Playbook Builder - Visual playbook editor
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { Playbook, PlaybookStep, PlaybookActionType, PlaybookTrigger, TriggerCondition } from './types'
import {
  PlusIcon,
  TrashIcon,
  BoltIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  TicketIcon,
  BellAlertIcon,
  GlobeAltIcon,
  ClockIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  XMarkIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  HandRaisedIcon,
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

const TRIGGER_TYPES: Array<{
  type: PlaybookTrigger['type']
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = [
  { type: 'manual', name: 'Manual', icon: HandRaisedIcon, description: 'Triggered manually by user' },
  { type: 'threat_detected', name: 'Threat Detected', icon: ExclamationTriangleIcon, description: 'When a threat is detected' },
  { type: 'threshold_exceeded', name: 'Threshold Exceeded', icon: ArrowPathIcon, description: 'When a metric exceeds threshold' },
  { type: 'pattern_match', name: 'Pattern Match', icon: MagnifyingGlassIcon, description: 'When pattern is matched' },
]

const TRIGGER_FIELDS = [
  { value: 'threat_type', label: 'Threat Type' },
  { value: 'dga_score', label: 'DGA Score' },
  { value: 'tunneling_score', label: 'Tunneling Score' },
  { value: 'phishing_blocks', label: 'Phishing Blocks' },
  { value: 'malware_blocks', label: 'Malware Blocks' },
  { value: 'query_count', label: 'Query Count' },
  { value: 'source_ip', label: 'Source IP' },
  { value: 'domain', label: 'Domain' },
]

const TRIGGER_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
  { value: 'matches', label: 'matches (regex)' },
]

export function PlaybookBuilder({ playbook, onSave, onCancel }: PlaybookBuilderProps) {
  const [name, setName] = useState(playbook?.name || '')
  const [description, setDescription] = useState(playbook?.description || '')
  const [steps, setSteps] = useState<PlaybookStep[]>(playbook?.steps || [])
  const [trigger, setTrigger] = useState<PlaybookTrigger>(
    playbook?.trigger || { type: 'manual', conditions: [] }
  )
  const [showActionPicker, setShowActionPicker] = useState(false)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [showTriggerConfig, setShowTriggerConfig] = useState(false)

  const addStep = (type: PlaybookActionType) => {
    const actionInfo = ACTION_TYPES.find((a) => a.type === type)
    const newStep: PlaybookStep = {
      id: `step-${Date.now()}`,
      type,
      name: actionInfo?.name || type,
      config: getDefaultConfig(type),
    }
    setSteps([...steps, newStep])
    setShowActionPicker(false)
    setSelectedStepId(newStep.id)
  }

  const removeStep = (stepId: string) => {
    setSteps(steps.filter((s) => s.id !== stepId))
    if (selectedStepId === stepId) setSelectedStepId(null)
  }

  const updateStepConfig = (stepId: string, config: Record<string, unknown>) => {
    setSteps(steps.map((s) => (s.id === stepId ? { ...s, config } : s)))
  }

  const updateStepName = (stepId: string, name: string) => {
    setSteps(steps.map((s) => (s.id === stepId ? { ...s, name } : s)))
  }

  const addTriggerCondition = () => {
    setTrigger({
      ...trigger,
      conditions: [...trigger.conditions, { field: 'threat_type', operator: 'equals', value: '' }],
    })
  }

  const updateTriggerCondition = (index: number, updates: Partial<TriggerCondition>) => {
    const newConditions = [...trigger.conditions]
    newConditions[index] = { ...newConditions[index], ...updates }
    setTrigger({ ...trigger, conditions: newConditions })
  }

  const removeTriggerCondition = (index: number) => {
    setTrigger({ ...trigger, conditions: trigger.conditions.filter((_, i) => i !== index) })
  }

  const handleSave = () => {
    onSave({
      ...playbook,
      name,
      description,
      steps,
      trigger,
    })
  }

  const selectedStep = steps.find((s) => s.id === selectedStepId)
  const selectedTriggerType = TRIGGER_TYPES.find((t) => t.type === trigger.type)

  function getDefaultConfig(type: PlaybookActionType): Record<string, unknown> {
    switch (type) {
      case 'block_domain':
        return { scope: 'all_zones', duration: '24h' }
      case 'block_ip':
        return { scope: 'all_zones', duration: '24h' }
      case 'notify_email':
        return { to: '', subject: 'Security Alert: {{threat_type}}', template: 'default' }
      case 'notify_slack':
        return { channel: '#security-alerts', message: '' }
      case 'create_ticket':
        return { system: 'jira', priority: 'high', title: 'Security Incident: {{threat_type}}' }
      case 'pagerduty_alert':
        return { severity: 'critical', service_key: '' }
      case 'webhook':
        return { url: '', method: 'POST', headers: {}, body: '' }
      case 'wait':
        return { duration: 60, unit: 'seconds' }
      case 'log':
        return { level: 'warning', message: '' }
      default:
        return {}
    }
  }

  return (
    <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-space-200 dark:border-space-700">
        <h2 className="text-lg font-semibold text-space-900 dark:text-white">
          {playbook ? 'Edit Playbook' : 'Create Playbook'}
        </h2>
      </div>

      <div className="flex">
        {/* Main Form */}
        <div className="flex-1 p-6 space-y-6">
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

          {/* Trigger Configuration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-space-700 dark:text-space-300">Trigger</label>
              <button
                onClick={() => setShowTriggerConfig(!showTriggerConfig)}
                className="text-xs text-primary-500 hover:text-primary-600"
              >
                {showTriggerConfig ? 'Hide Details' : 'Configure'}
              </button>
            </div>
            <div
              onClick={() => setShowTriggerConfig(!showTriggerConfig)}
              className="flex items-center gap-3 p-3 bg-space-50 dark:bg-space-900 rounded-lg cursor-pointer hover:bg-space-100 dark:hover:bg-space-800"
            >
              {selectedTriggerType && <selectedTriggerType.icon className="h-5 w-5 text-primary-500" />}
              <div className="flex-1">
                <p className="text-sm font-medium text-space-900 dark:text-white">{selectedTriggerType?.name}</p>
                <p className="text-xs text-space-500">{selectedTriggerType?.description}</p>
              </div>
              <ChevronDownIcon className={clsx('h-4 w-4 text-space-400 transition-transform', showTriggerConfig && 'rotate-180')} />
            </div>

            <AnimatePresence>
              {showTriggerConfig && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 p-4 bg-space-50 dark:bg-space-900 rounded-lg space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-space-500 mb-2">Trigger Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {TRIGGER_TYPES.map((t) => (
                          <button
                            key={t.type}
                            onClick={() => setTrigger({ ...trigger, type: t.type })}
                            className={clsx(
                              'p-2 rounded-lg text-left text-sm flex items-center gap-2',
                              trigger.type === t.type
                                ? 'bg-primary-500 text-white'
                                : 'bg-white dark:bg-space-800 text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-700'
                            )}
                          >
                            <t.icon className="h-4 w-4" />
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {trigger.type !== 'manual' && (
                      <div>
                        <label className="block text-xs font-medium text-space-500 mb-2">Conditions</label>
                        <div className="space-y-2">
                          {trigger.conditions.map((condition, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <select
                                value={condition.field}
                                onChange={(e) => updateTriggerCondition(index, { field: e.target.value })}
                                className="flex-1 px-2 py-1.5 text-sm rounded border border-space-200 dark:border-space-700 bg-white dark:bg-space-800 text-space-900 dark:text-white"
                              >
                                {TRIGGER_FIELDS.map((f) => (
                                  <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                              </select>
                              <select
                                value={condition.operator}
                                onChange={(e) => updateTriggerCondition(index, { operator: e.target.value as TriggerCondition['operator'] })}
                                className="px-2 py-1.5 text-sm rounded border border-space-200 dark:border-space-700 bg-white dark:bg-space-800 text-space-900 dark:text-white"
                              >
                                {TRIGGER_OPERATORS.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={String(condition.value)}
                                onChange={(e) => updateTriggerCondition(index, { value: e.target.value })}
                                placeholder="Value"
                                className="flex-1 px-2 py-1.5 text-sm rounded border border-space-200 dark:border-space-700 bg-white dark:bg-space-800 text-space-900 dark:text-white"
                              />
                              <button
                                onClick={() => removeTriggerCondition(index)}
                                className="p-1 hover:bg-space-200 dark:hover:bg-space-700 rounded"
                              >
                                <XMarkIcon className="h-4 w-4 text-danger-500" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={addTriggerCondition}
                            className="w-full p-2 border border-dashed border-space-300 dark:border-space-600 rounded text-sm text-space-500 hover:border-primary-500 hover:text-primary-500"
                          >
                            + Add Condition
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Steps */}
          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Steps</label>
            <div className="space-y-2">
              {steps.map((step, index) => {
                const actionInfo = ACTION_TYPES.find((a) => a.type === step.type)
                const Icon = actionInfo?.icon || BoltIcon
                const isSelected = selectedStepId === step.id
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setSelectedStepId(isSelected ? null : step.id)}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500'
                        : 'bg-space-50 dark:bg-space-900 border-2 border-transparent hover:border-space-200 dark:hover:border-space-700'
                    )}
                  >
                    <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                    <Icon className="h-5 w-5 text-space-500" />
                    <div className="flex-1">
                      <span className="text-space-900 dark:text-white">{step.name}</span>
                      {Object.keys(step.config).length > 0 && (
                        <p className="text-xs text-space-500 truncate">
                          {Object.entries(step.config)
                            .filter(([, v]) => v)
                            .slice(0, 2)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' • ')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedStepId(step.id)
                      }}
                      className="p-1 hover:bg-space-200 dark:hover:bg-space-700 rounded"
                    >
                      <Cog6ToothIcon className="h-4 w-4 text-space-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeStep(step.id)
                      }}
                      className="p-1 hover:bg-space-200 dark:hover:bg-space-700 rounded"
                    >
                      <TrashIcon className="h-4 w-4 text-danger-500" />
                    </button>
                  </motion.div>
                )
              })}
            </div>

            {/* Add step button */}
            <button
              onClick={() => setShowActionPicker(!showActionPicker)}
              className="mt-3 w-full p-3 border-2 border-dashed border-space-300 dark:border-space-600 rounded-lg text-space-500 hover:border-primary-500 hover:text-primary-500 transition-colors flex items-center justify-center gap-2"
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
                    className="p-3 bg-space-50 dark:bg-space-900 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-left"
                  >
                    <action.icon className="h-5 w-5 text-primary-500 mb-1" />
                    <p className="text-sm font-medium text-space-900 dark:text-white">{action.name}</p>
                    <p className="text-xs text-space-500">{action.description}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Step Config Panel */}
        <AnimatePresence>
          {selectedStep && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-space-200 dark:border-space-700 bg-space-50 dark:bg-space-900 overflow-hidden"
            >
              <div className="w-80 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-space-900 dark:text-white">Configure Step</h3>
                  <button
                    onClick={() => setSelectedStepId(null)}
                    className="p-1 hover:bg-space-200 dark:hover:bg-space-700 rounded"
                  >
                    <XMarkIcon className="h-4 w-4 text-space-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-space-500 mb-1">Step Name</label>
                    <input
                      type="text"
                      value={selectedStep.name}
                      onChange={(e) => updateStepName(selectedStep.id, e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-800 text-space-900 dark:text-white"
                    />
                  </div>

                  <StepConfigFields
                    step={selectedStep}
                    onConfigChange={(config) => updateStepConfig(selectedStep.id, config)}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-space-200 dark:border-space-700 bg-space-50 dark:bg-space-900 flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-space-600 dark:text-space-400 hover:bg-space-100 dark:hover:bg-space-800 rounded-lg">
          Cancel
        </button>
        <button onClick={handleSave} disabled={!name || steps.length === 0} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50">
          Save Playbook
        </button>
      </div>
    </div>
  )
}

// Step Configuration Fields Component
function StepConfigFields({
  step,
  onConfigChange,
}: {
  step: PlaybookStep
  onConfigChange: (config: Record<string, unknown>) => void
}) {
  const config = step.config as Record<string, string | number>

  const updateField = (field: string, value: string | number) => {
    onConfigChange({ ...step.config, [field]: value })
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-800 text-space-900 dark:text-white'
  const selectClass = inputClass
  const labelClass = 'block text-xs font-medium text-space-500 mb-1'

  switch (step.type) {
    case 'block_domain':
    case 'block_ip':
      return (
        <>
          <div>
            <label className={labelClass}>Scope</label>
            <select
              value={String(config.scope || 'all_zones')}
              onChange={(e) => updateField('scope', e.target.value)}
              className={selectClass}
            >
              <option value="all_zones">All Zones</option>
              <option value="affected_zone">Affected Zone Only</option>
              <option value="specific_zones">Specific Zones</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Duration</label>
            <select
              value={String(config.duration || '24h')}
              onChange={(e) => updateField('duration', e.target.value)}
              className={selectClass}
            >
              <option value="1h">1 Hour</option>
              <option value="6h">6 Hours</option>
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>
          <p className="text-xs text-space-500 bg-space-100 dark:bg-space-800 p-2 rounded">
            The {step.type === 'block_domain' ? 'domain' : 'IP'} will be extracted from the trigger event data.
          </p>
        </>
      )

    case 'notify_email':
      return (
        <>
          <div>
            <label className={labelClass}>To (Email)</label>
            <input
              type="email"
              value={String(config.to || '')}
              onChange={(e) => updateField('to', e.target.value)}
              placeholder="security@company.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Subject</label>
            <input
              type="text"
              value={String(config.subject || '')}
              onChange={(e) => updateField('subject', e.target.value)}
              placeholder="Security Alert: {{threat_type}}"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Template</label>
            <select
              value={String(config.template || 'default')}
              onChange={(e) => updateField('template', e.target.value)}
              className={selectClass}
            >
              <option value="default">Default Alert</option>
              <option value="executive">Executive Summary</option>
              <option value="technical">Technical Details</option>
            </select>
          </div>
        </>
      )

    case 'notify_slack':
      return (
        <>
          <div>
            <label className={labelClass}>Channel</label>
            <input
              type="text"
              value={String(config.channel || '')}
              onChange={(e) => updateField('channel', e.target.value)}
              placeholder="#security-alerts"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Message (Optional)</label>
            <textarea
              value={String(config.message || '')}
              onChange={(e) => updateField('message', e.target.value)}
              placeholder="Custom message. Use {{variable}} for dynamic values."
              rows={3}
              className={inputClass}
            />
          </div>
        </>
      )

    case 'create_ticket':
      return (
        <>
          <div>
            <label className={labelClass}>System</label>
            <select
              value={String(config.system || 'jira')}
              onChange={(e) => updateField('system', e.target.value)}
              className={selectClass}
            >
              <option value="jira">Jira</option>
              <option value="servicenow">ServiceNow</option>
              <option value="zendesk">Zendesk</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Priority</label>
            <select
              value={String(config.priority || 'high')}
              onChange={(e) => updateField('priority', e.target.value)}
              className={selectClass}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={String(config.title || '')}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Security Incident: {{threat_type}}"
              className={inputClass}
            />
          </div>
        </>
      )

    case 'pagerduty_alert':
      return (
        <>
          <div>
            <label className={labelClass}>Severity</label>
            <select
              value={String(config.severity || 'critical')}
              onChange={(e) => updateField('severity', e.target.value)}
              className={selectClass}
            >
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Service Key</label>
            <input
              type="text"
              value={String(config.service_key || '')}
              onChange={(e) => updateField('service_key', e.target.value)}
              placeholder="PagerDuty integration key"
              className={inputClass}
            />
          </div>
        </>
      )

    case 'webhook':
      return (
        <>
          <div>
            <label className={labelClass}>URL</label>
            <input
              type="url"
              value={String(config.url || '')}
              onChange={(e) => updateField('url', e.target.value)}
              placeholder="https://api.example.com/webhook"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Method</label>
            <select
              value={String(config.method || 'POST')}
              onChange={(e) => updateField('method', e.target.value)}
              className={selectClass}
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Body Template (JSON)</label>
            <textarea
              value={String(config.body || '')}
              onChange={(e) => updateField('body', e.target.value)}
              placeholder={'{"event": "{{threat_type}}", "domain": "{{domain}}"}'}
              rows={3}
              className={inputClass}
            />
          </div>
        </>
      )

    case 'wait':
      return (
        <>
          <div>
            <label className={labelClass}>Duration</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={Number(config.duration || 60)}
                onChange={(e) => updateField('duration', parseInt(e.target.value))}
                min={1}
                className={inputClass}
              />
              <select
                value={String(config.unit || 'seconds')}
                onChange={(e) => updateField('unit', e.target.value)}
                className={selectClass}
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
              </select>
            </div>
          </div>
        </>
      )

    case 'log':
      return (
        <>
          <div>
            <label className={labelClass}>Level</label>
            <select
              value={String(config.level || 'warning')}
              onChange={(e) => updateField('level', e.target.value)}
              className={selectClass}
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Message</label>
            <textarea
              value={String(config.message || '')}
              onChange={(e) => updateField('message', e.target.value)}
              placeholder="Detected {{threat_type}} from {{source_ip}}"
              rows={2}
              className={inputClass}
            />
          </div>
        </>
      )

    default:
      return (
        <p className="text-sm text-space-500">No configuration options for this action type.</p>
      )
  }
}

