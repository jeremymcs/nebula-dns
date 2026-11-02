/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Template Card - Individual template display card
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { PolicyTemplate, TEMPLATE_CATEGORIES } from './types'
import { StarIcon, CheckBadgeIcon, UsersIcon } from '@heroicons/react/24/solid'

interface TemplateCardProps {
  template: PolicyTemplate
  onClick: () => void
  index?: number
}

export function TemplateCard({ template, onClick, index = 0 }: TemplateCardProps) {
  const category = TEMPLATE_CATEGORIES.find((c) => c.id === template.category)

  const formatUsage = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-4 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category?.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-space-900 dark:text-white">{template.name}</h4>
              {template.isOfficial && (
                <CheckBadgeIcon className="h-4 w-4 text-primary-500" title="Official Template" />
              )}
            </div>
            <p className="text-xs text-space-500">{template.author.name}</p>
          </div>
        </div>
        {template.isFeatured && (
          <span className="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
            Featured
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-space-500 mb-3 line-clamp-2">{template.description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {template.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 text-xs bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400 rounded-full"
          >
            {tag}
          </span>
        ))}
        {template.tags.length > 3 && (
          <span className="px-2 py-0.5 text-xs text-space-400">+{template.tags.length - 3}</span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-3 border-t border-space-100 dark:border-space-700">
        <div className="flex items-center gap-1">
          <StarIcon className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-space-900 dark:text-white">{template.rating.toFixed(1)}</span>
          <span className="text-xs text-space-400">({template.reviewCount})</span>
        </div>
        <div className="flex items-center gap-1 text-space-500">
          <UsersIcon className="h-4 w-4" />
          <span className="text-xs">{formatUsage(template.usageCount)} uses</span>
        </div>
      </div>
    </motion.button>
  )
}

