/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Template Detail - Full template view with reviews
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { PolicyTemplate, TEMPLATE_CATEGORIES } from './types'
import {
  StarIcon,
  CheckBadgeIcon,
  UsersIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid'

interface TemplateDetailProps {
  template: PolicyTemplate
  isOpen: boolean
  onClose: () => void
  onUseTemplate: (template: PolicyTemplate) => void
}

export function TemplateDetail({ template, isOpen, onClose, onUseTemplate }: TemplateDetailProps) {
  const category = TEMPLATE_CATEGORIES.find((c) => c.id === template.category)

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-space-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-space-200 dark:border-space-700 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{category?.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-space-900 dark:text-white">{template.name}</h2>
                {template.isOfficial && <CheckBadgeIcon className="h-5 w-5 text-nebula-500" />}
              </div>
              <p className="text-sm text-space-500">by {template.author.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg">
            <XMarkIcon className="h-5 w-5 text-space-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Stats */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-1">
              <StarIcon className="h-5 w-5 text-amber-500" />
              <span className="font-bold text-space-900 dark:text-white">{template.rating.toFixed(1)}</span>
              <span className="text-space-500">({template.reviewCount} reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-space-500">
              <UsersIcon className="h-5 w-5" />
              <span>{template.usageCount.toLocaleString()} uses</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-space-700 dark:text-space-300 mb-6">{template.description}</p>

          {/* Features */}
          <div className="mb-6">
            <h3 className="font-semibold text-space-900 dark:text-white mb-3">Features</h3>
            <div className="grid grid-cols-2 gap-2">
              {template.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-space-600 dark:text-space-400">
                  <CheckIcon className="h-4 w-4 text-green-500" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <h3 className="font-semibold text-space-900 dark:text-white mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 text-sm bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="p-4 bg-space-50 dark:bg-space-900 rounded-lg">
            <p className="text-sm text-space-500">Category</p>
            <p className="font-medium text-space-900 dark:text-white flex items-center gap-2">
              <span>{category?.icon}</span>
              {category?.name} - {category?.description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-space-200 dark:border-space-700 bg-space-50 dark:bg-space-900 flex gap-3">
          <button
            onClick={() => onUseTemplate(template)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-nebula-500 text-white rounded-lg hover:bg-nebula-600 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Use This Template
          </button>
          <button className="px-4 py-2 border border-space-300 dark:border-space-600 text-space-700 dark:text-space-300 rounded-lg hover:bg-space-100 dark:hover:bg-space-800 transition-colors">
            <ShareIcon className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

