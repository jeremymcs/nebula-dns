/**
 * Nebula DNS - Admin UI Skeleton Loading Component
 * Cosmic Security Theme
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import clsx from 'clsx'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  animation?: 'pulse' | 'shimmer' | 'none'
}

export function Skeleton({
  className,
  width,
  height,
  variant = 'rectangular',
  animation = 'shimmer',
}: SkeletonProps) {
  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={clsx(
        'bg-space-200 dark:bg-space-700',
        {
          'rounded': variant === 'rounded' || variant === 'rectangular',
          'rounded-full': variant === 'circular',
          'h-4': variant === 'text',
          'animate-pulse': animation === 'pulse',
          'shimmer': animation === 'shimmer',
        },
        className
      )}
      style={style}
      aria-hidden="true"
    />
  )
}

// Pre-built skeleton patterns for common use cases
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx('rounded-xl border border-space-200 dark:border-space-700 p-6', className)}>
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" width="80%" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="border border-space-200 dark:border-space-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex bg-space-100 dark:bg-space-800 px-4 py-3 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" className="flex-1" height={14} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex px-4 py-3 gap-4 border-t border-space-200 dark:border-space-700"
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton key={colIdx} variant="text" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonMetric({ className }: { className?: string }) {
  return (
    <div className={clsx('rounded-2xl p-6 bg-space-200 dark:bg-space-700', className)}>
      <Skeleton variant="text" width="40%" height={14} className="mb-2" />
      <Skeleton variant="text" width="60%" height={32} className="mb-3" />
      <Skeleton variant="text" width="50%" height={14} />
    </div>
  )
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-space-200 dark:border-space-700">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="50%" height={12} />
          </div>
        </div>
      ))}
    </div>
  )
}
