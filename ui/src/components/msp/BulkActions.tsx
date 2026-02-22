// Nebula DNS - MSP Bulk Actions Component
// Allows MSPs to perform bulk operations across multiple client organizations
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'

interface Client {
  id: string
  name: string
  slug: string
  status: string
}

interface BulkActionsProps {
  clients: Client[]
  templates: any[]
  onComplete?: () => void
}

type ActionType = 'apply-template' | 'update-policy' | 'sync-settings'

interface DeploymentResult {
  tenantId: string
  status: 'success' | 'failed'
  policyId?: string
  error?: string
}

export function BulkActions({ clients, templates, onComplete }: BulkActionsProps) {
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [actionType, setActionType] = useState<ActionType>('apply-template')
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentResults, setDeploymentResults] = useState<DeploymentResult[]>([])
  const [showResults, setShowResults] = useState(false)

  const handleToggleClient = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  const handleSelectAll = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([])
    } else {
      setSelectedClients(clients.map(c => c.id))
    }
  }

  const handleDeployTemplate = async () => {
    if (!selectedTemplate || selectedClients.length === 0) return

    setIsDeploying(true)
    setDeploymentResults([])
    setShowResults(false)

    try {
      const response = await api.deployMspTemplate(selectedTemplate, {
        tenantIds: selectedClients,
        mode: 'overlay',
      })

      setDeploymentResults(response.results)
      setShowResults(true)

      logger.info(`Template deployed to ${response.successfulDeployments}/${response.totalTenants} clients`)

      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      logger.error('Failed to deploy template:', error)
    } finally {
      setIsDeploying(false)
    }
  }

  const successCount = deploymentResults.filter(r => r.status === 'success').length
  const failureCount = deploymentResults.filter(r => r.status === 'failed').length

  return (
    <div className="space-y-6">
      {/* Action Type Selection */}
      <div>
        <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
          Bulk Action Type
        </label>
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value as ActionType)}
          className="block w-full rounded-xl border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 px-4 py-2.5 text-space-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="apply-template">Apply Policy Template</option>
          <option value="update-policy">Update Policy Settings</option>
          <option value="sync-settings">Sync Organization Settings</option>
        </select>
      </div>

      {/* Template Selection (for apply-template action) */}
      {actionType === 'apply-template' && (
        <div>
          <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
            Select Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="block w-full rounded-xl border border-space-300 dark:border-space-600 bg-white dark:bg-space-800 px-4 py-2.5 text-space-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Choose a template...</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Client Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-space-700 dark:text-space-300">
            Select Clients ({selectedClients.length} of {clients.length})
          </label>
          <button
            onClick={handleSelectAll}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            {selectedClients.length === clients.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="border border-space-200 dark:border-space-700 rounded-xl divide-y divide-space-200 dark:divide-space-700 max-h-96 overflow-y-auto">
          {clients.map((client) => (
            <label
              key={client.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-space-50 dark:hover:bg-space-800/50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedClients.includes(client.id)}
                onChange={() => handleToggleClient(client.id)}
                className="h-4 w-4 rounded border-space-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-space-900 dark:text-white">
                  {client.name}
                </div>
                <div className="text-xs text-space-500 dark:text-space-400">
                  {client.slug}
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                client.status === 'active'
                  ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                  : 'bg-space-100 text-space-700 dark:bg-space-700 dark:text-space-300'
              }`}>
                {client.status}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Deploy Button */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleDeployTemplate}
          disabled={!selectedTemplate || selectedClients.length === 0 || isDeploying}
          className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isDeploying ? (
            <>
              <ClockIcon className="h-5 w-5 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <DocumentDuplicateIcon className="h-5 w-5" />
              Deploy to {selectedClients.length} Client{selectedClients.length !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>

      {/* Deployment Results */}
      {showResults && deploymentResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6"
        >
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
            Deployment Results
          </h3>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-success-50 dark:bg-success-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-success-700 dark:text-success-400">
                <CheckCircleIcon className="h-5 w-5" />
                <span className="text-2xl font-bold">{successCount}</span>
              </div>
              <div className="text-sm text-success-600 dark:text-success-500 mt-1">
                Successful
              </div>
            </div>

            <div className="bg-danger-50 dark:bg-danger-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-danger-700 dark:text-danger-400">
                <XCircleIcon className="h-5 w-5" />
                <span className="text-2xl font-bold">{failureCount}</span>
              </div>
              <div className="text-sm text-danger-600 dark:text-danger-500 mt-1">
                Failed
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-2">
            {deploymentResults.map((result) => {
              const client = clients.find(c => c.id === result.tenantId)
              return (
                <div
                  key={result.tenantId}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.status === 'success'
                      ? 'bg-success-50 dark:bg-success-900/20'
                      : 'bg-danger-50 dark:bg-danger-900/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.status === 'success' ? (
                      <CheckCircleIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-danger-600 dark:text-danger-400" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-space-900 dark:text-white">
                        {client?.name || result.tenantId}
                      </div>
                      {result.error && (
                        <div className="text-xs text-danger-600 dark:text-danger-400 mt-1">
                          {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                  {result.policyId && (
                    <div className="text-xs text-space-500 dark:text-space-400">
                      Policy: {result.policyId.slice(0, 8)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
