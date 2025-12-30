/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Threat Indicators - Multi-source threat intelligence display
 */

'use client'

import clsx from 'clsx'
import { ThreatIndicator } from './types'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/solid'

interface ThreatIndicatorsProps {
  threats: ThreatIndicator[]
  className?: string
}

export function ThreatIndicators({ threats, className }: ThreatIndicatorsProps) {
  const getStatusIcon = (status: ThreatIndicator['status']) => {
    switch (status) {
      case 'clean':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />
      case 'suspicious':
        return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
      case 'malicious':
        return <XCircleIcon className="h-5 w-5 text-danger-500" />
      default:
        return <QuestionMarkCircleIcon className="h-5 w-5 text-space-400" />
    }
  }

  const getStatusColor = (status: ThreatIndicator['status']) => {
    switch (status) {
      case 'clean':
        return 'bg-success-50 dark:bg-success-900/20 border-green-200 dark:border-green-800'
      case 'suspicious':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      case 'malicious':
        return 'bg-danger-50 dark:bg-danger-900/20 border-red-200 dark:border-red-800'
      default:
        return 'bg-space-50 dark:bg-space-800 border-space-200 dark:border-space-700'
    }
  }

  // Calculate overall threat level
  const overallStatus = threats.some(t => t.status === 'malicious')
    ? 'malicious'
    : threats.some(t => t.status === 'suspicious')
    ? 'suspicious'
    : 'clean'

  return (
    <div className={clsx('space-y-3', className)}>
      <h4 className="font-semibold text-space-900 dark:text-white flex items-center gap-2">
        Threat Intelligence
        {getStatusIcon(overallStatus)}
      </h4>

      <div className="grid gap-2">
        {threats.map((threat) => (
          <div
            key={threat.source}
            className={clsx(
              'flex items-center justify-between p-3 rounded-lg border',
              getStatusColor(threat.status)
            )}
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(threat.status)}
              <div>
                <p className="font-medium text-space-900 dark:text-white">{threat.source}</p>
                {threat.details && (
                  <p className="text-xs text-space-500">{threat.details}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className={clsx(
                'text-sm font-medium',
                threat.status === 'clean' ? 'text-success-600 dark:text-success-400' :
                threat.status === 'suspicious' ? 'text-amber-600 dark:text-amber-400' :
                threat.status === 'malicious' ? 'text-danger-600 dark:text-danger-400' :
                'text-space-500'
              )}>
                {threat.score}/{threat.maxScore}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

