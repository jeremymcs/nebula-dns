/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Family Dashboard - Family-focused home view
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { FamilyMember, generateDemoFamilyMembers } from './types'
import { FamilyMemberCard } from './FamilyMemberCard'
import { QuickActions } from './QuickActions'
import { ActivitySummary } from './ActivitySummary'
import { AddFamilyMemberModal } from './AddFamilyMemberModal'
import { MemberDetailPanel } from './MemberDetailPanel'
import { useFamilyMembers, useSummaryStats } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import { Card, Button, Modal } from '@/components/ui'
import { useToast } from '@/components/Toast'
import {
  ShieldCheckIcon,
  PlusIcon,
  Cog6ToothIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface FamilyDashboardProps {
  className?: string
}

export function FamilyDashboard({ className }: FamilyDashboardProps) {
  const { data: familyData, isLoading, mutate: mutateFamilyMembers } = useFamilyMembers()
  const { data: summaryStats } = useSummaryStats('24h')
  const { showToast } = useToast()
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [defaultSettings, setDefaultSettings] = useState({
    dailyLimit: 180,
    bedtimeStart: '21:00',
    bedtimeEnd: '07:00',
    safeSearch: true,
  })

  // Use API data if available, otherwise fall back to demo data
  const demoMembers = generateDemoFamilyMembers()
  const members: FamilyMember[] = (familyData?.data?.length ?? 0) > 0 ? familyData!.data : demoMembers

  const onlineCount = members.filter((m) => m.isOnline).length
  const totalThreatsBlocked = summaryStats?.threatsBlocked ?? 0
  // Calculate unique blocked categories from all members' restrictions
  const categoriesBlocked = new Set(members.flatMap(m => m.restrictions?.blockedCategories ?? [])).size

  // Quick action handlers
  const handleQuickAction = async (actionId: string) => {
    const nonParentMembers = members.filter((m) => m.role !== 'parent')
    if (nonParentMembers.length === 0) return

    try {
      switch (actionId) {
        case 'pause-gaming':
          // Add 'gaming' to blocked categories for all non-parent members
          await Promise.all(
            nonParentMembers.map((member) =>
              api.updateFamilyMember(member.id, {
                restrictions: {
                  ...member.restrictions,
                  blockedCategories: [...new Set([...member.restrictions.blockedCategories, 'gaming'])],
                },
              })
            )
          )
          break

        case 'homework':
          // Block gaming, social media, streaming for homework mode
          await Promise.all(
            nonParentMembers.map((member) =>
              api.updateFamilyMember(member.id, {
                restrictions: {
                  ...member.restrictions,
                  blockedCategories: [...new Set([...member.restrictions.blockedCategories, 'gaming', 'social-media', 'streaming'])],
                },
              })
            )
          )
          break

        case 'bedtime':
          // Apply bedtime restrictions immediately
          await Promise.all(
            nonParentMembers.map((member) =>
              api.updateFamilyMember(member.id, {
                restrictions: {
                  ...member.restrictions,
                  bedtime: { start: new Date().toTimeString().slice(0, 5), end: '07:00' },
                },
              })
            )
          )
          break

        case 'pause-all':
          // Block all internet (add all categories to blocklist)
          await Promise.all(
            nonParentMembers.map((member) =>
              api.updateFamilyMember(member.id, {
                restrictions: {
                  ...member.restrictions,
                  blockedCategories: ['adult', 'gambling', 'gaming', 'social-media', 'streaming', 'shopping', 'news'],
                },
              })
            )
          )
          break
      }
      mutateFamilyMembers()
    } catch (error) {
      logger.error('Failed to apply quick action:', error)
    }
  }

  const handleAddMember = async (data: { name: string; avatar: string; role: 'parent' | 'teen' | 'child' }) => {
    await api.createFamilyMember(data)
    mutateFamilyMembers()
  }

  const handlePauseInternet = async (member: FamilyMember) => {
    if (member.role === 'parent') return

    try {
      // Block all categories for this member
      await api.updateFamilyMember(member.id, {
        restrictions: {
          ...member.restrictions,
          blockedCategories: ['adult', 'gambling', 'gaming', 'social-media', 'streaming', 'shopping', 'news', 'entertainment'],
        },
      })
      mutateFamilyMembers()
      showToast('success', `Internet paused for ${member.name}`)
    } catch (error) {
      logger.error('Failed to pause internet:', error)
      showToast('error', 'Failed to pause internet')
    }
  }

  const handleSaveMemberRestrictions = async (memberId: string, updates: Partial<FamilyMember['restrictions']>) => {
    try {
      await api.updateFamilyMember(memberId, { restrictions: updates })
      mutateFamilyMembers()
      showToast('success', 'Restrictions updated')
      setSelectedMember(null)
    } catch (error) {
      logger.error('Failed to update restrictions:', error)
      showToast('error', 'Failed to update restrictions')
    }
  }

  const selectedMemberData = members.find(m => m.id === selectedMember) || null

  return (
    <div className={clsx('min-h-screen bg-surface', className)}>
      {/* Header */}
      <header className="bg-white/80 dark:bg-space-800/80 backdrop-blur-lg border-b border-space-200 dark:border-space-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-600">
              <ShieldCheckIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-space-900 dark:text-white">Family Protection</h1>
              <p className="text-sm text-space-500">
                {onlineCount} online • {totalThreatsBlocked} threats blocked today
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg"
            title="Family Settings"
          >
            <Cog6ToothIcon className="h-6 w-6 text-space-500" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <QuickActions onAction={handleQuickAction} />

        {/* Family Members */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-space-900 dark:text-white">Family Members</h2>
            <button
              onClick={() => setIsAddMemberModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
            >
              <PlusIcon className="h-4 w-4" />
              Add Member
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member, index) => (
              <FamilyMemberCard
                key={member.id}
                member={member}
                isSelected={selectedMember === member.id}
                onClick={() => setSelectedMember(member.id === selectedMember ? null : member.id)}
                onPauseInternet={handlePauseInternet}
                index={index}
              />
            ))}
            {/* Add member card */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: members.length * 0.1 }}
              onClick={() => setIsAddMemberModalOpen(true)}
              className="min-h-[200px] border-2 border-dashed border-space-300 dark:border-space-600 rounded-2xl flex flex-col items-center justify-center gap-2 text-space-400 hover:border-primary-500 hover:text-primary-500 transition-colors"
            >
              <PlusIcon className="h-8 w-8" />
              <span className="font-medium">Add Family Member</span>
            </motion.button>
          </div>
        </section>

        {/* Activity Summary */}
        <ActivitySummary
          members={members}
          threatsBlocked={totalThreatsBlocked}
          categoriesBlocked={categoriesBlocked}
        />
      </main>

      {/* Add Family Member Modal */}
      <AddFamilyMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSave={handleAddMember}
      />

      {/* Family Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Family Settings"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
              Default Daily Screen Time Limit
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="30"
                max="480"
                step="30"
                value={defaultSettings.dailyLimit}
                onChange={(e) => setDefaultSettings({ ...defaultSettings, dailyLimit: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm font-medium text-space-900 dark:text-white w-16">
                {Math.floor(defaultSettings.dailyLimit / 60)}h {defaultSettings.dailyLimit % 60}m
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2">
              Default Bedtime
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-space-500 mb-1">Start</label>
                <input
                  type="time"
                  value={defaultSettings.bedtimeStart}
                  onChange={(e) => setDefaultSettings({ ...defaultSettings, bedtimeStart: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-space-200 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-space-500 mb-1">End</label>
                <input
                  type="time"
                  value={defaultSettings.bedtimeEnd}
                  onChange={(e) => setDefaultSettings({ ...defaultSettings, bedtimeEnd: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-space-200 dark:border-space-600 bg-white dark:bg-space-800 text-space-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-space-50 dark:bg-space-800/50">
            <div>
              <h3 className="text-sm font-medium text-space-900 dark:text-white">Safe Search</h3>
              <p className="text-sm text-space-500">Enforce safe search on Google, Bing, YouTube</p>
            </div>
            <button
              onClick={() => setDefaultSettings({ ...defaultSettings, safeSearch: !defaultSettings.safeSearch })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${defaultSettings.safeSearch ? 'bg-success-500' : 'bg-space-200 dark:bg-space-600'}`}
            >
              <span className={`${defaultSettings.safeSearch ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-panel shadow ring-0 transition duration-200 ease-in-out`} />
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setIsSettingsOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              showToast('success', 'Settings saved')
              setIsSettingsOpen(false)
            }}
          >
            Save Settings
          </Button>
        </div>
      </Modal>

      {/* Member Detail Panel */}
      <MemberDetailPanel
        member={selectedMemberData}
        onClose={() => setSelectedMember(null)}
        onSave={handleSaveMemberRestrictions}
      />
    </div>
  )
}

