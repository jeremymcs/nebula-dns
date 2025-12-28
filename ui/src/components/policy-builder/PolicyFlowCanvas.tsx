/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Policy Flow Canvas - Visual drag-and-drop policy builder
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { PolicyNode, PolicyNodeType, PolicyConnection } from './types'
import { FlowNode } from './FlowNode'
import { NodePalette } from './NodePalette'
import { ConnectionLine } from './ConnectionLine'
import {
  PlusIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline'

interface PolicyFlowCanvasProps {
  nodes: PolicyNode[]
  connections: PolicyConnection[]
  onNodesChange: (nodes: PolicyNode[]) => void
  onConnectionsChange: (connections: PolicyConnection[]) => void
  className?: string
}

export function PolicyFlowCanvas({
  nodes,
  connections,
  onNodesChange,
  onConnectionsChange,
  className,
}: PolicyFlowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [showPalette, setShowPalette] = useState(false)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const connectingFromRef = useRef<string | null>(null)

  // Keep ref in sync with state for use in event handlers
  useEffect(() => {
    connectingFromRef.current = connectingFrom
  }, [connectingFrom])

  // Handle canvas pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
    // Always track mouse position for connection line preview
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      setMousePos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom,
      })
    }
  }, [isPanning, dragStart, pan, zoom])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    // Don't clear connectingFrom here - let click on target node handle it
  }, [])

  // Click on canvas background cancels connection
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only cancel if clicking directly on canvas (not on a node)
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
      setConnectingFrom(null)
    }
  }, [])

  // Handle zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoom((z) => Math.min(2, Math.max(0.25, z * delta)))
    }
  }, [])

  // Node operations
  const handleNodeMove = useCallback((nodeId: string, x: number, y: number) => {
    onNodesChange(nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)))
  }, [nodes, onNodesChange])

  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNode(nodeId)
  }, [])

  const handleAddNode = useCallback((type: PolicyNodeType, x?: number, y?: number) => {
    const newNode: PolicyNode = {
      id: `node-${Date.now()}`,
      type,
      x: x ?? 300,
      y: y ?? 200,
      data: getDefaultNodeData(type),
    }
    onNodesChange([...nodes, newNode])
    setShowPalette(false)
  }, [nodes, onNodesChange])

  const handleDeleteNode = useCallback((nodeId: string) => {
    onNodesChange(nodes.filter((n) => n.id !== nodeId))
    onConnectionsChange(connections.filter((c) => c.from !== nodeId && c.to !== nodeId))
    setSelectedNode(null)
  }, [nodes, connections, onNodesChange, onConnectionsChange])

  const handleConnect = useCallback((fromId: string, toId: string) => {
    if (fromId !== toId && !connections.find((c) => c.from === fromId && c.to === toId)) {
      onConnectionsChange([...connections, { id: `conn-${Date.now()}`, from: fromId, to: toId }])
    }
    setConnectingFrom(null)
  }, [connections, onConnectionsChange])

  return (
    <div className={clsx('relative overflow-hidden bg-space-50 dark:bg-space-950 rounded-xl border border-space-200 dark:border-space-800', className)}>
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setShowPalette(!showPalette)}
          className="flex items-center gap-2 px-3 py-2 bg-nebula-500 text-white rounded-lg shadow-lg hover:bg-nebula-600 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Node
        </button>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-white dark:bg-space-800 rounded-lg shadow-lg border border-space-200 dark:border-space-700 p-1">
        <button onClick={() => setZoom((z) => Math.min(2, z * 1.2))} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded">
          <MagnifyingGlassPlusIcon className="h-4 w-4 text-space-600 dark:text-space-400" />
        </button>
        <span className="px-2 text-sm text-space-600 dark:text-space-400">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.max(0.25, z * 0.8))} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded">
          <MagnifyingGlassMinusIcon className="h-4 w-4 text-space-600 dark:text-space-400" />
        </button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded">
          <ArrowsPointingOutIcon className="h-4 w-4 text-space-600 dark:text-space-400" />
        </button>
      </div>

      {/* Connection Mode Indicator */}
      {connectingFrom && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-nebula-500 text-white rounded-lg shadow-lg animate-pulse">
          Click on a target node to connect
          <button
            onClick={() => setConnectingFrom(null)}
            className="ml-3 px-2 py-1 bg-white/20 rounded hover:bg-white/30"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Node Palette */}
      <AnimatePresence>
        {showPalette && (
          <NodePalette onSelect={handleAddNode} onClose={() => setShowPalette(false)} />
        )}
      </AnimatePresence>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-[600px] cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
      >
        {/* Grid background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-space-200 dark:text-space-800" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" style={{ transform: `translate(${pan.x % 20}px, ${pan.y % 20}px)` }} />
        </svg>

        {/* Connections and Nodes container */}
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          {/* Connection lines */}
          <svg
            className="absolute pointer-events-none"
            style={{
              overflow: 'visible',
              left: 0,
              top: 0,
              width: '5000px',
              height: '5000px',
              zIndex: 1000
            }}
          >
            {connections.map((conn) => {
              const fromNode = nodes.find((n) => n.id === conn.from)
              const toNode = nodes.find((n) => n.id === conn.to)
              if (!fromNode || !toNode) return null
              return <ConnectionLine key={conn.id} from={fromNode} to={toNode} />
            })}
            {/* Preview line while connecting */}
            {connectingFrom && (() => {
              const fromNode = nodes.find((n) => n.id === connectingFrom)
              if (!fromNode) return null
              const startX = fromNode.x + 192 // node width
              const startY = fromNode.y + 40 // approx center
              return (
                <path
                  d={`M ${startX} ${startY} C ${startX + 50} ${startY}, ${mousePos.x - 50} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  className="text-nebula-500"
                />
              )
            })()}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <FlowNode
              key={node.id}
              node={node}
              isSelected={selectedNode === node.id}
              isConnecting={connectingFrom !== null}
              isConnectTarget={connectingFrom !== null && connectingFrom !== node.id}
              onSelect={() => handleNodeSelect(node.id)}
              onMove={(x, y) => handleNodeMove(node.id, x, y)}
              onDelete={() => handleDeleteNode(node.id)}
              onStartConnect={() => setConnectingFrom(node.id)}
              onEndConnect={() => {
                if (connectingFromRef.current && connectingFromRef.current !== node.id) {
                  handleConnect(connectingFromRef.current, node.id)
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function getDefaultNodeData(type: PolicyNodeType): Record<string, unknown> {
  switch (type) {
    case 'threat-check': return { categories: ['malware', 'phishing'] }
    case 'category-filter': return { categories: [], action: 'block' }
    case 'allowlist': return { domains: [], lists: [] }
    case 'blocklist': return { domains: [], lists: [] }
    case 'schedule': return { days: [], startTime: '09:00', endTime: '17:00' }
    case 'safesearch': return { enabled: true }
    case 'decision': return { action: 'allow' }
    default: return {}
  }
}

