/**
 * Nebula DNS - Badge & Status Components
 * Cosmic Security Theme
 */

'use client'

import clsx from 'clsx'

// Badge Component
export interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral'
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

const badgeStyles = {
  primary: 'badge-primary',
  accent: 'badge-accent',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  neutral: 'badge-neutral',
}

const dotStyles = {
  primary: 'bg-primary-500',
  accent: 'bg-accent-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  neutral: 'bg-space-400',
}

export function Badge({ children, variant = 'neutral', size = 'md', dot, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'badge',
        badgeStyles[variant],
        size === 'sm' && 'text-[10px] px-2 py-0',
        className
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotStyles[variant])} />}
      {children}
    </span>
  )
}

// Status Indicator (Glowing Dot)
export interface StatusDotProps {
  status: 'success' | 'warning' | 'danger' | 'neutral' | 'processing'
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
}

const statusDotColors = {
  success: 'bg-success-500 shadow-success-500/50',
  warning: 'bg-warning-500 shadow-warning-500/50',
  danger: 'bg-danger-500 shadow-danger-500/50',
  neutral: 'bg-space-400 dark:bg-space-500',
  processing: 'bg-accent-500 shadow-accent-500/50',
}

const statusDotSizes = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-3 h-3',
}

export function StatusDot({ status, size = 'md', pulse, className }: StatusDotProps) {
  return (
    <span
      className={clsx(
        'inline-block rounded-full',
        statusDotColors[status],
        statusDotSizes[size],
        status !== 'neutral' && 'shadow-[0_0_8px]',
        pulse && 'animate-pulse',
        className
      )}
    />
  )
}

// Status Badge (combines dot + text)
export interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'blocked' | 'error'
  className?: string
}

const statusConfig = {
  active: { label: 'Active', variant: 'success' as const, dot: 'success' as const },
  inactive: { label: 'Inactive', variant: 'neutral' as const, dot: 'neutral' as const },
  pending: { label: 'Pending', variant: 'warning' as const, dot: 'processing' as const },
  blocked: { label: 'Blocked', variant: 'danger' as const, dot: 'danger' as const },
  error: { label: 'Error', variant: 'danger' as const, dot: 'danger' as const },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <Badge variant={config.variant} className={className}>
      <StatusDot status={config.dot} size="sm" pulse={status === 'pending'} />
      {config.label}
    </Badge>
  )
}

// Role Badge
export interface RoleBadgeProps {
  role: 'owner' | 'admin' | 'analyst' | 'readonly'
  className?: string
}

const roleConfig = {
  owner: { label: 'Owner', variant: 'primary' as const },
  admin: { label: 'Admin', variant: 'accent' as const },
  analyst: { label: 'Analyst', variant: 'success' as const },
  readonly: { label: 'Read Only', variant: 'neutral' as const },
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = roleConfig[role]
  
  return (
    <Badge variant={config.variant} size="sm" className={clsx('capitalize', className)}>
      {config.label}
    </Badge>
  )
}

// Category Tag
export interface CategoryTagProps {
  category: string
  onRemove?: () => void
  className?: string
}

export function CategoryTag({ category, onRemove, className }: CategoryTagProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium',
        'bg-space-100 dark:bg-space-800 text-space-700 dark:text-space-300',
        'ring-1 ring-space-200 dark:ring-space-700',
        className
      )}
    >
      {category}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 hover:text-danger-500 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  )
}

