/**
 * Nebula DNS - MSP Onboarding Wizard Types
 * Type definitions for wizard steps and state
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import type { MspTenantCreatedResponse } from '@/hooks/useApi'

/**
 * Wizard step definition
 */
export interface WizardStep {
  id: string
  title: string
  description: string
}

/**
 * Wizard steps configuration
 * 4-step process: Company Info -> Admin User -> Settings -> Review
 */
export const WIZARD_STEPS: WizardStep[] = [
  { id: 'company', title: 'Company Info', description: 'Basic organization details' },
  { id: 'admin', title: 'Admin User', description: 'Initial administrator account' },
  { id: 'settings', title: 'Settings', description: 'Limits and configuration' },
  { id: 'review', title: 'Review', description: 'Confirm and create' },
]

/**
 * MSP Onboarding wizard state
 */
export interface MspOnboardingState {
  step: number
  isSubmitting: boolean
  isComplete: boolean
  createdMsp: MspTenantCreatedResponse | null
}

/**
 * Initial wizard state
 */
export const INITIAL_STATE: MspOnboardingState = {
  step: 0,
  isSubmitting: false,
  isComplete: false,
  createdMsp: null,
}
