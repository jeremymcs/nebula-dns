/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Activity Summary - Daily/weekly activity overview
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { FamilyMember } from './types'
import {
  ShieldCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

interface ActivitySummaryProps {
  members: FamilyMember[]
  className?: string
}

export function ActivitySummary({ members, className }: ActivitySummaryProps) {
  // Calculate totals
  const totalScreenTime = members.reduce((sum, m) => sum + m.screenTime.today, 0)
  const avgScreenTime = Math.round(totalScreenTime / members.length)
  const threatsBlocked = 47 // Demo value
  const categoriesBlocked = 12 // Demo value

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  const stats = [
    {
      label: 'Total Screen Time',
      value: formatTime(totalScreenTime),
      icon: ClockIcon,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Avg per Person',
      value: formatTime(avgScreenTime),
      icon: ChartBarIcon,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: 'Threats Blocked',
      value: threatsBlocked.toString(),
      icon: ShieldCheckIcon,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Categories Blocked',
      value: categoriesBlocked.toString(),
      icon: ExclamationTriangleIcon,
      color: 'text-amber-500',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ]

  return (
    <section className={className}>
      <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Today's Summary</h2>
      <div className="bg-white dark:bg-space-800 rounded-2xl shadow-md p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className={clsx('w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center', stat.bgColor)}>
                <stat.icon className={clsx('h-6 w-6', stat.color)} />
              </div>
              <p className="text-2xl font-bold text-space-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-space-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Activity by member */}
        <div className="border-t border-space-100 dark:border-space-700 pt-4">
          <h3 className="text-sm font-medium text-space-500 mb-3">Screen Time by Member</h3>
          <div className="space-y-3">
            {members.map((member) => {
              const percent = member.restrictions.dailyLimit
                ? (member.screenTime.today / member.restrictions.dailyLimit) * 100
                : 50
              return (
                <div key={member.id} className="flex items-center gap-3">
                  <span className="text-2xl">{member.avatar}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-space-900 dark:text-white">{member.name}</span>
                      <span className="text-space-500">{formatTime(member.screenTime.today)}</span>
                    </div>
                    <div className="h-2 bg-space-100 dark:bg-space-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(percent, 100)}%` }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className={clsx(
                          'h-full rounded-full',
                          percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-green-500'
                        )}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

