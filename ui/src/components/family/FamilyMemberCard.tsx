/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Family Member Card - Individual family member display
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { FamilyMember, DEVICE_ICONS } from './types'
import {
  ClockIcon,
  DevicePhoneMobileIcon,
  PauseCircleIcon,
} from '@heroicons/react/24/outline'

interface FamilyMemberCardProps {
  member: FamilyMember
  isSelected: boolean
  onClick: () => void
  onPauseInternet?: (member: FamilyMember) => void
  index: number
}

export function FamilyMemberCard({ member, isSelected, onClick, onPauseInternet, index }: FamilyMemberCardProps) {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  const limitPercent = member.restrictions.dailyLimit
    ? Math.min((member.screenTime.today / member.restrictions.dailyLimit) * 100, 100)
    : 0

  const getRoleColor = (role: FamilyMember['role']) => {
    switch (role) {
      case 'parent':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'teen':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'child':
        return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className={clsx(
        'bg-white dark:bg-space-800 rounded-2xl border-2 p-4 cursor-pointer transition-all',
        isSelected
          ? 'border-nebula-500 shadow-lg shadow-nebula-500/20'
          : 'border-transparent shadow-md hover:shadow-lg'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-4xl">{member.avatar}</span>
            {member.isOnline && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-success-500 rounded-full border-2 border-white dark:border-space-800" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-space-900 dark:text-white">{member.name}</h3>
            <span className={clsx('text-xs px-2 py-0.5 rounded-full capitalize', getRoleColor(member.role))}>
              {member.role}
            </span>
          </div>
        </div>
        {member.role !== 'parent' && onPauseInternet && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPauseInternet(member)
            }}
            className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg text-space-400 hover:text-danger-500"
            title="Pause Internet"
          >
            <PauseCircleIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Screen Time */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="flex items-center gap-1 text-space-500">
            <ClockIcon className="h-4 w-4" />
            Screen Time Today
          </span>
          <span className="font-medium text-space-900 dark:text-white">
            {formatTime(member.screenTime.today)}
            {member.restrictions.dailyLimit && (
              <span className="text-space-400"> / {formatTime(member.restrictions.dailyLimit)}</span>
            )}
          </span>
        </div>
        {member.restrictions.dailyLimit && (
          <div className="h-2 bg-space-100 dark:bg-space-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${limitPercent}%` }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className={clsx(
                'h-full rounded-full',
                limitPercent >= 90 ? 'bg-danger-500' : limitPercent >= 70 ? 'bg-amber-500' : 'bg-success-500'
              )}
            />
          </div>
        )}
      </div>

      {/* Category breakdown */}
      <div className="flex gap-1 mb-4">
        {member.screenTime.byCategory.map((cat) => (
          <div
            key={cat.category}
            className="flex-1 h-2 rounded-full"
            style={{ backgroundColor: cat.color }}
            title={`${cat.category}: ${formatTime(cat.minutes)}`}
          />
        ))}
      </div>

      {/* Devices */}
      <div className="flex items-center gap-2">
        <DevicePhoneMobileIcon className="h-4 w-4 text-space-400" />
        <div className="flex gap-1">
          {member.devices.map((device) => (
            <span
              key={device.id}
              className={clsx(
                'text-lg',
                device.isOnline ? 'opacity-100' : 'opacity-40'
              )}
              title={`${device.name} - ${device.isOnline ? 'Online' : 'Offline'}`}
            >
              {DEVICE_ICONS[device.type]}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

