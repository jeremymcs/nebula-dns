/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Protection Shield - Visual indicator showing overall protection strength
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { ShieldCheckIcon, ShieldExclamationIcon } from '@heroicons/react/24/solid'

interface ProtectionShieldProps {
  score: number // 0-100
  threatsBlocked: number
  policiesActive: number
  zonesProtected: number
  className?: string
}

export function ProtectionShield({
  score = 85,
  threatsBlocked = 1247,
  policiesActive = 5,
  zonesProtected = 4,
  className,
}: ProtectionShieldProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-green-500', bg: 'from-green-500 to-emerald-600', glow: 'shadow-green-500/30' }
    if (score >= 60) return { text: 'text-amber-500', bg: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/30' }
    return { text: 'text-red-500', bg: 'from-red-500 to-rose-600', glow: 'shadow-red-500/30' }
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Good'
    if (score >= 60) return 'Fair'
    return 'Needs Attention'
  }

  const colors = getScoreColor(score)

  return (
    <div className={clsx('bg-white dark:bg-space-900 rounded-xl border border-space-200 dark:border-space-800 p-6', className)}>
      <div className="flex items-start gap-6">
        {/* Shield visualization */}
        <div className="relative flex-shrink-0">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={clsx('relative w-24 h-28 rounded-t-full rounded-b-[60%]', 'bg-gradient-to-b', colors.bg, 'shadow-2xl', colors.glow)}
          >
            {/* Inner shield */}
            <div className="absolute inset-2 rounded-t-full rounded-b-[60%] bg-gradient-to-b from-white/20 to-transparent" />
            
            {/* Score display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <span className="text-3xl font-bold">{score}</span>
              <span className="text-xs font-medium opacity-80">SCORE</span>
            </div>

            {/* Animated pulse ring */}
            <motion.div
              className={clsx('absolute -inset-1 rounded-t-full rounded-b-[60%] border-2 opacity-50', score >= 80 ? 'border-green-400' : score >= 60 ? 'border-amber-400' : 'border-red-400')}
              animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        </div>

        {/* Stats */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {score >= 60 ? (
              <ShieldCheckIcon className={clsx('h-5 w-5', colors.text)} />
            ) : (
              <ShieldExclamationIcon className={clsx('h-5 w-5', colors.text)} />
            )}
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">
              Protection Level: <span className={colors.text}>{getScoreLabel(score)}</span>
            </h3>
          </div>
          
          <p className="text-sm text-space-500 dark:text-space-400 mb-4">
            Your network is actively protected against threats
          </p>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-space-900 dark:text-white">
                {threatsBlocked.toLocaleString()}
              </p>
              <p className="text-xs text-space-500">Threats Blocked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-space-900 dark:text-white">{policiesActive}</p>
              <p className="text-xs text-space-500">Active Policies</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-space-900 dark:text-white">{zonesProtected}</p>
              <p className="text-xs text-space-500">Zones Protected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick improvement suggestions */}
      {score < 100 && (
        <div className="mt-4 pt-4 border-t border-space-100 dark:border-space-800">
          <p className="text-xs font-medium text-space-500 mb-2">Quick improvements:</p>
          <div className="flex flex-wrap gap-2">
            {score < 90 && (
              <span className="px-2 py-1 text-xs rounded-full bg-nebula-500/10 text-nebula-600 dark:text-nebula-400 border border-nebula-500/20">
                +5 pts: Enable MFA
              </span>
            )}
            {score < 85 && (
              <span className="px-2 py-1 text-xs rounded-full bg-nebula-500/10 text-nebula-600 dark:text-nebula-400 border border-nebula-500/20">
                +3 pts: Block NRD
              </span>
            )}
            {score < 80 && (
              <span className="px-2 py-1 text-xs rounded-full bg-nebula-500/10 text-nebula-600 dark:text-nebula-400 border border-nebula-500/20">
                +5 pts: Add backup zone
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

