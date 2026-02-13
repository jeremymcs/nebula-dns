// Nebula DNS - Policy Presets Component
// Simple preset policies for Kids, Teens, and Adults
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState } from 'react'
import {
  UserIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { API_URL } from '@/lib/api'

interface PolicyPreset {
  id: string
  name: string
  description: string
  icon: any
  color: { bg: string; text: string; icon: string; border: string }
  protections: {
    malware: boolean
    phishing: boolean
    adult: boolean
    gambling: boolean
    socialMedia: boolean
    streaming: boolean
    gaming: boolean
  }
}

const presets: PolicyPreset[] = [
  {
    id: 'kids',
    name: 'Kids',
    description: 'Maximum protection for young children',
    icon: UserIcon,
    color: {
      bg: 'bg-success-50 dark:bg-success-900/20',
      text: 'text-success-700 dark:text-success-300',
      icon: 'text-success-600 dark:text-success-400',
      border: 'border-success-200 dark:border-success-800/30',
    },
    protections: {
      malware: true,
      phishing: true,
      adult: true,
      gambling: true,
      socialMedia: true,
      streaming: true,
      gaming: true,
    },
  },
  {
    id: 'teens',
    name: 'Teens',
    description: 'Balanced protection for teenagers',
    icon: UserGroupIcon,
    color: {
      bg: 'bg-primary-50 dark:bg-primary-900/20',
      text: 'text-primary-700 dark:text-primary-300',
      icon: 'text-primary-600 dark:text-primary-400',
      border: 'border-primary-200 dark:border-primary-800/30',
    },
    protections: {
      malware: true,
      phishing: true,
      adult: true,
      gambling: true,
      socialMedia: false,
      streaming: false,
      gaming: false,
    },
  },
  {
    id: 'adults',
    name: 'Adults',
    description: 'Essential security protection only',
    icon: ShieldCheckIcon,
    color: {
      bg: 'bg-accent-50 dark:bg-accent-900/20',
      text: 'text-accent-700 dark:text-accent-300',
      icon: 'text-accent-600 dark:text-accent-400',
      border: 'border-accent-200 dark:border-accent-800/30',
    },
    protections: {
      malware: true,
      phishing: true,
      adult: false,
      gambling: false,
      socialMedia: false,
      streaming: false,
      gaming: false,
    },
  },
]

const protectionLabels: Record<string, string> = {
  malware: 'Malware & Viruses',
  phishing: 'Phishing & Scams',
  adult: 'Adult Content',
  gambling: 'Gambling Sites',
  socialMedia: 'Social Media',
  streaming: 'Streaming Services',
  gaming: 'Gaming Sites',
}

export function PolicyPresets() {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  const handleApplyPreset = async (presetId: string) => {
    setApplying(true)
    try {
      const token = localStorage.getItem('token')
      const preset = presets.find(p => p.id === presetId)

      if (!preset) return

      // Create or update policy with preset configuration
      const response = await fetch(`${API_URL}/policies/apply-preset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          presetId,
          protections: preset.protections,
        }),
      })

      if (response.ok) {
        setSelectedPreset(presetId)
        // Show success notification (you can add a toast here)
      }
    } catch (error) {
      console.error('Failed to apply preset:', error)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="bg-white dark:bg-space-800 rounded-xl p-6 border border-space-200 dark:border-space-700">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-space-900 dark:text-white">
          Quick Protection Presets
        </h3>
        <p className="text-sm text-space-600 dark:text-space-400 mt-1">
          Choose a protection level that's right for your family member
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {presets.map(preset => (
          <div
            key={preset.id}
            className={`relative rounded-xl p-6 border-2 transition-all ${
              selectedPreset === preset.id
                ? `${preset.color.border} ${preset.color.bg}`
                : 'border-space-200 dark:border-space-700 hover:border-space-300 dark:hover:border-space-600'
            }`}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-xl ${preset.color.bg}`}>
                <preset.icon className={`h-6 w-6 ${preset.color.icon}`} />
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold ${selectedPreset === preset.id ? preset.color.text : 'text-space-900 dark:text-white'}`}>
                  {preset.name}
                </h4>
                <p className="text-xs text-space-600 dark:text-space-400">
                  {preset.description}
                </p>
              </div>
            </div>

            {/* Protections List */}
            <div className="space-y-2 mb-4">
              {Object.entries(preset.protections).map(([key, enabled]) => (
                <div key={key} className="flex items-center gap-2">
                  {enabled ? (
                    <CheckCircleIcon className="h-4 w-4 text-success-600 dark:text-success-400 flex-shrink-0" />
                  ) : (
                    <XCircleIcon className="h-4 w-4 text-space-300 dark:text-space-600 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${enabled ? 'text-space-700 dark:text-space-300' : 'text-space-400 dark:text-space-600'}`}>
                    {protectionLabels[key]}
                  </span>
                </div>
              ))}
            </div>

            {/* Apply Button */}
            <button
              onClick={() => handleApplyPreset(preset.id)}
              disabled={applying || selectedPreset === preset.id}
              className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                selectedPreset === preset.id
                  ? `${preset.color.bg} ${preset.color.text} cursor-default`
                  : `bg-space-100 dark:bg-space-700 text-space-700 dark:text-space-300 hover:bg-space-200 dark:hover:bg-space-600`
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {applying && selectedPreset === preset.id
                ? 'Applying...'
                : selectedPreset === preset.id
                ? 'Applied'
                : 'Apply Preset'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/30">
        <p className="text-sm text-primary-700 dark:text-primary-300">
          <strong>Tip:</strong> You can customize these presets further by going to Policies and adjusting individual categories.
        </p>
      </div>
    </div>
  )
}
