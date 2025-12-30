/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Quick Actions - One-tap family controls
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import {
  PauseIcon,
  BookOpenIcon,
  MoonIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/solid'

interface QuickAction {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'pause-gaming',
    name: 'Pause Gaming',
    description: 'Block all games',
    icon: PauseIcon,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  {
    id: 'homework',
    name: 'Homework Mode',
    description: 'Focus time',
    icon: BookOpenIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    id: 'bedtime',
    name: 'Bedtime Now',
    description: 'Start bedtime',
    icon: MoonIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    id: 'pause-all',
    name: 'Pause Internet',
    description: 'For everyone',
    icon: NoSymbolIcon,
    color: 'text-danger-600',
    bgColor: 'bg-danger-100 dark:bg-danger-900/30',
  },
]

interface QuickActionsProps {
  className?: string
}

export function QuickActions({ className }: QuickActionsProps) {
  const handleAction = (_actionId: string) => {
    // TODO: Implement quick action handlers
  }

  return (
    <section className={className}>
      <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleAction(action.id)}
            className={clsx(
              'p-4 rounded-xl text-left transition-all hover:scale-105 active:scale-95',
              action.bgColor
            )}
          >
            <action.icon className={clsx('h-8 w-8 mb-2', action.color)} />
            <p className={clsx('font-semibold', action.color)}>{action.name}</p>
            <p className="text-xs text-space-500">{action.description}</p>
          </motion.button>
        ))}
      </div>
    </section>
  )
}

