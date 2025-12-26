/**
 * Nebula DNS - Activity Feed Component
 * Real-time blocks/activity feed
 */

'use client'

import { Card, CardHeader, Badge, StatusDot } from '@/components/ui'
import { ShieldExclamationIcon, GlobeAltIcon, ClockIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface ActivityItem {
  id: string
  type: 'block' | 'allow' | 'threat'
  domain: string
  category?: string
  location?: string
  timestamp: Date | string
}

interface ActivityFeedProps {
  data: ActivityItem[]
  isLoading?: boolean
  maxItems?: number
}

function formatTimeAgo(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

const typeConfig = {
  block: {
    icon: ShieldExclamationIcon,
    color: 'text-danger-500',
    bg: 'bg-danger-100 dark:bg-danger-900/30',
    badge: 'danger' as const,
    label: 'Blocked',
  },
  allow: {
    icon: GlobeAltIcon,
    color: 'text-success-500',
    bg: 'bg-success-100 dark:bg-success-900/30',
    badge: 'success' as const,
    label: 'Allowed',
  },
  threat: {
    icon: ShieldExclamationIcon,
    color: 'text-warning-500',
    bg: 'bg-warning-100 dark:bg-warning-900/30',
    badge: 'warning' as const,
    label: 'Threat',
  },
}

export function ActivityFeed({ data, isLoading, maxItems = 10 }: ActivityFeedProps) {
  const displayData = data.slice(0, maxItems)

  if (isLoading) {
    return (
      <Card padding="md">
        <CardHeader title="Live Activity" subtitle="Loading..." />
        <div className="space-y-3 mt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <div className="skeleton w-8 h-8 rounded-full" />
              <div className="flex-1">
                <div className="skeleton h-4 w-3/4 mb-1" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card padding="md">
      <CardHeader 
        title="Live Activity" 
        subtitle="Recent DNS queries"
        action={
          <div className="flex items-center gap-1.5">
            <StatusDot status="success" pulse />
            <span className="text-xs text-space-500 dark:text-space-400">Live</span>
          </div>
        }
      />
      <div className="space-y-1 mt-4 max-h-[400px] overflow-y-auto scrollbar-hide">
        {displayData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-space-500 dark:text-space-400">
            <ClockIcon className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          displayData.map((item, index) => {
            const config = typeConfig[item.type]
            const Icon = config.icon

            return (
              <div
                key={item.id}
                className={clsx(
                  'flex items-start gap-3 p-3 rounded-xl transition-all animate-fade-in',
                  'hover:bg-space-50 dark:hover:bg-space-800/50'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Icon */}
                <div className={clsx('flex-shrink-0 p-2 rounded-xl', config.bg)}>
                  <Icon className={clsx('w-4 h-4', config.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-space-900 dark:text-white truncate">
                      {item.domain}
                    </span>
                    <Badge variant={config.badge} size="sm">
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-space-500 dark:text-space-400">
                    {item.location && <span>{item.location}</span>}
                    {item.location && item.category && <span>•</span>}
                    {item.category && <span>{item.category}</span>}
                  </div>
                </div>

                {/* Time */}
                <span className="flex-shrink-0 text-xs text-space-400 dark:text-space-500">
                  {formatTimeAgo(item.timestamp)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}

