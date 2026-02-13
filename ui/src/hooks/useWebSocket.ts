/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * WebSocket Hook - Real-time data streaming for live dashboard updates
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { API_URL } from '@/lib/api'

export interface WebSocketMessage<T = unknown> {
  type: string
  payload: T
  timestamp: string
}

interface UseWebSocketOptions {
  url: string
  enabled?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
}

interface UseWebSocketReturn<T> {
  data: T | null
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
  send: (message: unknown) => void
  reconnect: () => void
  disconnect: () => void
}

export function useWebSocket<T = unknown>(options: UseWebSocketOptions): UseWebSocketReturn<T> {
  const {
    url,
    enabled = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onOpen,
    onClose,
    onError,
  } = options

  const [data, setData] = useState<T | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return

    setIsConnecting(true)
    setError(null)

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setIsConnecting(false)
        reconnectCountRef.current = 0
        onOpen?.()
      }

      ws.onclose = () => {
        setIsConnected(false)
        setIsConnecting(false)
        onClose?.()

        // Attempt reconnection
        if (enabled && reconnectCountRef.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCountRef.current++
            connect()
          }, reconnectInterval)
        }
      }

      ws.onerror = (event) => {
        setError(new Error('WebSocket connection error'))
        setIsConnecting(false)
        onError?.(event)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage<T>
          setData(message.payload)
        } catch {
          // If not JSON, treat as raw data
          setData(event.data)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect'))
      setIsConnecting(false)
    }
  }, [url, enabled, reconnectInterval, maxReconnectAttempts, onOpen, onClose, onError])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  const send = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof message === 'string' ? message : JSON.stringify(message))
    }
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    reconnectCountRef.current = 0
    connect()
  }, [connect, disconnect])

  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  return { data, isConnected, isConnecting, error, send, reconnect, disconnect }
}

// Specialized hook for DNS query stream
export interface DnsQueryEvent {
  id: string
  domain: string
  decision: 'allowed' | 'blocked' | 'warned'
  category?: string
  zone: string
  sourceIp?: string
  responseTime: number
  timestamp: string
}

export function useDnsQueryStream(enabled = true) {
  const wsUrl = API_URL.replace(/^http/, 'ws') + '/realtime/queries'

  return useWebSocket<DnsQueryEvent>({
    url: wsUrl,
    enabled,
  })
}

