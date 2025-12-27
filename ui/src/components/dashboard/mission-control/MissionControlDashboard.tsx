/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Mission Control Dashboard - Immersive security command center
 */

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ThreatRadar } from './ThreatRadar'
import { NetworkStatus } from './NetworkStatus'
import { ProtectionShield } from './ProtectionShield'
import { QueryStream } from './QueryStream'
import { MissionControlHeader } from './MissionControlHeader'
import { QuickActions } from './QuickActions'
import { ThreatHeatmap } from './ThreatHeatmap'
import { generateDemoThreats, generateDemoHeatmapData } from './types'

export function MissionControlDashboard() {
  const [threats] = useState(generateDemoThreats())
  const [heatmapData] = useState(generateDemoHeatmapData())

  const handleBlockDomain = () => {
    console.log('Block domain action')
  }

  const handlePauseProtection = () => {
    console.log('Pause protection action')
  }

  const handleEmergencyLockdown = () => {
    console.log('Emergency lockdown action')
  }

  const handleCreatePolicy = () => {
    console.log('Create policy action')
  }

  return (
    <div className="min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -my-6 bg-gradient-to-b from-space-900 via-space-950 to-black">
      {/* Mission Control Header */}
      <MissionControlHeader />

      <div className="px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
        {/* Top Row - Radar, Shield, Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Threat Radar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-5"
          >
            <ThreatRadar threats={threats} />
          </motion.div>

          {/* Protection Shield */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 flex flex-col gap-4"
          >
            <ProtectionShield
              score={85}
              threatsBlocked={847}
              policiesActive={5}
              zonesProtected={5}
            />
            <QuickActions
              onBlockDomain={handleBlockDomain}
              onPauseProtection={handlePauseProtection}
              onEmergencyLockdown={handleEmergencyLockdown}
              onCreatePolicy={handleCreatePolicy}
            />
          </motion.div>

          {/* Network Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-4"
          >
            <NetworkStatus />
          </motion.div>
        </div>

        {/* Middle Row - Query Stream and Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real-time Query Stream */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <QueryStream />
          </motion.div>

          {/* Threat Heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <ThreatHeatmap data={heatmapData} />
          </motion.div>
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total Queries Today', value: '8.5M', change: '+12%' },
            { label: 'Threats Blocked', value: '847', change: '-15%' },
            { label: 'Active Zones', value: '12', change: '' },
            { label: 'Avg Response Time', value: '12ms', change: '-8%' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-space-800/50 backdrop-blur-sm border border-space-700 rounded-xl p-4"
            >
              <p className="text-sm text-space-400">{stat.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              {stat.change && (
                <p className={`text-xs mt-1 ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                  {stat.change} vs last week
                </p>
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

