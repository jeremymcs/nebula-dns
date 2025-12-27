/**
 * Nebula DNS - Onboarding Types
 */

export type DeviceType = 'home' | 'office' | 'personal' | 'router'

export type Platform = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'router' | 'other'

export interface OnboardingState {
  step: number
  deviceType?: DeviceType
  platform?: Platform
  zoneName?: string
  policyTemplate?: string
  setupMethod?: 'qr' | 'email' | 'manual' | 'profile'
  isComplete: boolean
}

export interface SetupConfig {
  primaryDns: string
  secondaryDns: string
  dohUrl: string
  dotHostname: string
  profileUrl?: string
  qrCodeData?: string
}

export interface OnboardingStep {
  id: string
  title: string
  description: string
  component: string
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'device-type',
    title: 'What are you protecting?',
    description: 'Choose the type of network or device',
    component: 'DeviceTypeSelector',
  },
  {
    id: 'platform',
    title: 'Select your platform',
    description: 'Choose your device or router type',
    component: 'PlatformSelector',
  },
  {
    id: 'zone-setup',
    title: 'Name your zone',
    description: 'Give this protection zone a name',
    component: 'ZoneSetup',
  },
  {
    id: 'policy-template',
    title: 'Choose protection level',
    description: 'Select a policy template to start with',
    component: 'PolicyTemplateSelector',
  },
  {
    id: 'setup-method',
    title: 'Configure your device',
    description: 'Choose how to set up DNS',
    component: 'SetupMethodSelector',
  },
  {
    id: 'verification',
    title: 'Verify protection',
    description: 'Confirm DNS is working correctly',
    component: 'VerificationStep',
  },
]

export const DEVICE_TYPES: Array<{
  id: DeviceType
  name: string
  description: string
  icon: string
}> = [
  {
    id: 'home',
    name: 'Home Network',
    description: 'Protect your entire home via router',
    icon: '🏠',
  },
  {
    id: 'office',
    name: 'Office Network',
    description: 'Enterprise protection for your business',
    icon: '🏢',
  },
  {
    id: 'personal',
    name: 'Personal Device',
    description: 'Protect a single phone, tablet, or computer',
    icon: '📱',
  },
  {
    id: 'router',
    name: 'Router Only',
    description: 'Configure DNS on your router directly',
    icon: '📡',
  },
]

export const PLATFORMS: Array<{
  id: Platform
  name: string
  icon: string
  supportsProfile: boolean
}> = [
  { id: 'ios', name: 'iPhone / iPad', icon: '🍎', supportsProfile: true },
  { id: 'android', name: 'Android', icon: '🤖', supportsProfile: false },
  { id: 'macos', name: 'macOS', icon: '💻', supportsProfile: true },
  { id: 'windows', name: 'Windows', icon: '🪟', supportsProfile: false },
  { id: 'linux', name: 'Linux', icon: '🐧', supportsProfile: false },
  { id: 'router', name: 'Router', icon: '📡', supportsProfile: false },
  { id: 'other', name: 'Other', icon: '⚙️', supportsProfile: false },
]

export const POLICY_TEMPLATES = [
  {
    id: 'family',
    name: 'Family Safe',
    description: 'Block adult content, enforce SafeSearch, limit social media',
    icon: '👨‍👩‍👧‍👦',
    features: ['Adult content blocking', 'SafeSearch enforcement', 'Social media limits'],
  },
  {
    id: 'security',
    name: 'Security Focus',
    description: 'Maximum threat protection with minimal content filtering',
    icon: '🛡️',
    features: ['Malware blocking', 'Phishing protection', 'NRD blocking'],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Basic protection with no content filtering',
    icon: '⚡',
    features: ['Malware blocking only', 'No content filtering', 'Fast resolution'],
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Start from scratch and configure everything',
    icon: '🔧',
    features: ['Full customization', 'Advanced options', 'Granular control'],
  },
]

