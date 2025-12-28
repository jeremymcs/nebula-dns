/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Threat Radar - Real-time circular visualization of threat activity
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

interface ThreatBlip {
  id: string
  angle: number
  distance: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: string
  domain?: string
  timestamp: number
}

interface ThreatRadarProps {
  threats?: ThreatBlip[]
  isLive?: boolean
  className?: string
}

export function ThreatRadar({ threats = [], isLive = true, className }: ThreatRadarProps) {
  const [blips, setBlips] = useState<ThreatBlip[]>(threats)
  const [scanAngle, setScanAngle] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Animate radar sweep
  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(() => {
      setScanAngle((prev) => (prev + 2) % 360)
    }, 50)
    return () => clearInterval(interval)
  }, [isLive])

  // Demo: Generate random threats
  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(() => {
      const shouldAddThreat = Math.random() > 0.7
      if (shouldAddThreat) {
        const newBlip: ThreatBlip = {
          id: `threat-${Date.now()}`,
          angle: Math.random() * 360,
          distance: 0.3 + Math.random() * 0.6,
          severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as ThreatBlip['severity'],
          type: ['Malware', 'Phishing', 'C2', 'Cryptomining', 'Botnet'][Math.floor(Math.random() * 5)],
          domain: `threat-${Math.floor(Math.random() * 1000)}.example.com`,
          timestamp: Date.now(),
        }
        setBlips((prev) => [...prev.slice(-20), newBlip])
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [isLive])

  const getSeverityColor = (severity: ThreatBlip['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 shadow-red-500/50'
      case 'high': return 'bg-orange-500 shadow-orange-500/50'
      case 'medium': return 'bg-yellow-500 shadow-yellow-500/50'
      case 'low': return 'bg-blue-400 shadow-blue-400/50'
    }
  }

  return (
    <div ref={containerRef} className={clsx('relative aspect-square', className)}>
      {/* Radar background */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-space-200 to-space-300 dark:from-space-800 dark:to-space-900 border border-space-300 dark:border-space-700 overflow-hidden">
        {/* Grid circles */}
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <div
            key={scale}
            className="absolute inset-0 m-auto rounded-full border border-space-400/50 dark:border-space-700/50"
            style={{ width: `${scale * 100}%`, height: `${scale * 100}%` }}
          />
        ))}

        {/* Cross lines */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-px bg-space-400/50 dark:bg-space-700/50" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-full w-px bg-space-400/50 dark:bg-space-700/50" />
        </div>

        {/* Sweep line */}
        <div
          className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left"
          style={{ transform: `rotate(${scanAngle}deg)` }}
        >
          <div className="w-full h-full bg-gradient-to-r from-nebula-500 to-transparent" />
        </div>

        {/* Sweep glow */}
        <div
          className="absolute top-1/2 left-1/2 w-1/2 h-1/2 origin-top-left opacity-30"
          style={{ transform: `rotate(${scanAngle - 30}deg)` }}
        >
          <div className="w-full h-full bg-gradient-to-br from-nebula-500/50 to-transparent rounded-tr-full" />
        </div>

        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-nebula-500 shadow-lg shadow-nebula-500/50" />

        {/* Threat blips */}
        <AnimatePresence>
          {blips.map((blip) => {
            const x = 50 + blip.distance * 45 * Math.cos((blip.angle * Math.PI) / 180)
            const y = 50 + blip.distance * 45 * Math.sin((blip.angle * Math.PI) / 180)
            
            return (
              <motion.div
                key={blip.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className={clsx('absolute w-2 h-2 rounded-full shadow-lg cursor-pointer', getSeverityColor(blip.severity))}
                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                title={`${blip.type}: ${blip.domain}`}
              >
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  style={{ backgroundColor: 'inherit' }}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Status indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-space-800/80 backdrop-blur-sm border border-space-200 dark:border-space-700">
        <span className={clsx('w-2 h-2 rounded-full', isLive ? 'bg-green-500 animate-pulse' : 'bg-space-500')} />
        <span className="text-xs font-medium text-space-700 dark:text-space-300">{isLive ? 'Live Monitoring' : 'Paused'}</span>
      </div>
    </div>
  )
}

