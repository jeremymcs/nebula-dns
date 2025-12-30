/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Chart Components for Reports
 * Simple, responsive chart components without external dependencies
 */

'use client'

import { useMemo } from 'react'

// Simple Line Chart
interface LineChartProps {
  data: { label: string; value: number }[]
  height?: number
  color?: string
  showLabels?: boolean
}

export function LineChart({ data, height = 200, color = '#4f46e5', showLabels = true }: LineChartProps) {
  const { points, maxValue, minValue } = useMemo(() => {
    if (data.length === 0) return { points: '', maxValue: 0, minValue: 0 }
    
    const values = data.map(d => d.value)
    const max = Math.max(...values)
    const min = Math.min(...values)
    const range = max - min || 1
    
    const padding = 40
    const chartWidth = 100
    const chartHeight = height - padding * 2
    
    const pts = data.map((d, i) => {
      const x = (i / (data.length - 1)) * chartWidth
      const y = chartHeight - ((d.value - min) / range) * chartHeight + padding
      return `${x},${y}`
    }).join(' ')
    
    return { points: pts, maxValue: max, minValue: min }
  }, [data, height])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-space-400 dark:text-space-500">
        No data available
      </div>
    )
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox={`0 0 100 ${height}`} className="w-full h-full" preserveAspectRatio="none">
        {/* Grid lines */}
        <line x1="0" y1={height - 40} x2="100" y2={height - 40} className="stroke-space-200 dark:stroke-space-700" strokeWidth="0.2" />
        <line x1="0" y1={(height - 80) / 2 + 40} x2="100" y2={(height - 80) / 2 + 40} className="stroke-space-200 dark:stroke-space-700" strokeWidth="0.2" />
        <line x1="0" y1="40" x2="100" y2="40" className="stroke-space-200 dark:stroke-space-700" strokeWidth="0.2" />
        
        {/* Line */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="0.5"
          points={points}
        />
        
        {/* Area fill */}
        <polygon
          fill={`${color}20`}
          points={`0,${height - 40} ${points} 100,${height - 40}`}
        />
        
        {/* Data points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * 100
          const range = maxValue - minValue || 1
          const y = (height - 80) - ((d.value - minValue) / range) * (height - 80) + 40
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1"
              fill={color}
            />
          )
        })}
      </svg>
      
      {/* Labels */}
      {showLabels && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-space-500 dark:text-space-400 px-1">
          {data.filter((_, i) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)).map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// Bar Chart
interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  height?: number
  showValues?: boolean
  horizontal?: boolean
}

export function BarChart({ data, height = 200, showValues = true, horizontal = false }: BarChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-space-400 dark:text-space-500" style={{ height }}>
        No data available
      </div>
    )
  }

  if (horizontal) {
    return (
      <div className="space-y-3" style={{ minHeight: height }}>
        {data.map((item, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-space-700 dark:text-space-300 truncate flex-1">{item.label}</span>
              {showValues && (
                <span className="text-space-500 dark:text-space-400 ml-2">{item.value.toLocaleString()}</span>
              )}
            </div>
            <div className="h-2 bg-space-100 dark:bg-space-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color || '#4f46e5',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const barWidth = Math.min(40, 100 / data.length - 10)

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox={`0 0 100 ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {data.map((item, i) => {
          const barHeight = (item.value / maxValue) * (height - 40)
          const x = (i / data.length) * 100 + (50 / data.length) - barWidth / 2
          const y = height - barHeight - 20
          
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={item.color || '#4f46e5'}
                rx="2"
                className="transition-all duration-300 hover:opacity-80"
              />
              {showValues && (
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  className="text-xs fill-space-600 dark:fill-space-400"
                  fontSize="6"
                >
                  {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}K` : item.value}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around text-xs text-space-500 dark:text-space-400">
        {data.map((d, i) => (
          <span key={i} className="truncate text-center" style={{ maxWidth: `${100 / data.length}%` }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// Donut Chart
interface DonutChartProps {
  data: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  showLegend?: boolean
}

export function DonutChart({ data, size = 160, thickness = 30, showLegend = true }: DonutChartProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data])
  
  const segments = useMemo(() => {
    let currentAngle = -90 // Start from top
    return data.map(item => {
      const percentage = item.value / total
      const angle = percentage * 360
      const startAngle = currentAngle
      currentAngle += angle
      return { ...item, startAngle, angle, percentage }
    })
  }, [data, total])

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center text-space-400 dark:text-space-500" style={{ width: size, height: size }}>
        No data
      </div>
    )
  }

  const radius = size / 2
  const innerRadius = radius - thickness

  const polarToCartesian = (angle: number, r: number) => {
    const radians = (angle * Math.PI) / 180
    return {
      x: radius + r * Math.cos(radians),
      y: radius + r * Math.sin(radians),
    }
  }

  const createArcPath = (startAngle: number, endAngle: number, innerR: number, outerR: number) => {
    const start = polarToCartesian(startAngle, outerR)
    const end = polarToCartesian(endAngle, outerR)
    const innerStart = polarToCartesian(endAngle, innerR)
    const innerEnd = polarToCartesian(startAngle, innerR)
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

    return [
      `M ${start.x} ${start.y}`,
      `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${innerEnd.x} ${innerEnd.y}`,
      'Z',
    ].join(' ')
  }

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="flex-shrink-0">
        {segments.map((segment, i) => (
          <path
            key={i}
            d={createArcPath(
              segment.startAngle,
              segment.startAngle + segment.angle - 0.5,
              innerRadius,
              radius - 2
            )}
            fill={segment.color}
            className="transition-opacity hover:opacity-80"
          />
        ))}
        {/* Center text */}
        <text
          x={radius}
          y={radius}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-space-900 dark:fill-white font-semibold"
          fontSize="16"
        >
          {total.toLocaleString()}
        </text>
      </svg>

      {showLegend && (
        <div className="space-y-2">
          {segments.map((segment, i) => (
            <div key={i} className="flex items-center text-sm">
              <div
                className="w-3 h-3 rounded-sm mr-2 flex-shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-space-700 dark:text-space-300 truncate">{segment.label}</span>
              <span className="text-space-500 dark:text-space-400 ml-2">
                {(segment.percentage * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Stat Card with Sparkline
interface SparklineStatProps {
  label: string
  value: string | number
  trend?: { value: number; isUp: boolean }
  sparklineData?: number[]
  color?: string
}

export function SparklineStat({ label, value, trend, sparklineData, color = '#4f46e5' }: SparklineStatProps) {
  const sparklinePath = useMemo(() => {
    if (!sparklineData || sparklineData.length === 0) return ''
    
    const min = Math.min(...sparklineData)
    const max = Math.max(...sparklineData)
    const range = max - min || 1
    
    return sparklineData.map((v, i) => {
      const x = (i / (sparklineData.length - 1)) * 100
      const y = 20 - ((v - min) / range) * 16
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }, [sparklineData])

  return (
    <div className="bg-white dark:bg-space-800 rounded-lg border border-space-200 dark:border-space-700 p-4">
      <p className="text-sm text-space-500 dark:text-space-400">{label}</p>
      <div className="mt-1 flex items-baseline justify-between">
        <p className="text-2xl font-semibold text-space-900 dark:text-white">{value}</p>
        {trend && (
          <span className={`text-sm ${trend.isUp ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>
            {trend.isUp ? '↑' : '↓'} {trend.value}%
          </span>
        )}
      </div>
      {sparklineData && sparklineData.length > 0 && (
        <svg className="w-full h-5 mt-2" viewBox="0 0 100 20" preserveAspectRatio="none">
          <path
            d={sparklinePath}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  )
}

// Progress Ring
interface ProgressRingProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
}

export function ProgressRing({ 
  value, 
  max = 100, 
  size = 80, 
  strokeWidth = 8, 
  color = '#4f46e5',
  label 
}: ProgressRingProps) {
  const percentage = Math.min((value / max) * 100, 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-space-200 dark:stroke-space-700"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold text-space-900 dark:text-white">{percentage.toFixed(0)}%</span>
        {label && <span className="text-xs text-space-500 dark:text-space-400">{label}</span>}
      </div>
    </div>
  )
}
