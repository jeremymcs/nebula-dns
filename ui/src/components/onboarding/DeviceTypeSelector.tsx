/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Device Type Selector - First step of onboarding
 */

'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { DeviceType, DEVICE_TYPES } from './types'

interface DeviceTypeSelectorProps {
  selected?: DeviceType
  onSelect: (type: DeviceType) => void
}

export function DeviceTypeSelector({ selected, onSelect }: DeviceTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {DEVICE_TYPES.map((device, index) => (
        <motion.button
          key={device.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelect(device.id)}
          className={clsx(
            'p-6 rounded-xl border-2 text-left transition-all hover:scale-105',
            selected === device.id
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-space-200 dark:border-space-700 hover:border-primary-300 dark:hover:border-primary-700'
          )}
        >
          <div className="text-4xl mb-3">{device.icon}</div>
          <h3 className="font-semibold text-space-900 dark:text-white mb-1">{device.name}</h3>
          <p className="text-sm text-space-500">{device.description}</p>
        </motion.button>
      ))}
    </div>
  )
}

