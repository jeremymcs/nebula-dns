/**
 * Nebula DNS - Zone Editor Modal
 * Comprehensive zone/location configuration with tabbed interface
 */

'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Input, Textarea, Select, Tabs, Badge, Card } from '@/components/ui'
import {
  MapPinIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ClockIcon,
  Cog6ToothIcon,
  WifiIcon,
  ServerIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

export interface ZoneFormData {
  name: string
  description: string
  policyId: string
  ipRanges: string[]
  dyndns: string
  status: 'active' | 'inactive'
  timezone: string
  scheduleEnabled: boolean
  scheduleStart: string
  scheduleEnd: string
  scheduleDays: string[]
  fallbackPolicy: string
  blockPageId: string
  loggingEnabled: boolean
  loggingRetentionDays: number
  notes: string
}

interface Policy {
  id: string
  name: string
}

interface BlockPage {
  id: string
  name: string
}

export interface ZoneEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ZoneFormData) => Promise<void>
  initialData?: Partial<ZoneFormData>
  policies: Policy[]
  blockPages?: BlockPage[]
  isEditing?: boolean
  isSaving?: boolean
}

const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
]

// IP/CIDR validation helpers
const isValidIPv4 = (ip: string): boolean => {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  return parts.every(part => {
    const num = parseInt(part, 10)
    return !isNaN(num) && num >= 0 && num <= 255 && part === String(num)
  })
}

const isValidIPv6 = (ip: string): boolean => {
  // Simplified IPv6 validation - accepts standard format
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^([0-9a-fA-F]{1,4}:)*::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/
  return ipv6Regex.test(ip)
}

const isValidCIDR = (cidr: string): boolean => {
  const parts = cidr.split('/')
  if (parts.length !== 2) return false
  const [ip, prefix] = parts
  const prefixNum = parseInt(prefix, 10)

  if (ip.includes(':')) {
    // IPv6 CIDR
    return isValidIPv6(ip) && !isNaN(prefixNum) && prefixNum >= 0 && prefixNum <= 128
  } else {
    // IPv4 CIDR
    return isValidIPv4(ip) && !isNaN(prefixNum) && prefixNum >= 0 && prefixNum <= 32
  }
}

const validateIpOrCidr = (value: string): string | null => {
  if (!value.trim()) return null // Empty is ok, will be filtered out
  const trimmed = value.trim()

  if (trimmed.includes('/')) {
    if (!isValidCIDR(trimmed)) {
      return 'Invalid CIDR notation (e.g., 192.168.1.0/24)'
    }
  } else if (trimmed.includes(':')) {
    if (!isValidIPv6(trimmed)) {
      return 'Invalid IPv6 address'
    }
  } else {
    if (!isValidIPv4(trimmed)) {
      return 'Invalid IPv4 address (e.g., 192.168.1.1)'
    }
  }
  return null
}

const DEFAULT_FORM: ZoneFormData = {
  name: '',
  description: '',
  policyId: '',
  ipRanges: [''],
  dyndns: '',
  status: 'active',
  timezone: 'UTC',
  scheduleEnabled: false,
  scheduleStart: '09:00',
  scheduleEnd: '17:00',
  scheduleDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
  fallbackPolicy: '',
  blockPageId: '',
  loggingEnabled: true,
  loggingRetentionDays: 30,
  notes: '',
}

