/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Policy Templates Marketplace
 */

'use client'

import { useState } from 'react'
import {
  TemplateBrowser,
  TemplateDetail,
  PolicyTemplate,
  generateDemoTemplates,
} from '@/components/templates'
import { RectangleStackIcon } from '@heroicons/react/24/outline'

export default function TemplatesPage() {
  const [templates] = useState<PolicyTemplate[]>(generateDemoTemplates())
  const [selectedTemplate, setSelectedTemplate] = useState<PolicyTemplate | null>(null)

  const handleSelectTemplate = (template: PolicyTemplate) => {
    setSelectedTemplate(template)
  }

  const handleUseTemplate = (_template: PolicyTemplate) => {
    // TODO: Navigate to policy creation with template pre-filled
    setSelectedTemplate(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-teal-500">
          <RectangleStackIcon className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Policy Templates</h1>
          <p className="text-space-500">Browse and use community policy templates</p>
        </div>
      </div>

      {/* Template Browser */}
      <TemplateBrowser
        templates={templates}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <TemplateDetail
          template={selectedTemplate}
          isOpen={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onUseTemplate={handleUseTemplate}
        />
      )}
    </div>
  )
}

