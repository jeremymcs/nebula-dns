/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Policy Rollback - Rollback confirmation dialog
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { PolicyVersion } from './types'
import {
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface PolicyRollbackProps {
  isOpen: boolean
  targetVersion: PolicyVersion
  currentVersionNumber: number
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function PolicyRollback({
  isOpen,
  targetVersion,
  currentVersionNumber,
  onConfirm,
  onCancel,
  isLoading = false,
}: PolicyRollbackProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-space-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-space-200 dark:border-space-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <ArrowUturnLeftIcon className="h-5 w-5 text-amber-500" />
                </div>
                <h3 className="font-semibold text-space-900 dark:text-white">Rollback Policy</h3>
              </div>
              <button onClick={onCancel} className="p-2 hover:bg-space-100 dark:hover:bg-space-700 rounded-lg">
                <XMarkIcon className="h-5 w-5 text-space-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl mb-4">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  This will create a new version with the configuration from version {targetVersion.version}.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-space-50 dark:bg-space-900 rounded-lg">
                  <div>
                    <p className="text-xs text-space-500">Current version</p>
                    <p className="font-medium text-space-900 dark:text-white">v{currentVersionNumber}</p>
                  </div>
                  <ArrowUturnLeftIcon className="h-5 w-5 text-space-400" />
                  <div className="text-right">
                    <p className="text-xs text-space-500">Rolling back to</p>
                    <p className="font-medium text-space-900 dark:text-white">v{targetVersion.version}</p>
                  </div>
                </div>

                <div className="text-sm text-space-600 dark:text-space-400 space-y-1">
                  <p><strong className="text-space-700 dark:text-space-300">Created:</strong> {formatDate(targetVersion.createdAt)}</p>
                  {targetVersion.changelog && (
                    <p><strong className="text-space-700 dark:text-space-300">Changelog:</strong> {targetVersion.changelog}</p>
                  )}
                  <p className="text-xs text-space-500 mt-2">
                    {targetVersion.config.blockCategories?.length || 0} blocked categories,
                    {targetVersion.config.warnCategories?.length || 0} warn categories
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-space-200 dark:border-space-700 bg-space-50 dark:bg-space-900 flex gap-3">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-lg border border-space-300 dark:border-space-600 text-space-700 dark:text-space-300 hover:bg-space-100 dark:hover:bg-space-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Rolling back...
                  </>
                ) : (
                  <>
                    <ArrowUturnLeftIcon className="h-4 w-4" />
                    Confirm Rollback
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

