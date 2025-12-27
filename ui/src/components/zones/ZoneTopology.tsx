/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Zone Topology - Interactive network topology visualization
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Zone, ZoneHealth } from './types'
import { ZoneNode } from './ZoneNode'
import { ZoneConnection } from './ZoneConnection'
import {
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline'

interface ZoneTopologyProps {
  zones: Zone[]
  onZoneSelect?: (zone: Zone) => void
  onZoneAction?: (zone: Zone, action: string) => void
  className?: string
}

export function ZoneTopology({ zones, onZoneSelect, onZoneAction, className }: ZoneTopologyProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Calculate zone positions based on hierarchy
  const positionedZones = useMemo(() => {
    const positioned: Array<Zone & { x: number; y: number }> = []
    const rootZones = zones.filter(z => !z.parentId)
    const childrenMap = new Map<string, Zone[]>()
    
    zones.forEach(z => {
      if (z.parentId) {
        const children = childrenMap.get(z.parentId) || []
        children.push(z)
        childrenMap.set(z.parentId, children)
      }
    })

    // Position root zones
    rootZones.forEach((zone, index) => {
      const x = 150 + (index % 3) * 300
      const y = 100 + Math.floor(index / 3) * 250
      positioned.push({ ...zone, x, y })

      // Position children
      const children = childrenMap.get(zone.id) || []
      children.forEach((child, childIndex) => {
        positioned.push({
          ...child,
          x: x + 50 + childIndex * 180,
          y: y + 150,
        })
      })
    })

    return positioned
  }, [zones])

  // Get connections between parent and child zones
  const connections = useMemo(() => {
    return positionedZones
      .filter(z => z.parentId)
      .map(child => {
        const parent = positionedZones.find(p => p.id === child.parentId)
        if (!parent) return null
        return { from: parent, to: child }
      })
      .filter(Boolean) as Array<{ from: Zone & { x: number; y: number }; to: Zone & { x: number; y: number } }>
  }, [positionedZones])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && e.altKey) {
      setIsPanning(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
  }, [isPanning, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const handleZoneClick = useCallback((zone: Zone) => {
    setSelectedZoneId(zone.id)
    onZoneSelect?.(zone)
  }, [onZoneSelect])

  return (
    <div className={clsx('relative overflow-hidden bg-space-50 dark:bg-space-950 rounded-xl border border-space-200 dark:border-space-800', className)}>
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-white dark:bg-space-800 rounded-lg shadow-lg border border-space-200 dark:border-space-700 p-1">
        <button onClick={() => setZoom(z => Math.min(2, z * 1.2))} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded">
          <MagnifyingGlassPlusIcon className="h-4 w-4 text-space-600 dark:text-space-400" />
        </button>
        <span className="px-2 text-sm text-space-600 dark:text-space-400">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.max(0.5, z * 0.8))} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded">
          <MagnifyingGlassMinusIcon className="h-4 w-4 text-space-600 dark:text-space-400" />
        </button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded">
          <ArrowsPointingOutIcon className="h-4 w-4 text-space-600 dark:text-space-400" />
        </button>
      </div>

      {/* Canvas */}
      <div
        className="w-full h-[500px] cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <pattern id="zone-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-space-200 dark:text-space-800" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#zone-grid)" />
        </svg>

        {/* Zones and connections */}
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
            {connections.map((conn, i) => (
              <ZoneConnection key={i} from={conn.from} to={conn.to} />
            ))}
          </svg>

          {/* Zone nodes */}
          {positionedZones.map((zone) => (
            <ZoneNode
              key={zone.id}
              zone={zone}
              x={zone.x}
              y={zone.y}
              isSelected={selectedZoneId === zone.id}
              onClick={() => handleZoneClick(zone)}
              onAction={(action) => onZoneAction?.(zone, action)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

