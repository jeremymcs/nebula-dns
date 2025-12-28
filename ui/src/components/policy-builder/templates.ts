/**
 * Nebula DNS - Policy Builder Templates
 * Pre-built policy templates for common use cases
 */

import { PolicyNode, PolicyConnection } from './types'

export interface PolicyTemplate {
  id: string
  name: string
  description: string
  icon: string
  color: string
  nodes: PolicyNode[]
  connections: PolicyConnection[]
}

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: 'basic-security',
    name: 'Basic Security',
    description: 'Essential malware and phishing protection',
    icon: 'ShieldCheckIcon',
    color: 'green',
    nodes: [
      { id: 'start', type: 'start', x: 100, y: 200, data: {} },
      { id: 'threat', type: 'threat-check', x: 350, y: 200, data: { categories: ['malware', 'phishing', 'ransomware'] } },
      { id: 'allow', type: 'decision', x: 600, y: 150, data: { action: 'allow' } },
      { id: 'block', type: 'decision', x: 600, y: 280, data: { action: 'block' } },
    ],
    connections: [
      { id: 'c1', from: 'start', to: 'threat' },
      { id: 'c2', from: 'threat', to: 'allow', label: 'Clean' },
      { id: 'c3', from: 'threat', to: 'block', label: 'Threat' },
    ],
  },
  {
    id: 'family-safe',
    name: 'Family Safe',
    description: 'Child-friendly with SafeSearch and content filtering',
    icon: 'UserGroupIcon',
    color: 'blue',
    nodes: [
      { id: 'start', type: 'start', x: 50, y: 200, data: {} },
      { id: 'threat', type: 'threat-check', x: 250, y: 200, data: { categories: ['malware', 'phishing'] } },
      { id: 'category', type: 'category-filter', x: 450, y: 200, data: { categories: ['adult', 'gambling', 'drugs', 'weapons'], action: 'block' } },
      { id: 'safesearch', type: 'safesearch', x: 650, y: 200, data: { enabled: true, services: ['google', 'bing', 'youtube'] } },
      { id: 'allow', type: 'decision', x: 850, y: 200, data: { action: 'allow' } },
      { id: 'block', type: 'decision', x: 450, y: 350, data: { action: 'block' } },
    ],
    connections: [
      { id: 'c1', from: 'start', to: 'threat' },
      { id: 'c2', from: 'threat', to: 'category', label: 'Clean' },
      { id: 'c3', from: 'threat', to: 'block', label: 'Threat' },
      { id: 'c4', from: 'category', to: 'safesearch', label: 'Allowed' },
      { id: 'c5', from: 'category', to: 'block', label: 'Blocked' },
      { id: 'c6', from: 'safesearch', to: 'allow' },
    ],
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Business policy with work-hours restrictions',
    icon: 'BuildingOfficeIcon',
    color: 'purple',
    nodes: [
      { id: 'start', type: 'start', x: 50, y: 220, data: {} },
      { id: 'allowlist', type: 'allowlist', x: 230, y: 220, data: { domains: [], lists: ['corporate-approved'] } },
      { id: 'threat', type: 'threat-check', x: 410, y: 220, data: { categories: ['malware', 'phishing', 'c2', 'cryptomining'] } },
      { id: 'schedule', type: 'schedule', x: 590, y: 220, data: { days: ['mon', 'tue', 'wed', 'thu', 'fri'], startTime: '09:00', endTime: '17:00' } },
      { id: 'category', type: 'category-filter', x: 770, y: 150, data: { categories: ['social_media', 'streaming', 'gaming'], action: 'block' } },
      { id: 'allow', type: 'decision', x: 950, y: 220, data: { action: 'allow' } },
      { id: 'block', type: 'decision', x: 590, y: 380, data: { action: 'block' } },
    ],
    connections: [
      { id: 'c1', from: 'start', to: 'allowlist' },
      { id: 'c2', from: 'allowlist', to: 'allow', label: 'Allowed' },
      { id: 'c3', from: 'allowlist', to: 'threat' },
      { id: 'c4', from: 'threat', to: 'schedule', label: 'Clean' },
      { id: 'c5', from: 'threat', to: 'block', label: 'Threat' },
      { id: 'c6', from: 'schedule', to: 'category', label: 'Work Hours' },
      { id: 'c7', from: 'schedule', to: 'allow', label: 'After Hours' },
      { id: 'c8', from: 'category', to: 'block', label: 'Blocked' },
      { id: 'c9', from: 'category', to: 'allow', label: 'Allowed' },
    ],
  },
  {
    id: 'maximum-protection',
    name: 'Maximum Protection',
    description: 'Strictest security with all protections enabled',
    icon: 'ShieldExclamationIcon',
    color: 'red',
    nodes: [
      { id: 'start', type: 'start', x: 50, y: 200, data: {} },
      { id: 'blocklist', type: 'blocklist', x: 220, y: 200, data: { domains: [], lists: ['threat-intel', 'ads', 'trackers'] } },
      { id: 'threat', type: 'threat-check', x: 390, y: 200, data: { categories: ['malware', 'phishing', 'c2', 'ransomware', 'cryptomining', 'spam'] } },
      { id: 'category', type: 'category-filter', x: 560, y: 200, data: { categories: ['adult', 'gambling', 'drugs', 'weapons', 'hacking', 'piracy'], action: 'block' } },
      { id: 'safesearch', type: 'safesearch', x: 730, y: 200, data: { enabled: true, services: ['google', 'bing', 'youtube', 'duckduckgo'] } },
      { id: 'allow', type: 'decision', x: 900, y: 200, data: { action: 'allow' } },
      { id: 'block', type: 'decision', x: 500, y: 350, data: { action: 'block' } },
    ],
    connections: [
      { id: 'c1', from: 'start', to: 'blocklist' },
      { id: 'c2', from: 'blocklist', to: 'block', label: 'Blocked' },
      { id: 'c3', from: 'blocklist', to: 'threat' },
      { id: 'c4', from: 'threat', to: 'category', label: 'Clean' },
      { id: 'c5', from: 'threat', to: 'block', label: 'Threat' },
      { id: 'c6', from: 'category', to: 'safesearch', label: 'Allowed' },
      { id: 'c7', from: 'category', to: 'block', label: 'Blocked' },
      { id: 'c8', from: 'safesearch', to: 'allow' },
    ],
  },
  {
    id: 'education',
    name: 'Education',
    description: 'K-12 compliant with CIPA filtering',
    icon: 'AcademicCapIcon',
    color: 'amber',
    nodes: [
      { id: 'start', type: 'start', x: 50, y: 200, data: {} },
      { id: 'allowlist', type: 'allowlist', x: 220, y: 200, data: { domains: [], lists: ['educational-resources'] } },
      { id: 'threat', type: 'threat-check', x: 390, y: 200, data: { categories: ['malware', 'phishing'] } },
      { id: 'category', type: 'category-filter', x: 560, y: 200, data: { categories: ['adult', 'gambling', 'drugs', 'weapons', 'violence', 'hate'], action: 'block' } },
      { id: 'safesearch', type: 'safesearch', x: 730, y: 200, data: { enabled: true, services: ['google', 'bing', 'youtube'] } },
      { id: 'allow', type: 'decision', x: 900, y: 200, data: { action: 'allow' } },
      { id: 'block', type: 'decision', x: 500, y: 350, data: { action: 'block' } },
    ],
    connections: [
      { id: 'c1', from: 'start', to: 'allowlist' },
      { id: 'c2', from: 'allowlist', to: 'allow', label: 'Allowed' },
      { id: 'c3', from: 'allowlist', to: 'threat' },
      { id: 'c4', from: 'threat', to: 'category', label: 'Clean' },
      { id: 'c5', from: 'threat', to: 'block', label: 'Threat' },
      { id: 'c6', from: 'category', to: 'safesearch', label: 'Allowed' },
      { id: 'c7', from: 'category', to: 'block', label: 'Blocked' },
      { id: 'c8', from: 'safesearch', to: 'allow' },
    ],
  },
]

