/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * AI Insights - Weekly AI-generated security insights
 */

'use client'

import { useState } from 'react'
import {
  WeeklyInsights,
  TrendChart,
  generateDemoWeeklyInsight,
} from '@/components/insights'
import { useInsights } from '@/hooks/useApi'
import { SparklesIcon, CalendarIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export default function InsightsPage() {
  const { data: apiInsightData, mutate, isLoading } = useInsights('7d')
  const [isGenerating, setIsGenerating] = useState(false)

  // Use API data if complete, otherwise fall back to demo data
  const demoData = generateDemoWeeklyInsight()
  const insightData = apiInsightData?.metrics ? apiInsightData : demoData

  const handleRegenerate = async () => {
    setIsGenerating(true)
    await mutate()
    setIsGenerating(false)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="text-space-500">Loading insights...</p>
        </div>
      </div>
    )
  }

  // Note: We always have data (API or demo fallback), so no error state needed

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
            <SparklesIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-space-900 dark:text-white">AI Insights</h1>
            <p className="text-space-500">AI-powered weekly security analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-space-500">
            <CalendarIcon className="h-4 w-4" />
            Generated {new Date(insightData.generatedAt).toLocaleDateString()}
          </div>
          <button
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 border border-space-300 dark:border-space-600 text-space-700 dark:text-space-300 rounded-lg hover:bg-space-100 dark:hover:bg-space-800 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WeeklyInsights insight={insightData} className="lg:col-span-2" />
        <TrendChart trends={insightData.trends} />
      </div>

      {/* Metrics Overview */}
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6">
        <h3 className="font-semibold text-space-900 dark:text-white mb-4">Weekly Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Queries', value: insightData.metrics.totalQueries.toLocaleString() },
            { label: 'Blocked', value: insightData.metrics.blockedQueries.toLocaleString() },
            { label: 'Threats', value: insightData.metrics.threatsBlocked.toLocaleString() },
            { label: 'Clients', value: insightData.metrics.uniqueClients.toString() },
            { label: 'Avg Response', value: `${insightData.metrics.avgResponseTime}ms` },
            { label: 'Uptime', value: `${insightData.metrics.uptime}%` },
          ].map((metric) => (
            <div key={metric.label} className="text-center p-4 bg-space-50 dark:bg-space-900 rounded-lg">
              <p className="text-2xl font-bold text-space-900 dark:text-white">{metric.value}</p>
              <p className="text-sm text-space-500">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

