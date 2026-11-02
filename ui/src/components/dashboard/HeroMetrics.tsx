/**
 * Nebula DNS - Hero Metrics Component
 * Large animated stat cards for dashboard
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import clsx from 'clsx'

interface MetricProps {
  title: string
  value: number | string
  suffix?: string
  icon: React.ReactNode
  trend?: { value: number; isUp: boolean }
  subtitle?: string
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'accent'
  formatValue?: ((n: number) => string) | false
}

// Variant only tints the icon; the card itself stays a calm white surface.
const variantStyles = {
  primary: { iconBg: 'bg-primary-50 dark:bg-primary-900/40', iconColor: 'text-primary-700 dark:text-primary-300' },
  success: { iconBg: 'bg-success-50 dark:bg-success-900/40', iconColor: 'text-success-700 dark:text-success-300' },
  warning: { iconBg: 'bg-warning-50 dark:bg-warning-900/40', iconColor: 'text-warning-700 dark:text-warning-300' },
  danger: { iconBg: 'bg-accent-50 dark:bg-accent-900/40', iconColor: 'text-accent-700 dark:text-accent-300' },
  accent: { iconBg: 'bg-accent-50 dark:bg-accent-900/40', iconColor: 'text-accent-700 dark:text-accent-300' },
}

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0)
  const prevEnd = useRef(0)

  useEffect(() => {
    if (end === prevEnd.current) return
    
    const start = prevEnd.current
    prevEnd.current = end
    const startTime = Date.now()
    
    const animate = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // Ease out cubic
      
      setCount(Math.floor(start + (end - start) * eased))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [end, duration])

  return count
}

// Default formatter
const defaultFormat = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

export function HeroMetric({
  title,
  value,
  suffix = '',
  icon,
  trend,
  subtitle,
  variant = 'primary',
  formatValue = defaultFormat
}: MetricProps) {
  const numericValue = typeof value === 'number' ? value : 0
  const animatedValue = useAnimatedCounter(numericValue)
  const styles = variantStyles[variant]

  // Determine displayed value
  const displayValue = typeof value === 'string'
    ? value
    : (formatValue === false ? value.toString() : formatValue(animatedValue))

  return (
    <div className="fs-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-txt dark:text-space-400">{title}</p>
          <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums text-ink dark:text-white">
            {displayValue}{suffix}
          </p>
          {subtitle && (
            <p className="mt-2 text-[12.5px] text-mut">{subtitle}</p>
          )}
          {trend && (
            <div className={clsx(
              'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold',
              trend.isUp
                ? 'bg-success-50 text-success-700 dark:bg-success-900/40 dark:text-success-300'
                : 'bg-space-100 text-space-600 dark:bg-space-800 dark:text-space-300'
            )}>
              {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className={clsx('shrink-0 rounded-lg p-2', styles.iconBg)}>
          <div className={clsx('h-5 w-5', styles.iconColor)}>{icon}</div>
        </div>
      </div>
    </div>
  )
}

// Grid wrapper for metrics
export function HeroMetricsGrid({
  children,
  columns = 4
}: {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 5 | 6
}) {
  const columnClasses = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${columnClasses[columns]} gap-4 lg:gap-6`}>
      {children}
    </div>
  )
}

