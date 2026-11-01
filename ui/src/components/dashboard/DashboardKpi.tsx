'use client'

import clsx from 'clsx'

const dotColors = {
  blue: 'bg-primary-500',
  coral: 'bg-accent-500',
  navy: 'bg-primary-700',
  green: 'bg-success-500',
} as const

export function DashboardKpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="fs-card grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
}

export function DashboardKpi({
  label,
  value,
  subtitle,
  delta,
  dot = 'blue',
}: {
  label: string
  value: string
  subtitle?: string
  delta?: { text: string; tone: 'up' | 'down' | 'neutral' }
  dot?: keyof typeof dotColors
}) {
  return (
    <div className="px-5 py-[18px] border-t sm:border-t-0 sm:border-l fs-hairline first:border-l-0 first:border-t-0">
      <div className="flex items-center gap-2 text-[12.5px] text-mut">
        <span className={clsx('inline-block h-1.5 w-1.5 rounded-[2px]', dotColors[dot])} />
        {label}
      </div>
      <div className="mt-2.5 flex items-baseline gap-2.5 text-[30px] font-medium tracking-tight text-ink">
        {value}
        {delta && (
          <small
            className={clsx(
              'text-xs font-medium px-1.5 py-0.5 rounded-md',
              delta.tone === 'up' && 'text-success-700 bg-success-50 dark:bg-success-900/30',
              delta.tone === 'down' && 'text-danger-700 bg-danger-50 dark:bg-danger-900/30',
              delta.tone === 'neutral' && 'text-mut bg-space-100 dark:bg-space-900',
            )}
          >
            {delta.text}
          </small>
        )}
      </div>
      {subtitle && <p className="mt-1.5 text-xs text-mut">{subtitle}</p>}
    </div>
  )
}
