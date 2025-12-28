/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Threat Heatmap - 24-hour visualization of threat activity patterns
 */

'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

interface HeatmapData {
  hour: number
  day: string
  value: number
}

interface ThreatHeatmapProps {
  data?: HeatmapData[]
  className?: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

// Generate demo data
function generateDemoData(): HeatmapData[] {
  const data: HeatmapData[] = []
  DAYS.forEach((day) => {
    HOURS.forEach((hour) => {
      // Higher activity during business hours on weekdays
      const isWeekday = !['Sun', 'Sat'].includes(day)
      const isBusinessHour = hour >= 9 && hour <= 17
      const baseValue = isWeekday && isBusinessHour ? 50 : 10
      const randomValue = Math.floor(Math.random() * 50)
      data.push({ hour, day, value: baseValue + randomValue })
    })
  })
  return data
}

export function ThreatHeatmap({ data, className }: ThreatHeatmapProps) {
  const heatmapData = useMemo(() => data || generateDemoData(), [data])
  
  const maxValue = useMemo(() => Math.max(...heatmapData.map(d => d.value)), [heatmapData])

  const getColor = (value: number) => {
    const intensity = value / maxValue
    if (intensity < 0.2) return 'bg-space-200 dark:bg-space-800'
    if (intensity < 0.4) return 'bg-nebula-200/50 dark:bg-nebula-900/50'
    if (intensity < 0.6) return 'bg-nebula-400/60 dark:bg-nebula-700/60'
    if (intensity < 0.8) return 'bg-nebula-500/70'
    return 'bg-nebula-400'
  }

  return (
    <div className={clsx('bg-white dark:bg-space-900 rounded-xl border border-space-200 dark:border-space-800 p-6', className)}>
      <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">
        Threat Activity Heatmap
      </h3>
      <p className="text-sm text-space-500 mb-6">
        Blocked threats by hour over the past week
      </p>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex mb-2 pl-12">
            {HOURS.filter((_, i) => i % 3 === 0).map((hour) => (
              <div
                key={hour}
                className="flex-1 text-xs text-space-500 text-center"
                style={{ marginLeft: hour === 0 ? 0 : undefined }}
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-2 mb-1">
              <div className="w-10 text-xs text-space-500 text-right">{day}</div>
              <div className="flex-1 flex gap-0.5">
                {HOURS.map((hour) => {
                  const cell = heatmapData.find(d => d.day === day && d.hour === hour)
                  return (
                    <motion.div
                      key={`${day}-${hour}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (DAYS.indexOf(day) * 24 + hour) * 0.002 }}
                      className={clsx(
                        'flex-1 aspect-square rounded-sm cursor-pointer transition-transform hover:scale-110',
                        getColor(cell?.value || 0)
                      )}
                      title={`${day} ${hour}:00 - ${cell?.value || 0} threats blocked`}
                    />
                  )
                })}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-xs text-space-500">Less</span>
            <div className="flex gap-0.5">
              <div className="w-3 h-3 rounded-sm bg-space-200 dark:bg-space-800" />
              <div className="w-3 h-3 rounded-sm bg-nebula-200/50 dark:bg-nebula-900/50" />
              <div className="w-3 h-3 rounded-sm bg-nebula-400/60 dark:bg-nebula-700/60" />
              <div className="w-3 h-3 rounded-sm bg-nebula-500/70" />
              <div className="w-3 h-3 rounded-sm bg-nebula-400" />
            </div>
            <span className="text-xs text-space-500">More</span>
          </div>
        </div>
      </div>
    </div>
  )
}

