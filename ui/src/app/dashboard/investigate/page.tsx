/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Domain Investigation - Deep-dive domain intelligence
 */

'use client'

import { useState } from 'react'
import { DomainInvestigationPanel, generateDemoInvestigation } from '@/components/investigation'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function InvestigatePage() {
  const [domain, setDomain] = useState('')
  const [investigation, setInvestigation] = useState<ReturnType<typeof generateDemoInvestigation> | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleInvestigate = async () => {
    if (!domain) return
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setInvestigation(generateDemoInvestigation(domain))
    setIsLoading(false)
  }

  const handleAction = (action: string, domain: string) => {
    console.log('Action:', action, 'on domain:', domain)
    // Would perform the action (block, allowlist, etc.)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
          <MagnifyingGlassIcon className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Domain Investigation</h1>
          <p className="text-space-500">Deep-dive into domain intelligence and threat analysis</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-space-400" />
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvestigate()}
              placeholder="Enter domain to investigate (e.g., suspicious-domain.com)"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-space-200 dark:border-space-700 bg-white dark:bg-space-900 text-space-900 dark:text-white text-lg focus:ring-2 focus:ring-nebula-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleInvestigate}
            disabled={!domain || isLoading}
            className="px-6 py-3 bg-nebula-500 text-white rounded-lg hover:bg-nebula-600 disabled:opacity-50 font-medium"
          >
            {isLoading ? 'Investigating...' : 'Investigate'}
          </button>
        </div>

        {/* Quick suggestions */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-sm text-space-500">Try:</span>
          {['malware-c2.bad', 'phishing-site.xyz', 'tracker.adnetwork.com'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                setDomain(suggestion)
                setInvestigation(generateDemoInvestigation(suggestion))
              }}
              className="px-3 py-1 text-sm bg-space-100 dark:bg-space-700 text-space-600 dark:text-space-400 rounded-full hover:bg-space-200 dark:hover:bg-space-600"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Investigation Results */}
      {investigation && (
        <DomainInvestigationPanel
          investigation={investigation}
          onAction={handleAction}
        />
      )}

      {/* Empty State */}
      {!investigation && !isLoading && (
        <div className="text-center py-16 bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700">
          <MagnifyingGlassIcon className="h-16 w-16 text-space-300 dark:text-space-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-space-900 dark:text-white mb-2">
            No Domain Selected
          </h3>
          <p className="text-space-500 max-w-md mx-auto">
            Enter a domain above to investigate its reputation, hosting details, WHOIS information, and threat intelligence.
          </p>
        </div>
      )}
    </div>
  )
}

