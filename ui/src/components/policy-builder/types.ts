/**
 * Nebula DNS - Policy Builder Types
 */

export type PolicyNodeType =
  | 'start'
  | 'threat-check'
  | 'category-filter'
  | 'allowlist'
  | 'blocklist'
  | 'schedule'
  | 'safesearch'
  | 'decision'
  | 'condition'

export interface PolicyNode {
  id: string
  type: PolicyNodeType
  x: number
  y: number
  data: Record<string, unknown>
}

export interface PolicyConnection {
  id: string
  from: string
  to: string
  label?: string
  condition?: string
}

export interface PolicyFlow {
  id: string
  name: string
  description?: string
  nodes: PolicyNode[]
  connections: PolicyConnection[]
  version: number
  createdAt: string
  updatedAt: string
}

// Node configuration interfaces
export interface ThreatCheckData {
  categories: string[]
  action: 'block' | 'warn' | 'log'
}

export interface CategoryFilterData {
  categories: string[]
  action: 'block' | 'allow' | 'warn'
}

export interface AllowlistData {
  domains: string[]
  lists: string[]
}

export interface BlocklistData {
  domains: string[]
  lists: string[]
}

export interface ScheduleData {
  days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[]
  startTime: string
  endTime: string
  timezone?: string
}

export interface SafeSearchData {
  enabled: boolean
  services: ('google' | 'bing' | 'youtube' | 'duckduckgo')[]
}

export interface DecisionData {
  action: 'allow' | 'block' | 'warn' | 'redirect'
  redirectUrl?: string
  blockPageId?: string
}

export interface ConditionData {
  field: 'domain' | 'category' | 'time' | 'zone' | 'user'
  operator: 'equals' | 'contains' | 'matches' | 'in'
  value: string | string[]
}

// Node display configuration
export interface NodeConfig {
  type: PolicyNodeType
  label: string
  description: string
  icon: string
  color: string
  maxConnections: {
    inputs: number
    outputs: number
  }
}

export const NODE_CONFIGS: Record<PolicyNodeType, NodeConfig> = {
  start: {
    type: 'start',
    label: 'Start',
    description: 'Entry point for DNS query',
    icon: 'PlayIcon',
    color: 'green',
    maxConnections: { inputs: 0, outputs: 1 },
  },
  'threat-check': {
    type: 'threat-check',
    label: 'Threat Check',
    description: 'Check against threat intelligence',
    icon: 'ShieldExclamationIcon',
    color: 'red',
    maxConnections: { inputs: 1, outputs: 2 },
  },
  'category-filter': {
    type: 'category-filter',
    label: 'Category Filter',
    description: 'Filter by content category',
    icon: 'FunnelIcon',
    color: 'purple',
    maxConnections: { inputs: 1, outputs: 2 },
  },
  allowlist: {
    type: 'allowlist',
    label: 'Allowlist',
    description: 'Check against allowlist',
    icon: 'CheckCircleIcon',
    color: 'green',
    maxConnections: { inputs: 1, outputs: 2 },
  },
  blocklist: {
    type: 'blocklist',
    label: 'Blocklist',
    description: 'Check against blocklist',
    icon: 'NoSymbolIcon',
    color: 'red',
    maxConnections: { inputs: 1, outputs: 2 },
  },
  schedule: {
    type: 'schedule',
    label: 'Schedule',
    description: 'Time-based filtering',
    icon: 'ClockIcon',
    color: 'blue',
    maxConnections: { inputs: 1, outputs: 2 },
  },
  safesearch: {
    type: 'safesearch',
    label: 'SafeSearch',
    description: 'Enforce safe search',
    icon: 'ShieldCheckIcon',
    color: 'cyan',
    maxConnections: { inputs: 1, outputs: 1 },
  },
  decision: {
    type: 'decision',
    label: 'Decision',
    description: 'Final action for query',
    icon: 'FlagIcon',
    color: 'amber',
    maxConnections: { inputs: 1, outputs: 0 },
  },
  condition: {
    type: 'condition',
    label: 'Condition',
    description: 'Custom condition check',
    icon: 'AdjustmentsHorizontalIcon',
    color: 'indigo',
    maxConnections: { inputs: 1, outputs: 2 },
  },
}

