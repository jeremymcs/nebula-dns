/**
 * Nebula DNS - Admin UI EmptyState Component
 * Cosmic Security Theme
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { ReactNode } from 'react'
import clsx from 'clsx'

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
    <div className={clsx('fs-empty-state', className)}>
      <div className="fs-empty-state-icon">{icon}</div>
      <h3 className="mt-4 text-sm font-semibold text-ink dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-mut max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
