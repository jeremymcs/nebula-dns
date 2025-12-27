/**
 * Nebula DNS - Incident Response Playbook Types
 */

export interface Playbook {
  id: string
  name: string
  description: string
  trigger: PlaybookTrigger
  steps: PlaybookStep[]
  isEnabled: boolean
  isBuiltIn: boolean
  lastTriggered?: string
  triggerCount: number
  createdAt: string
  updatedAt: string
}

export interface PlaybookTrigger {
  type: 'threat_detected' | 'threshold_exceeded' | 'pattern_match' | 'manual'
  conditions: TriggerCondition[]
}

export interface TriggerCondition {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'matches'
  value: string | number
}

export interface PlaybookStep {
  id: string
  type: PlaybookActionType
  name: string
  config: Record<string, unknown>
  onSuccess?: string // next step id
  onFailure?: string // next step id or 'abort'
}

export type PlaybookActionType =
  | 'block_domain'
  | 'block_ip'
  | 'notify_slack'
  | 'notify_email'
  | 'create_ticket'
  | 'pagerduty_alert'
  | 'webhook'
  | 'wait'
  | 'condition'
  | 'log'

export interface PlaybookExecution {
  id: string
  playbookId: string
  playbookName: string
  status: 'running' | 'completed' | 'failed' | 'paused'
  startedAt: string
  completedAt?: string
  currentStep?: string
  steps: ExecutionStep[]
  triggerData: Record<string, unknown>
}

export interface ExecutionStep {
  stepId: string
  stepName: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startedAt?: string
  completedAt?: string
  output?: string
  error?: string
}

// Demo data generators
export function generateDemoPlaybooks(): Playbook[] {
  return [
    {
      id: 'pb1',
      name: 'Ransomware Response',
      description: 'Automatically respond to ransomware C2 domain detection',
      trigger: {
        type: 'threat_detected',
        conditions: [{ field: 'threat_type', operator: 'equals', value: 'ransomware' }],
      },
      steps: [
        { id: 's1', type: 'block_domain', name: 'Block C2 Domain', config: { scope: 'all_zones' } },
        { id: 's2', type: 'notify_slack', name: 'Alert Security Team', config: { channel: '#security-alerts' } },
        { id: 's3', type: 'create_ticket', name: 'Create Incident Ticket', config: { priority: 'critical' } },
        { id: 's4', type: 'pagerduty_alert', name: 'Page On-Call', config: { severity: 'critical' } },
      ],
      isEnabled: true,
      isBuiltIn: true,
      triggerCount: 3,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-03-15T00:00:00Z',
    },
    {
      id: 'pb2',
      name: 'DGA Detection Response',
      description: 'Respond to Domain Generation Algorithm activity',
      trigger: {
        type: 'pattern_match',
        conditions: [{ field: 'dga_score', operator: 'greater_than', value: 0.8 }],
      },
      steps: [
        { id: 's1', type: 'block_domain', name: 'Block DGA Domain', config: {} },
        { id: 's2', type: 'log', name: 'Log Detection', config: { level: 'warning' } },
        { id: 's3', type: 'notify_email', name: 'Email Report', config: { to: 'security@company.com' } },
      ],
      isEnabled: true,
      isBuiltIn: true,
      triggerCount: 47,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-03-10T00:00:00Z',
    },
    {
      id: 'pb3',
      name: 'Phishing Outbreak',
      description: 'Coordinate response to phishing campaign detection',
      trigger: {
        type: 'threshold_exceeded',
        conditions: [
          { field: 'phishing_blocks', operator: 'greater_than', value: 10 },
          { field: 'time_window', operator: 'equals', value: '1h' },
        ],
      },
      steps: [
        { id: 's1', type: 'notify_slack', name: 'Alert Team', config: { channel: '#security' } },
        { id: 's2', type: 'webhook', name: 'Update Threat Feed', config: { url: 'https://api.threatfeed.local' } },
        { id: 's3', type: 'notify_email', name: 'Executive Summary', config: { to: 'ciso@company.com' } },
      ],
      isEnabled: true,
      isBuiltIn: true,
      triggerCount: 5,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-02-28T00:00:00Z',
    },
    {
      id: 'pb4',
      name: 'DNS Tunneling Alert',
      description: 'Detect and respond to DNS tunneling attempts',
      trigger: {
        type: 'pattern_match',
        conditions: [{ field: 'tunneling_score', operator: 'greater_than', value: 0.9 }],
      },
      steps: [
        { id: 's1', type: 'block_ip', name: 'Block Source IP', config: { duration: '24h' } },
        { id: 's2', type: 'notify_slack', name: 'Alert SOC', config: { channel: '#soc' } },
        { id: 's3', type: 'create_ticket', name: 'Investigation Ticket', config: { priority: 'high' } },
      ],
      isEnabled: false,
      isBuiltIn: true,
      triggerCount: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ]
}

