/**
 * Nebula DNS - Onboarding Components
 * Onboarding wizard is lazy-loaded since it's only needed once per user
 */

import dynamic from 'next/dynamic'

export * from './types'

// Lazy-loaded onboarding components (reduces initial bundle for returning users)
export const OnboardingWizard = dynamic(
  () => import('./OnboardingWizard').then((mod) => mod.OnboardingWizard),
  {
    loading: () => (
      <div className="min-h-screen bg-space-50 dark:bg-space-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nebula-500" />
          <p className="text-space-500">Loading setup wizard...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
)

export const DeviceTypeSelector = dynamic(
  () => import('./DeviceTypeSelector').then((mod) => mod.DeviceTypeSelector),
  { ssr: false }
)

export const PlatformSelector = dynamic(
  () => import('./PlatformSelector').then((mod) => mod.PlatformSelector),
  { ssr: false }
)

export const PolicyTemplateSelector = dynamic(
  () => import('./PolicyTemplateSelector').then((mod) => mod.PolicyTemplateSelector),
  { ssr: false }
)

export const SetupMethodSelector = dynamic(
  () => import('./SetupMethodSelector').then((mod) => mod.SetupMethodSelector),
  { ssr: false }
)

export const VerificationStep = dynamic(
  () => import('./VerificationStep').then((mod) => mod.VerificationStep),
  { ssr: false }
)
