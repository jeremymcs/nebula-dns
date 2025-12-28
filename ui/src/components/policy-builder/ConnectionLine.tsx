/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Connection Line - SVG line connecting nodes in the flow builder
 */

'use client'

import { PolicyNode } from './types'

interface ConnectionLineProps {
  from: PolicyNode
  to: PolicyNode
  label?: string
}

export function ConnectionLine({ from, to, label }: ConnectionLineProps) {
  // Calculate connection points (right side of from node, left side of to node)
  const nodeWidth = 192 // w-48 = 12rem = 192px
  const nodeHeight = 80 // approximate height

  const startX = from.x + nodeWidth
  const startY = from.y + nodeHeight / 2
  const endX = to.x
  const endY = to.y + nodeHeight / 2

  // Calculate bezier curve control points
  const controlOffset = Math.min(100, Math.abs(endX - startX) / 2)
  const midX = (startX + endX) / 2

  const path = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`

  return (
    <g>
      {/* Shadow/glow effect */}
      <path
        d={path}
        fill="none"
        stroke="rgba(139, 92, 246, 0.2)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      
      {/* Main line */}
      <path
        d={path}
        fill="none"
        stroke="url(#connectionGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        className="transition-all"
      />
      
      {/* Arrow at end */}
      <circle
        cx={endX}
        cy={endY}
        r="4"
        fill="#8b5cf6"
      />

      {/* Label */}
      {label && (
        <g transform={`translate(${midX}, ${(startY + endY) / 2 - 10})`}>
          <rect
            x="-20"
            y="-8"
            width="40"
            height="16"
            rx="4"
            className="fill-white dark:fill-space-800 stroke-space-200 dark:stroke-space-700"
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-space-600 dark:fill-space-400"
          >
            {label}
          </text>
        </g>
      )}

      {/* Gradient definition */}
      <defs>
        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="1" />
        </linearGradient>
      </defs>
    </g>
  )
}

