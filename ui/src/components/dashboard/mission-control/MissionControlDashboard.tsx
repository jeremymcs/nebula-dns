/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Mission Control Dashboard - Immersive security command center
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ThreatRadar } from './ThreatRadar'
import { NetworkStatus } from './NetworkStatus'
import { ProtectionShield } from './ProtectionShield'
import { QueryStream } from './QueryStream'
import { MissionControlHeader } from './MissionControlHeader'
import { QuickActions } from './QuickActions'
import { ThreatHeatmap } from './ThreatHeatmap'
import { BlockDomainModal } from './BlockDomainModal'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useThreatData, useSecurityScore, useLocations } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export function MissionControlDashboard() {
  const router = useRouter()
  const { data: threatData, error: threatError, isLoading: threatLoading, mutate: mutateThreat } = useThreatData('24h')
  const { data: securityScoreData, error: scoreError, isLoading: scoreLoading, mutate: mutateScore } = useSecurityScore()
  const { data: locationsData, mutate: mutateLocations } = useLocations()

  // Modal states
  const [isBlockDomainModalOpen, setIsBlockDomainModalOpen] = useState(false)
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false)
  const [isLockdownDialogOpen, setIsLockdownDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Determine if protection is currently paused (all locations inactive)
  const locations = locationsData?.data || []
  const isProtectionPaused = locations.length > 0 && locations.every((loc: any) => loc.status === 'inactive')

  const isLoading = threatLoading || scoreLoading
  const hasError = threatError || scoreError

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -my-6 bg-gradient-to-b from-space-100 via-space-50 to-white dark:from-space-900 dark:via-space-950 dark:to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-nebula-500"></div>
          <p className="text-space-500 text-lg">Loading Mission Control...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (hasError) {
    return (
      <div className="min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -my-6 bg-gradient-to-b from-space-100 via-space-50 to-white dark:from-space-900 dark:via-space-950 dark:to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="p-4 rounded-full bg-danger-100 dark:bg-danger-900/30">
            <ExclamationTriangleIcon className="h-12 w-12 text-danger-500" />
          </div>
          <h2 className="text-xl font-semibold text-space-900 dark:text-white">Failed to Load Mission Control</h2>
          <p className="text-space-500">
            {threatError?.message || scoreError?.message || 'Unable to fetch data. Please try again later.'}
          </p>
          <button
            onClick={() => { mutateThreat(); mutateScore(); }}
            className="flex items-center gap-2 px-4 py-2 bg-nebula-500 text-white rounded-lg hover:bg-nebula-600"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  const threats = threatData?.threats || []
  const heatmapData = threatData?.heatmap || []
  const securityScore = securityScoreData?.score || 0

  const handleBlockDomain = () => {
    setIsBlockDomainModalOpen(true)
  }

  const handlePauseProtection = () => {
    setIsPauseDialogOpen(true)
  }

  const handleToggleProtection = async () => {
    if (locations.length === 0) return

    setIsProcessing(true)
    try {
      const newStatus = isProtectionPaused ? 'active' : 'inactive'
      // Update all locations
      await Promise.all(
        locations.map((loc: any) =>
          api.updateLocation(loc.id, { status: newStatus })
        )
      )
      await mutateLocations()
      setIsPauseDialogOpen(false)
    } catch (error) {
      logger.error('Failed to toggle protection:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEmergencyLockdown = () => {
    setIsLockdownDialogOpen(true)
  }

  const handleConfirmLockdown = async () => {
    if (locations.length === 0) return

    setIsProcessing(true)
    try {
      // For emergency lockdown, we set all locations to inactive
      // In a full implementation, this would assign a special "lockdown" policy
      await Promise.all(
        locations.map((loc: any) =>
          api.updateLocation(loc.id, {
            status: 'inactive',
            settings: { ...loc.settings, lockdownMode: true }
          })
        )
      )
      await mutateLocations()
      setIsLockdownDialogOpen(false)
    } catch (error) {
      logger.error('Failed to activate lockdown:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCreatePolicy = () => {
    router.push('/dashboard/policies?action=new')
  }

  return (
    <div className="min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -my-6 bg-gradient-to-b from-space-100 via-space-50 to-white dark:from-space-900 dark:via-space-950 dark:to-black">
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
              score={securityScore}
              threatsBlocked={threatData?.blockedCount || 847}
              policiesActive={securityScoreData?.policiesActive || 5}
              zonesProtected={securityScoreData?.zonesProtected || 5}
            />
            <QuickActions
              onBlockDomain={handleBlockDomain}
              onPauseProtection={handlePauseProtection}
              onEmergencyLockdown={handleEmergencyLockdown}
              onCreatePolicy={handleCreatePolicy}
              isProtectionPaused={isProtectionPaused}
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
              className="bg-white/80 dark:bg-space-800/50 backdrop-blur-sm border border-space-200 dark:border-space-700 rounded-xl p-4"
            >
              <p className="text-sm text-space-500 dark:text-space-400">{stat.label}</p>
              <p className="text-2xl font-bold text-space-900 dark:text-white mt-1">{stat.value}</p>
              {stat.change && (
                <p className={`text-xs mt-1 ${stat.change.startsWith('+') ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>
                  {stat.change} vs last week
                </p>
              )}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Block Domain Modal */}
      <BlockDomainModal
        isOpen={isBlockDomainModalOpen}
        onClose={() => setIsBlockDomainModalOpen(false)}
        onSuccess={() => {
          mutateThreat()
        }}
      />

      {/* Pause Protection Dialog */}
      <ConfirmDialog
        isOpen={isPauseDialogOpen}
        onClose={() => setIsPauseDialogOpen(false)}
        onConfirm={handleToggleProtection}
        title={isProtectionPaused ? 'Resume Protection' : 'Pause Protection'}
        message={
          isProtectionPaused
            ? 'This will re-enable DNS filtering for all your locations. DNS queries will be filtered according to your policies.'
            : 'This will temporarily disable DNS filtering for all your locations. DNS queries will pass through without filtering. Are you sure?'
        }
        confirmText={isProtectionPaused ? 'Resume Protection' : 'Pause Protection'}
        variant={isProtectionPaused ? 'success' : 'warning'}
        isLoading={isProcessing}
      />

      {/* Emergency Lockdown Dialog */}
      <ConfirmDialog
        isOpen={isLockdownDialogOpen}
        onClose={() => setIsLockdownDialogOpen(false)}
        onConfirm={handleConfirmLockdown}
        title="Activate Emergency Lockdown"
        message="Emergency lockdown will block all DNS queries across all locations. Only essential services will be allowed. This is a drastic measure - use only in case of active security incidents."
        confirmText="Activate Lockdown"
        variant="danger"
        isLoading={isProcessing}
      />
    </div>
  )
}

