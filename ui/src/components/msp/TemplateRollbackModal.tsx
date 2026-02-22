/**
 * Nebula DNS - Template Rollback Modal Component
 * Confirmation modal for rolling back templates (US-035)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { api } from '@/lib/api'

interface RollbackResponse {
  success: boolean
  newVersion: number
  rolledBackToVersion: number
  message?: string
  applyJobId?: string
}

interface TemplateRollbackModalProps {
  templateId: string
  templateName: string
  currentVersion: number
  targetVersionId: string
  targetVersionNumber: number
  clientCount: number
  onClose: () => void
  onSuccess: () => void
}

export default function TemplateRollbackModal({
  templateId,
  templateName,
  currentVersion,
  targetVersionId,
  targetVersionNumber,
  clientCount,
  onClose,
  onSuccess,
}: TemplateRollbackModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [reapplyToClients, setReapplyToClients] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RollbackResponse | null>(null)

  const handleRollback = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.post<RollbackResponse>(
        `/msp/templates/${templateId}/rollback/${targetVersionId}`,
        {
          reapplyToClients,
        }
      )

      setResult(response)

      // Delay before closing to show success
      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to rollback template')
      setIsLoading(false)
    }
  }

  const newVersionNumber = currentVersion + 1

  return (
    <Transition.Root show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={result ? () => {} : onClose}>
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
                {!result && !isLoading && (
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

                {result ? (
                  <>
                    {/* Success State */}
                    <div className="text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                        <ArrowPathIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <Dialog.Title
                        as="h3"
                        className="mt-4 text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                      >
                        Rollback Successful
                      </Dialog.Title>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {result.message}
                      </p>
                      {result.applyJobId && (
                        <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400">
                          Re-applying to clients in progress...
                        </p>
                      )}
                    </div>
                  </>
                ) : isLoading ? (
                  <>
                    {/* Loading State */}
                    <div className="text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                        <ArrowPathIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
                      </div>
                      <Dialog.Title
                        as="h3"
                        className="mt-4 text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                      >
                        Rolling Back...
                      </Dialog.Title>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Please wait while we rollback to v{targetVersionNumber}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Confirmation State */}
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900 sm:mx-0 sm:h-10 sm:w-10">
                        <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                        <Dialog.Title
                          as="h3"
                          className="text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                        >
                          Rollback to v{targetVersionNumber}?
                        </Dialog.Title>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            This will create <strong>v{newVersionNumber}</strong> with the configuration from{' '}
                            <strong>v{targetVersionNumber}</strong>. The current version will be preserved in
                            history.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Info Box */}
                    <div className="mt-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="text-sm">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-500 dark:text-gray-400">Template:</span>
                          <span className="text-gray-900 dark:text-white font-medium">{templateName}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-500 dark:text-gray-400">Current Version:</span>
                          <span className="text-gray-900 dark:text-white">v{currentVersion}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-500 dark:text-gray-400">Rollback To:</span>
                          <span className="text-indigo-600 dark:text-indigo-400">v{targetVersionNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">New Version:</span>
                          <span className="text-green-600 dark:text-green-400">v{newVersionNumber}</span>
                        </div>
                      </div>
                    </div>

                    {/* Re-apply Option */}
                    {clientCount > 0 && (
                      <div className="mt-4">
                        <label className="flex items-start">
                          <input
                            type="checkbox"
                            checked={reapplyToClients}
                            onChange={(e) => setReapplyToClients(e.target.checked)}
                            className="h-4 w-4 mt-1 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                          />
                          <span className="ml-3">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Re-apply to all clients after rollback
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                              {clientCount} client{clientCount !== 1 ? 's' : ''} currently using this template
                            </span>
                          </span>
                        </label>
                      </div>
                    )}

                    {error && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 rounded-md">
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                      </div>
                    )}

                    <div className="mt-6 sm:flex sm:flex-row-reverse sm:gap-3">
                      <button
                        type="button"
                        className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 sm:w-auto"
                        onClick={handleRollback}
                      >
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                        Rollback to v{targetVersionNumber}
                      </button>
                      <button
                        type="button"
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto"
                        onClick={onClose}
                      >
                        Cancel
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
