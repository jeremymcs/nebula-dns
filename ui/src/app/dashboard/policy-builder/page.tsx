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
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function PolicyBuilderPage() {
  const [nodes, setNodes] = useState<PolicyNode[]>([])
  const [connections, setConnections] = useState<PolicyConnection[]>([])

  const handleNodesChange = (newNodes: PolicyNode[]) => {
    setNodes(newNodes)
  }

  const handleConnectionsChange = (newConnections: PolicyConnection[]) => {
    setConnections(newConnections)
  }

  const handleSave = () => {
    console.log('Saving policy:', { nodes, connections })
    // Would call API to save policy
  }

  return (
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
            <h1 className="text-xl font-bold text-space-900 dark:text-white">Visual Policy Builder</h1>
            <p className="text-sm text-space-500">Drag and drop nodes to build your policy</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-space-600 dark:text-space-400 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
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
  )
}

