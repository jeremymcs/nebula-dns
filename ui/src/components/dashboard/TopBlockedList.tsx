/**
 * Nebula DNS - Top Blocked Domains List
 * Styled list of most blocked domains
 */

'use client'

import { Card, CardHeader, Badge } from '@/components/ui'
import { NoSymbolIcon } from '@heroicons/react/24/outline'

interface BlockedDomain {
  domain: string
  count: number
  category?: string
}

interface TopBlockedListProps {
  data: BlockedDomain[]
  isLoading?: boolean
  limit?: number
}

export function TopBlockedList({ data, isLoading, limit = 5 }: TopBlockedListProps) {
  const displayData = data.slice(0, limit)
  const maxCount = Math.max(...data.map(d => d.count), 1)

  if (isLoading) {
    return (
      <Card padding="md">
        <CardHeader title="Top Blocked" subtitle="Loading..." />
        <div className="space-y-3 mt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton w-8 h-8 rounded-lg" />
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
        title="Top Blocked" 
        subtitle="Most frequently blocked domains"
      />
      <div className="space-y-3 mt-4">
        {displayData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-space-500 dark:text-space-400">
            <NoSymbolIcon className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">No blocked domains</p>
          </div>
        ) : (
          displayData.map((item, index) => {
            const percentage = (item.count / maxCount) * 100
            
            return (
              <div 
                key={item.domain}
                className="group relative flex items-center gap-3 p-3 rounded-xl hover:bg-space-50 dark:hover:bg-space-800/50 transition-colors"
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-space-100 dark:bg-space-800 flex items-center justify-center">
                  <span className="text-sm font-bold text-space-600 dark:text-space-400">
                    {index + 1}
                  </span>
                </div>

                {/* Domain info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-space-900 dark:text-white truncate">
                      {item.domain}
                    </span>
                    {item.category && (
                      <Badge variant="danger" size="sm">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1.5 bg-space-100 dark:bg-space-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-danger-600 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Count */}
                <div className="flex-shrink-0 text-right">
                  <span className="text-sm font-semibold text-space-900 dark:text-white">
                    {item.count.toLocaleString()}
                  </span>
                  <p className="text-xs text-space-500 dark:text-space-400">blocks</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}

