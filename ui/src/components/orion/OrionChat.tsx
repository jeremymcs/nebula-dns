/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Orion Chat - AI Co-Pilot chat interface
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { OrionMessage, OrionAction } from './types'
import { OrionMessageBubble } from './OrionMessageBubble'
import { OrionQuickActions } from './OrionQuickActions'
import {
  SparklesIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'

interface OrionChatProps {
  isOpen: boolean
  onClose: () => void
  onAction?: (action: OrionAction) => void
  className?: string
}

export function OrionChat({ isOpen, onClose, onAction, className }: OrionChatProps) {
  const [messages, setMessages] = useState<OrionMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm Orion, your AI security co-pilot. I can help you manage DNS security, investigate threats, and configure policies. What would you like to do?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: OrionMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Simulate AI response (in production, this would call the backend)
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000))

    const response = generateResponse(input)
    const assistantMessage: OrionMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      actions: response.actions,
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsTyping(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickAction = (action: OrionAction) => {
    onAction?.(action)
    const actionMessage: OrionMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `✓ ${action.label} completed successfully.`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, actionMessage])
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={clsx(
            'fixed bottom-24 right-6 w-96 h-[600px] bg-white dark:bg-space-900 rounded-2xl shadow-2xl border border-space-200 dark:border-space-800 flex flex-col overflow-hidden z-50',
            className
          )}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-primary-600 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Orion</h3>
              <p className="text-xs text-primary-100">AI Security Co-Pilot</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <XMarkIcon className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <OrionMessageBubble
                key={message.id}
                message={message}
                onAction={handleQuickAction}
              />
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-space-500">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm">Orion is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <OrionQuickActions onAction={handleQuickAction} />

          {/* Input */}
          <div className="p-4 border-t border-space-200 dark:border-space-800">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Orion anything..."
                className="flex-1 rounded-xl border-space-300 dark:border-space-700 dark:bg-space-800 text-sm focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className={clsx(
                  'p-3 rounded-xl transition-colors',
                  input.trim()
                    ? 'bg-primary-500 text-white hover:bg-primary-600'
                    : 'bg-space-100 dark:bg-space-800 text-space-400'
                )}
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Simple response generator (would be replaced with actual AI in production)
function generateResponse(input: string): { content: string; actions?: OrionAction[] } {
  const lowerInput = input.toLowerCase()
  
  if (lowerInput.includes('block') && lowerInput.includes('facebook')) {
    return {
      content: "I can help you block Facebook. Would you like to block it for all zones or a specific zone?",
      actions: [
        { id: 'block-all', type: 'block-domain', label: 'Block for All Zones', data: { domain: 'facebook.com', zones: 'all' } },
        { id: 'block-guest', type: 'block-domain', label: 'Block for Guest WiFi', data: { domain: 'facebook.com', zones: ['guest'] } },
      ],
    }
  }
  
  if (lowerInput.includes('threat') || lowerInput.includes('attack')) {
    return {
      content: "I've analyzed your recent threat activity. In the last 24 hours, I blocked 47 malware attempts and 12 phishing domains. Your network is well protected. Would you like to see the details?",
      actions: [
        { id: 'view-threats', type: 'navigate', label: 'View Threat Report', data: { path: '/investigate/threats' } },
      ],
    }
  }
  
  if (lowerInput.includes('policy') || lowerInput.includes('create')) {
    return {
      content: "I can help you create a new policy. What type of protection are you looking for?",
      actions: [
        { id: 'family', type: 'create-policy', label: 'Family Safe', data: { template: 'family-safe' } },
        { id: 'corporate', type: 'create-policy', label: 'Corporate', data: { template: 'corporate' } },
        { id: 'custom', type: 'navigate', label: 'Custom Policy', data: { path: '/protection/policies/new' } },
      ],
    }
  }
  
  return {
    content: "I understand you're asking about DNS security. I can help you with blocking domains, investigating threats, creating policies, and monitoring your network. What would you like to do?",
  }
}

