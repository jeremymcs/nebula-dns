/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Security Score - Gamified security posture dashboard
 */

'use client'

import { useState } from 'react'
import {
  SecurityScore,
  Achievements,
  Recommendations,
  generateDemoScore,
  generateDemoAchievements,
} from '@/components/security-score'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'

export default function SecurityScorePage() {
  const [scoreData] = useState(generateDemoScore())
  const [achievements] = useState(generateDemoAchievements())

  const handleActionClick = (_actionId: string) => {
    // TODO: Implement security action handlers
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-nebula-500 to-purple-500">
          <ShieldCheckIcon className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-space-900 dark:text-white">Security Score</h1>
          <p className="text-space-500">Track and improve your security posture</p>
        </div>
      </div>

      {/* Main Score Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SecurityScore score={scoreData.totalScore} data={scoreData} />
        <Recommendations
          factors={scoreData.factors}
          onAction={handleActionClick}
          className="lg:col-span-2"
        />
      </div>

      {/* Achievements */}
      <Achievements achievements={achievements} />
    </div>
  )
}

