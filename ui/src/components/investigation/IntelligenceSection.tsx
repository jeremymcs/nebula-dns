/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 * 
 * Intelligence Section - WHOIS and DNS intelligence display
 */

'use client'

import clsx from 'clsx'
import { DomainIntel } from './types'
import {
  IdentificationIcon,
  ServerIcon,
  LockClosedIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'

interface IntelligenceSectionProps {
  intel: DomainIntel | null
  className?: string
}

export function IntelligenceSection({ intel, className }: IntelligenceSectionProps) {
  if (!intel) return null

  const sections = [
    {
      title: 'Registration',
      icon: IdentificationIcon,
      items: [
        { label: 'Registrar', value: intel.registrar },
        { label: 'Registered', value: intel.registrationDate },
        { label: 'Expires', value: intel.expirationDate },
      ],
    },
    {
      title: 'SSL Certificate',
      icon: LockClosedIcon,
      items: [
        { label: 'Issuer', value: intel.sslIssuer },
        { label: 'Expires', value: intel.sslExpiry },
      ],
    },
    {
      title: 'Infrastructure',
      icon: ServerIcon,
      items: [
        { label: 'ASN', value: intel.asn },
        { label: 'IPs', value: intel.ipAddresses.join(', ') },
      ],
    },
    {
      title: 'DNS',
      icon: GlobeAltIcon,
      items: [
        { label: 'Nameservers', value: intel.nameservers.join(', ') },
      ],
    },
  ]

  return (
    <div className={clsx('space-y-4', className)}>
      <h4 className="font-semibold text-space-900 dark:text-white">Domain Intelligence</h4>

      <div className="grid gap-4">
        {sections.map((section) => (
          <div
            key={section.title}
            className="bg-space-50 dark:bg-space-800 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <section.icon className="h-4 w-4 text-nebula-500" />
              <h5 className="font-medium text-space-700 dark:text-space-300">{section.title}</h5>
            </div>
            <dl className="space-y-2">
              {section.items.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <dt className="text-space-500">{item.label}</dt>
                  <dd className="font-medium text-space-900 dark:text-white text-right max-w-[60%] truncate">
                    {item.value || 'Unknown'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}

