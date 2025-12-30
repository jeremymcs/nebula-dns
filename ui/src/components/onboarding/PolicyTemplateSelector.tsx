/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Policy Template Selector - Choose initial policy template
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { POLICY_TEMPLATES } from './types'
import { CheckIcon } from '@heroicons/react/24/solid'

interface PolicyTemplateSelectorProps {
  selected?: string
  onSelect: (templateId: string) => void
}

export function PolicyTemplateSelector({ selected, onSelect }: PolicyTemplateSelectorProps) {
  return (
    <div className="space-y-3">
      {POLICY_TEMPLATES.map((template, index) => (
        <motion.button
          key={template.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelect(template.id)}
          className={clsx(
            'w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4',
            selected === template.id
              ? 'border-nebula-500 bg-nebula-500/10'
              : 'border-space-200 dark:border-space-700 hover:border-nebula-300 dark:hover:border-nebula-700'
          )}
        >
          <div className="text-3xl">{template.icon}</div>
          <div className="flex-1">
            <h3 className="font-semibold text-space-900 dark:text-white">{template.name}</h3>
            <p className="text-sm text-space-500 mt-1">{template.description}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {template.features.map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400 rounded-full"
                >
                  <CheckIcon className="h-3 w-3 text-success-500" />
                  {feature}
                </span>
              ))}
            </div>
          </div>
          {selected === template.id && (
            <div className="w-6 h-6 rounded-full bg-nebula-500 flex items-center justify-center">
              <CheckIcon className="h-4 w-4 text-white" />
            </div>
          )}
        </motion.button>
      ))}
    </div>
  )
}

