/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Orion Quick Actions - Suggested action buttons in chat
 */

'use client'

import clsx from 'clsx'
import { OrionAction } from './types'
import {
  NoSymbolIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

interface OrionQuickActionsProps {
  onAction: (action: OrionAction) => void
  className?: string
}

const QUICK_ACTIONS: Array<{
  action: OrionAction
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    action: {
      id: 'block-domain',
      type: 'block-domain',
      label: 'Block Domain',
      data: {},
    },
    icon: NoSymbolIcon,
  },
  {
    action: {
      id: 'threat-summary',
      type: 'report',
      label: 'Threat Summary',
      data: { type: 'threat-summary' },
    },
    icon: ShieldCheckIcon,
  },
  {
    action: {
      id: 'view-stats',
      type: 'navigate',
      label: 'View Stats',
      data: { path: '/insights' },
    },
    icon: ChartBarIcon,
  },
  {
    action: {
      id: 'view-logs',
      type: 'navigate',
      label: 'Query Logs',
      data: { path: '/investigate/logs' },
    },
    icon: DocumentTextIcon,
  },
]

export function OrionQuickActions({ onAction, className }: OrionQuickActionsProps) {
  return (
    <div className={clsx('px-4 py-2 border-t border-space-200 dark:border-space-800', className)}>
      <p className="text-xs text-space-500 mb-2">Quick Actions</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {QUICK_ACTIONS.map(({ action, icon: Icon }) => (
          <button
            key={action.id}
            onClick={() => onAction(action)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-space-100 dark:bg-space-800 text-space-600 dark:text-space-400 hover:bg-space-200 dark:hover:bg-space-700 transition-colors whitespace-nowrap"
          >
            <Icon className="h-3.5 w-3.5" />
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}

