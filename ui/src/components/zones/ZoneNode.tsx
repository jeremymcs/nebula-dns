/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Zone Node - Individual zone card in topology view
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { Zone, ZoneHealth } from './types'
import {
  BuildingOfficeIcon,
  WifiIcon,
  CpuChipIcon,
  GlobeAltIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  PauseIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

interface ZoneNodeProps {
  zone: Zone
  x: number
  y: number
  isSelected: boolean
  onClick: () => void
  onAction: (action: string) => void
}

const ZONE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  hq: BuildingOfficeIcon,
  'hq-guest': WifiIcon,
  'hq-iot': CpuChipIcon,
  remote: GlobeAltIcon,
  default: BuildingOfficeIcon,
}

export function ZoneNode({ zone, x, y, isSelected, onClick, onAction }: ZoneNodeProps) {
  const [showMenu, setShowMenu] = useState(false)
  const Icon = ZONE_ICONS[zone.id] || ZONE_ICONS.default

  const getHealthColor = (health: ZoneHealth) => {
    switch (health) {
      case 'healthy': return 'bg-success-500'
      case 'warning': return 'bg-amber-500'
      case 'critical': return 'bg-danger-500'
      case 'offline': return 'bg-space-400'
    }
  }

  const getHealthBorder = (health: ZoneHealth) => {
    switch (health) {
      case 'healthy': return 'border-green-500/30'
      case 'warning': return 'border-amber-500/30'
      case 'critical': return 'border-red-500/30'
      case 'offline': return 'border-space-400/30'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={clsx(
        'absolute w-44 bg-white dark:bg-space-800 rounded-xl border-2 shadow-lg cursor-pointer transition-all',
        isSelected ? 'ring-2 ring-primary-500 ring-offset-2 border-primary-500' : getHealthBorder(zone.health),
        'hover:shadow-xl hover:scale-105'
      )}
      style={{ left: x, top: y }}
      onClick={onClick}
    >
      {/* Health indicator */}
      <div className={clsx('absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-space-800', getHealthColor(zone.health))}>
        {zone.health === 'healthy' && (
          <span className="absolute inset-0 rounded-full bg-success-500 animate-ping opacity-50" />
        )}
      </div>

      {/* Header */}
      <div className="px-3 py-2 border-b border-space-100 dark:border-space-700 flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-primary-500/10">
          <Icon className="h-4 w-4 text-primary-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-space-900 dark:text-white truncate">{zone.name}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
          className="p-1 hover:bg-space-100 dark:hover:bg-space-700 rounded"
        >
          <EllipsisVerticalIcon className="h-4 w-4 text-space-400" />
        </button>
      </div>

      {/* Metrics */}
      <div className="px-3 py-2 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-space-500">Queries/s</span>
          <span className="font-medium text-space-900 dark:text-white">{zone.metrics.queriesPerSecond}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-space-500">Block Rate</span>
          <span className="font-medium text-space-900 dark:text-white">{zone.metrics.blockRate}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-space-500">Devices</span>
          <span className="font-medium text-space-900 dark:text-white">{zone.devices || 0}</span>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-space-800 rounded-lg shadow-xl border border-space-200 dark:border-space-700 py-1 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { id: 'edit', label: 'Edit Zone', icon: PencilIcon },
              { id: 'pause', label: 'Pause Zone', icon: PauseIcon },
              { id: 'clone', label: 'Clone Zone', icon: DocumentDuplicateIcon },
              { id: 'logs', label: 'View Logs', icon: DocumentTextIcon },
              { id: 'delete', label: 'Delete Zone', icon: TrashIcon, danger: true },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { onAction(item.id); setShowMenu(false) }}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-space-50 dark:hover:bg-space-700',
                  item.danger ? 'text-danger-600 dark:text-danger-400' : 'text-space-700 dark:text-space-300'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

