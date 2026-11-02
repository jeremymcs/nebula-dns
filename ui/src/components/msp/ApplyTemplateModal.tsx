/**
 * Nebula DNS - Apply Template Modal Component
 * Modal for applying template to clients with progress tracking (US-036)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { ClientUsingTemplate, useMspApplyJobStatus, ApplyJobResponse } from '@/hooks/useApi'
import { api } from '@/lib/api'

interface ApplyTemplateModalProps {
  templateId: string
  templateName: string
  templateVersion: number
  clients: ClientUsingTemplate[]
  onClose: () => void
  onSuccess: () => void
}

type ApplyMode = 'all' | 'selected' | 'outdated'

export default function ApplyTemplateModal({
  templateId,
  templateName,
  templateVersion,
  clients,
  onClose,
  onSuccess,
}: ApplyTemplateModalProps) {
  const [applyMode, setApplyMode] = useState<ApplyMode>('all')
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [isApplying, setIsApplying] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: jobStatus } = useMspApplyJobStatus(templateId, jobId)

  const outdatedClients = clients.filter((c) => !c.isLatestVersion)

  useEffect(() => {
    // Pre-select outdated clients when switching to that mode
    if (applyMode === 'outdated') {
      setSelectedClientIds(outdatedClients.map((c) => c.clientId))
    } else if (applyMode === 'all') {
      setSelectedClientIds([])
    }
  }, [applyMode, outdatedClients])

  // Check if job is complete
  useEffect(() => {
    if (jobStatus && (jobStatus.status === 'completed' || jobStatus.status === 'failed')) {
      if (jobStatus.status === 'completed' && jobStatus.failedCount === 0) {
        // Delay before closing to show success
        setTimeout(() => {
          onSuccess()
        }, 2000)
      }
    }
  }, [jobStatus, onSuccess])

  const handleClientToggle = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    )
    if (applyMode !== 'selected') {
      setApplyMode('selected')
    }
  }

  const handleApply = async () => {
    setIsApplying(true)
    setError(null)

    try {
      const clientIds = applyMode === 'all' ? 'all' : selectedClientIds

      const response = await api.post<ApplyJobResponse>(`/msp/templates/${templateId}/apply`, {
        clientIds,
      })

      setJobId(response.jobId)
    } catch (err: any) {
      setError(err.message || 'Failed to start apply job')
      setIsApplying(false)
    }
  }

  const handleRetryFailed = async () => {
    if (!jobStatus?.results) return

    const failedClientIds = jobStatus.results
      .filter((r) => r.status === 'failed')
      .map((r) => r.clientId)

    if (failedClientIds.length === 0) return

    setIsApplying(true)
    setError(null)

    try {
      const response = await api.post<ApplyJobResponse>(`/msp/templates/${templateId}/retry`, {
        clientIds: failedClientIds,
      })

      setJobId(response.jobId)
    } catch (err: any) {
      setError(err.message || 'Failed to retry')
      setIsApplying(false)
    }
  }

  const canApply =
    !isApplying &&
    !jobId &&
    (applyMode === 'all' || selectedClientIds.length > 0)

  const getTargetCount = () => {
    if (applyMode === 'all') return clients.length
    return selectedClientIds.length
  }

  return (
    <Transition.Root show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={jobId ? () => {} : onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                {!jobId && (
                  <div className="absolute right-0 top-0 pr-4 pt-4">
                    <button
                      type="button"
                      className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={onClose}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                )}

                {!jobId ? (
                  <>
                    {/* Initial Selection State */}
                    <div>
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                        <PlayIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="mt-3 text-center sm:mt-5">
                        <Dialog.Title
                          as="h3"
                          className="text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                        >
                          Apply Template
                        </Dialog.Title>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          Apply "{templateName}" v{templateVersion} to your clients
                        </p>
                      </div>
                    </div>

                    {/* Apply Mode Selection */}
                    <div className="mt-6 space-y-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Apply to:
                      </label>

                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applyMode"
                            checked={applyMode === 'all'}
                            onChange={() => setApplyMode('all')}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            All clients using this template ({clients.length})
                          </span>
                        </label>

                        {outdatedClients.length > 0 && (
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="applyMode"
                              checked={applyMode === 'outdated'}
                              onChange={() => setApplyMode('outdated')}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              Only outdated clients ({outdatedClients.length})
                            </span>
                          </label>
                        )}

                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applyMode"
                            checked={applyMode === 'selected'}
                            onChange={() => setApplyMode('selected')}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Select specific clients
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Client Selection */}
                    {applyMode === 'selected' && (
                      <div className="mt-4 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                        {clients.map((client) => (
                          <label
                            key={client.clientId}
                            className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedClientIds.includes(client.clientId)}
                              onChange={() => handleClientToggle(client.clientId)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                            />
                            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                              {client.clientName}
                              {!client.isLatestVersion && (
                                <span className="ml-2 text-xs text-yellow-600">(v{client.appliedVersion})</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    {error && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 rounded-md">
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                      </div>
                    )}

                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        className="rounded-md bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                        onClick={onClose}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleApply}
                        disabled={!canApply}
                      >
                        Apply to {getTargetCount()} client{getTargetCount() !== 1 ? 's' : ''}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Progress/Results State */}
                    <div className="text-center">
                      {jobStatus?.status === 'in_progress' || jobStatus?.status === 'pending' ? (
                        <>
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                            <ArrowPathIcon className="h-6 w-6 text-primary-600 dark:text-primary-400 animate-spin" />
                          </div>
                          <Dialog.Title
                            as="h3"
                            className="mt-4 text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                          >
                            Applying Template...
                          </Dialog.Title>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Processing {jobStatus?.processedClients || 0} of {jobStatus?.totalClients || 0}{' '}
                            clients
                          </p>

                          {/* Progress bar */}
                          <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${
                                  jobStatus
                                    ? (jobStatus.processedClients / jobStatus.totalClients) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </>
                      ) : jobStatus?.status === 'completed' && jobStatus.failedCount === 0 ? (
                        <>
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                            <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <Dialog.Title
                            as="h3"
                            className="mt-4 text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                          >
                            Success!
                          </Dialog.Title>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Applied to {jobStatus.successCount} client{jobStatus.successCount !== 1 ? 's' : ''}{' '}
                            successfully.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <Dialog.Title
                            as="h3"
                            className="mt-4 text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                          >
                            Completed with Errors
                          </Dialog.Title>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Applied to {jobStatus?.successCount || 0} of {jobStatus?.totalClients || 0} clients.{' '}
                            {jobStatus?.failedCount || 0} failed.
                          </p>
                        </>
                      )}
                    </div>

                    {/* Results List */}
                    {jobStatus?.results && jobStatus.results.length > 0 && (
                      <div className="mt-4 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700">
                        {jobStatus.results.map((result) => (
                          <div
                            key={result.clientId}
                            className="px-3 py-2 flex items-center justify-between"
                          >
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {result.clientName}
                            </span>
                            {result.status === 'success' ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            ) : result.status === 'failed' ? (
                              <div className="flex items-center">
                                <XCircleIcon className="h-5 w-5 text-red-500" />
                                {result.error && (
                                  <span className="ml-2 text-xs text-red-500 truncate max-w-[150px]">
                                    {result.error}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="h-4 w-4 border-2 border-gray-300 rounded-full animate-pulse" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-6 flex justify-end space-x-3">
                      {jobStatus?.failedCount && jobStatus.failedCount > 0 && (
                        <button
                          type="button"
                          className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
                          onClick={handleRetryFailed}
                        >
                          Retry Failed ({jobStatus.failedCount})
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded-md bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                        onClick={onClose}
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
