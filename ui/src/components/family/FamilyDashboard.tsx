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
import { useFamilyMembers } from '@/hooks/useApi'
import {
  ShieldCheckIcon,
  PlusIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'

interface FamilyDashboardProps {
  className?: string
}

export function FamilyDashboard({ className }: FamilyDashboardProps) {
  const { data: familyData, isLoading } = useFamilyMembers()
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  // Use API data if available, otherwise fall back to demo data
  const demoMembers = generateDemoFamilyMembers()
  const members: FamilyMember[] = (familyData?.data?.length ?? 0) > 0 ? familyData!.data : demoMembers

  const onlineCount = members.filter((m) => m.isOnline).length
  const totalThreatsBlocked = 47 // TODO: Fetch from API

  return (
    <div className={clsx('min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-space-900 dark:to-space-800', className)}>
      {/* Header */}
      <header className="bg-white/80 dark:bg-space-800/80 backdrop-blur-lg border-b border-space-200 dark:border-space-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-nebula-500 to-purple-500">
              <ShieldCheckIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-space-900 dark:text-white">Family Protection</h1>
              <p className="text-sm text-space-500">
                {onlineCount} online • {totalThreatsBlocked} threats blocked today
              </p>
            </div>
          </div>
          <button className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg">
            <Cog6ToothIcon className="h-6 w-6 text-space-500" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <QuickActions />

        {/* Family Members */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-space-900 dark:text-white">Family Members</h2>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-nebula-500 hover:bg-nebula-50 dark:hover:bg-nebula-900/20 rounded-lg">
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
                index={index}
              />
            ))}
            {/* Add member card */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: members.length * 0.1 }}
              className="min-h-[200px] border-2 border-dashed border-space-300 dark:border-space-600 rounded-2xl flex flex-col items-center justify-center gap-2 text-space-400 hover:border-nebula-500 hover:text-nebula-500 transition-colors"
            >
              <PlusIcon className="h-8 w-8" />
              <span className="font-medium">Add Family Member</span>
            </motion.button>
          </div>
        </section>

        {/* Activity Summary */}
        <ActivitySummary members={members} />
      </main>
    </div>
  )
}

