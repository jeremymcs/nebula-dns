/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Policy Test Simulator - Test policy with sample domains and see flow execution
 */

'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { PolicyNode, PolicyConnection } from './types'
import {
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

interface SimulationResult {
  domain: string
  decision: 'allowed' | 'blocked' | 'warned'
  path: string[]
  matchedRule?: string
  executionTime: number
}

interface PolicyTestSimulatorProps {
  nodes: PolicyNode[]
  connections: PolicyConnection[]
  onHighlightPath: (nodeIds: string[]) => void
  className?: string
}

export function PolicyTestSimulator({
  nodes,
  connections,
  onHighlightPath,
  className,
}: PolicyTestSimulatorProps) {
  const [testDomain, setTestDomain] = useState('')
  const [isSimulating, setIsSimulating] = useState(false)
  const [results, setResults] = useState<SimulationResult[]>([])

  const simulatePolicy = useCallback(async (domain: string) => {
    setIsSimulating(true)
    
    // Simulate flow execution
    const startTime = performance.now()
    const path: string[] = []
    let decision: 'allowed' | 'blocked' | 'warned' = 'allowed'
    let matchedRule: string | undefined

    // Build adjacency list
    const adjacency = new Map<string, string[]>()
    connections.forEach(conn => {
      const existing = adjacency.get(conn.from) || []
      adjacency.set(conn.from, [...existing, conn.to])
    })

    // Find start node
    const startNode = nodes.find(n => n.type === 'start')
    if (startNode) {
      path.push(startNode.id)
      
      // Traverse the flow
      let currentId = startNode.id
      const visited = new Set<string>()
      
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId)
        const node = nodes.find(n => n.id === currentId)
        
        if (node) {
          // Simulate node evaluation
          const result = evaluateNode(node, domain)
          
          if (result.matched) {
            matchedRule = node.type
            decision = result.decision
            break
          }
          
          // Move to next node
          const nextNodes = adjacency.get(currentId) || []
          if (nextNodes.length > 0) {
            currentId = nextNodes[0]
            path.push(currentId)
          } else {
            break
          }
        } else {
          break
        }
      }
    }

    const executionTime = performance.now() - startTime

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))

    const result: SimulationResult = {
      domain,
      decision,
      path,
      matchedRule,
      executionTime,
    }

    setResults(prev => [result, ...prev].slice(0, 10))
    onHighlightPath(path)
    setIsSimulating(false)
  }, [nodes, connections, onHighlightPath])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (testDomain.trim()) {
      simulatePolicy(testDomain.trim())
    }
  }

  return (
    <div className={clsx('bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 overflow-hidden', className)}>
      <div className="px-4 py-3 border-b border-space-200 dark:border-space-700">
        <h3 className="font-semibold text-space-900 dark:text-white">Policy Simulator</h3>
        <p className="text-xs text-space-500 mt-1">Test how domains will be handled by this policy</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-b border-space-200 dark:border-space-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={testDomain}
            onChange={(e) => setTestDomain(e.target.value)}
            placeholder="Enter domain to test (e.g., facebook.com)"
            className="flex-1 rounded-lg border-space-300 dark:border-space-600 dark:bg-space-700 text-sm"
          />
          <button
            type="submit"
            disabled={isSimulating || !testDomain.trim()}
            className={clsx(
              'px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors',
              isSimulating
                ? 'bg-space-200 dark:bg-space-700 text-space-500 cursor-not-allowed'
                : 'bg-nebula-500 text-white hover:bg-nebula-600'
            )}
          >
            {isSimulating ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <PlayIcon className="h-4 w-4" />
            )}
            Test
          </button>
        </div>
      </form>

      <div className="max-h-[300px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {results.map((result, index) => (
            <motion.div
              key={`${result.domain}-${index}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-3 border-b border-space-100 dark:border-space-700 last:border-0"
            >
              <div className="flex items-center gap-3">
                {result.decision === 'allowed' && <CheckCircleIcon className="h-5 w-5 text-success-500" />}
                {result.decision === 'blocked' && <XCircleIcon className="h-5 w-5 text-danger-500" />}
                {result.decision === 'warned' && <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />}
                <div className="flex-1">
                  <p className="font-medium text-sm text-space-900 dark:text-white">{result.domain}</p>
                  <p className="text-xs text-space-500">
                    {result.matchedRule ? `Matched: ${result.matchedRule}` : 'No rule matched'} • {result.executionTime.toFixed(2)}ms
                  </p>
                </div>
                <span className={clsx(
                  'px-2 py-1 rounded text-xs font-medium',
                  result.decision === 'allowed' && 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
                  result.decision === 'blocked' && 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
                  result.decision === 'warned' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                )}>
                  {result.decision.toUpperCase()}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {results.length === 0 && (
          <div className="px-4 py-8 text-center text-space-500">
            <p className="text-sm">Enter a domain above to test the policy</p>
          </div>
        )}
      </div>
    </div>
  )
}

function evaluateNode(node: PolicyNode, domain: string): { matched: boolean; decision: 'allowed' | 'blocked' | 'warned' } {
  switch (node.type) {
    case 'blocklist': {
      const domains = (node.data.domains as string[]) || []
      const matched = domains.some(d => domain.includes(d) || d.includes(domain))
      return { matched, decision: 'blocked' }
    }
    case 'allowlist': {
      const domains = (node.data.domains as string[]) || []
      const matched = domains.some(d => domain.includes(d) || d.includes(domain))
      return { matched, decision: 'allowed' }
    }
    case 'threat-check': {
      // Simulate threat detection for demo
      const threatDomains = ['malware', 'phishing', 'virus', 'hack']
      const matched = threatDomains.some(t => domain.includes(t))
      return { matched, decision: 'blocked' }
    }
    case 'category-filter': {
      // Simulate category matching for demo
      const socialMedia = ['facebook', 'twitter', 'instagram', 'tiktok']
      const matched = socialMedia.some(s => domain.includes(s))
      return { matched, decision: (node.data.action as 'blocked') || 'blocked' }
    }
    case 'decision':
      return { matched: true, decision: (node.data.action as 'allowed') || 'allowed' }
    default:
      return { matched: false, decision: 'allowed' }
  }
}

