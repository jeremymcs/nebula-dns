/**
 * Nebula DNS - UI Component Library
 * Tabs Component - Cosmic Security Theme
 */

import { ReactNode } from 'react'

export interface TabItem {
  id: string
  label: string
  count?: number
  icon?: ReactNode
}

export interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (tabId: string) => void
  variant?: 'default' | 'pills' | 'underline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  size = 'md',
  className = '',
}: TabsProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  if (variant === 'pills') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              inline-flex items-center px-4 py-2 rounded-xl font-medium transition-all
              ${sizeClasses[size]}
              ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow-sm'
                  : 'bg-space-100 dark:bg-space-700/50 text-space-600 dark:text-space-400 hover:bg-space-200 dark:hover:bg-space-700'
              }
            `}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-space-200 dark:bg-space-600 text-space-600 dark:text-space-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }

  if (variant === 'default') {
    return (
      <div className={`flex gap-1 p-1 bg-space-100 dark:bg-space-800 rounded-xl ${className}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all
              ${sizeClasses[size]}
              ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-space-700 text-space-900 dark:text-white shadow-sm'
                  : 'text-space-500 dark:text-space-400 hover:text-space-700 dark:hover:text-space-300'
              }
            `}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 text-space-400 dark:text-space-500">
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }

  // Underline variant (default)
  return (
    <div className={`border-b border-space-200 dark:border-space-700 ${className}`}>
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium transition-colors
              ${sizeClasses[size]}
              ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-space-500 dark:text-space-400 hover:text-space-700 dark:hover:text-space-300 hover:border-space-300 dark:hover:border-space-600'
              }
            `}
          >
            <span className="inline-flex items-center">
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                    : 'bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}

