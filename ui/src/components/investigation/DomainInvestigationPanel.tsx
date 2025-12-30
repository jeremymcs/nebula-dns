/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Domain Investigation Panel - Inline investigation results display
 */

'use client'

import { motion } from 'framer-motion'
import { InvestigationData } from './types'
import { DomainHeader } from './DomainHeader'
import { ThreatIndicators } from './ThreatIndicators'
import { IntelligenceSection } from './IntelligenceSection'
import { NetworkActivitySection } from './NetworkActivitySection'
import {
  ShieldExclamationIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

interface DomainInvestigationPanelProps {
  investigation: InvestigationData
  onAction?: (action: string, domain: string) => void
}

export function DomainInvestigationPanel({ investigation, onAction }: DomainInvestigationPanelProps) {
  const { domain, intel, activity, threats, timeline } = investigation
  const isMalicious = threats.some((t) => t.status === 'malicious')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Domain Header */}
      <DomainHeader domain={domain} intel={intel} />

      {/* Quick Actions */}
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onAction?.('block', domain)}
            className="flex items-center gap-2 px-4 py-2 bg-danger-500 text-white rounded-lg hover:bg-danger-600 transition-colors"
          >
            <NoSymbolIcon className="h-4 w-4" />
            Block Domain
          </button>
          <button
            onClick={() => onAction?.('allowlist', domain)}
            className="flex items-center gap-2 px-4 py-2 bg-success-500 text-white rounded-lg hover:bg-success-600 transition-colors"
          >
            <CheckCircleIcon className="h-4 w-4" />
            Add to Allowlist
          </button>
          <button
            onClick={() => onAction?.('monitor', domain)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            <ShieldExclamationIcon className="h-4 w-4" />
            Monitor
          </button>
        </div>
      </div>

      {/* Threat Indicators */}
      <ThreatIndicators threats={threats} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IntelligenceSection intel={intel} />
        <NetworkActivitySection activity={activity} />
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6">
        <h3 className="font-semibold text-space-900 dark:text-white mb-4 flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-space-400" />
          Activity Timeline
        </h3>
        <div className="space-y-4">
          {timeline.map((event, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    event.event === 'blocked'
                      ? 'bg-danger-500'
                      : event.event === 'threat_detected'
                      ? 'bg-amber-500'
                      : 'bg-success-500'
                  }`}
                />
                {index < timeline.length - 1 && <div className="w-0.5 h-full bg-space-200 dark:bg-space-700" />}
              </div>
              <div className="flex-1 pb-4">
                <p className="text-sm font-medium text-space-900 dark:text-white">{event.details}</p>
                <p className="text-xs text-space-500">
                  {new Date(event.timestamp).toLocaleString()}
                  {event.zone && ` • ${event.zone}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

