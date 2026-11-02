/**
 * Nebula DNS - Template Version Diff Component
 * Displays diff between a version and current template (US-034)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, PlusIcon, MinusIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import { useMspTemplateVersionDiff } from '@/hooks/useApi'

interface TemplateVersionDiffProps {
  templateId: string
  versionNumber: number
  currentVersion: number
  onClose: () => void
}

export default function TemplateVersionDiff({
  templateId,
  versionNumber,
  currentVersion,
  onClose,
}: TemplateVersionDiffProps) {
  const { data: diffData, isLoading, error } = useMspTemplateVersionDiff(templateId, versionNumber)

  return (
    <Transition.Root show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
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

                <div>
                  <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                    Configuration Diff
                  </Dialog.Title>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Comparing version {versionNumber} with current version {currentVersion}
                  </p>
                </div>

                <div className="mt-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  ) : error ? (
                    <div className="text-center py-8 text-red-600 dark:text-red-400">
                      Failed to load diff. Please try again.
                    </div>
                  ) : diffData ? (
                    <div className="space-y-6">
                      {/* Summary */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Summary</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{diffData.summary}</p>
                      </div>

                      {/* Added Items */}
                      {Object.keys(diffData.diff.added).length > 0 && (
                        <div>
                          <div className="flex items-center mb-2">
                            <PlusIcon className="h-4 w-4 text-green-600 mr-2" />
                            <h4 className="text-sm font-medium text-green-600 dark:text-green-400">Added</h4>
                          </div>
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-3">
                            {Object.entries(diffData.diff.added).map(([key, value]) => (
                              <DiffItem key={key} label={key} value={value} type="added" />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Removed Items */}
                      {Object.keys(diffData.diff.removed).length > 0 && (
                        <div>
                          <div className="flex items-center mb-2">
                            <MinusIcon className="h-4 w-4 text-red-600 mr-2" />
                            <h4 className="text-sm font-medium text-red-600 dark:text-red-400">Removed</h4>
                          </div>
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 space-y-3">
                            {Object.entries(diffData.diff.removed).map(([key, value]) => (
                              <DiffItem key={key} label={key} value={value} type="removed" />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Changed Items */}
                      {Object.keys(diffData.diff.changed).length > 0 && (
                        <div>
                          <div className="flex items-center mb-2">
                            <ArrowsRightLeftIcon className="h-4 w-4 text-yellow-600 mr-2" />
                            <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Changed</h4>
                          </div>
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 space-y-3">
                            {Object.entries(diffData.diff.changed).map(([key, change]) => (
                              <ChangedItem key={key} label={key} change={change as { from: any; to: any }} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No Changes */}
                      {Object.keys(diffData.diff.added).length === 0 &&
                        Object.keys(diffData.diff.removed).length === 0 &&
                        Object.keys(diffData.diff.changed).length === 0 && (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            No significant differences found between versions.
                          </div>
                        )}
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="rounded-md bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

function DiffItem({ label, value, type }: { label: string; value: any; type: 'added' | 'removed' }) {
  const formatValue = (val: any): string => {
    if (Array.isArray(val)) {
      return val.join(', ')
    }
    if (typeof val === 'object') {
      return JSON.stringify(val, null, 2)
    }
    return String(val)
  }

  const colorClass = type === 'added' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'

  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{formatLabel(label)}</dt>
      <dd className={`mt-1 text-sm ${colorClass}`}>{formatValue(value)}</dd>
    </div>
  )
}

function ChangedItem({ label, change }: { label: string; change: { from: any; to: any } }) {
  const formatValue = (val: any): string => {
    if (val === undefined || val === null) return 'N/A'
    if (typeof val === 'boolean') return val ? 'Enabled' : 'Disabled'
    if (Array.isArray(val)) return val.join(', ')
    if (typeof val === 'object') return JSON.stringify(val, null, 2)
    return String(val)
  }

  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{formatLabel(label)}</dt>
      <dd className="mt-1 flex items-center text-sm">
        <span className="text-red-600 dark:text-red-400 line-through">{formatValue(change.from)}</span>
        <span className="mx-2 text-gray-400">to</span>
        <span className="text-green-600 dark:text-green-400">{formatValue(change.to)}</span>
      </dd>
    </div>
  )
}

function formatLabel(label: string): string {
  return label
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}
