/**
 * Nebula DNS - Admin UI Card Component
 * Cosmic Security Theme
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { forwardRef } from 'react'
import clsx from 'clsx'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'solid' | 'interactive' | 'gradient'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const variantStyles = {
  default: 'card',
  glass: 'card-glass',
  solid: 'card-solid',
  interactive: 'card-interactive',
  gradient: 'card-gradient',
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(variantStyles[variant], paddingStyles[padding], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Card subcomponents
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx('flex items-start justify-between mb-4', className)}
        {...props}
      >
        <div>
          <h3 className="text-lg font-semibold text-space-900 dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-sm text-space-500 dark:text-space-400">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

// Stat Card for dashboard metrics
export interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: {
    value: number
    isUp: boolean
  }
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

const statColorStyles = {
  default: {
    iconBg: 'bg-space-100 dark:bg-space-800',
    iconColor: 'text-space-600 dark:text-space-400',
  },
  primary: {
    iconBg: 'bg-primary-100 dark:bg-primary-900/30',
    iconColor: 'text-primary-600 dark:text-primary-400',
  },
  success: {
    iconBg: 'bg-success-100 dark:bg-success-900/30',
    iconColor: 'text-success-600 dark:text-success-400',
  },
  warning: {
    iconBg: 'bg-warning-100 dark:bg-warning-900/30',
    iconColor: 'text-warning-600 dark:text-warning-400',
  },
  danger: {
    iconBg: 'bg-danger-100 dark:bg-danger-900/30',
    iconColor: 'text-danger-600 dark:text-danger-400',
  },
}

export function StatCard({ title, value, icon, trend, variant = 'default' }: StatCardProps) {
  const colors = statColorStyles[variant]

  return (
    <Card variant="glass" padding="md">
      <div className="flex items-center gap-4">
        {icon && (
          <div className={clsx('flex-shrink-0 p-3 rounded-xl', colors.iconBg)}>
            <div className={clsx('w-6 h-6', colors.iconColor)}>{icon}</div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-space-500 dark:text-space-400 truncate">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-space-900 dark:text-white">
              {value}
            </p>
            {trend && (
              <span
                className={clsx(
                  'inline-flex items-center text-xs font-semibold',
                  trend.isUp ? 'text-success-600' : 'text-danger-600'
                )}
              >
                {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
