/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Domain Header - Domain name and quick info display
 */

'use client'

import clsx from 'clsx'
import { DomainIntel } from './types'
import {
  GlobeAltIcon,
  ClockIcon,
  MapPinIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline'

interface DomainHeaderProps {
  domain: string
  intel: DomainIntel | null
  className?: string
}

export function DomainHeader({ domain, intel, className }: DomainHeaderProps) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(domain)
  }

  return (
    <div className={clsx('bg-space-50 dark:bg-space-800 rounded-xl p-4', className)}>
      {/* Domain name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-nebula-500/10">
          <GlobeAltIcon className="h-6 w-6 text-nebula-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-space-900 dark:text-white truncate">{domain}</h3>
            <button
              onClick={copyToClipboard}
              className="p-1 hover:bg-space-200 dark:hover:bg-space-700 rounded"
              title="Copy domain"
            >
              <ClipboardDocumentIcon className="h-4 w-4 text-space-400" />
            </button>
          </div>
          {intel?.hostingProvider && (
            <p className="text-sm text-space-500">Hosted by {intel.hostingProvider}</p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-space-500 mb-1">
            <ClockIcon className="h-4 w-4" />
            <span className="text-xs">Age</span>
          </div>
          <p className="font-semibold text-space-900 dark:text-white">{intel?.domainAge || 'Unknown'}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-space-500 mb-1">
            <MapPinIcon className="h-4 w-4" />
            <span className="text-xs">Country</span>
          </div>
          <p className="font-semibold text-space-900 dark:text-white">{intel?.country || 'Unknown'}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-space-500 mb-1">
            <GlobeAltIcon className="h-4 w-4" />
            <span className="text-xs">IPs</span>
          </div>
          <p className="font-semibold text-space-900 dark:text-white">{intel?.ipAddresses.length || 0}</p>
        </div>
      </div>
    </div>
  )
}

