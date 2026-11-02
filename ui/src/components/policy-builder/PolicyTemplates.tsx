/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Policy Templates - Pre-built flow templates for common use cases
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { PolicyFlow, PolicyNode, PolicyConnection } from './types'
import {
  HomeIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

export interface PolicyTemplate {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: 'family' | 'corporate' | 'education' | 'minimal' | 'custom'
  flow: PolicyFlow
}

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: 'family-safe',
    name: 'Family Safe',
    description: 'Block adult content, enforce SafeSearch, and protect against threats',
    icon: HomeIcon,
    category: 'family',
    flow: createFamilySafeFlow(),
  },
  {
    id: 'corporate-standard',
    name: 'Corporate Standard',
    description: 'Enterprise security with threat protection and productivity controls',
    icon: BuildingOfficeIcon,
    category: 'corporate',
    flow: createCorporateFlow(),
  },
  {
    id: 'education',
    name: 'Education',
    description: 'CIPA-compliant filtering for schools with schedule-based controls',
    icon: AcademicCapIcon,
    category: 'education',
    flow: createEducationFlow(),
  },
  {
    id: 'minimal-security',
    name: 'Minimal Security',
    description: 'Basic threat protection only - blocks malware and phishing',
    icon: ShieldCheckIcon,
    category: 'minimal',
    flow: createMinimalFlow(),
  },
]

interface PolicyTemplatesProps {
  onSelect: (template: PolicyTemplate) => void
  className?: string
}

export function PolicyTemplates({ onSelect, className }: PolicyTemplatesProps) {
  return (
    <div className={clsx('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {POLICY_TEMPLATES.map((template, index) => (
        <motion.button
          key={template.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelect(template)}
          className="p-4 bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 text-left hover:border-primary-500 hover:shadow-lg transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary-500/10 text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-colors">
              <template.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-space-900 dark:text-white">{template.name}</h3>
              <p className="text-sm text-space-500 mt-1">{template.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400">
                  {template.flow.nodes.length - 1} rules
                </span>
                <span className="text-xs text-primary-500 group-hover:underline">Use template →</span>
              </div>
            </div>
          </div>
        </motion.button>
      ))}

      {/* Custom template option */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: POLICY_TEMPLATES.length * 0.1 }}
        onClick={() => onSelect({
          id: 'blank',
          name: 'Blank Policy',
          description: 'Start from scratch',
          icon: SparklesIcon,
          category: 'custom',
          flow: createBlankFlow(),
        })}
        className="p-4 bg-space-50 dark:bg-space-900 rounded-xl border-2 border-dashed border-space-300 dark:border-space-700 text-left hover:border-primary-500 transition-all group"
      >
        <div className="flex items-center justify-center gap-3 py-4">
          <SparklesIcon className="h-6 w-6 text-space-400 group-hover:text-primary-500" />
          <span className="font-medium text-space-600 dark:text-space-400 group-hover:text-primary-500">
            Start from scratch
          </span>
        </div>
      </motion.button>
    </div>
  )
}

// Template flow generators
function createBlankFlow(): PolicyFlow {
  return {
    id: `policy-${Date.now()}`,
    name: 'New Policy',
    nodes: [{ id: 'start', type: 'start', x: 100, y: 200, data: {} }],
    connections: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function createFamilySafeFlow(): PolicyFlow {
  const nodes: PolicyNode[] = [
    { id: 'start', type: 'start', x: 50, y: 200, data: {} },
    { id: 'threat', type: 'threat-check', x: 250, y: 200, data: { categories: ['malware', 'phishing', 'ransomware'] } },
    { id: 'safesearch', type: 'safesearch', x: 450, y: 200, data: { enabled: true } },
    { id: 'category', type: 'category-filter', x: 650, y: 200, data: { categories: ['adult', 'gambling'], action: 'block' } },
    { id: 'decision', type: 'decision', x: 850, y: 200, data: { action: 'allow' } },
  ]
  const connections: PolicyConnection[] = [
    { id: 'c1', from: 'start', to: 'threat' },
    { id: 'c2', from: 'threat', to: 'safesearch' },
    { id: 'c3', from: 'safesearch', to: 'category' },
    { id: 'c4', from: 'category', to: 'decision' },
  ]
  return { id: 'family-safe', name: 'Family Safe', nodes, connections, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
}

function createCorporateFlow(): PolicyFlow {
  const nodes: PolicyNode[] = [
    { id: 'start', type: 'start', x: 50, y: 200, data: {} },
    { id: 'allowlist', type: 'allowlist', x: 250, y: 200, data: { domains: ['company.com', 'internal.corp'] } },
    { id: 'threat', type: 'threat-check', x: 450, y: 200, data: { categories: ['malware', 'phishing', 'botnet', 'dga'] } },
    { id: 'category', type: 'category-filter', x: 650, y: 200, data: { categories: ['social-media', 'streaming', 'gaming'], action: 'block' } },
    { id: 'decision', type: 'decision', x: 850, y: 200, data: { action: 'allow' } },
  ]
  const connections: PolicyConnection[] = [
    { id: 'c1', from: 'start', to: 'allowlist' },
    { id: 'c2', from: 'allowlist', to: 'threat' },
    { id: 'c3', from: 'threat', to: 'category' },
    { id: 'c4', from: 'category', to: 'decision' },
  ]
  return { id: 'corporate', name: 'Corporate Standard', nodes, connections, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
}

function createEducationFlow(): PolicyFlow {
  const nodes: PolicyNode[] = [
    { id: 'start', type: 'start', x: 50, y: 200, data: {} },
    { id: 'threat', type: 'threat-check', x: 250, y: 200, data: { categories: ['malware', 'phishing'] } },
    { id: 'safesearch', type: 'safesearch', x: 450, y: 200, data: { enabled: true } },
    { id: 'schedule', type: 'schedule', x: 650, y: 200, data: { days: ['mon', 'tue', 'wed', 'thu', 'fri'], startTime: '08:00', endTime: '15:00' } },
    { id: 'category', type: 'category-filter', x: 850, y: 200, data: { categories: ['adult', 'gambling', 'gaming', 'social-media'], action: 'block' } },
    { id: 'decision', type: 'decision', x: 1050, y: 200, data: { action: 'allow' } },
  ]
  const connections: PolicyConnection[] = [
    { id: 'c1', from: 'start', to: 'threat' },
    { id: 'c2', from: 'threat', to: 'safesearch' },
    { id: 'c3', from: 'safesearch', to: 'schedule' },
    { id: 'c4', from: 'schedule', to: 'category' },
    { id: 'c5', from: 'category', to: 'decision' },
  ]
  return { id: 'education', name: 'Education', nodes, connections, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
}

function createMinimalFlow(): PolicyFlow {
  const nodes: PolicyNode[] = [
    { id: 'start', type: 'start', x: 100, y: 200, data: {} },
    { id: 'threat', type: 'threat-check', x: 350, y: 200, data: { categories: ['malware', 'phishing'] } },
    { id: 'decision', type: 'decision', x: 600, y: 200, data: { action: 'allow' } },
  ]
  const connections: PolicyConnection[] = [
    { id: 'c1', from: 'start', to: 'threat' },
    { id: 'c2', from: 'threat', to: 'decision' },
  ]
  return { id: 'minimal', name: 'Minimal Security', nodes, connections, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
}

