/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Domain Investigation - Deep-dive domain intelligence panel
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { DomainIntel, NetworkActivity, ThreatIndicator } from './types'
import { DomainHeader } from './DomainHeader'
import { IntelligenceSection } from './IntelligenceSection'
import { NetworkActivitySection } from './NetworkActivitySection'
import { ThreatIndicators } from './ThreatIndicators'
import { QuickActionBar } from './QuickActionBar'
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface DomainInvestigationProps {
  domain: string
  isOpen: boolean
  onClose: () => void
  onAction?: (action: string, domain: string) => void
}

export function DomainInvestigation({ domain, isOpen, onClose, onAction }: DomainInvestigationProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [intel, setIntel] = useState<DomainIntel | null>(null)
  const [activity, setActivity] = useState<NetworkActivity | null>(null)
  const [threats, setThreats] = useState<ThreatIndicator[]>([])

  // Fetch domain intelligence
  useEffect(() => {
    if (!isOpen || !domain) return

    setIsLoading(true)
    
    // Simulate API call (in production, this would fetch real data)
    const fetchData = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setIntel({
        domain,
        registrar: 'GoDaddy LLC',
        registrationDate: '2010-03-15',
        expirationDate: '2025-03-15',
        domainAge: '14 years',
        sslIssuer: "Let's Encrypt",
        sslExpiry: '2024-06-15',
        hostingProvider: 'Cloudflare, Inc.',
        asn: 'AS13335',
        ipAddresses: ['104.21.32.128', '172.67.182.31'],
        nameservers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
        country: 'US',
      })

      setActivity({
        firstSeen: '2024-01-15T10:30:00Z',
        lastSeen: new Date().toISOString(),
        totalQueries: 1247,
        uniqueClients: 45,
        zones: ['Headquarters', 'Remote Workers'],
        topClients: [
          { ip: '192.168.1.100', queries: 234 },
          { ip: '192.168.1.105', queries: 189 },
          { ip: '10.0.0.50', queries: 156 },
        ],
      })

      setThreats([
        { source: 'VirusTotal', score: 0, maxScore: 90, status: 'clean', details: '0/90 vendors flagged' },
        { source: 'Google Safe Browsing', score: 0, maxScore: 1, status: 'clean', details: 'No threats detected' },
        { source: 'PhishTank', score: 0, maxScore: 1, status: 'clean', details: 'Not in database' },
      ])

      setIsLoading(false)
    }

    fetchData()
  }, [domain, isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white dark:bg-space-900 shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-space-200 dark:border-space-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-space-900 dark:text-white">Domain Investigation</h2>
              <button onClick={onClose} className="p-2 hover:bg-space-100 dark:hover:bg-space-800 rounded-lg">
                <XMarkIcon className="h-5 w-5 text-space-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <ArrowPathIcon className="h-8 w-8 text-primary-500 animate-spin" />
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  <DomainHeader domain={domain} intel={intel} />
                  <ThreatIndicators threats={threats} />
                  <IntelligenceSection intel={intel} />
                  <NetworkActivitySection activity={activity} />
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <QuickActionBar
              domain={domain}
              onAction={(action) => onAction?.(action, domain)}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

