/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Undo/Redo Hook - History management for state changes
 */

import { useState, useCallback, useEffect } from 'react'

interface UseUndoRedoOptions<T> {
  maxHistory?: number
  onUndo?: (state: T) => void
  onRedo?: (state: T) => void
}

interface UseUndoRedoReturn<T> {
  state: T
  setState: (newState: T | ((prev: T) => T)) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  reset: (initialState: T) => void
  historyLength: number
  currentIndex: number
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions<T> = {}
): UseUndoRedoReturn<T> {
  const { maxHistory = 50, onUndo, onRedo } = options

  const [history, setHistory] = useState<T[]>([initialState])
  const [currentIndex, setCurrentIndex] = useState(0)

  const state = history[currentIndex]

  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    setHistory((prevHistory) => {
      const currentState = prevHistory[currentIndex]
      const resolvedState = typeof newState === 'function'
        ? (newState as (prev: T) => T)(currentState)
        : newState

      // Don't add to history if state hasn't changed
      if (JSON.stringify(resolvedState) === JSON.stringify(currentState)) {
        return prevHistory
      }

      // Remove any future states (redo history) when making a new change
      const newHistory = prevHistory.slice(0, currentIndex + 1)
      
      // Add new state
      newHistory.push(resolvedState)

      // Limit history size
      if (newHistory.length > maxHistory) {
        newHistory.shift()
        setCurrentIndex((prev) => Math.max(0, prev))
      } else {
        setCurrentIndex(newHistory.length - 1)
      }

      return newHistory
    })
  }, [currentIndex, maxHistory])

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      onUndo?.(history[newIndex])
    }
  }, [currentIndex, history, onUndo])

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      onRedo?.(history[newIndex])
    }
  }, [currentIndex, history, onRedo])

  const reset = useCallback((newInitialState: T) => {
    setHistory([newInitialState])
    setCurrentIndex(0)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    reset,
    historyLength: history.length,
    currentIndex,
  }
}

// Specialized hook for policy flow builder
import { PolicyNode, PolicyConnection } from '@/components/policy-builder/types'

interface FlowState {
  nodes: PolicyNode[]
  connections: PolicyConnection[]
}

export function useFlowHistory(initialNodes: PolicyNode[], initialConnections: PolicyConnection[]) {
  const {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  } = useUndoRedo<FlowState>({
    nodes: initialNodes,
    connections: initialConnections,
  })

  const setNodes = useCallback((nodes: PolicyNode[] | ((prev: PolicyNode[]) => PolicyNode[])) => {
    setState((prev) => ({
      ...prev,
      nodes: typeof nodes === 'function' ? nodes(prev.nodes) : nodes,
    }))
  }, [setState])

  const setConnections = useCallback((connections: PolicyConnection[] | ((prev: PolicyConnection[]) => PolicyConnection[])) => {
    setState((prev) => ({
      ...prev,
      connections: typeof connections === 'function' ? connections(prev.connections) : connections,
    }))
  }, [setState])

  return {
    nodes: state.nodes,
    connections: state.connections,
    setNodes,
    setConnections,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: (nodes: PolicyNode[], connections: PolicyConnection[]) => reset({ nodes, connections }),
  }
}

