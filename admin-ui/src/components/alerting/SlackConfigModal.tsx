/**
 * Nebula DNS - Slack Configuration Modal Component
 * Modal for creating and configuring Slack webhook integrations
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/Toast'
import { createSlackConfig } from '@/hooks/useAlertConfigs'
import {
  slackConfigSchema,
  SEVERITY_OPTIONS,
  EVENT_TYPE_OPTIONS,
} from '@/lib/validations/alerting.schema'
import type { AlertSeverity, AlertEventType } from '@/types/alerting'

interface SlackConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormErrors {
  name?: string
  webhookUrl?: string
  severityFilter?: string
  eventTypes?: string
  form?: string
}

export function SlackConfigModal({ isOpen, onClose, onSuccess }: SlackConfigModalProps) {
  const { showToast } = useToast()

  // Form state
  const [name, setName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity[]>(['critical', 'error'])
  const [eventTypes, setEventTypes] = useState<AlertEventType[]>([])

  // UI state
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('')
      setWebhookUrl('')
      setSeverityFilter(['critical', 'error'])
      setEventTypes([])
      setErrors({})
    }
  }, [isOpen])

  const handleSeverityToggle = (severity: AlertSeverity) => {
    setSeverityFilter((prev) =>
      prev.includes(severity)
        ? prev.filter((s) => s !== severity)
        : [...prev, severity]
    )
  }

  const handleEventTypeToggle = (eventType: AlertEventType) => {
    setEventTypes((prev) =>
      prev.includes(eventType)
        ? prev.filter((e) => e !== eventType)
        : [...prev, eventType]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validate with Zod
    const result = slackConfigSchema.safeParse({
      name,
      webhookUrl,
      severityFilter,
      eventTypes,
    })

    if (!result.success) {
      const fieldErrors: FormErrors = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormErrors
        fieldErrors[field] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)

    try {
      await createSlackConfig(result.data)
      showToast('success', 'Integration Created', `Slack integration "${name}" has been created`)
      onSuccess()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create Slack integration'
      setErrors({ form: message })
      showToast('error', 'Creation Failed', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Slack Integration"
      description="Configure a Slack webhook to receive alert notifications"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* API Error Display */}
        {errors.form && (
          <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
            <p className="text-sm text-danger-700 dark:text-danger-300">{errors.form}</p>
          </div>
        )}

        {/* Name Input */}
        <Input
          label="Integration Name"
          placeholder="Production Alerts"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          disabled={isSubmitting}
          helperText="A friendly name to identify this integration"
        />

        {/* Webhook URL Input */}
        <Input
          label="Webhook URL"
          type="url"
          placeholder="https://hooks.slack.com/services/..."
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          error={errors.webhookUrl}
          disabled={isSubmitting}
          helperText="Must start with https://hooks.slack.com/"
        />

        {/* Severity Filter */}
        <div>
          <label className="label">Severity Filter</label>
          <p className="text-sm text-space-500 dark:text-space-400 mb-3">
            Select which severity levels should trigger alerts
          </p>
          <div className="flex flex-wrap gap-3">
            {SEVERITY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="inline-flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={severityFilter.includes(option.value as AlertSeverity)}
                  onChange={() => handleSeverityToggle(option.value as AlertSeverity)}
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded border-space-300 dark:border-space-600 text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-space-700"
                />
                <span className="text-sm text-space-700 dark:text-space-300">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
          {errors.severityFilter && (
            <p className="mt-1.5 text-sm text-danger-600 dark:text-danger-400">
              {errors.severityFilter}
            </p>
          )}
        </div>

        {/* Event Types */}
        <div>
          <label className="label">Event Types</label>
          <p className="text-sm text-space-500 dark:text-space-400 mb-3">
            Filter by event type (leave empty to receive all types)
          </p>
          <div className="flex flex-wrap gap-3">
            {EVENT_TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="inline-flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={eventTypes.includes(option.value as AlertEventType)}
                  onChange={() => handleEventTypeToggle(option.value as AlertEventType)}
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded border-space-300 dark:border-space-600 text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-space-700"
                />
                <span className="text-sm text-space-700 dark:text-space-300">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
          {errors.eventTypes && (
            <p className="mt-1.5 text-sm text-danger-600 dark:text-danger-400">
              {errors.eventTypes}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Add Integration
          </Button>
        </div>
      </form>
    </Modal>
  )
}
