/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Platform Selector - Device platform selection
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Platform, DeviceType, PLATFORMS } from './types'

interface PlatformSelectorProps {
  deviceType?: DeviceType
  selected?: Platform
  onSelect: (platform: Platform) => void
}

export function PlatformSelector({ deviceType, selected, onSelect }: PlatformSelectorProps) {
  // Filter platforms based on device type
  const filteredPlatforms = PLATFORMS.filter((p) => {
    if (deviceType === 'router') return p.id === 'router'
    if (deviceType === 'personal') return p.id !== 'router'
    return true
  })

  return (
    <div className="grid grid-cols-3 gap-3">
      {filteredPlatforms.map((platform, index) => (
        <motion.button
          key={platform.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect(platform.id)}
          className={clsx(
            'p-4 rounded-xl border-2 text-center transition-all hover:scale-105',
            selected === platform.id
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-space-200 dark:border-space-700 hover:border-primary-300 dark:hover:border-primary-700'
          )}
        >
          <div className="text-3xl mb-2">{platform.icon}</div>
          <p className="font-medium text-space-900 dark:text-white text-sm">{platform.name}</p>
          {platform.supportsProfile && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-success-500/10 text-success-600 dark:text-success-400 rounded-full">
              Auto-config
            </span>
          )}
        </motion.button>
      ))}
    </div>
  )
}

