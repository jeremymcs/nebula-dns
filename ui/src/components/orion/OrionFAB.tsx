/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Orion FAB - Floating action button to open Orion chat
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { OrionChat } from './OrionChat'
import { OrionAction, OrionAlert } from './types'
import { SparklesIcon, XMarkIcon, BellAlertIcon } from '@heroicons/react/24/solid'

interface OrionFABProps {
  onAction?: (action: OrionAction) => void
  alerts?: OrionAlert[]
  className?: string
}

export function OrionFAB({ onAction, alerts = [], className }: OrionFABProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(false)
  const [showPulse, setShowPulse] = useState(true)

  // Show pulse animation for new users
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  // Check for unread alerts
  useEffect(() => {
    setHasUnreadAlerts(alerts.length > 0)
  }, [alerts])

  const handleToggle = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setHasUnreadAlerts(false)
    }
  }

  return (
    <>
      {/* Chat Panel */}
      <OrionChat isOpen={isOpen} onClose={() => setIsOpen(false)} onAction={onAction} />

      {/* FAB */}
      <motion.button
        onClick={handleToggle}
        className={clsx(
          'fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50',
          'bg-gradient-to-br from-nebula-500 to-nebula-600',
          'flex items-center justify-center',
          'hover:shadow-xl hover:scale-105 transition-all',
          'focus:outline-none focus:ring-2 focus:ring-nebula-500 focus:ring-offset-2',
          className
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Pulse animation */}
        {showPulse && !isOpen && (
          <motion.span
            className="absolute inset-0 rounded-full bg-nebula-500"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {/* Alert badge */}
        {hasUnreadAlerts && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger-500 flex items-center justify-center">
            <BellAlertIcon className="h-3 w-3 text-white" />
          </span>
        )}

        {/* Icon */}
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SparklesIcon className="h-6 w-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {!isOpen && showPulse && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="fixed bottom-8 right-24 bg-space-900 text-white px-3 py-2 rounded-lg text-sm shadow-lg z-50"
          >
            <span className="font-medium">Meet Orion</span>
            <span className="text-space-400 ml-1">- Your AI Co-Pilot</span>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-space-900 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

