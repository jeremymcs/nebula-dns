/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Query Stream - Live scrolling feed of DNS queries with color-coded decisions
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/solid'

interface Query {
  id: string
  domain: string
  decision: 'allowed' | 'blocked' | 'warned'
  category?: string
  zone: string
  timestamp: Date
  responseTime: number
}

interface QueryStreamProps {
  queries?: Query[]
  maxItems?: number
  isLive?: boolean
  className?: string
}

const demoCategories = ['Social Media', 'News', 'Technology', 'Malware', 'Phishing', 'Ads', 'Streaming', 'Gaming']
const demoDomains = ['google.com', 'facebook.com', 'malware-site.xyz', 'phishing-attempt.com', 'youtube.com', 'github.com', 'ads.doubleclick.net', 'tracker.example.com']
const demoZones = ['Headquarters', 'Remote Workers', 'Guest WiFi', 'IoT Devices']

export function QueryStream({ maxItems = 10, isLive = true, className }: QueryStreamProps) {
  const [queries, setQueries] = useState<Query[]>([])
  const streamRef = useRef<HTMLDivElement>(null)

  // Generate demo queries
  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(() => {
      const domain = demoDomains[Math.floor(Math.random() * demoDomains.length)]
      const isThreat = domain.includes('malware') || domain.includes('phishing') || domain.includes('tracker') || domain.includes('ads')
      
      const newQuery: Query = {
        id: `query-${Date.now()}-${Math.random()}`,
        domain,
        decision: isThreat ? 'blocked' : Math.random() > 0.95 ? 'warned' : 'allowed',
        category: demoCategories[Math.floor(Math.random() * demoCategories.length)],
        zone: demoZones[Math.floor(Math.random() * demoZones.length)],
        timestamp: new Date(),
        responseTime: Math.floor(Math.random() * 50) + 5,
      }
      
      setQueries((prev) => [newQuery, ...prev].slice(0, maxItems))
    }, 500 + Math.random() * 1000)
    
    return () => clearInterval(interval)
  }, [isLive, maxItems])

  const getDecisionIcon = (decision: Query['decision']) => {
    switch (decision) {
      case 'allowed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />
      case 'blocked':
        return <XCircleIcon className="h-4 w-4 text-red-500" />
      case 'warned':
        return <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
    }
  }

  const getDecisionBg = (decision: Query['decision']) => {
    switch (decision) {
      case 'allowed': return 'bg-green-500/5 border-green-500/10'
      case 'blocked': return 'bg-red-500/5 border-red-500/10'
      case 'warned': return 'bg-amber-500/5 border-amber-500/10'
    }
  }

  return (
    <div className={clsx('bg-white dark:bg-space-900 rounded-xl border border-space-200 dark:border-space-800 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-space-200 dark:border-space-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GlobeAltIcon className="h-5 w-5 text-nebula-500" />
          <h3 className="text-lg font-semibold text-space-900 dark:text-white">Live Query Stream</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx('w-2 h-2 rounded-full', isLive ? 'bg-green-500 animate-pulse' : 'bg-space-400')} />
          <span className="text-xs text-space-500">{isLive ? 'Live' : 'Paused'}</span>
        </div>
      </div>

      {/* Stream - fixed height to prevent layout shift */}
      <div ref={streamRef} className="h-[400px] overflow-y-auto overflow-x-hidden">
        <div className="divide-y divide-space-100 dark:divide-space-800">
          <AnimatePresence initial={false}>
            {queries.map((query) => (
              <motion.div
                key={query.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={clsx('px-6 py-3 flex items-center gap-4 cursor-pointer hover:bg-space-50 dark:hover:bg-space-800/50 transition-colors', getDecisionBg(query.decision))}
              >
                {getDecisionIcon(query.decision)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-space-900 dark:text-white truncate">{query.domain}</p>
                  <p className="text-xs text-space-500">{query.zone} • {query.category}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-space-500">{query.responseTime}ms</p>
                  <p className="text-xs text-space-400">{query.timestamp.toLocaleTimeString()}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {queries.length === 0 && (
            <div className="px-6 py-12 text-center text-space-500">
              <GlobeAltIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Waiting for DNS queries...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

