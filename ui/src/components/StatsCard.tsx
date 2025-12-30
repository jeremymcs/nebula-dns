'use client'

import clsx from 'clsx'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/20/solid'

interface StatsCardProps {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  trend?: {
    value: number
    isUp: boolean
  }
  color?: 'blue' | 'green' | 'red' | 'yellow'
}

const colorClasses = {
  blue: {
    bg: 'bg-primary-50 dark:bg-primary-900/30',
    icon: 'text-primary-600 dark:text-primary-400',
  },
  green: {
    bg: 'bg-success-50 dark:bg-success-900/30',
    icon: 'text-success-600 dark:text-success-400',
  },
  red: {
    bg: 'bg-danger-50 dark:bg-danger-900/30',
    icon: 'text-danger-600 dark:text-danger-400',
  },
  yellow: {
    bg: 'bg-warning-50 dark:bg-warning-900/30',
    icon: 'text-warning-600 dark:text-warning-400',
  },
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
}: StatsCardProps) {
  const colors = colorClasses[color]

  return (
    <div className="card overflow-hidden">
      <div className="p-5">
        <div className="flex items-center">
          <div className={clsx('flex-shrink-0 rounded-md p-3', colors.bg)}>
            <Icon className={clsx('h-6 w-6', colors.icon)} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="truncate text-sm font-medium text-space-500 dark:text-space-400">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <p className="text-2xl font-semibold text-space-900 dark:text-white">{value}</p>
                {trend && (
                  <p
                    className={clsx(
                      'ml-2 flex items-baseline text-sm font-semibold',
                      trend.isUp ? 'text-success-600' : 'text-danger-600'
                    )}
                  >
                    {trend.isUp ? (
                      <ArrowUpIcon className="h-4 w-4 flex-shrink-0 self-center" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 flex-shrink-0 self-center" />
                    )}
                    <span className="ml-0.5">{trend.value}%</span>
                  </p>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
