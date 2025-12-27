/**
 * Nebula DNS - Orion AI Co-Pilot Types
 */

export interface OrionMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  actions?: OrionAction[]
  metadata?: {
    context?: string
    confidence?: number
    sources?: string[]
  }
}

export interface OrionAction {
  id: string
  type: OrionActionType
  label: string
  description?: string
  data: Record<string, unknown>
  requiresConfirmation?: boolean
}

export type OrionActionType =
  | 'block-domain'
  | 'unblock-domain'
  | 'create-policy'
  | 'update-policy'
  | 'navigate'
  | 'investigate'
  | 'report'
  | 'alert'
  | 'schedule'
  | 'custom'

export interface OrionContext {
  currentPage: string
  selectedZone?: string
  selectedPolicy?: string
  recentActivity: OrionActivityItem[]
  pendingAlerts: OrionAlert[]
}

export interface OrionActivityItem {
  type: 'query' | 'block' | 'policy-change' | 'zone-update'
  description: string
  timestamp: Date
  data?: Record<string, unknown>
}

export interface OrionAlert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  timestamp: Date
  actionable: boolean
  suggestedAction?: OrionAction
}

export interface OrionConversation {
  id: string
  messages: OrionMessage[]
  context: OrionContext
  createdAt: Date
  updatedAt: Date
}

// AI function calling types
export interface OrionFunction {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
    }>
    required: string[]
  }
}

export const ORION_FUNCTIONS: OrionFunction[] = [
  {
    name: 'block_domain',
    description: 'Block a domain across one or more zones',
    parameters: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'The domain to block' },
        zones: { type: 'string', description: 'Comma-separated zone IDs or "all"' },
        duration: { type: 'string', description: 'Block duration: permanent, 1h, 24h, 7d', enum: ['permanent', '1h', '24h', '7d'] },
      },
      required: ['domain'],
    },
  },
  {
    name: 'unblock_domain',
    description: 'Remove a domain from blocklist',
    parameters: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'The domain to unblock' },
        zones: { type: 'string', description: 'Comma-separated zone IDs or "all"' },
      },
      required: ['domain'],
    },
  },
  {
    name: 'get_threat_summary',
    description: 'Get a summary of recent threat activity',
    parameters: {
      type: 'object',
      properties: {
        timeRange: { type: 'string', description: 'Time range: 1h, 24h, 7d, 30d', enum: ['1h', '24h', '7d', '30d'] },
        zone: { type: 'string', description: 'Optional zone ID to filter by' },
      },
      required: [],
    },
  },
  {
    name: 'search_logs',
    description: 'Search DNS query logs',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (domain, IP, or keyword)' },
        decision: { type: 'string', description: 'Filter by decision', enum: ['allowed', 'blocked', 'warned'] },
        timeRange: { type: 'string', description: 'Time range', enum: ['1h', '24h', '7d', '30d'] },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_policy',
    description: 'Create a new DNS filtering policy',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Policy name' },
        template: { type: 'string', description: 'Template to use', enum: ['family-safe', 'corporate', 'education', 'minimal', 'blank'] },
        zones: { type: 'string', description: 'Comma-separated zone IDs to apply to' },
      },
      required: ['name'],
    },
  },
  {
    name: 'explain_block',
    description: 'Explain why a domain was blocked',
    parameters: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'The blocked domain' },
        queryId: { type: 'string', description: 'Optional specific query ID' },
      },
      required: ['domain'],
    },
  },
]

