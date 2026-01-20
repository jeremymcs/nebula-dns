// Nebula DNS - New MSP Wizard Page
// Admin page for creating new MSP accounts
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { MspOnboardingWizard } from '@/components/admin/msp-onboarding'

/**
 * New MSP Page
 *
 * Renders the MSP onboarding wizard for creating new MSP accounts.
 * Accessible from Mission Control at /mission-control/msps/new.
 */
export default function NewMspPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-space-900 dark:text-white">
          Create New MSP
        </h1>
        <p className="mt-1 text-sm text-space-600 dark:text-space-400">
          Set up a new Managed Service Provider account with initial admin user.
        </p>
      </div>
      <MspOnboardingWizard />
    </div>
  )
}
