/**
 * Nebula DNS - Policy History Types
 */

export interface PolicyVersion {
  id: string
  policyId: string
  version: number
  createdAt: string
  createdBy: string | null
  changelog: string | null
  config: PolicyConfig
}

export interface PolicyConfig {
  blockCategories: string[]
  warnCategories?: string[]
  threatBlocking: {
    enabled: boolean
    feeds: string[]
  }
  safesearch: {
    enabled: boolean
    services: string[]
    settings?: SafeSearchSettings
  }
  schedules?: PolicySchedule[]
}

export interface SafeSearchSettings {
  google?: 'off' | 'moderate' | 'strict'
  bing?: 'off' | 'moderate' | 'strict'
  youtube?: 'off' | 'moderate' | 'strict'
  duckduckgo?: 'off' | 'moderate' | 'strict'
}

export interface PolicySchedule {
  name: string
  days: string[]
  startTime: string
  endTime: string
  timezone: string
  additionalCategories: string[]
}

export interface PolicyDiff {
  field: string
  path: string
  oldValue: unknown
  newValue: unknown
  type: 'added' | 'removed' | 'changed'
}

export interface PolicyComparison {
  fromVersion: PolicyVersion
  toVersion: PolicyVersion
  diffs: PolicyDiff[]
}
