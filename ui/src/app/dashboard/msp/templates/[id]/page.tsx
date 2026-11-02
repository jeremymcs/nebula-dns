/**
 * Nebula DNS - MSP Template Detail Page
 * Shows template details with version history and client application management
 * Implements US-034, US-035, US-036
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  ClockIcon,
  UsersIcon,
  PlayIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import {
  useMspTemplate,
  useMspTemplateVersions,
  useMspTemplateClients,
} from '@/hooks/useApi'
import TemplateVersionHistory from '@/components/msp/TemplateVersionHistory'
import TemplateVersionDiff from '@/components/msp/TemplateVersionDiff'
import ApplyTemplateModal from '@/components/msp/ApplyTemplateModal'
import TemplateRollbackModal from '@/components/msp/TemplateRollbackModal'
import { formatDistanceToNow } from 'date-fns'

export default function TemplateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string

  const { data: template, isLoading: templateLoading, mutate: mutateTemplate } = useMspTemplate(templateId)
  const { data: versionsData, isLoading: versionsLoading, mutate: mutateVersions } = useMspTemplateVersions(templateId)
  const { data: clientsData, isLoading: clientsLoading, mutate: mutateClients } = useMspTemplateClients(templateId)

  const [activeTab, setActiveTab] = useState<'overview' | 'versions' | 'clients'>('overview')
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [showRollbackModal, setShowRollbackModal] = useState(false)
  const [rollbackVersionId, setRollbackVersionId] = useState<string | null>(null)
  const [rollbackVersionNumber, setRollbackVersionNumber] = useState<number>(0)

  const handleViewDiff = (versionNumber: number) => {
    setSelectedVersionNumber(versionNumber)
    setShowDiff(true)
  }

  const handleRollback = (versionId: string, versionNumber: number) => {
    setRollbackVersionId(versionId)
    setRollbackVersionNumber(versionNumber)
    setShowRollbackModal(true)
  }

  const handleRollbackSuccess = () => {
    mutateTemplate()
    mutateVersions()
    setShowRollbackModal(false)
    setRollbackVersionId(null)
  }

  const handleApplySuccess = () => {
    mutateClients()
    setShowApplyModal(false)
  }

  if (templateLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Template not found</h2>
        <button
          onClick={() => router.push('/dashboard/msp/templates')}
          className="mt-4 text-primary-600 hover:text-primary-500"
        >
          Back to templates
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/msp/templates')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{template.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              v{template.version} - {template.category || 'Uncategorized'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push(`/dashboard/msp/templates?edit=${templateId}`)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit
          </button>
          <button
            onClick={() => setShowApplyModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            Apply to Clients
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentDuplicateIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Current Version
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    v{template.version}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Versions
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {versionsData?.totalVersions || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Clients Using
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {clientsData?.totalClients || 0}
                    {clientsData && clientsData.clientsOutdated > 0 && (
                      <span className="ml-2 text-sm text-yellow-600">
                        ({clientsData.clientsOutdated} outdated)
                      </span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`${
              activeTab === 'versions'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Version History
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`${
              activeTab === 'clients'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Clients ({clientsData?.totalClients || 0})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Template Configuration
          </h3>

          {template.description && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h4>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{template.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Blocked Categories ({template.config.blockCategories?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-2">
                {template.config.blockCategories?.slice(0, 10).map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  >
                    {cat}
                  </span>
                ))}
                {(template.config.blockCategories?.length || 0) > 10 && (
                  <span className="text-xs text-gray-500">
                    +{template.config.blockCategories.length - 10} more
                  </span>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Security Settings
              </h4>
              <ul className="text-sm text-gray-900 dark:text-white space-y-1">
                <li>
                  Threat Blocking: {' '}
                  <span className={template.config.threatBlocking?.enabled ? 'text-green-600' : 'text-gray-500'}>
                    {template.config.threatBlocking?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </li>
                <li>
                  SafeSearch: {' '}
                  <span className={template.config.safesearch?.enabled ? 'text-green-600' : 'text-gray-500'}>
                    {template.config.safesearch?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Metadata</h4>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="text-gray-900 dark:text-white">
                  {formatDistanceToNow(new Date(template.createdAt), { addSuffix: true })}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Last Updated</dt>
                <dd className="text-gray-900 dark:text-white">
                  {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Tags</dt>
                <dd className="text-gray-900 dark:text-white">
                  {template.tags?.length > 0 ? template.tags.join(', ') : 'None'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'versions' && (
        <TemplateVersionHistory
          templateId={templateId}
          currentVersion={template.version}
          versions={versionsData?.versions || []}
          isLoading={versionsLoading}
          onViewDiff={handleViewDiff}
          onRollback={handleRollback}
        />
      )}

      {activeTab === 'clients' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          {clientsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : clientsData?.clients.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No clients</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No clients are currently using this template.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Applied Version
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Last Applied
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {clientsData?.clients.map((client) => (
                    <tr key={client.clientId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {client.clientName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {client.clientSlug}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-900 dark:text-white">
                            v{client.appliedVersion}
                          </span>
                          {!client.isLatestVersion && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              Outdated
                            </span>
                          )}
                          {client.isLatestVersion && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Latest
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            client.status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : client.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(client.appliedAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Diff Modal */}
      {showDiff && selectedVersionNumber && (
        <TemplateVersionDiff
          templateId={templateId}
          versionNumber={selectedVersionNumber}
          currentVersion={template.version}
          onClose={() => {
            setShowDiff(false)
            setSelectedVersionNumber(null)
          }}
        />
      )}

      {/* Apply Modal */}
      {showApplyModal && (
        <ApplyTemplateModal
          templateId={templateId}
          templateName={template.name}
          templateVersion={template.version}
          clients={clientsData?.clients || []}
          onClose={() => setShowApplyModal(false)}
          onSuccess={handleApplySuccess}
        />
      )}

      {/* Rollback Modal */}
      {showRollbackModal && rollbackVersionId && (
        <TemplateRollbackModal
          templateId={templateId}
          templateName={template.name}
          currentVersion={template.version}
          targetVersionId={rollbackVersionId}
          targetVersionNumber={rollbackVersionNumber}
          clientCount={clientsData?.totalClients || 0}
          onClose={() => {
            setShowRollbackModal(false)
            setRollbackVersionId(null)
          }}
          onSuccess={handleRollbackSuccess}
        />
      )}
    </div>
  )
}
