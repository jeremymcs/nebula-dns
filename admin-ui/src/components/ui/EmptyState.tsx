/**
 * Nebula DNS - Admin UI EmptyState Component
 * Cosmic Security Theme
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { ReactNode } from 'react'

export interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="mx-auto h-12 w-12 text-space-400 dark:text-space-500 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-space-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-space-500 dark:text-space-400 max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
