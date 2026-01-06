/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Block Domain Modal - Quick action to add domains to blocklist
 */

'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { NoSymbolIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { useLists } from '@/hooks/useApi'

interface BlockDomainModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialDomain?: string
}

export function BlockDomainModal({
  isOpen,
  onClose,
  onSuccess,
  initialDomain = '',
}: BlockDomainModalProps) {
  const [domains, setDomains] = useState<string[]>([''])
  const [selectedListId, setSelectedListId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: listsData, isLoading: listsLoading } = useLists('blocklist')

  const blocklists = listsData?.data || []

  useEffect(() => {
    if (isOpen) {
      setDomains(initialDomain ? [initialDomain] : [''])
      setError(null)
      // Auto-select first blocklist if available
      if (blocklists.length > 0 && !selectedListId) {
        setSelectedListId(blocklists[0].id)
      }
    }
  }, [isOpen, initialDomain, blocklists, selectedListId])

  const addDomain = () => {
    setDomains((prev) => [...prev, ''])
  }

  const removeDomain = (index: number) => {
    setDomains((prev) => prev.filter((_, i) => i !== index))
  }

  const updateDomain = (index: number, value: string) => {
    setDomains((prev) => prev.map((d, i) => (i === index ? value : d)))
  }

  const validateDomain = (domain: string): boolean => {
    // Basic domain validation
    const domainRegex = /^(\*\.)?([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/
    return domainRegex.test(domain.trim())
  }

  const handleSubmit = async () => {
    const validDomains = domains
      .map((d) => d.trim())
      .filter((d) => d.length > 0)

    if (validDomains.length === 0) {
      setError('Please enter at least one domain')
      return
    }

    const invalidDomains = validDomains.filter((d) => !validateDomain(d))
    if (invalidDomains.length > 0) {
      setError(`Invalid domain format: ${invalidDomains.join(', ')}`)
      return
    }

    if (!selectedListId) {
      setError('Please select a blocklist')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await api.bulkAddListEntries(selectedListId, validDomains)
      onSuccess?.()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to add domains to blocklist')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Block Domain"
      description="Add domains to your blocklist for immediate protection"
      size="lg"
    >
      <div className="space-y-6">
        {/* Blocklist Selection */}
        <Select
          label="Add to Blocklist"
          value={selectedListId}
          onChange={(e) => setSelectedListId(e.target.value)}
          disabled={listsLoading || blocklists.length === 0}
          options={
            blocklists.length === 0
              ? [{ value: '', label: 'No blocklists available' }]
              : blocklists.map((list: any) => ({
                  value: list.id,
                  label: list.name,
                }))
          }
        />

        {blocklists.length === 0 && !listsLoading && (
          <p className="text-sm text-warning-600 dark:text-warning-400">
            You don't have any blocklists yet. Create one in Lists management first.
          </p>
        )}

        {/* Domain Input(s) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="label mb-0">Domains to Block</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={addDomain}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Add More
            </Button>
          </div>
          <div className="space-y-3">
            {domains.map((domain, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="e.g., malware.example.com or *.ads.example.com"
                  value={domain}
                  onChange={(e) => updateDomain(index, e.target.value)}
                  leftIcon={<NoSymbolIcon className="h-5 w-5" />}
                />
                {domains.length > 1 && (
                  <button
                    onClick={() => removeDomain(index)}
                    className="p-2 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm text-space-500 dark:text-space-400">
            Use wildcards (*.example.com) to block all subdomains
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-space-200 dark:border-space-700">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={blocklists.length === 0}
            leftIcon={<NoSymbolIcon className="h-4 w-4" />}
          >
            Block Domain{domains.filter((d) => d.trim()).length > 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
