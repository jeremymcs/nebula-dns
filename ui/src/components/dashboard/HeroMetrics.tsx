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

const variantStyles = {
  primary: {
    bg: 'from-primary-600 to-primary-500',
    glow: 'shadow-primary-500/30',
    iconBg: 'bg-white/20',
  },
  success: {
    bg: 'from-success-600 to-success-500',
    glow: 'shadow-success-500/30',
    iconBg: 'bg-white/20',
  },
  warning: {
    bg: 'from-warning-600 to-warning-500',
    glow: 'shadow-warning-500/30',
    iconBg: 'bg-white/20',
  },
  danger: {
    bg: 'from-danger-600 to-danger-500',
    glow: 'shadow-danger-500/30',
    iconBg: 'bg-white/20',
  },
  accent: {
    bg: 'from-accent-600 to-accent-500',
    glow: 'shadow-accent-500/30',
    iconBg: 'bg-white/20',
  },
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
    <div className={clsx(
      'relative overflow-hidden rounded-2xl p-6',
      'bg-gradient-to-br', styles.bg,
      'shadow-xl', styles.glow,
      'transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl'
    )}>
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-black/10 rounded-full blur-xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="mt-2 text-4xl font-bold text-white tracking-tight">
            {displayValue}{suffix}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-white/70">{subtitle}</p>
          )}
          {trend && (
            <div className={clsx(
              'mt-2 inline-flex items-center gap-1 text-sm font-medium',
              'px-2 py-0.5 rounded-full',
              trend.isUp ? 'bg-white/20 text-white' : 'bg-black/20 text-white'
            )}>
              {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl', styles.iconBg)}>
          <div className="w-8 h-8 text-white">{icon}</div>
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

