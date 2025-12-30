/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Toast Notification Component with Framer Motion
 */

'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (type: ToastType, title: string, message?: string) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const toastIcons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
}

const toastStyles = {
  success: 'bg-success-50 dark:bg-success-900/50 border-success-200 dark:border-success-800 text-success-800 dark:text-success-200',
  error: 'bg-danger-50 dark:bg-danger-900/50 border-danger-200 dark:border-danger-800 text-danger-800 dark:text-danger-200',
  warning: 'bg-warning-50 dark:bg-warning-900/50 border-warning-200 dark:border-warning-800 text-warning-800 dark:text-warning-200',
  info: 'bg-accent-50 dark:bg-accent-900/50 border-accent-200 dark:border-accent-800 text-accent-800 dark:text-accent-200',
}

const iconStyles = {
  success: 'text-success-500',
  error: 'text-danger-500',
  warning: 'text-warning-500',
  info: 'text-accent-500',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substr(2, 9)
    const toast: Toast = { id, type, title, message }
    
    setToasts(prev => [...prev, toast])

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({
  toasts,
  onDismiss
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => {
          const Icon = toastIcons[toast.type]
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
                mass: 0.8
              }}
              className={`flex items-start p-4 rounded-xl border shadow-xl backdrop-blur-sm ${toastStyles[toast.type]}`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${iconStyles[toast.type]}`} />
              </motion.div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.message && (
                  <p className="mt-1 text-sm opacity-80">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="ml-4 flex-shrink-0 rounded-md hover:opacity-75 focus:outline-none transition-opacity"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
