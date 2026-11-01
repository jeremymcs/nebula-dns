/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Verification Step - Confirm DNS is working
 */

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid'

interface VerificationStepProps {
  onVerified: () => void
}

type VerificationStatus = 'checking' | 'success' | 'failed'

export function VerificationStep({ onVerified }: VerificationStepProps) {
  const [status, setStatus] = useState<VerificationStatus>('checking')
  const [attempts, setAttempts] = useState(0)

  const runVerification = async () => {
    setStatus('checking')
    setAttempts((prev) => prev + 1)

    // Simulate verification check
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Demo: succeed after 2 attempts
    if (attempts >= 1) {
      setStatus('success')
    } else {
      setStatus('failed')
    }
  }

  useEffect(() => {
    runVerification()
  }, [])

  return (
    <div className="text-center py-8">
      {status === 'checking' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="relative w-24 h-24 mx-auto">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-4 border-primary-500/30 border-t-primary-500"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <ArrowPathIcon className="h-8 w-8 text-primary-500 animate-pulse" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-space-900 dark:text-white">
            Verifying DNS Configuration...
          </h3>
          <p className="text-space-500">
            Checking if your device is using Flux Shield
          </p>
        </motion.div>
      )}

      {status === 'success' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="w-24 h-24 mx-auto rounded-full bg-success-500/10 flex items-center justify-center">
            <CheckCircleIcon className="h-16 w-16 text-success-500" />
          </div>
          <h3 className="text-xl font-semibold text-success-600 dark:text-success-400">
            Protection Active! 🎉
          </h3>
          <p className="text-space-500">
            Your device is now protected by Flux Shield
          </p>
          <button
            onClick={onVerified}
            className="mt-4 px-6 py-2 bg-success-500 text-white rounded-lg hover:bg-success-600 transition-colors"
          >
            Continue to Dashboard
          </button>
        </motion.div>
      )}

      {status === 'failed' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="w-24 h-24 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
            <XCircleIcon className="h-16 w-16 text-amber-500" />
          </div>
          <h3 className="text-xl font-semibold text-amber-600 dark:text-amber-400">
            Not Detected Yet
          </h3>
          <p className="text-space-500 max-w-sm mx-auto">
            We couldn't detect Flux Shield on your device. Make sure you've completed the setup steps.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={runVerification}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Try Again
            </button>
            <button
              onClick={onVerified}
              className="px-4 py-2 border border-space-300 dark:border-space-600 text-space-700 dark:text-space-300 rounded-lg hover:bg-space-100 dark:hover:bg-space-800 transition-colors"
            >
              Skip for Now
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

