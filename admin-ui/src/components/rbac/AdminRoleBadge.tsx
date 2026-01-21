/**
 * Nebula DNS - Admin Role Badge Component
 * Displays admin role with role-specific colors and styling
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import clsx from 'clsx'
import {
  AdminRole,
  ADMIN_ROLE_LABELS,
  ADMIN_ROLE_STYLES,
} from '@/lib/admin-permissions'

export interface AdminRoleBadgeProps {
  role: AdminRole
  size?: 'sm' | 'md'
  showGlow?: boolean
  className?: string
}

export function AdminRoleBadge({
  role,
  size = 'md',
  showGlow = true,
  className,
}: AdminRoleBadgeProps) {
  const styles = ADMIN_ROLE_STYLES[role]
  const label = ADMIN_ROLE_LABELS[role]

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        styles.bg,
        styles.text,
        // Only apply glow to super_admin and only if showGlow is true
        showGlow && styles.glow,
        // Size variants
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-xs',
        className
      )}
    >
      {label}
    </span>
  )
}
