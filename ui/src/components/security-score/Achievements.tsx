/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Achievements - Gamification badges and progress tracking
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { Achievement } from './types'
import { LockClosedIcon } from '@heroicons/react/24/solid'

interface AchievementsProps {
  achievements: Achievement[]
  className?: string
}

export function Achievements({ achievements, className }: AchievementsProps) {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)

  const unlockedCount = achievements.filter(a => a.unlockedAt).length
  const totalCount = achievements.length

  return (
    <div className={clsx('bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-space-200 dark:border-space-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-space-900 dark:text-white">Achievements</h3>
          <span className="text-sm text-space-500">
            {unlockedCount}/{totalCount} unlocked
          </span>
        </div>
      </div>

      {/* Achievement grid */}
      <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {achievements.map((achievement, index) => {
          const isUnlocked = !!achievement.unlockedAt
          const hasProgress = achievement.progress !== undefined && achievement.maxProgress !== undefined
          const progressPercent = hasProgress ? (achievement.progress! / achievement.maxProgress!) * 100 : 0

          return (
            <motion.button
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedAchievement(achievement)}
              className={clsx(
                'relative p-3 rounded-xl border-2 transition-all',
                isUnlocked
                  ? 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-300 dark:border-amber-700 hover:scale-105'
                  : 'bg-space-50 dark:bg-space-900 border-space-200 dark:border-space-700 opacity-60 hover:opacity-80'
              )}
            >
              {/* Icon */}
              <div className="text-3xl mb-1 text-center">
                {isUnlocked ? achievement.icon : <LockClosedIcon className="h-8 w-8 mx-auto text-space-400" />}
              </div>

              {/* Progress bar for in-progress achievements */}
              {hasProgress && !isUnlocked && (
                <div className="h-1 rounded-full bg-space-200 dark:bg-space-700 overflow-hidden mt-2">
                  <div
                    className="h-full bg-nebula-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}

              {/* Unlocked indicator */}
              {isUnlocked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success-500 flex items-center justify-center"
                >
                  <span className="text-white text-xs">✓</span>
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Achievement detail modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAchievement(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-space-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="text-6xl mb-4">
                  {selectedAchievement.unlockedAt ? selectedAchievement.icon : '🔒'}
                </div>
                <h3 className="text-xl font-bold text-space-900 dark:text-white mb-2">
                  {selectedAchievement.name}
                </h3>
                <p className="text-space-500 mb-4">{selectedAchievement.description}</p>

                {selectedAchievement.unlockedAt ? (
                  <p className="text-sm text-success-600 dark:text-success-400">
                    Unlocked on {new Date(selectedAchievement.unlockedAt).toLocaleDateString()}
                  </p>
                ) : selectedAchievement.progress !== undefined ? (
                  <div>
                    <div className="h-2 rounded-full bg-space-200 dark:bg-space-700 overflow-hidden mb-2">
                      <div
                        className="h-full bg-nebula-500 rounded-full"
                        style={{ width: `${(selectedAchievement.progress / selectedAchievement.maxProgress!) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-space-500">
                      {selectedAchievement.progress} / {selectedAchievement.maxProgress}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-space-400">Not yet unlocked</p>
                )}
              </div>

              <button
                onClick={() => setSelectedAchievement(null)}
                className="mt-6 w-full py-2 bg-space-100 dark:bg-space-700 rounded-lg text-space-600 dark:text-space-300 hover:bg-space-200 dark:hover:bg-space-600 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

