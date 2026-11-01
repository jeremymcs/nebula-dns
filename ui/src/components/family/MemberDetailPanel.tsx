/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Member Detail Panel - Edit family member restrictions
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { FamilyMember, DEVICE_ICONS } from './types'
import { Button } from '@/components/ui'
import {
  XMarkIcon,
  ClockIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  MoonIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'

interface MemberDetailPanelProps {
  member: FamilyMember | null
  onClose: () => void
  onSave: (memberId: string, updates: Partial<FamilyMember['restrictions']>) => Promise<void>
}

const CATEGORY_OPTIONS = [
  { id: 'adult', label: 'Adult Content', color: 'bg-danger-500' },
  { id: 'gambling', label: 'Gambling', color: 'bg-amber-500' },
  { id: 'gaming', label: 'Gaming', color: 'bg-primary-500' },
  { id: 'social-media', label: 'Social Media', color: 'bg-blue-500' },
  { id: 'streaming', label: 'Streaming', color: 'bg-accent-500' },
  { id: 'shopping', label: 'Shopping', color: 'bg-success-500' },
  { id: 'news', label: 'News', color: 'bg-space-500' },
]

export function MemberDetailPanel({ member, onClose, onSave }: MemberDetailPanelProps) {
  const [saving, setSaving] = useState(false)
  const [restrictions, setRestrictions] = useState({
    dailyLimit: 180,
    bedtimeStart: '21:00',
    bedtimeEnd: '07:00',
    blockedCategories: [] as string[],
    safeSearch: true,
  })

  // Sync state when member changes
  useEffect(() => {
    if (member) {
      setRestrictions({
        dailyLimit: member.restrictions?.dailyLimit ?? 180,
        bedtimeStart: member.restrictions?.bedtime?.start ?? '21:00',
        bedtimeEnd: member.restrictions?.bedtime?.end ?? '07:00',
        blockedCategories: member.restrictions?.blockedCategories ?? [],
        safeSearch: member.restrictions?.safeSearch ?? true,
      })
    }
  }, [member])

  const toggleCategory = (categoryId: string) => {
    setRestrictions(prev => ({
      ...prev,
      blockedCategories: prev.blockedCategories.includes(categoryId)
        ? prev.blockedCategories.filter(c => c !== categoryId)
        : [...prev.blockedCategories, categoryId],
    }))
  }

  const handleSave = async () => {
    if (!member) return
    setSaving(true)
    try {
      await onSave(member.id, {
        dailyLimit: restrictions.dailyLimit,
        bedtime: { start: restrictions.bedtimeStart, end: restrictions.bedtimeEnd },
        blockedCategories: restrictions.blockedCategories,
        safeSearch: restrictions.safeSearch,
      })
    } finally {
      setSaving(false)
    }
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  return (
    <AnimatePresence>
      {member && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-space-800 shadow-2xl z-50 overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-space-800 border-b border-space-200 dark:border-space-700 p-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{member.avatar}</span>
              <div>
                <h2 className="font-semibold text-space-900 dark:text-white">{member.name}</h2>
                <span className="text-sm text-space-500 capitalize">{member.role}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg"
            >
              <XMarkIcon className="h-5 w-5 text-space-500" />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* Screen Time Limit */}
            <div className="bg-space-50 dark:bg-space-900/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ClockIcon className="h-5 w-5 text-blue-500" />
                <h3 className="font-medium text-space-900 dark:text-white">Daily Screen Time</h3>
              </div>
              <div className="space-y-2">
                <input
                  type="range"
                  min="30"
                  max="480"
                  step="30"
                  value={restrictions.dailyLimit}
                  onChange={(e) => setRestrictions({ ...restrictions, dailyLimit: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-space-500">30m</span>
                  <span className="font-medium text-space-900 dark:text-white">
                    {formatTime(restrictions.dailyLimit)}
                  </span>
                  <span className="text-space-500">8h</span>
                </div>
              </div>
            </div>

            {/* Bedtime */}
            <div className="bg-space-50 dark:bg-space-900/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <MoonIcon className="h-5 w-5 text-primary-500" />
                <h3 className="font-medium text-space-900 dark:text-white">Bedtime</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-space-500 mb-1">Internet off at</label>
                  <input
                    type="time"
                    value={restrictions.bedtimeStart}
                    onChange={(e) => setRestrictions({ ...restrictions, bedtimeStart: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-space-200 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-space-500 mb-1">Back on at</label>
                  <input
                    type="time"
                    value={restrictions.bedtimeEnd}
                    onChange={(e) => setRestrictions({ ...restrictions, bedtimeEnd: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-space-200 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Blocked Categories */}
            <div className="bg-space-50 dark:bg-space-900/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <NoSymbolIcon className="h-5 w-5 text-danger-500" />
                <h3 className="font-medium text-space-900 dark:text-white">Blocked Categories</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((category) => {
                  const isBlocked = restrictions.blockedCategories.includes(category.id)
                  return (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={clsx(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                        isBlocked
                          ? `${category.color} text-white`
                          : 'bg-space-200 dark:bg-space-700 text-space-600 dark:text-space-400 hover:bg-space-300 dark:hover:bg-space-600'
                      )}
                    >
                      {category.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Safe Search */}
            <div className="bg-space-50 dark:bg-space-900/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-5 w-5 text-success-500" />
                  <div>
                    <h3 className="font-medium text-space-900 dark:text-white">Safe Search</h3>
                    <p className="text-sm text-space-500">Filter explicit search results</p>
                  </div>
                </div>
                <button
                  onClick={() => setRestrictions({ ...restrictions, safeSearch: !restrictions.safeSearch })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${restrictions.safeSearch ? 'bg-success-500' : 'bg-space-200 dark:bg-space-600'}`}
                >
                  <span className={`${restrictions.safeSearch ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                </button>
              </div>
            </div>

            {/* Devices */}
            <div className="bg-space-50 dark:bg-space-900/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <DevicePhoneMobileIcon className="h-5 w-5 text-accent-500" />
                <h3 className="font-medium text-space-900 dark:text-white">Devices</h3>
              </div>
              <div className="space-y-2">
                {member.devices.length === 0 ? (
                  <p className="text-sm text-space-500">No devices assigned</p>
                ) : (
                  member.devices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-2 bg-white dark:bg-space-800 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{DEVICE_ICONS[device.type]}</span>
                        <span className="text-sm text-space-900 dark:text-white">{device.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${device.isOnline ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' : 'bg-space-100 text-space-500 dark:bg-space-700 dark:text-space-400'}`}>
                        {device.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-space-800 border-t border-space-200 dark:border-space-700 p-4 flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
