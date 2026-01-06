/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Policy Templates Marketplace
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TemplateBrowser,
  TemplateDetail,
  PolicyTemplate,
} from '@/components/templates'
import { usePolicyTemplates } from '@/hooks/useApi'
import { RectangleStackIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export default function TemplatesPage() {
  const router = useRouter()
  const { data: templatesData, error, isLoading, mutate } = usePolicyTemplates()
  const templates: PolicyTemplate[] = templatesData?.data || []
  const [selectedTemplate, setSelectedTemplate] = useState<PolicyTemplate | null>(null)

  const handleSelectTemplate = (template: PolicyTemplate) => {
    setSelectedTemplate(template)
  }

  const handleUseTemplate = (template: PolicyTemplate) => {
    // Store template in sessionStorage for the policies page to read
    sessionStorage.setItem('policyTemplate', JSON.stringify({
      name: `${template.name} Policy`,
      description: template.description,
      config: template.config,
      templateId: template.id,
    }))
    setSelectedTemplate(null)
    // Navigate to policy creation with template flag
    router.push('/dashboard/policies?action=new&fromTemplate=true')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
          <p className="text-space-500">Loading templates...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="p-4 rounded-full bg-danger-100 dark:bg-danger-900/30">
            <ExclamationTriangleIcon className="h-12 w-12 text-danger-500" />
          </div>
          <h2 className="text-xl font-semibold text-space-900 dark:text-white">Failed to Load Templates</h2>
          <p className="text-space-500">
            {error?.message || 'Unable to fetch policy templates. Please try again later.'}
          </p>
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    )
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

