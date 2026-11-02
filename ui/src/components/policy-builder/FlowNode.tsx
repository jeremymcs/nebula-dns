/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Flow Node - Individual node component in the policy flow builder
 */

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { PolicyNode, NODE_CONFIGS } from './types'
import {
  PlayIcon,
  ShieldExclamationIcon,
  FunnelIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  ClockIcon,
  ShieldCheckIcon,
  FlagIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PlayIcon,
  ShieldExclamationIcon,
  FunnelIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  ClockIcon,
  ShieldCheckIcon,
  FlagIcon,
  AdjustmentsHorizontalIcon,
}

interface FlowNodeProps {
  node: PolicyNode
  isSelected: boolean
  isConnecting?: boolean
  isConnectTarget?: boolean
  onSelect: () => void
  onMove: (x: number, y: number) => void
  onDelete: () => void
  onStartConnect: () => void
  onEndConnect: () => void
}

export function FlowNode({
  node,
  isSelected,
  isConnecting,
  isConnectTarget,
  onSelect,
  onMove,
  onDelete,
  onStartConnect,
  onEndConnect,
}: FlowNodeProps) {
  const config = NODE_CONFIGS[node.type]
  const Icon = ICONS[config.icon] || FlagIcon
  const nodeRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    onSelect()
    setIsDragging(true)
    setDragOffset({ x: e.clientX - node.x, y: e.clientY - node.y })
  }, [node.x, node.y, onSelect])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      onMove(e.clientX - dragOffset.x, e.clientY - dragOffset.y)
    }
  }, [isDragging, dragOffset, onMove])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add/remove global listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      green: { bg: 'bg-success-500/10', border: 'border-green-500', text: 'text-success-600 dark:text-success-400' },
      red: { bg: 'bg-danger-500/10', border: 'border-red-500', text: 'text-danger-600 dark:text-danger-400' },
      blue: { bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'text-blue-600 dark:text-blue-400' },
      purple: { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-600 dark:text-purple-400' },
      amber: { bg: 'bg-amber-500/10', border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-400' },
      cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
      indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
    }
    return colors[color] || colors.blue
  }

  const colorClasses = getColorClasses(config.color)

  const handleNodeClick = useCallback((e: React.MouseEvent) => {
    // If we're in connect mode and this is a valid target, complete the connection
    if (isConnectTarget) {
      e.stopPropagation()
      e.preventDefault()
      onEndConnect()
    }
  }, [isConnectTarget, onEndConnect])

  return (
    <motion.div
      ref={nodeRef}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={clsx(
        'absolute cursor-move select-none overflow-visible',
        'w-48 rounded-xl border-2 shadow-lg',
        'bg-white dark:bg-space-800',
        isSelected ? `${colorClasses.border} ring-2 ring-offset-2` : 'border-space-200 dark:border-space-700',
        isDragging && 'shadow-2xl z-50',
        isConnectTarget && 'ring-4 ring-primary-500/50 cursor-pointer'
      )}
      style={{ left: node.x, top: node.y }}
      onMouseDown={handleMouseDown}
      onClick={handleNodeClick}
    >
      {/* Header */}
      <div className={clsx('px-3 py-2 rounded-t-lg flex items-center gap-2', colorClasses.bg)}>
        <Icon className={clsx('h-5 w-5', colorClasses.text)} />
        <span className={clsx('font-medium text-sm', colorClasses.text)}>{config.label}</span>
        {node.type !== 'start' && (
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="ml-auto p-1 hover:bg-danger-500/20 rounded">
            <XMarkIcon className="h-4 w-4 text-space-400 hover:text-danger-500" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        <p className="text-xs text-space-500">{config.description}</p>
      </div>

      {/* Connection points - Click to connect */}
      {config.maxConnections.inputs > 0 && (
        <div
          className={clsx(
            'absolute -left-3 top-1/2 -translate-y-1/2 rounded-full border-2 border-white dark:border-space-800 cursor-pointer transition-all z-10',
            isConnectTarget
              ? 'w-8 h-8 bg-primary-500 animate-pulse shadow-lg shadow-primary-500/50 -left-4'
              : 'w-5 h-5 bg-space-300 dark:bg-space-600 hover:bg-primary-500 hover:scale-125'
          )}
          onClick={(e) => { e.stopPropagation(); onEndConnect() }}
        />
      )}
      {config.maxConnections.outputs > 0 && (
        <div
          className={clsx(
            'absolute -right-3 top-1/2 -translate-y-1/2 rounded-full border-2 border-white dark:border-space-800 cursor-pointer transition-all z-10',
            isConnecting
              ? 'w-5 h-5 bg-primary-400 dark:bg-primary-500'
              : 'w-5 h-5 bg-space-300 dark:bg-space-600 hover:bg-primary-500 hover:scale-125'
          )}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onStartConnect()
          }}
        />
      )}
    </motion.div>
  )
}

