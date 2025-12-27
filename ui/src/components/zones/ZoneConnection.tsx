/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Zone Connection - SVG line connecting parent and child zones
 */

'use client'

import { Zone } from './types'

interface ZoneConnectionProps {
  from: Zone & { x: number; y: number }
  to: Zone & { x: number; y: number }
}

export function ZoneConnection({ from, to }: ZoneConnectionProps) {
  const nodeWidth = 176 // w-44 = 11rem = 176px
  const nodeHeight = 100 // approximate height

  // Calculate connection points (bottom of parent, top of child)
  const startX = from.x + nodeWidth / 2
  const startY = from.y + nodeHeight
  const endX = to.x + nodeWidth / 2
  const endY = to.y

  // Calculate bezier curve control points
  const midY = (startY + endY) / 2

  const path = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`

  return (
    <g>
      {/* Shadow/glow effect */}
      <path
        d={path}
        fill="none"
        stroke="rgba(139, 92, 246, 0.15)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      
      {/* Main line */}
      <path
        d={path}
        fill="none"
        stroke="url(#zoneConnectionGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="6 4"
      />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="zoneConnectionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
        </linearGradient>
      </defs>
    </g>
  )
}

