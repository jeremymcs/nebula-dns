/**
 * Nebula DNS - Template Version History Component
 * Displays version history for MSP templates (US-034)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { MspTemplateVersion } from '@/hooks/useApi'
import { formatDistanceToNow, format } from 'date-fns'
import {
  ClockIcon,
  ArrowPathIcon,
  DocumentMagnifyingGlassIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

interface TemplateVersionHistoryProps {
  templateId: string
  currentVersion: number
  versions: MspTemplateVersion[]
  isLoading: boolean
  onViewDiff: (versionNumber: number) => void
  onRollback: (versionId: string, versionNumber: number) => void
}

export default function TemplateVersionHistory({
  templateId,
  currentVersion,
  versions,
  isLoading,
  onViewDiff,
  onRollback,
}: TemplateVersionHistoryProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="text-center py-12">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No version history</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Version history will appear here after updates.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Version History</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View and manage all previous versions of this template
        </p>
      </div>

      <div className="flow-root">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {versions.map((version, index) => {
            const isCurrentVersion = version.version === currentVersion
            const isFirstVersion = version.version === 1

            return (
              <li key={version.id} className="relative">
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Version indicator */}
                      <div
                        className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                          isCurrentVersion
                            ? 'bg-primary-100 dark:bg-primary-900'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`text-sm font-medium ${
                            isCurrentVersion
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          v{version.version}
                        </span>
                      </div>

                      {/* Version details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Version {version.version}
                          </span>
                          {isCurrentVersion && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Current
                            </span>
                          )}
                          {version.isRollback && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              <ArrowPathIcon className="h-3 w-3 mr-1" />
                              Rollback from v{version.rollbackFromVersion}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {version.changelog || 'No changelog provided'}
                        </p>

                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {version.createdByName
                            ? `By ${version.createdByName}`
                            : 'Unknown author'}{' '}
                          - {format(new Date(version.createdAt), 'MMM d, yyyy h:mm a')} (
                          {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })})
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {!isCurrentVersion && !isFirstVersion && (
                        <button
                          onClick={() => onViewDiff(version.version)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          <DocumentMagnifyingGlassIcon className="h-4 w-4 mr-1" />
                          View Diff
                        </button>
                      )}

                      {!isCurrentVersion && (
                        <button
                          onClick={() => onRollback(version.id, version.version)}
                          className="inline-flex items-center px-3 py-1.5 border border-primary-300 dark:border-primary-600 rounded-md text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50"
                        >
                          <ArrowPathIcon className="h-4 w-4 mr-1" />
                          Rollback
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Config summary */}
                  <div className="mt-3 ml-14">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        {version.config.blockCategories?.length || 0} blocked categories
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        Threat blocking:{' '}
                        <span
                          className={
                            version.config.threatBlocking?.enabled
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-400'
                          }
                        >
                          {version.config.threatBlocking?.enabled ? 'On' : 'Off'}
                        </span>
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        SafeSearch:{' '}
                        <span
                          className={
                            version.config.safesearch?.enabled
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-400'
                          }
                        >
                          {version.config.safesearch?.enabled ? 'On' : 'Off'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
