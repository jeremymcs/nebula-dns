/**
 * Nebula DNS - Policy Builder Serializers
 * Convert between visual flow graph and policy JSON format
 */

import { PolicyNode, PolicyConnection, PolicyFlow, PolicyNodeType } from './types'

// Policy JSON format (API format)
export interface PolicyJSON {
  id: string
  name: string
  description?: string
  version: number
  rules: PolicyRule[]
  settings: PolicySettings
  createdAt: string
  updatedAt: string
}

export interface PolicyRule {
  id: string
  type: 'threat' | 'category' | 'allowlist' | 'blocklist' | 'schedule' | 'safesearch' | 'custom'
  enabled: boolean
  priority: number
  config: Record<string, unknown>
  action: 'allow' | 'block' | 'warn' | 'redirect'
}

export interface PolicySettings {
  defaultAction: 'allow' | 'block'
  logQueries: boolean
  blockPage?: string
}

/**
 * Convert visual flow graph to policy JSON format
 */
export function flowToPolicy(flow: PolicyFlow): PolicyJSON {
  const rules: PolicyRule[] = []
  let priority = 0

  // Traverse the flow graph from start node
  const startNode = flow.nodes.find(n => n.type === 'start')
  if (!startNode) {
    throw new Error('Flow must have a start node')
  }

  // Build adjacency list
  const adjacency = new Map<string, string[]>()
  flow.connections.forEach(conn => {
    const existing = adjacency.get(conn.from) || []
    adjacency.set(conn.from, [...existing, conn.to])
  })

  // BFS traversal to convert nodes to rules
  const visited = new Set<string>()
  const queue = [startNode.id]

  while (queue.length > 0) {
    const nodeId = queue.shift()!
    if (visited.has(nodeId)) continue
    visited.add(nodeId)

    const node = flow.nodes.find(n => n.id === nodeId)
    if (!node) continue

    // Convert node to rule
    const rule = nodeToRule(node, priority++)
    if (rule) {
      rules.push(rule)
    }

    // Add connected nodes to queue
    const nextNodes = adjacency.get(nodeId) || []
    nextNodes.forEach(nextId => queue.push(nextId))
  }

  // Determine default action from decision nodes
  const decisionNodes = flow.nodes.filter(n => n.type === 'decision')
  const defaultAction = decisionNodes.length > 0 
    ? (decisionNodes[0].data.action as 'allow' | 'block') || 'allow'
    : 'allow'

  return {
    id: flow.id,
    name: flow.name,
    description: flow.description,
    version: flow.version,
    rules,
    settings: {
      defaultAction,
      logQueries: true,
    },
    createdAt: flow.createdAt,
    updatedAt: new Date().toISOString(),
  }
}

function nodeToRule(node: PolicyNode, priority: number): PolicyRule | null {
  switch (node.type) {
    case 'threat-check':
      return {
        id: node.id,
        type: 'threat',
        enabled: true,
        priority,
        config: { categories: node.data.categories || [] },
        action: (node.data.action as 'block') || 'block',
      }
    case 'category-filter':
      return {
        id: node.id,
        type: 'category',
        enabled: true,
        priority,
        config: { categories: node.data.categories || [] },
        action: (node.data.action as 'block') || 'block',
      }
    case 'allowlist':
      return {
        id: node.id,
        type: 'allowlist',
        enabled: true,
        priority,
        config: { domains: node.data.domains || [], lists: node.data.lists || [] },
        action: 'allow',
      }
    case 'blocklist':
      return {
        id: node.id,
        type: 'blocklist',
        enabled: true,
        priority,
        config: { domains: node.data.domains || [], lists: node.data.lists || [] },
        action: 'block',
      }
    case 'schedule':
      return {
        id: node.id,
        type: 'schedule',
        enabled: true,
        priority,
        config: { days: node.data.days, startTime: node.data.startTime, endTime: node.data.endTime },
        action: 'block',
      }
    case 'safesearch':
      return {
        id: node.id,
        type: 'safesearch',
        enabled: node.data.enabled !== false,
        priority,
        config: { services: node.data.services || ['google', 'bing', 'youtube'] },
        action: 'allow',
      }
    default:
      return null
  }
}

/**
 * Convert policy JSON to visual flow graph
 */
export function policyToFlow(policy: PolicyJSON): PolicyFlow {
  const nodes: PolicyNode[] = []
  const connections: PolicyConnection[] = []
  let y = 100

  // Create start node
  const startNode: PolicyNode = {
    id: 'start',
    type: 'start',
    x: 100,
    y: 300,
    data: {},
  }
  nodes.push(startNode)

  let prevNodeId = startNode.id

  // Convert each rule to a node
  policy.rules.forEach((rule, index) => {
    const node = ruleToNode(rule, 400, y)
    if (node) {
      nodes.push(node)
      connections.push({ id: `conn-${index}`, from: prevNodeId, to: node.id })
      prevNodeId = node.id
      y += 120
    }
  })

  // Add decision node at the end
  const decisionNode: PolicyNode = {
    id: 'decision-end',
    type: 'decision',
    x: 700,
    y: 300,
    data: { action: policy.settings.defaultAction },
  }
  nodes.push(decisionNode)
  connections.push({ id: 'conn-final', from: prevNodeId, to: decisionNode.id })

  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    nodes,
    connections,
    version: policy.version,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  }
}

function ruleToNode(rule: PolicyRule, x: number, y: number): PolicyNode | null {
  const typeMap: Record<string, PolicyNodeType> = {
    threat: 'threat-check',
    category: 'category-filter',
    allowlist: 'allowlist',
    blocklist: 'blocklist',
    schedule: 'schedule',
    safesearch: 'safesearch',
  }

  const nodeType = typeMap[rule.type]
  if (!nodeType) return null

  return {
    id: rule.id,
    type: nodeType,
    x,
    y,
    data: { ...rule.config, action: rule.action },
  }
}

