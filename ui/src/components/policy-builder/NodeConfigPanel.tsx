/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Node Config Panel - Side panel for configuring selected node
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { PolicyNode, NODE_CONFIGS, PolicyNodeType } from './types'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface NodeConfigPanelProps {
  node: PolicyNode
  onUpdate: (data: Record<string, unknown>) => void
  onClose: () => void
}

const THREAT_CATEGORIES = [
  { id: 'malware', label: 'Malware' },
  { id: 'phishing', label: 'Phishing' },
  { id: 'ransomware', label: 'Ransomware' },
  { id: 'botnet', label: 'Botnet C2' },
  { id: 'cryptomining', label: 'Cryptomining' },
  { id: 'dga', label: 'DGA Domains' },
]

const CONTENT_CATEGORIES = [
  { id: 'adult', label: 'Adult Content' },
  { id: 'gambling', label: 'Gambling' },
  { id: 'social-media', label: 'Social Media' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'ads', label: 'Ads & Trackers' },
]

export function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  const config = NODE_CONFIGS[node.type]

  const renderConfig = () => {
    switch (node.type) {
      case 'threat-check':
        return <ThreatCheckConfig data={node.data} onUpdate={onUpdate} />
      case 'category-filter':
        return <CategoryFilterConfig data={node.data} onUpdate={onUpdate} />
      case 'allowlist':
      case 'blocklist':
        return <ListConfig data={node.data} onUpdate={onUpdate} type={node.type} />
      case 'schedule':
        return <ScheduleConfig data={node.data} onUpdate={onUpdate} />
      case 'decision':
        return <DecisionConfig data={node.data} onUpdate={onUpdate} />
      default:
        return <p className="text-space-500 text-sm">No configuration needed</p>
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute right-4 top-16 z-30 w-80 bg-white dark:bg-space-800 rounded-xl shadow-2xl border border-space-200 dark:border-space-700 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-space-200 dark:border-space-700 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-space-900 dark:text-white">{config.label}</h3>
          <p className="text-xs text-space-500">{config.description}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-space-100 dark:hover:bg-space-700 rounded">
          <XMarkIcon className="h-5 w-5 text-space-500" />
        </button>
      </div>
      <div className="p-4 max-h-[400px] overflow-y-auto">{renderConfig()}</div>
    </motion.div>
  )
}

function ThreatCheckConfig({ data, onUpdate }: { data: Record<string, unknown>; onUpdate: (d: Record<string, unknown>) => void }) {
  const categories = (data.categories as string[]) || []
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-space-700 dark:text-space-300">Threat Categories</label>
      <div className="space-y-2">
        {THREAT_CATEGORIES.map((cat) => (
          <label key={cat.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={categories.includes(cat.id)}
              onChange={(e) => {
                const updated = e.target.checked ? [...categories, cat.id] : categories.filter((c) => c !== cat.id)
                onUpdate({ ...data, categories: updated })
              }}
              className="rounded border-space-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-space-600 dark:text-space-400">{cat.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function CategoryFilterConfig({ data, onUpdate }: { data: Record<string, unknown>; onUpdate: (d: Record<string, unknown>) => void }) {
  const categories = (data.categories as string[]) || []
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-space-700 dark:text-space-300">Content Categories</label>
      <div className="space-y-2">
        {CONTENT_CATEGORIES.map((cat) => (
          <label key={cat.id} className="flex items-center gap-2">
            <input type="checkbox" checked={categories.includes(cat.id)} onChange={(e) => {
              const updated = e.target.checked ? [...categories, cat.id] : categories.filter((c) => c !== cat.id)
              onUpdate({ ...data, categories: updated })
            }} className="rounded border-space-300 text-primary-500 focus:ring-primary-500" />
            <span className="text-sm text-space-600 dark:text-space-400">{cat.label}</span>
          </label>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">Action</label>
        <select value={(data.action as string) || 'block'} onChange={(e) => onUpdate({ ...data, action: e.target.value })} className="w-full rounded-lg border-space-300 dark:border-space-600 dark:bg-space-700">
          <option value="block">Block</option>
          <option value="warn">Warn</option>
          <option value="allow">Allow</option>
        </select>
      </div>
    </div>
  )
}

function ListConfig({ data, onUpdate, type }: { data: Record<string, unknown>; onUpdate: (d: Record<string, unknown>) => void; type: PolicyNodeType }) {
  const domains = (data.domains as string[]) || []
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-space-700 dark:text-space-300">Domains</label>
      <textarea rows={4} value={domains.join('\n')} onChange={(e) => onUpdate({ ...data, domains: e.target.value.split('\n').filter(Boolean) })} placeholder="example.com&#10;*.blocked.com" className="w-full rounded-lg border-space-300 dark:border-space-600 dark:bg-space-700 text-sm font-mono" />
      <p className="text-xs text-space-500">One domain per line. Use * for wildcards.</p>
    </div>
  )
}

function ScheduleConfig({ data, onUpdate }: { data: Record<string, unknown>; onUpdate: (d: Record<string, unknown>) => void }) {
  const days = (data.days as string[]) || []
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-space-700 dark:text-space-300">Days</label>
      <div className="flex gap-1">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
        <button key={day} onClick={() => { const d = day.toLowerCase(); const updated = days.includes(d) ? days.filter((x) => x !== d) : [...days, d]; onUpdate({ ...data, days: updated }) }} className={clsx('px-2 py-1 text-xs rounded', days.includes(day.toLowerCase()) ? 'bg-primary-500 text-white' : 'bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400')}>{day[0]}</button>
      ))}</div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-xs text-space-500 mb-1">Start Time</label><input type="time" value={(data.startTime as string) || '09:00'} onChange={(e) => onUpdate({ ...data, startTime: e.target.value })} className="w-full rounded-lg border-space-300 dark:border-space-600 dark:bg-space-700" /></div>
        <div><label className="block text-xs text-space-500 mb-1">End Time</label><input type="time" value={(data.endTime as string) || '17:00'} onChange={(e) => onUpdate({ ...data, endTime: e.target.value })} className="w-full rounded-lg border-space-300 dark:border-space-600 dark:bg-space-700" /></div>
      </div>
    </div>
  )
}

function DecisionConfig({ data, onUpdate }: { data: Record<string, unknown>; onUpdate: (d: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-space-700 dark:text-space-300">Final Action</label>
      <select value={(data.action as string) || 'allow'} onChange={(e) => onUpdate({ ...data, action: e.target.value })} className="w-full rounded-lg border-space-300 dark:border-space-600 dark:bg-space-700">
        <option value="allow">Allow</option>
        <option value="block">Block</option>
        <option value="warn">Warn</option>
        <option value="redirect">Redirect</option>
      </select>
    </div>
  )
}

