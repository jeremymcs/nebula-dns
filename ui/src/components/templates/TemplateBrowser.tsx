/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Template Browser - Browse and search policy templates
 */

'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { PolicyTemplate, TemplateCategory, TEMPLATE_CATEGORIES } from './types'
import { TemplateCard } from './TemplateCard'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'

interface TemplateBrowserProps {
  templates: PolicyTemplate[]
  onSelectTemplate: (template: PolicyTemplate) => void
  className?: string
}

export function TemplateBrowser({ templates, onSelectTemplate, className }: TemplateBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all')
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'recent'>('popular')

  const filteredTemplates = useMemo(() => {
    let filtered = templates

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        filtered = [...filtered].sort((a, b) => b.usageCount - a.usageCount)
        break
      case 'rating':
        filtered = [...filtered].sort((a, b) => b.rating - a.rating)
        break
      case 'recent':
        filtered = [...filtered].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        break
    }

    return filtered
  }, [templates, selectedCategory, searchQuery, sortBy])

  const featuredTemplates = templates.filter((t) => t.isFeatured)

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-space-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-800 text-space-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-4 py-2 rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-800 text-space-900 dark:text-white"
        >
          <option value="popular">Most Popular</option>
          <option value="rating">Highest Rated</option>
          <option value="recent">Recently Updated</option>
        </select>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={clsx(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            selectedCategory === 'all'
              ? 'bg-primary-500 text-white'
              : 'bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-300 hover:bg-space-200 dark:hover:bg-space-600'
          )}
        >
          All
        </button>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={clsx(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2',
              selectedCategory === cat.id
                ? 'bg-primary-500 text-white'
                : 'bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-300 hover:bg-space-200 dark:hover:bg-space-600'
            )}
          >
            <span>{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Featured section */}
      {selectedCategory === 'all' && !searchQuery && featuredTemplates.length > 0 && (
        <div>
          <h3 className="font-semibold text-space-900 dark:text-white mb-4">⭐ Featured Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredTemplates.map((template, index) => (
              <TemplateCard key={template.id} template={template} onClick={() => onSelectTemplate(template)} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* All templates */}
      <div>
        <h3 className="font-semibold text-space-900 dark:text-white mb-4">
          {selectedCategory === 'all' ? 'All Templates' : TEMPLATE_CATEGORIES.find((c) => c.id === selectedCategory)?.name}
          <span className="text-space-500 font-normal ml-2">({filteredTemplates.length})</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template, index) => (
            <TemplateCard key={template.id} template={template} onClick={() => onSelectTemplate(template)} index={index} />
          ))}
        </div>
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12 text-space-500">
            No templates found matching your criteria
          </div>
        )}
      </div>
    </div>
  )
}

