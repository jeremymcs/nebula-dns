/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Node Palette - Side panel for adding new nodes to the flow
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { PolicyNodeType, NODE_CONFIGS } from './types'
import {
  XMarkIcon,
  PlayIcon,
  ShieldExclamationIcon,
  FunnelIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  ClockIcon,
  ShieldCheckIcon,
  FlagIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PlayIcon,
  ShieldExclamationIcon,
  FunnelIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  ClockIcon,
  ShieldCheckIcon,
  FlagIcon,
  AdjustmentsHorizontalIcon,
}

interface NodePaletteProps {
  onSelect: (type: PolicyNodeType) => void
  onClose: () => void
}

const nodeCategories = [
  {
    name: 'Security Checks',
    nodes: ['threat-check', 'safesearch'] as PolicyNodeType[],
  },
  {
    name: 'Filtering',
    nodes: ['category-filter', 'allowlist', 'blocklist'] as PolicyNodeType[],
  },
  {
    name: 'Conditions',
    nodes: ['schedule', 'condition'] as PolicyNodeType[],
  },
  {
    name: 'Actions',
    nodes: ['decision'] as PolicyNodeType[],
  },
]

export function NodePalette({ onSelect, onClose }: NodePaletteProps) {
  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
      red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
      blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    }
    return colors[color] || colors.blue
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="absolute left-4 top-16 z-30 w-64 bg-white dark:bg-space-800 rounded-xl shadow-2xl border border-space-200 dark:border-space-700 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-space-200 dark:border-space-700 flex items-center justify-between">
        <h3 className="font-semibold text-space-900 dark:text-white">Add Node</h3>
        <button onClick={onClose} className="p-1 hover:bg-space-100 dark:hover:bg-space-700 rounded">
          <XMarkIcon className="h-5 w-5 text-space-500" />
        </button>
      </div>

      {/* Node list */}
      <div className="max-h-[400px] overflow-y-auto p-2">
        {nodeCategories.map((category) => (
          <div key={category.name} className="mb-4">
            <h4 className="px-2 py-1 text-xs font-semibold text-space-500 uppercase tracking-wider">
              {category.name}
            </h4>
            <div className="space-y-1 mt-1">
              {category.nodes.map((nodeType) => {
                const config = NODE_CONFIGS[nodeType]
                const Icon = ICONS[config.icon] || FlagIcon
                
                return (
                  <button
                    key={nodeType}
                    onClick={() => onSelect(nodeType)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all',
                      'hover:shadow-md hover:scale-[1.02]',
                      getColorClasses(config.color)
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-medium text-sm">{config.label}</p>
                      <p className="text-xs opacity-70">{config.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Help text */}
      <div className="px-4 py-2 border-t border-space-200 dark:border-space-700 bg-space-50 dark:bg-space-900">
        <p className="text-xs text-space-500">
          Drag nodes from here or click to add at center
        </p>
      </div>
    </motion.div>
  )
}

