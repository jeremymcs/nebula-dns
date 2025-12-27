/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Quick Action Bar - Domain investigation actions
 */

'use client'

import clsx from 'clsx'
import {
  NoSymbolIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'

interface QuickActionBarProps {
  domain: string
  onAction: (action: string) => void
  className?: string
}

export function QuickActionBar({ domain, onAction, className }: QuickActionBarProps) {
  const actions = [
    {
      id: 'block',
      label: 'Block',
      icon: NoSymbolIcon,
      color: 'bg-red-500 hover:bg-red-600 text-white',
    },
    {
      id: 'allow',
      label: 'Allow',
      icon: CheckCircleIcon,
      color: 'bg-green-500 hover:bg-green-600 text-white',
    },
    {
      id: 'add-to-list',
      label: 'Add to List',
      icon: ClipboardDocumentListIcon,
      color: 'bg-space-600 hover:bg-space-700 text-white',
    },
    {
      id: 'external',
      label: 'VirusTotal',
      icon: ArrowTopRightOnSquareIcon,
      color: 'bg-space-200 dark:bg-space-700 hover:bg-space-300 dark:hover:bg-space-600 text-space-700 dark:text-space-300',
      external: true,
    },
  ]

  const handleAction = (action: typeof actions[0]) => {
    if (action.external) {
      window.open(`https://www.virustotal.com/gui/domain/${domain}`, '_blank')
    } else {
      onAction(action.id)
    }
  }

  return (
    <div className={clsx('px-6 py-4 border-t border-space-200 dark:border-space-800 bg-space-50 dark:bg-space-900', className)}>
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              action.color
            )}
          >
            <action.icon className="h-4 w-4" />
            <span className="text-sm">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

