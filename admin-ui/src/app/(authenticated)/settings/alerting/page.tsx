/**
 * Nebula DNS - Alerting Settings Page
 * Management interface for Slack and PagerDuty alert integrations
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useState, useCallback } from 'react'
import {
  ChatBubbleLeftRightIcon,
  BellAlertIcon,
  CogIcon,
} from '@heroicons/react/24/outline'
import { Card, Button } from '@/components/ui'
import { useRequireFeature } from '@/hooks/useRequireRole'
import { useToast } from '@/components/Toast'
import {
  useAlertConfigs,
  enableAlertConfig,
  disableAlertConfig,
  testAlertConfig,
  deleteAlertConfig,
} from '@/hooks/useAlertConfigs'
import {
  AlertConfigCard,
  SlackConfigModal,
  PagerDutyConfigModal,
} from '@/components/alerting'
import type { AlertConfigResponse, TestAlertResponse } from '@/types/alerting'

export default function AlertingSettingsPage() {
  // Route protection - redirects non-admin users
  const hasAccess = useRequireFeature('alerting-config')
  const { showToast } = useToast()

  // Modal state
  const [showSlackModal, setShowSlackModal] = useState(false)
  const [showPagerDutyModal, setShowPagerDutyModal] = useState(false)

  // Operation state
  const [testingId, setTestingId] = useState<string | null>(null)

  // Fetch alert configurations
  const {
    data: configs,
    isLoading,
    mutate,
  } = useAlertConfigs()

  // Handler: toggle enable/disable
  const handleToggle = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        if (enabled) {
          await enableAlertConfig(id)
        } else {
          await disableAlertConfig(id)
        }
        mutate() // Refresh list
        showToast(
          'success',
          enabled ? 'Integration Enabled' : 'Integration Disabled',
          enabled
            ? 'Alert integration is now active'
            : 'Alert integration has been disabled'
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update integration'
        showToast('error', 'Update Failed', message)
      }
    },
    [mutate, showToast]
  )

  // Handler: test alert configuration
  const handleTest = useCallback(
    async (id: string) => {
      setTestingId(id)
      try {
        const result: TestAlertResponse = await testAlertConfig(id)
        if (result.success) {
          showToast(
            'success',
            'Test Alert Sent',
            `Response time: ${result.responseTimeMs}ms`
          )
        } else {
          showToast('error', 'Test Alert Failed', result.message || 'Unknown error')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send test alert'
        showToast('error', 'Test Failed', message)
      } finally {
        setTestingId(null)
      }
    },
    [showToast]
  )

  // Handler: delete configuration
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteAlertConfig(id)
        mutate() // Refresh list
        showToast('success', 'Integration Deleted', 'Alert integration has been removed')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete integration'
        showToast('error', 'Delete Failed', message)
      }
    },
    [mutate, showToast]
  )

  // Handler: edit configuration (placeholder for future edit modal)
  const handleEdit = useCallback((config: AlertConfigResponse) => {
    // TODO: Implement edit modal in future enhancement
    showToast('info', 'Edit Coming Soon', `Edit functionality for "${config.name}" will be available soon`)
  }, [showToast])

  // Handler: modal success (refresh list)
  const handleCreateSuccess = useCallback(() => {
    mutate()
  }, [mutate])

  // Render nothing while checking access (redirect happens in hook)
  if (!hasAccess) {
    return null
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header Skeleton */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <div className="h-9 w-48 bg-space-200 dark:bg-space-700 rounded-lg animate-pulse" />
            <div className="mt-2 h-5 w-96 bg-space-100 dark:bg-space-800 rounded animate-pulse" />
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <div className="h-10 w-28 bg-space-200 dark:bg-space-700 rounded-lg animate-pulse" />
            <div className="h-10 w-36 bg-space-200 dark:bg-space-700 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} variant="glass" padding="md">
              <div className="animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-space-200 dark:bg-space-700 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-5 w-32 bg-space-200 dark:bg-space-700 rounded" />
                    <div className="mt-2 h-4 w-24 bg-space-100 dark:bg-space-800 rounded" />
                    <div className="mt-4 h-4 w-40 bg-space-100 dark:bg-space-800 rounded" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Check if configs is empty
  const hasConfigs = configs && configs.length > 0

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-space-900 dark:text-white">
            Alerting Settings
          </h1>
          <p className="mt-2 text-space-500 dark:text-space-400">
            Configure Slack and PagerDuty integrations for system alerts
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <Button
            variant="primary"
            leftIcon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
            onClick={() => setShowSlackModal(true)}
          >
            Add Slack
          </Button>
          <Button
            variant="secondary"
            leftIcon={<BellAlertIcon className="h-5 w-5" />}
            onClick={() => setShowPagerDutyModal(true)}
          >
            Add PagerDuty
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {hasConfigs ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {configs.map((config) => (
            <AlertConfigCard
              key={config.id}
              config={config}
              onEdit={handleEdit}
              onTest={handleTest}
              onDelete={handleDelete}
              onToggle={handleToggle}
              isTestingId={testingId}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card variant="glass" padding="lg">
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
              <CogIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-2">
              No Alert Integrations
            </h3>
            <p className="text-space-500 dark:text-space-400 max-w-md mx-auto mb-6">
              Get notified about system health, security events, and billing alerts. Add your
              first Slack or PagerDuty integration to start receiving alerts.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                variant="primary"
                leftIcon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
                onClick={() => setShowSlackModal(true)}
              >
                Add Slack
              </Button>
              <Button
                variant="secondary"
                leftIcon={<BellAlertIcon className="h-5 w-5" />}
                onClick={() => setShowPagerDutyModal(true)}
              >
                Add PagerDuty
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Modals */}
      <SlackConfigModal
        isOpen={showSlackModal}
        onClose={() => setShowSlackModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <PagerDutyConfigModal
        isOpen={showPagerDutyModal}
        onClose={() => setShowPagerDutyModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
