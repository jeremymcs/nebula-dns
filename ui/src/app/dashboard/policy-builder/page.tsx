/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Visual Policy Builder - No-code flow-based policy editor
 */

'use client'

import { useState } from 'react'
import { PolicyFlowCanvas } from '@/components/policy-builder'
import { PolicyNode, PolicyConnection } from '@/components/policy-builder/types'
import { TemplateSelector } from '@/components/policy-builder/TemplateSelector'
import { PolicyTemplate } from '@/components/policy-builder/templates'
import { ArrowLeftIcon, XMarkIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

// Initialize with a Start node (used for blank template)
const blankNodes: PolicyNode[] = [
  {
    id: 'start-node',
    type: 'start',
    x: 100,
    y: 200,
    data: {},
  },
]

// Convert visual flow to PolicyConfig format
function flowToPolicyConfig(nodes: PolicyNode[], connections: PolicyConnection[]) {
  const blockCategories: string[] = []
  const warnCategories: string[] = []
  let threatBlocking = { enabled: false, feeds: [] as string[] }
  let safesearch = { enabled: false, services: [] as string[] }
  const schedules: Array<{
    name: string
    days: string[]
    startTime: string
    endTime: string
    timezone: string
    additionalCategories: string[]
  }> = []

  // Process each node to extract config
  nodes.forEach((node) => {
    switch (node.type) {
      case 'threat-check':
        threatBlocking = {
          enabled: true,
          feeds: (node.data.categories as string[]) || ['malware', 'phishing'],
        }
        break
      case 'category-filter':
        const cats = (node.data.categories as string[]) || []
        if (node.data.action === 'warn') {
          warnCategories.push(...cats)
        } else {
          blockCategories.push(...cats)
        }
        break
      case 'blocklist':
        // Add to block categories
        blockCategories.push(...((node.data.lists as string[]) || []))
        break
      case 'safesearch':
        safesearch = {
          enabled: node.data.enabled !== false,
          services: ['google', 'bing', 'youtube'],
        }
        break
      case 'schedule':
        schedules.push({
          name: 'Schedule Rule',
          days: (node.data.days as string[]) || [],
          startTime: (node.data.startTime as string) || '09:00',
          endTime: (node.data.endTime as string) || '17:00',
          timezone: 'America/New_York',
          additionalCategories: [],
        })
        break
    }
  })

  return {
    blockCategories: blockCategories.length ? blockCategories : ['malware', 'phishing'],
    warnCategories,
    threatBlocking: threatBlocking.enabled ? threatBlocking : { enabled: true, feeds: ['malware', 'phishing'] },
    safesearch,
    schedules,
  }
}

export default function PolicyBuilderPage() {
  const router = useRouter()
  const [nodes, setNodes] = useState<PolicyNode[]>([])
  const [connections, setConnections] = useState<PolicyConnection[]>([])
  const [showTemplateSelector, setShowTemplateSelector] = useState(true)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [policyName, setPolicyName] = useState('')
  const [policyDescription, setPolicyDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null)

  const handleSelectTemplate = (template: PolicyTemplate) => {
    setNodes(template.nodes)
    setConnections(template.connections)
    setPolicyName(template.name)
    setPolicyDescription(template.description)
    setSelectedTemplateName(template.name)
    setShowTemplateSelector(false)
  }

  const handleStartBlank = () => {
    setNodes(blankNodes)
    setConnections([])
    setSelectedTemplateName(null)
    setShowTemplateSelector(false)
  }

  const handleNodesChange = (newNodes: PolicyNode[]) => {
    setNodes(newNodes)
  }

  const handleConnectionsChange = (newConnections: PolicyConnection[]) => {
    setConnections(newConnections)
  }

  const handleSave = async () => {
    if (!policyName.trim()) {
      setSaveError('Policy name is required')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const config = flowToPolicyConfig(nodes, connections)

      // Store visual flow data along with the policy
      const visualFlow = {
        nodes,
        connections,
        templateName: selectedTemplateName,
      }

      await api.post('/policies', {
        name: policyName,
        description: policyDescription,
        config,
        visualFlow, // Store visual representation for future editing
      })

      // Success - redirect to policies list
      router.push('/dashboard/policies')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save policy')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelector
          onSelect={handleSelectTemplate}
          onStartBlank={handleStartBlank}
          onClose={() => {
            if (nodes.length === 0) {
              handleStartBlank()
            } else {
              setShowTemplateSelector(false)
            }
          }}
        />
      )}

      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-space-200 dark:border-space-700 bg-white dark:bg-space-800">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/policies"
              className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg"
            >
              <ArrowLeftIcon className="h-5 w-5 text-space-500" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-space-900 dark:text-white">
                Visual Policy Builder
                {selectedTemplateName && (
                  <span className="ml-2 text-sm font-normal text-nebula-500">
                    ({selectedTemplateName} template)
                  </span>
                )}
              </h1>
              <p className="text-sm text-space-500">Drag and drop nodes to build your policy</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="flex items-center gap-2 px-3 py-2 text-space-600 dark:text-space-400 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
              Templates
            </button>
            <Link
              href="/dashboard/policies"
              className="px-4 py-2 text-space-600 dark:text-space-400 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg"
            >
              Cancel
            </Link>
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-4 py-2 bg-nebula-500 text-white rounded-lg hover:bg-nebula-600"
            >
              Save Policy
            </button>
          </div>
        </div>

        {/* Builder */}
        <div className="flex-1">
          <PolicyFlowCanvas
            nodes={nodes}
            connections={connections}
            onNodesChange={handleNodesChange}
            onConnectionsChange={handleConnectionsChange}
          />
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-space-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-space-200 dark:border-space-700">
              <h2 className="text-lg font-semibold text-space-900 dark:text-white">Save Policy</h2>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-1 hover:bg-space-100 dark:hover:bg-space-700 rounded"
              >
                <XMarkIcon className="h-5 w-5 text-space-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {saveError && (
                <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-red-200 dark:border-red-800 rounded-lg text-danger-600 dark:text-danger-400 text-sm">
                  {saveError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                  Policy Name *
                </label>
                <input
                  type="text"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="e.g., Corporate Security Policy"
                  className="w-full px-3 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-900 text-space-900 dark:text-white focus:ring-2 focus:ring-nebula-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-1">
                  Description
                </label>
                <textarea
                  value={policyDescription}
                  onChange={(e) => setPolicyDescription(e.target.value)}
                  placeholder="Describe what this policy does..."
                  rows={3}
                  className="w-full px-3 py-2 border border-space-300 dark:border-space-600 rounded-lg bg-white dark:bg-space-900 text-space-900 dark:text-white focus:ring-2 focus:ring-nebula-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-space-200 dark:border-space-700">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-space-600 dark:text-space-400 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-nebula-500 text-white rounded-lg hover:bg-nebula-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