export function ZoneEditorModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  policies,
  blockPages = [],
  isEditing = false,
  isSaving = false,
}: ZoneEditorModalProps) {
  const [activeTab, setActiveTab] = useState('general')
  const [form, setForm] = useState<ZoneFormData>(DEFAULT_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof ZoneFormData, string>>>({})
  const [ipErrors, setIpErrors] = useState<Record<number, string>>({})

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          ...DEFAULT_FORM,
          ...initialData,
          ipRanges: initialData.ipRanges?.length ? initialData.ipRanges : [''],
        })
      } else {
        setForm({
          ...DEFAULT_FORM,
          policyId: policies[0]?.id || '',
        })
      }
      setErrors({})
      setIpErrors({})
      setActiveTab('general')
    }
  }, [isOpen, initialData, policies])

  const updateForm = <K extends keyof ZoneFormData>(key: K, value: ZoneFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }))
    }
  }

  const addIpRange = () => {
    setForm(prev => ({ ...prev, ipRanges: [...prev.ipRanges, ''] }))
  }

  const removeIpRange = (index: number) => {
    setForm(prev => ({
      ...prev,
      ipRanges: prev.ipRanges.filter((_, i) => i !== index),
    }))
  }

  const updateIpRange = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      ipRanges: prev.ipRanges.map((ip, i) => (i === index ? value : ip)),
    }))
    // Clear general ipRanges error when typing
    if (errors.ipRanges) {
      setErrors(prev => ({ ...prev, ipRanges: undefined }))
    }
    // Validate after user stops typing (debounce effect via onBlur is better, but we validate on submit too)
    const error = validateIpOrCidr(value)
    if (error) {
      setIpErrors(prev => ({ ...prev, [index]: error }))
    } else {
      setIpErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[index]
        return newErrors
      })
    }
  }

  const toggleDay = (day: string) => {
    setForm(prev => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(day)
        ? prev.scheduleDays.filter(d => d !== day)
        : [...prev.scheduleDays, day],
    }))
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ZoneFormData, string>> = {}
    const newIpErrors: Record<number, string> = {}

    if (!form.name.trim()) {
      newErrors.name = 'Zone name is required'
    }

    const nonEmptyIps = form.ipRanges.filter(ip => ip.trim())
    const hasDyndns = form.dyndns.trim()

    if (nonEmptyIps.length === 0 && !hasDyndns) {
      newErrors.ipRanges = 'At least one IP range or DynDNS hostname is required'
    } else {
      // Validate each non-empty IP range
      form.ipRanges.forEach((ip, index) => {
        if (ip.trim()) {
          const error = validateIpOrCidr(ip)
          if (error) {
            newIpErrors[index] = error
          }
        }
      })
      if (Object.keys(newIpErrors).length > 0) {
        newErrors.ipRanges = 'One or more IP addresses are invalid'
      }
    }

    setErrors(newErrors)
    setIpErrors(newIpErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) {
      setActiveTab('network')
      return
    }

    await onSave({
      ...form,
      ipRanges: form.ipRanges.filter(ip => ip.trim()),
    })
  }

  const tabs = [
    { id: 'general', label: 'General', icon: <MapPinIcon className="h-4 w-4" /> },
    { id: 'network', label: 'Network', icon: <WifiIcon className="h-4 w-4" /> },
    { id: 'policy', label: 'Policy', icon: <ShieldCheckIcon className="h-4 w-4" /> },
    { id: 'schedule', label: 'Schedule', icon: <ClockIcon className="h-4 w-4" /> },
    { id: 'advanced', label: 'Advanced', icon: <Cog6ToothIcon className="h-4 w-4" /> },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Protection Zone' : 'Create Protection Zone'}
      description={isEditing ? 'Update zone configuration and network settings' : 'Configure a new network protection zone'}
      size="3xl"
    >
      {/* Tab Navigation */}
      <div className="mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="pills" size="sm" />
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Zone Name"
                placeholder="e.g., Main Office, Home Network"
                value={form.name}
                onChange={e => updateForm('name', e.target.value)}
                error={errors.name}
                leftIcon={<MapPinIcon className="h-5 w-5" />}
                required
              />
              <Select
                label="Status"
                value={form.status}
                onChange={e => updateForm('status', e.target.value as 'active' | 'inactive')}
                options={[
                  { value: 'active', label: '🟢 Active - Protection Enabled' },
                  { value: 'inactive', label: '⚪ Inactive - Protection Disabled' },
                ]}
              />
            </div>
            <Textarea
              label="Description"
              placeholder="Describe this zone's purpose, location, or network segment..."
              value={form.description}
              onChange={e => updateForm('description', e.target.value)}
              rows={3}
            />

            {/* Quick Status Card */}
            <Card variant="glass" padding="md">
              <div className="flex items-center gap-3">
                {form.status === 'active' ? (
                  <>
                    <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
                      <CheckCircleIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
                    </div>
                    <div>
                      <p className="font-medium text-space-900 dark:text-white">Protection Active</p>
                      <p className="text-sm text-space-500 dark:text-space-400">
                        DNS queries from this zone will be filtered according to the assigned policy
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30">
                      <ExclamationTriangleIcon className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                    </div>
                    <div>
                      <p className="font-medium text-space-900 dark:text-white">Protection Disabled</p>
                      <p className="text-sm text-space-500 dark:text-space-400">
                        DNS queries will pass through without filtering
                      </p>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Network Tab */}
        {activeTab === 'network' && (
          <div className="space-y-6">
            {/* IP Ranges Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="label mb-0">IP Addresses / Ranges</label>
                <Button variant="ghost" size="sm" onClick={addIpRange} leftIcon={<PlusIcon className="h-4 w-4" />}>
                  Add IP
                </Button>
              </div>
              <div className="space-y-3">
                {form.ipRanges.map((ip, index) => (
                  <div key={index}>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="e.g., 192.168.1.0/24 or 203.0.113.50"
                        value={ip}
                        onChange={e => updateIpRange(index, e.target.value)}
                        leftIcon={<ServerIcon className="h-5 w-5" />}
                        error={ipErrors[index]}
                      />
                      {form.ipRanges.length > 1 && (
                        <button
                          onClick={() => removeIpRange(index)}
                          className="p-2 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {errors.ipRanges && (
                <p className="mt-2 text-sm text-danger-600 dark:text-danger-400">{errors.ipRanges}</p>
              )}
              <p className="mt-2 text-sm text-space-500 dark:text-space-400">
                Enter static IPs or CIDR ranges. Multiple entries are supported for complex networks.
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-space-200 dark:bg-space-700" />
              <span className="text-sm text-space-500 dark:text-space-400 font-medium">OR use Dynamic DNS</span>
              <div className="flex-1 h-px bg-space-200 dark:bg-space-700" />
            </div>

            {/* DynDNS Section */}
            <Input
              label="Dynamic DNS Hostname"
              placeholder="e.g., myoffice.dyndns.org"
              value={form.dyndns}
              onChange={e => updateForm('dyndns', e.target.value)}
              leftIcon={<GlobeAltIcon className="h-5 w-5" />}
              helperText="Use a DynDNS hostname for locations with changing IP addresses"
            />

            {/* Info Card */}
            <Card variant="glass" padding="md" className="bg-accent-50/50 dark:bg-accent-900/10">
              <div className="flex gap-3">
                <InformationCircleIcon className="h-5 w-5 text-accent-600 dark:text-accent-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-space-600 dark:text-space-300">
                  <p className="font-medium mb-1">How network identification works</p>
                  <p className="mb-2">DNS queries can be identified by two methods:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Token-based:</strong> Use a DoH token in browser/device settings (recommended for roaming clients)</li>
                    <li><strong>IP-based:</strong> Automatically identify queries from configured IP ranges (ideal for office networks)</li>
                  </ul>
                  <p className="mt-2">For static IPs, enter the public IP or CIDR range. For dynamic IPs, use DynDNS or generate a DoH token.</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Policy Tab */}
        {activeTab === 'policy' && (
          <div className="space-y-6">
            <Select
              label="Primary Policy"
              value={form.policyId}
              onChange={e => updateForm('policyId', e.target.value)}
              options={[
                { value: '', label: 'Use organization default policy' },
                ...policies.map(p => ({ value: p.id, label: p.name })),
              ]}
            />
            <p className="text-sm text-space-500 dark:text-space-400">
              The primary policy determines which categories and domains are blocked for this zone.
            </p>

            {blockPages.length > 0 && (
              <Select
                label="Block Page"
                value={form.blockPageId}
                onChange={e => updateForm('blockPageId', e.target.value)}
                options={[
                  { value: '', label: 'Use default block page' },
                  ...blockPages.map(bp => ({ value: bp.id, label: bp.name })),
                ]}
              />
            )}

            <Card variant="glass" padding="md">
              <h4 className="font-medium text-space-900 dark:text-white mb-3">Policy Preview</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-space-500 dark:text-space-400">Assigned Policy:</span>
                  <p className="font-medium text-space-900 dark:text-white">
                    {policies.find(p => p.id === form.policyId)?.name || 'Default Policy'}
                  </p>
                </div>
                <div>
                  <span className="text-space-500 dark:text-space-400">Block Page:</span>
                  <p className="font-medium text-space-900 dark:text-white">
                    {blockPages.find(bp => bp.id === form.blockPageId)?.name || 'Default'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* Schedule Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-space-50 dark:bg-space-800/50 ring-1 ring-space-200 dark:ring-space-700">
              <div>
                <h4 className="font-medium text-space-900 dark:text-white">Time-Based Filtering</h4>
                <p className="text-sm text-space-500 dark:text-space-400">
                  Apply different policies based on time of day
                </p>
              </div>
              <button
                onClick={() => updateForm('scheduleEnabled', !form.scheduleEnabled)}
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  form.scheduleEnabled ? 'bg-primary-600' : 'bg-space-300 dark:bg-space-600'
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-4 w-4 transform rounded-full bg-panel transition-transform',
                    form.scheduleEnabled ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {form.scheduleEnabled && (
              <>
                <Select
                  label="Timezone"
                  value={form.timezone}
                  onChange={e => updateForm('timezone', e.target.value)}
                  options={TIMEZONES}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Start Time"
                    type="time"
                    value={form.scheduleStart}
                    onChange={e => updateForm('scheduleStart', e.target.value)}
                  />
                  <Input
                    label="End Time"
                    type="time"
                    value={form.scheduleEnd}
                    onChange={e => updateForm('scheduleEnd', e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Active Days</label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS_OF_WEEK.map(day => (
                      <button
                        key={day.value}
                        onClick={() => toggleDay(day.value)}
                        className={clsx(
                          'px-4 py-2 rounded-lg font-medium text-sm transition-all',
                          form.scheduleDays.includes(day.value)
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500'
                            : 'bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400 hover:bg-space-200 dark:hover:bg-space-600'
                        )}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Select
                  label="Fallback Policy (Outside Schedule)"
                  value={form.fallbackPolicy}
                  onChange={e => updateForm('fallbackPolicy', e.target.value)}
                  options={[
                    { value: '', label: 'No filtering (allow all)' },
                    ...policies.map(p => ({ value: p.id, label: p.name })),
                  ]}
                />
              </>
            )}
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            {/* Logging Settings */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-space-50 dark:bg-space-800/50 ring-1 ring-space-200 dark:ring-space-700">
              <div className="flex items-center gap-3">
                <DocumentTextIcon className="h-5 w-5 text-space-500" />
                <div>
                  <h4 className="font-medium text-space-900 dark:text-white">Query Logging</h4>
                  <p className="text-sm text-space-500 dark:text-space-400">
                    Record DNS queries for this zone
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateForm('loggingEnabled', !form.loggingEnabled)}
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  form.loggingEnabled ? 'bg-primary-600' : 'bg-space-300 dark:bg-space-600'
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-4 w-4 transform rounded-full bg-panel transition-transform',
                    form.loggingEnabled ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {form.loggingEnabled && (
              <Select
                label="Log Retention"
                value={String(form.loggingRetentionDays)}
                onChange={e => updateForm('loggingRetentionDays', parseInt(e.target.value))}
                options={[
                  { value: '7', label: '7 days' },
                  { value: '14', label: '14 days' },
                  { value: '30', label: '30 days' },
                  { value: '60', label: '60 days' },
                  { value: '90', label: '90 days' },
                  { value: '365', label: '1 year' },
                ]}
              />
            )}

            {/* Notes */}
            <Textarea
              label="Internal Notes"
              placeholder="Add any internal notes about this zone (not visible to end users)..."
              value={form.notes}
              onChange={e => updateForm('notes', e.target.value)}
              rows={4}
            />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-8 pt-6 border-t border-space-200 dark:border-space-700 flex items-center justify-between">
        <div className="text-sm text-space-500 dark:text-space-400">
          {isEditing ? 'Changes will take effect immediately' : 'Zone will be created in active state'}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={isSaving}>
            {isEditing ? 'Save Changes' : 'Create Zone'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
