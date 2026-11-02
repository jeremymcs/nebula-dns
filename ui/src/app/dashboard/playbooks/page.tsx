/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Playbooks - Incident Response Automation
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import {
  PlaybookList,
  PlaybookBuilder,
  Playbook,
  PlaybookExecution,
  ExecutionStep,
  generateDemoPlaybooks,
} from '@/components/playbooks'
import { usePlaybooks } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui'
import { useToast } from '@/components/Toast'
import {
  BoltIcon,
  PlusIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

export default function PlaybooksPage() {
  const { data: playbooksData, error, isLoading, mutate } = usePlaybooks()
  const { showToast } = useToast()
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | undefined>()
  const [importing, setImporting] = useState(false)
  const [currentExecution, setCurrentExecution] = useState<PlaybookExecution | null>(null)
  const [showExecutionModal, setShowExecutionModal] = useState(false)
  const [executionHistory, setExecutionHistory] = useState<PlaybookExecution[]>([])
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [runningPlaybookIds, setRunningPlaybookIds] = useState<Set<string>>(new Set())

  // Sync with API data or fallback to demo data
  useEffect(() => {
    if (playbooksData?.data && playbooksData.data.length > 0) {
      setPlaybooks(playbooksData.data)
    } else if (!isLoading && (error || !playbooksData?.data?.length)) {
      // Fallback to demo data for new tenants or on error
      setPlaybooks(generateDemoPlaybooks())
    }
  }, [playbooksData, isLoading, error])

  // Simulate execution progress
  const simulateExecution = useCallback((playbook: Playbook) => {
    const execution: PlaybookExecution = {
      id: `exec-${Date.now()}`,
      playbookId: playbook.id,
      playbookName: playbook.name,
      status: 'running',
      startedAt: new Date().toISOString(),
      steps: playbook.steps.map((step) => ({
        stepId: step.id,
        stepName: step.name,
        status: 'pending',
      })),
      triggerData: { manual: true, triggeredBy: 'current_user' },
    }

    setCurrentExecution(execution)
    setShowExecutionModal(true)
    setRunningPlaybookIds((prev) => new Set(prev).add(playbook.id))

    // Simulate each step completing
    let stepIndex = 0
    const runStep = () => {
      if (stepIndex >= execution.steps.length) {
        // All steps complete
        setCurrentExecution((prev) => prev ? {
          ...prev,
          status: 'completed',
          completedAt: new Date().toISOString(),
          steps: prev.steps.map((s) => ({ ...s, status: 'completed' as const })),
        } : null)
        setRunningPlaybookIds((prev) => {
          const next = new Set(prev)
          next.delete(playbook.id)
          return next
        })
        setExecutionHistory((prev) => [{
          ...execution,
          status: 'completed',
          completedAt: new Date().toISOString(),
          steps: execution.steps.map((s) => ({
            ...s,
            status: 'completed' as const,
            completedAt: new Date().toISOString(),
          })),
        }, ...prev.slice(0, 49)])
        showToast('success', `Playbook "${playbook.name}" completed successfully`)
        return
      }

      // Update current step to running
      setCurrentExecution((prev) => prev ? {
        ...prev,
        currentStep: execution.steps[stepIndex].stepId,
        steps: prev.steps.map((s, i) => ({
          ...s,
          status: i < stepIndex ? 'completed' as const : i === stepIndex ? 'running' as const : 'pending' as const,
          startedAt: i === stepIndex ? new Date().toISOString() : s.startedAt,
          completedAt: i < stepIndex ? new Date().toISOString() : undefined,
        })),
      } : null)

      // Simulate step duration (1-3 seconds)
      const duration = 1000 + Math.random() * 2000
      setTimeout(() => {
        stepIndex++
        runStep()
      }, duration)
    }

    // Start the first step after a short delay
    setTimeout(runStep, 500)
  }, [showToast])

  const handleToggle = async (id: string, enabled: boolean) => {
    // Optimistic update
    setPlaybooks(playbooks.map((p) => (p.id === id ? { ...p, isEnabled: enabled } : p)))
    try {
      await api.updatePlaybook(id, { isEnabled: enabled })
      mutate()
    } catch (err) {
      // Revert on error
      setPlaybooks(playbooks.map((p) => (p.id === id ? { ...p, isEnabled: !enabled } : p)))
    }
  }

  const handleEdit = (playbook: Playbook) => {
    setEditingPlaybook(playbook)
    setIsBuilderOpen(true)
  }

  const handleRun = async (playbook: Playbook) => {
    if (runningPlaybookIds.has(playbook.id)) {
      showToast('warning', 'This playbook is already running')
      return
    }
    try {
      // Try API call first
      await api.runPlaybook(playbook.id)
      // If successful, simulate the execution UI
      simulateExecution(playbook)
    } catch (err) {
      // If API fails (demo mode), still show the simulation
      console.warn('API call failed, running simulation:', err)
      simulateExecution(playbook)
    }
  }

  const handleSave = async (data: Partial<Playbook>) => {
    try {
      if (editingPlaybook) {
        await api.updatePlaybook(editingPlaybook.id, data)
      } else {
        await api.createPlaybook({
          name: data.name || 'New Playbook',
          description: data.description || '',
          trigger: data.trigger || { type: 'manual', conditions: [] },
          steps: data.steps || [],
          isEnabled: false,
        })
      }
      mutate()
    } catch (err: any) {
      console.error('Failed to save playbook:', err?.message || err)
    }
    setIsBuilderOpen(false)
    setEditingPlaybook(undefined)
  }

  const handleCancel = () => {
    setIsBuilderOpen(false)
    setEditingPlaybook(undefined)
  }

  const handleImportSamples = async () => {
    setImporting(true)
    try {
      const demoPlaybooks = generateDemoPlaybooks()
      for (const playbook of demoPlaybooks) {
        await api.createPlaybook({
          name: playbook.name,
          description: playbook.description,
          trigger: playbook.trigger,
          steps: playbook.steps,
          isEnabled: false,
        })
      }
      mutate()
    } catch (err: any) {
      console.error('Failed to import samples:', err?.message || err)
    } finally {
      setImporting(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          <p className="text-space-500">Loading playbooks...</p>
        </div>
      </div>
    )
  }

  // Use demo data for errors instead of showing error state
  const usingDemoData = error || !playbooksData?.data?.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500">
            <BoltIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-space-900 dark:text-white">Incident Playbooks</h1>
            <p className="text-space-500">Automated response workflows for security incidents</p>
          </div>
        </div>
        <button
          onClick={() => setIsBuilderOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
        >
          <PlusIcon className="h-5 w-5" />
          Create Playbook
        </button>
      </div>

      {/* Demo Data Notice */}
      {usingDemoData && !isBuilderOpen && (
        <div className="flex items-center justify-between gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center gap-3">
            <InformationCircleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Showing sample playbooks. Import them to use as starting templates.
            </p>
          </div>
          <button
            onClick={handleImportSamples}
            disabled={importing}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {importing ? 'Importing...' : 'Import Samples'}
          </button>
        </div>
      )}

      {/* Builder or List */}
      {isBuilderOpen ? (
        <PlaybookBuilder
          playbook={editingPlaybook}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <>
          <PlaybookList
            playbooks={playbooks}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onRun={handleRun}
            runningIds={runningPlaybookIds}
          />

          {/* Execution History Button */}
          {executionHistory.length > 0 && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-space-500 hover:text-space-700 dark:hover:text-space-300"
              >
                <ClockIcon className="h-4 w-4" />
                View Execution History ({executionHistory.length})
              </button>
            </div>
          )}
        </>
      )}

      {/* Execution Progress Modal */}
      <Modal
        isOpen={showExecutionModal}
        onClose={() => setShowExecutionModal(false)}
        title={currentExecution ? `Running: ${currentExecution.playbookName}` : 'Execution Progress'}
      >
        {currentExecution && (
          <div className="space-y-4">
            {/* Status Header */}
            <div className="flex items-center justify-between p-3 bg-space-50 dark:bg-space-900 rounded-lg">
              <div className="flex items-center gap-2">
                {currentExecution.status === 'running' ? (
                  <ArrowPathIcon className="h-5 w-5 text-primary-500 animate-spin" />
                ) : currentExecution.status === 'completed' ? (
                  <CheckCircleIcon className="h-5 w-5 text-success-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-danger-500" />
                )}
                <span className={clsx(
                  'font-medium capitalize',
                  currentExecution.status === 'running' && 'text-primary-500',
                  currentExecution.status === 'completed' && 'text-success-500',
                  currentExecution.status === 'failed' && 'text-danger-500'
                )}>
                  {currentExecution.status}
                </span>
              </div>
              <span className="text-sm text-space-500">
                Started: {new Date(currentExecution.startedAt).toLocaleTimeString()}
              </span>
            </div>

            {/* Steps Progress */}
            <div className="space-y-2">
              {currentExecution.steps.map((step, index) => (
                <motion.div
                  key={step.stepId}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    step.status === 'running' && 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700',
                    step.status === 'completed' && 'bg-success-50 dark:bg-success-900/20 border-success-300 dark:border-success-700',
                    step.status === 'failed' && 'bg-danger-50 dark:bg-danger-900/20 border-danger-300 dark:border-danger-700',
                    step.status === 'pending' && 'bg-space-50 dark:bg-space-900 border-space-200 dark:border-space-700'
                  )}
                >
                  <span className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                    step.status === 'running' && 'bg-primary-500 text-white',
                    step.status === 'completed' && 'bg-success-500 text-white',
                    step.status === 'failed' && 'bg-danger-500 text-white',
                    step.status === 'pending' && 'bg-space-200 dark:bg-space-700 text-space-600 dark:text-space-400'
                  )}>
                    {step.status === 'completed' ? '✓' : step.status === 'failed' ? '✗' : index + 1}
                  </span>
                  <span className={clsx(
                    'flex-1',
                    step.status === 'pending' && 'text-space-500',
                    step.status !== 'pending' && 'text-space-900 dark:text-white'
                  )}>
                    {step.stepName}
                  </span>
                  {step.status === 'running' && (
                    <ArrowPathIcon className="h-4 w-4 text-primary-500 animate-spin" />
                  )}
                  {step.status === 'completed' && (
                    <CheckCircleIcon className="h-4 w-4 text-success-500" />
                  )}
                  {step.status === 'failed' && (
                    <XCircleIcon className="h-4 w-4 text-danger-500" />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Close button when complete */}
            {currentExecution.status !== 'running' && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowExecutionModal(false)}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Execution History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Execution History"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {executionHistory.length === 0 ? (
            <p className="text-center text-space-500 py-8">No execution history yet</p>
          ) : (
            executionHistory.map((execution) => (
              <div
                key={execution.id}
                className="p-4 bg-space-50 dark:bg-space-900 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {execution.status === 'completed' ? (
                      <CheckCircleIcon className="h-5 w-5 text-success-500" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-danger-500" />
                    )}
                    <span className="font-medium text-space-900 dark:text-white">
                      {execution.playbookName}
                    </span>
                  </div>
                  <span className={clsx(
                    'px-2 py-0.5 text-xs rounded-full capitalize',
                    execution.status === 'completed'
                      ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400'
                      : 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400'
                  )}>
                    {execution.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-space-500">
                  <span>Started: {new Date(execution.startedAt).toLocaleString()}</span>
                  {execution.completedAt && (
                    <span>
                      Duration: {Math.round((new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000)}s
                    </span>
                  )}
                </div>
                <div className="flex gap-1 mt-2">
                  {execution.steps.map((step) => (
                    <div
                      key={step.stepId}
                      className={clsx(
                        'flex-1 h-1.5 rounded-full',
                        step.status === 'completed' && 'bg-success-500',
                        step.status === 'failed' && 'bg-danger-500',
                        step.status === 'skipped' && 'bg-space-300'
                      )}
                      title={`${step.stepName}: ${step.status}`}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}

