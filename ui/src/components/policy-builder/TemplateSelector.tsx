/**
 * Nebula DNS - Template Selector
 * Choose from pre-built policy templates
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { POLICY_TEMPLATES, PolicyTemplate } from './templates'
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  DocumentPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
}

interface TemplateSelectorProps {
  onSelect: (template: PolicyTemplate) => void
  onStartBlank: () => void
  onClose: () => void
}

export function TemplateSelector({ onSelect, onStartBlank, onClose }: TemplateSelectorProps) {
  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-success-500/10 text-success-600 dark:text-success-400 border-green-500/30 hover:border-green-500',
      red: 'bg-danger-500/10 text-danger-600 dark:text-danger-400 border-red-500/30 hover:border-red-500',
      blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:border-blue-500',
      purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:border-purple-500',
      amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:border-amber-500',
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-space-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-space-200 dark:border-space-700">
          <div>
            <h2 className="text-xl font-bold text-space-900 dark:text-white">Choose a Template</h2>
            <p className="text-sm text-space-500 mt-1">Start with a pre-built policy or create from scratch</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg">
            <XMarkIcon className="h-5 w-5 text-space-500" />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blank Template */}
            <button
              onClick={onStartBlank}
              className="flex items-start gap-4 p-4 rounded-xl border-2 border-dashed border-space-300 dark:border-space-600 hover:border-nebula-500 hover:bg-nebula-500/5 transition-all text-left group"
            >
              <div className="p-3 rounded-lg bg-space-100 dark:bg-space-700 group-hover:bg-nebula-500/20">
                <DocumentPlusIcon className="h-6 w-6 text-space-500 group-hover:text-nebula-500" />
              </div>
              <div>
                <h3 className="font-semibold text-space-900 dark:text-white group-hover:text-nebula-500">
                  Start from Scratch
                </h3>
                <p className="text-sm text-space-500 mt-1">
                  Build your own custom policy flow
                </p>
              </div>
            </button>

            {/* Pre-built Templates */}
            {POLICY_TEMPLATES.map((template) => {
              const Icon = ICONS[template.icon] || ShieldCheckIcon
              return (
                <button
                  key={template.id}
                  onClick={() => onSelect(template)}
                  className={clsx(
                    'flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left',
                    getColorClasses(template.color)
                  )}
                >
                  <div className={clsx('p-3 rounded-lg', getColorClasses(template.color))}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-space-900 dark:text-white">
                      {template.name}
                    </h3>
                    <p className="text-sm text-space-500 mt-1">
                      {template.description}
                    </p>
                    <p className="text-xs text-space-400 mt-2">
                      {template.nodes.length} nodes • {template.connections.length} connections
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

