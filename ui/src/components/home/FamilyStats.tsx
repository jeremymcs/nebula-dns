// Nebula DNS - Family Stats Component
// Display family-friendly statistics and top blocked categories
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import {
  ShieldExclamationIcon,
  VideoCameraIcon,
  GlobeAltIcon,
  UserGroupIcon,
  DevicePhoneMobileIcon,
  FireIcon,
} from '@heroicons/react/24/outline'

interface FamilyStatsProps {
  stats: {
    topBlockedCategories: Array<{ category: string; count: number }>
  }
  loading: boolean
}

const categoryIcons: Record<string, any> = {
  adult: ShieldExclamationIcon,
  gambling: FireIcon,
  'social media': UserGroupIcon,
  streaming: VideoCameraIcon,
  gaming: DevicePhoneMobileIcon,
  malware: ShieldExclamationIcon,
  phishing: ShieldExclamationIcon,
  default: GlobeAltIcon,
}

const categoryColors: Record<string, { bg: string; text: string; icon: string }> = {
  adult: {
    bg: 'bg-danger-50 dark:bg-danger-900/20',
    text: 'text-danger-700 dark:text-danger-300',
    icon: 'text-danger-600 dark:text-danger-400',
  },
  gambling: {
    bg: 'bg-warning-50 dark:bg-warning-900/20',
    text: 'text-warning-700 dark:text-warning-300',
    icon: 'text-warning-600 dark:text-warning-400',
  },
  'social media': {
    bg: 'bg-primary-50 dark:bg-primary-900/20',
    text: 'text-primary-700 dark:text-primary-300',
    icon: 'text-primary-600 dark:text-primary-400',
  },
  streaming: {
    bg: 'bg-accent-50 dark:bg-accent-900/20',
    text: 'text-accent-700 dark:text-accent-300',
    icon: 'text-accent-600 dark:text-accent-400',
  },
  gaming: {
    bg: 'bg-primary-50 dark:bg-primary-900/20',
    text: 'text-primary-700 dark:text-primary-300',
    icon: 'text-primary-600 dark:text-primary-400',
  },
  malware: {
    bg: 'bg-danger-50 dark:bg-danger-900/20',
    text: 'text-danger-700 dark:text-danger-300',
    icon: 'text-danger-600 dark:text-danger-400',
  },
  phishing: {
    bg: 'bg-danger-50 dark:bg-danger-900/20',
    text: 'text-danger-700 dark:text-danger-300',
    icon: 'text-danger-600 dark:text-danger-400',
  },
  default: {
    bg: 'bg-space-50 dark:bg-space-900',
    text: 'text-space-700 dark:text-space-300',
    icon: 'text-space-600 dark:text-space-400',
  },
}

function formatCategoryName(category: string): string {
  return category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function FamilyStats({ stats, loading }: FamilyStatsProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-space-800 rounded-xl p-6 border border-space-200 dark:border-space-700">
        <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
          Top Blocked Categories
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-space-100 dark:bg-space-700 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!stats.topBlockedCategories || stats.topBlockedCategories.length === 0) {
    return (
      <div className="bg-white dark:bg-space-800 rounded-xl p-6 border border-space-200 dark:border-space-700">
        <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
          Top Blocked Categories
        </h3>
        <div className="text-center py-8">
          <ShieldExclamationIcon className="h-12 w-12 text-space-400 dark:text-space-600 mx-auto mb-3" />
          <p className="text-space-600 dark:text-space-400">
            No threats blocked yet. Your protection is active and monitoring.
          </p>
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...stats.topBlockedCategories.map(c => c.count))

  return (
    <div className="bg-white dark:bg-space-800 rounded-xl p-6 border border-space-200 dark:border-space-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-space-900 dark:text-white">
          Top Blocked Categories
        </h3>
        <span className="text-sm text-space-500 dark:text-space-400">
          Last 24 hours
        </span>
      </div>

      <div className="space-y-3">
        {stats.topBlockedCategories.slice(0, 5).map((item, index) => {
          const categoryKey = item.category.toLowerCase().replace(/\s+/g, '-')
          const colors = categoryColors[categoryKey] || categoryColors.default
          const Icon = categoryIcons[categoryKey] || categoryIcons.default
          const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0

          return (
            <div
              key={item.category}
              className="relative"
            >
              <div className={`flex items-center justify-between p-4 rounded-lg ${colors.bg} border border-${categoryKey === 'default' ? 'space' : categoryKey.includes('adult') || categoryKey.includes('malware') || categoryKey.includes('phishing') ? 'danger' : categoryKey.includes('gambling') ? 'warning' : 'primary'}-200 dark:border-${categoryKey === 'default' ? 'space' : categoryKey.includes('adult') || categoryKey.includes('malware') || categoryKey.includes('phishing') ? 'danger' : categoryKey.includes('gambling') ? 'warning' : 'primary'}-800/30`}>
                <div className="flex items-center gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${colors.bg}`}>
                    <Icon className={`h-5 w-5 ${colors.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${colors.text}`}>
                      {formatCategoryName(item.category)}
                    </p>
                    <div className="mt-1 bg-space-100 dark:bg-space-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full ${colors.icon.replace('text-', 'bg-')}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${colors.text}`}>
                      {item.count.toLocaleString()}
                    </p>
                    <p className="text-xs text-space-500 dark:text-space-500">
                      blocked
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {stats.topBlockedCategories.length === 0 && (
        <div className="text-center py-8 text-space-500 dark:text-space-400">
          No categories blocked yet
        </div>
      )}
    </div>
  )
}
