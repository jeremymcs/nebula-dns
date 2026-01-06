/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Quick Actions - One-click action cards for common operations
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import {
  NoSymbolIcon,
  PauseIcon,
  PlayIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowPathIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'

interface QuickAction {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  variant: 'default' | 'warning' | 'danger' | 'success'
  action: () => void
}

interface QuickActionsProps {
  onBlockDomain?: () => void
  onPauseProtection?: () => void
  onEmergencyLockdown?: () => void
  onCreatePolicy?: () => void
  isProtectionPaused?: boolean
  className?: string
}

export function QuickActions({
  onBlockDomain,
  onPauseProtection,
  onEmergencyLockdown,
  onCreatePolicy,
  isProtectionPaused = false,
  className,
}: QuickActionsProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null)

  const actions: QuickAction[] = [
    {
      id: 'block-domain',
      name: 'Block Domain',
      description: 'Add to blocklist',
      icon: NoSymbolIcon,
      variant: 'default',
      action: () => onBlockDomain?.(),
    },
    {
      id: 'pause-protection',
      name: isProtectionPaused ? 'Resume Protection' : 'Pause Protection',
      description: isProtectionPaused ? 'Re-enable filtering' : 'Temporarily disable',
      icon: isProtectionPaused ? PlayIcon : PauseIcon,
      variant: isProtectionPaused ? 'success' : 'warning',
      action: () => onPauseProtection?.(),
    },
    {
      id: 'emergency-lockdown',
      name: 'Emergency Lockdown',
      description: 'Block all non-essential',
      icon: ExclamationTriangleIcon,
      variant: 'danger',
      action: () => onEmergencyLockdown?.(),
    },
    {
      id: 'create-policy',
      name: 'New Policy',
      description: 'Create security policy',
      icon: PlusIcon,
      variant: 'default',
      action: () => onCreatePolicy?.(),
    },
  ]

  const getVariantStyles = (variant: QuickAction['variant'], isActive: boolean) => {
    const base = 'border transition-all duration-200'

    switch (variant) {
      case 'danger':
        return clsx(
          base,
          isActive
            ? 'bg-danger-500 border-red-400 text-white shadow-lg shadow-red-500/25'
            : 'bg-danger-500/10 border-red-500/20 text-danger-600 dark:text-danger-400 hover:bg-danger-500/20'
        )
      case 'warning':
        return clsx(
          base,
          isActive
            ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/25'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
        )
      case 'success':
        return clsx(
          base,
          isActive
            ? 'bg-success-500 border-green-400 text-white shadow-lg shadow-green-500/25'
            : 'bg-success-500/10 border-green-500/20 text-success-600 dark:text-success-400 hover:bg-success-500/20'
        )
      default:
        return clsx(
          base,
          isActive
            ? 'bg-nebula-500 border-nebula-400 text-white shadow-lg shadow-nebula-500/25'
            : 'bg-nebula-500/10 border-nebula-500/20 text-nebula-600 dark:text-nebula-400 hover:bg-nebula-500/20'
        )
    }
  }

  return (
    <div className={clsx('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {actions.map((action, index) => (
        <motion.button
          key={action.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => {
            setActiveAction(action.id)
            action.action()
            setTimeout(() => setActiveAction(null), 500)
          }}
          className={clsx(
            'p-4 rounded-xl flex flex-col items-center text-center',
            getVariantStyles(action.variant, activeAction === action.id)
          )}
        >
          <action.icon className="h-8 w-8 mb-2" />
          <span className="font-medium text-sm">{action.name}</span>
          <span className="text-xs opacity-70 mt-0.5">{action.description}</span>
        </motion.button>
      ))}
    </div>
  )
}

