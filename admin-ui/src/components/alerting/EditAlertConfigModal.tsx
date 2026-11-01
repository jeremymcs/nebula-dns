'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/Toast'
import { updateAlertConfig } from '@/hooks/useAlertConfigs'
import {
  updateAlertConfigSchema,
  SEVERITY_OPTIONS,
  EVENT_TYPE_OPTIONS,
} from '@/lib/validations/alerting.schema'
import type {
  AlertConfigResponse,
  AlertSeverity,
  AlertEventType,
} from '@/types/alerting'

interface EditAlertConfigModalProps {
  config: AlertConfigResponse | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditAlertConfigModal({
  config,
  isOpen,
  onClose,
  onSuccess,
}: EditAlertConfigModalProps) {
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity[]>([])
  const [eventTypes, setEventTypes] = useState<AlertEventType[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (config && isOpen) {
      setName(config.name)
      setSeverityFilter(config.severityFilter)
      setEventTypes(config.eventTypes)
    }
  }, [config, isOpen])

  const toggleSeverity = (severity: AlertSeverity) => {
    setSeverityFilter((prev) =>
      prev.includes(severity)
        ? prev.filter((s) => s !== severity)
        : [...prev, severity]
    )
  }

  const toggleEventType = (eventType: AlertEventType) => {
    setEventTypes((prev) =>
      prev.includes(eventType)
        ? prev.filter((e) => e !== eventType)
        : [...prev, eventType]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    const parsed = updateAlertConfigSchema.safeParse({
      name,
      severityFilter,
      eventTypes,
    })

    if (!parsed.success) {
      showToast('error', 'Validation failed', parsed.error.issues[0]?.message)
      return
    }

    setIsSubmitting(true)
    try {
      await updateAlertConfig(config.id, parsed.data)
      showToast('success', 'Integration updated')
      onSuccess()
      onClose()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Update failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${config?.name ?? 'integration'}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <fieldset>
          <legend className="text-sm font-medium text-space-700 dark:text-space-300 mb-2">
            Severity filter
          </legend>
          <div className="flex flex-wrap gap-2">
            {SEVERITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleSeverity(opt.value)}
                className={`px-3 py-1 rounded-full text-xs border ${
                  severityFilter.includes(opt.value)
                    ? 'bg-primary-100 border-primary-500 text-primary-800'
                    : 'border-space-300 text-space-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-space-700 dark:text-space-300 mb-2">
            Event types
          </legend>
          <div className="space-y-2">
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={eventTypes.includes(opt.value)}
                  onChange={() => toggleEventType(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
