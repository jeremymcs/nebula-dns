/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Setup Method Selector - Choose how to configure DNS
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Platform, PLATFORMS, OnboardingState } from './types'

type SetupMethod = NonNullable<OnboardingState['setupMethod']>
import {
  QrCodeIcon,
  EnvelopeIcon,
  DocumentArrowDownIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'

interface SetupMethodSelectorProps {
  platform?: Platform
  selected?: SetupMethod
  onSelect: (method: SetupMethod) => void
}

export function SetupMethodSelector({ platform, selected, onSelect }: SetupMethodSelectorProps) {
  const platformInfo = PLATFORMS.find((p) => p.id === platform)
  const supportsProfile = platformInfo?.supportsProfile ?? false

  const methods = [
    {
      id: 'qr',
      name: 'Scan QR Code',
      description: 'Scan with your device camera to configure instantly',
      icon: QrCodeIcon,
      recommended: true,
    },
    {
      id: 'email',
      name: 'Email Instructions',
      description: 'Send setup instructions to your email',
      icon: EnvelopeIcon,
      recommended: false,
    },
    ...(supportsProfile
      ? [
          {
            id: 'profile',
            name: 'Download Profile',
            description: 'Install configuration profile for automatic setup',
            icon: DocumentArrowDownIcon,
            recommended: true,
          },
        ]
      : []),
    {
      id: 'manual',
      name: 'Manual Setup',
      description: 'View step-by-step instructions',
      icon: WrenchScrewdriverIcon,
      recommended: false,
    },
  ]

  return (
    <div className="space-y-3">
      {methods.map((method, index) => (
        <motion.button
          key={method.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelect(method.id as SetupMethod)}
          className={clsx(
            'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4',
            selected === method.id
              ? 'border-nebula-500 bg-nebula-500/10'
              : 'border-space-200 dark:border-space-700 hover:border-nebula-300 dark:hover:border-nebula-700'
          )}
        >
          <div className={clsx(
            'p-3 rounded-xl',
            method.recommended ? 'bg-nebula-500/10' : 'bg-space-100 dark:bg-space-700'
          )}>
            <method.icon className={clsx(
              'h-6 w-6',
              method.recommended ? 'text-nebula-500' : 'text-space-500'
            )} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-space-900 dark:text-white">{method.name}</h3>
              {method.recommended && (
                <span className="px-2 py-0.5 text-xs bg-nebula-500 text-white rounded-full">
                  Recommended
                </span>
              )}
            </div>
            <p className="text-sm text-space-500 mt-1">{method.description}</p>
          </div>
        </motion.button>
      ))}
    </div>
  )
}

