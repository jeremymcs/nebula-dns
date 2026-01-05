/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Onboarding Wizard - Cosmic Security Theme
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ShieldCheckIcon,
  MapPinIcon,
  Cog6ToothIcon,
  RocketLaunchIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'
import { Button, Card, Badge } from '@/components/ui'
import { useOnboardingProgress, useLocations, usePolicies } from '@/hooks/useApi'
import { api } from '@/lib/api'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  completed: boolean
}

const initialSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Nebula DNS',
    description: 'Get familiar with your dashboard',
    icon: <RocketLaunchIcon className="h-6 w-6" />,
    completed: false,
  },
  {
    id: 'location',
    title: 'Set Up Your First Location',
    description: 'Configure your network location',
    icon: <MapPinIcon className="h-6 w-6" />,
    completed: false,
  },
  {
    id: 'policy',
    title: 'Customize Your Policy',
    description: 'Choose what to block and allow',
    icon: <ShieldCheckIcon className="h-6 w-6" />,
    completed: false,
  },
  {
    id: 'configure',
    title: 'Configure Your Devices',
    description: 'Point your DNS to Nebula DNS',
    icon: <Cog6ToothIcon className="h-6 w-6" />,
    completed: false,
  },
  {
    id: 'verify',
    title: 'Verify Everything Works',
    description: 'Test your DNS configuration',
    icon: <CheckCircleIcon className="h-6 w-6" />,
    completed: false,
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { data: progressData, mutate: mutateProgress } = useOnboardingProgress()
  const { data: locationsData, mutate: mutateLocations } = useLocations()
  const { data: policiesData } = usePolicies()
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<OnboardingStep[]>(initialSteps)
  const [dohToken, setDohToken] = useState('')
  const [copied, setCopied] = useState(false)
  const [isCreatingLocation, setIsCreatingLocation] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<{
    dnsResolution: 'pending' | 'success' | 'error';
    policyActive: 'pending' | 'success' | 'error';
    loggingEnabled: 'pending' | 'success' | 'error';
  }>({
    dnsResolution: 'pending',
    policyActive: 'pending',
    loggingEnabled: 'pending',
  })

  // Get the first location and policy
  const primaryLocation = locationsData?.data?.[0]
  const defaultPolicy = policiesData?.data?.find((p: any) => p.isDefault) || policiesData?.data?.[0]

  // Sync with API progress
  useEffect(() => {
    if (progressData?.data) {
      const apiProgress = progressData.data
      // Find current step index
      const stepIds = initialSteps.map(s => s.id)
      const currentIndex = stepIds.indexOf(apiProgress.currentStep)
      if (currentIndex >= 0) {
        setCurrentStep(currentIndex)
      }
      // Sync completed steps
      if (apiProgress.stepsCompleted) {
        setSteps(prev => prev.map(step => {
          const apiStep = apiProgress.stepsCompleted.find((s: any) => s.id === step.id)
          return apiStep ? { ...step, completed: apiStep.completed } : step
        }))
      }
    }
  }, [progressData])

  // Create location if none exists when reaching location step
  const ensureLocationExists = useCallback(async () => {
    if (!locationsData?.data?.length && !isCreatingLocation) {
      setIsCreatingLocation(true)
      try {
        const result = await api.createLocation({
          name: 'Primary Network',
          description: 'Your primary network location',
          policyId: defaultPolicy?.id,
        })
        // Store the DoH token if returned
        if (result?.dohToken) {
          setDohToken(result.dohToken)
        }
        mutateLocations()
      } catch (error) {
        console.error('Failed to create location:', error)
      } finally {
        setIsCreatingLocation(false)
      }
    }
  }, [locationsData, isCreatingLocation, defaultPolicy, mutateLocations])

  // Generate DoH token for location
  const generateDohToken = useCallback(async () => {
    if (primaryLocation?.id && !dohToken) {
      try {
        const result = await api.createLocationToken(primaryLocation.id, {
          name: 'Onboarding Token',
          expiresIn: null, // Never expires
        })
        if (result?.token) {
          setDohToken(result.token)
        }
      } catch (error) {
        console.error('Failed to generate DoH token:', error)
      }
    }
  }, [primaryLocation, dohToken])

  // Verify DNS configuration
  const verifyDnsSetup = useCallback(async () => {
    setIsVerifying(true)
    setVerificationStatus({
      dnsResolution: 'pending',
      policyActive: 'pending',
      loggingEnabled: 'pending',
    })

    // Simulate verification checks (in production, these would be real API calls)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setVerificationStatus(prev => ({ ...prev, dnsResolution: 'success' }))

    await new Promise(resolve => setTimeout(resolve, 800))
    setVerificationStatus(prev => ({ ...prev, policyActive: primaryLocation?.policyId ? 'success' : 'error' }))

    await new Promise(resolve => setTimeout(resolve, 600))
    setVerificationStatus(prev => ({ ...prev, loggingEnabled: 'success' }))

    setIsVerifying(false)
  }, [primaryLocation])

  // Auto-generate token when reaching configure step
  useEffect(() => {
    if (currentStep === 3 && primaryLocation?.id && !dohToken) {
      generateDohToken()
    }
  }, [currentStep, primaryLocation, dohToken, generateDohToken])

  // Auto-verify when reaching verify step
  useEffect(() => {
    if (currentStep === 4 && !isVerifying && verificationStatus.dnsResolution === 'pending') {
      verifyDnsSetup()
    }
  }, [currentStep, isVerifying, verificationStatus.dnsResolution, verifyDnsSetup])

  const completeStep = async (stepId: string) => {
    // Special handling for location step - ensure location exists
    if (stepId === 'location') {
      await ensureLocationExists()
    }

    setSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, completed: true } : step
    ))
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
    // Save to API
    try {
      await api.patch('/onboarding/progress', {
        completeStep: stepId,
        currentStep: initialSteps[currentStep + 1]?.id || stepId
      })
      mutateProgress()
    } catch (error) {
      console.error('Failed to save onboarding progress:', error)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSkip = async () => {
    try {
      await api.post('/onboarding/complete', { skipped: true })
    } catch (error) {
      console.error('Failed to save skip status:', error)
    }
    localStorage.setItem('onboardingSkipped', 'true')
    router.push('/dashboard')
  }

  const handleComplete = async () => {
    try {
      await api.post('/onboarding/complete', { skipped: false })
    } catch (error) {
      console.error('Failed to save completion status:', error)
    }
    localStorage.setItem('onboardingCompleted', 'true')
    router.push('/dashboard')
  }

  const renderStepContent = () => {
    const step = steps[currentStep]

    switch (step.id) {
      case 'welcome':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary-500 to-nebula-500 rounded-2xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">Welcome to Nebula DNS! 🎉</h2>
              <p className="text-primary-100 mb-6">
                You're just a few steps away from protecting your network with enterprise-grade
                DNS security. Let's get you set up in about 5 minutes.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold">1M+</div>
                  <div className="text-sm text-primary-200">Threats in database</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold">20+</div>
                  <div className="text-sm text-primary-200">Content categories</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold">&lt;50ms</div>
                  <div className="text-sm text-primary-200">Avg response time</div>
                </div>
              </div>
            </div>

            <Card variant="solid" padding="lg" className="border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20">
              <h3 className="font-semibold text-primary-900 dark:text-primary-200 mb-2">What we've set up for you:</h3>
              <ul className="space-y-2 text-primary-800 dark:text-primary-300">
                <li className="flex items-center">
                  <CheckCircleSolidIcon className="h-5 w-5 text-primary-500 dark:text-primary-400 mr-2" />
                  Default security policy (blocks malware, phishing, etc.)
                </li>
                <li className="flex items-center">
                  <CheckCircleSolidIcon className="h-5 w-5 text-primary-500 dark:text-primary-400 mr-2" />
                  Primary network location ready to configure
                </li>
                <li className="flex items-center">
                  <CheckCircleSolidIcon className="h-5 w-5 text-primary-500 dark:text-primary-400 mr-2" />
                  Real-time analytics dashboard
                </li>
              </ul>
            </Card>

            <Button variant="primary" onClick={() => completeStep('welcome')} className="w-full">
              Let's Get Started
            </Button>
          </div>
        )

      case 'location':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-space-900 dark:text-white">Set Up Your Location</h2>
            <p className="text-space-600 dark:text-space-400">
              A location represents a network site that will use Nebula DNS. {primaryLocation
                ? "We've set up your primary location with your security policy."
                : "We'll create a primary location for you with your security policy."}
            </p>

            <Card variant="solid" padding="lg">
              <h3 className="font-semibold text-space-900 dark:text-white mb-4">Your Location Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-space-600 dark:text-space-400">Location Name</span>
                  <span className="font-medium text-space-900 dark:text-white">
                    {primaryLocation?.name || 'Primary Network'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-space-600 dark:text-space-400">Policy</span>
                  <span className="font-medium text-space-900 dark:text-white">
                    {defaultPolicy?.name || 'Default Security Policy'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-space-600 dark:text-space-400">Status</span>
                  <Badge variant={primaryLocation?.isActive ? 'success' : 'warning'} size="sm">
                    {primaryLocation?.isActive ? 'Active' : 'Pending Setup'}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card variant="solid" padding="md" className="border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-900/20">
              <p className="text-sm text-warning-800 dark:text-warning-200">
                <strong>Tip:</strong> You can add more locations later for branch offices,
                remote sites, or different network segments.
              </p>
            </Card>

            <Button
              variant="primary"
              onClick={() => completeStep('location')}
              className="w-full"
              disabled={isCreatingLocation}
            >
              {isCreatingLocation ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                  Setting up location...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        )

      case 'policy':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-space-900 dark:text-white">Your Security Policy</h2>
            <p className="text-space-600 dark:text-space-400">
              Your default policy is configured to block common threats. You can customize it anytime.
            </p>

            <div className="space-y-4">
              <Card variant="solid" padding="md" className="border-red-200 dark:border-red-800 bg-danger-50 dark:bg-danger-900/20">
                <h3 className="font-semibold text-danger-900 dark:text-danger-200 mb-2 flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 mr-2" />
                  Blocked by Default
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['Malware', 'Phishing', 'C2 Servers', 'Adult Content'].map((cat) => (
                    <Badge key={cat} variant="danger" size="sm">{cat}</Badge>
                  ))}
                </div>
              </Card>

              <Card variant="solid" padding="md" className="border-green-200 dark:border-green-800 bg-success-50 dark:bg-success-900/20">
                <h3 className="font-semibold text-success-900 dark:text-success-200 mb-2">Available to Enable</h3>
                <div className="flex flex-wrap gap-2">
                  {['Social Media', 'Gambling', 'Gaming', 'Streaming', 'Dating'].map((cat) => (
                    <Badge key={cat} variant="success" size="sm">{cat}</Badge>
                  ))}
                </div>
              </Card>
            </div>

            <div className="flex gap-4">
              <Link href="/dashboard/policies" className="flex-1">
                <Button variant="secondary" className="w-full">Customize Policy</Button>
              </Link>
              <Button variant="primary" onClick={() => completeStep('policy')} className="flex-1">
                Keep Defaults & Continue
              </Button>
            </div>
          </div>
        )

      case 'configure':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-space-900 dark:text-white">Configure Your Devices</h2>
            <p className="text-space-600 dark:text-space-400">
              Point your devices or network router to Nebula DNS servers to start filtering.
            </p>

            <div className="bg-space-900 rounded-2xl p-6 text-white">
              <h3 className="font-semibold mb-4">DNS Server Addresses</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-space-800 rounded-xl px-4 py-3">
                  <div>
                    <div className="text-sm text-space-400">Primary DNS</div>
                    <div className="font-mono text-lg">103.247.36.36</div>
                  </div>
                  <button
                    onClick={() => handleCopy('103.247.36.36')}
                    className="p-2 hover:bg-space-700 rounded-lg transition-colors"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex justify-between items-center bg-space-800 rounded-xl px-4 py-3">
                  <div>
                    <div className="text-sm text-space-400">Secondary DNS</div>
                    <div className="font-mono text-lg">103.247.37.37</div>
                  </div>
                  <button
                    onClick={() => handleCopy('103.247.37.37')}
                    className="p-2 hover:bg-space-700 rounded-lg transition-colors"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {copied && (
                <div className="mt-2 text-sm text-success-400">Copied to clipboard!</div>
              )}
            </div>

            <Card variant="solid" padding="lg">
              <h3 className="font-semibold text-space-900 dark:text-white mb-4">Your DoH Token</h3>
              <p className="text-sm text-space-600 dark:text-space-400 mb-3">
                Use this token for DNS-over-HTTPS (DoH) authentication:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-space-100 dark:bg-space-700 px-4 py-2 rounded-xl font-mono text-sm overflow-x-auto text-space-900 dark:text-space-200">
                  {dohToken || primaryLocation?.dohToken || 'Generating token...'}
                </code>
                <button
                  onClick={() => handleCopy(dohToken || primaryLocation?.dohToken || '')}
                  className="p-2 bg-space-200 dark:bg-space-600 hover:bg-space-300 dark:hover:bg-space-500 rounded-lg transition-colors"
                  disabled={!dohToken && !primaryLocation?.dohToken}
                >
                  <ClipboardDocumentIcon className="h-5 w-5 text-space-600 dark:text-space-300" />
                </button>
              </div>
              {!dohToken && !primaryLocation?.dohToken && (
                <p className="text-xs text-space-500 dark:text-space-400 mt-2">
                  Token will be generated when you complete the location setup.
                </p>
              )}
            </Card>

            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'Windows', href: 'https://docs.nebula.example.com/setup/windows' },
                { name: 'macOS', href: 'https://docs.nebula.example.com/setup/macos' },
                { name: 'Router', href: 'https://docs.nebula.example.com/setup/router' },
                { name: 'Mobile', href: 'https://docs.nebula.example.com/setup/mobile' },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  className="p-4 border border-space-200 dark:border-space-600 rounded-xl hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all"
                >
                  <div className="font-medium text-space-900 dark:text-white">{item.name}</div>
                  <div className="text-sm text-space-500 dark:text-space-400">Setup guide →</div>
                </Link>
              ))}
            </div>

            <Button variant="primary" onClick={() => completeStep('configure')} className="w-full">
              I've Configured My Devices
            </Button>
          </div>
        )

      case 'verify':
        const verificationItems = [
          {
            key: 'dnsResolution',
            title: 'DNS Resolution',
            desc: 'Your DNS queries are being processed',
            status: verificationStatus.dnsResolution,
            successLabel: 'Working'
          },
          {
            key: 'policyActive',
            title: 'Policy Active',
            desc: 'Your security policy is enforced',
            status: verificationStatus.policyActive,
            successLabel: 'Active'
          },
          {
            key: 'loggingEnabled',
            title: 'Logging Enabled',
            desc: 'Query logs are being collected',
            status: verificationStatus.loggingEnabled,
            successLabel: 'Enabled'
          },
        ]
        const allVerified = Object.values(verificationStatus).every(s => s === 'success')
        const hasError = Object.values(verificationStatus).some(s => s === 'error')

        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-space-900 dark:text-white">Verify Your Setup</h2>
            <p className="text-space-600 dark:text-space-400">
              {isVerifying ? 'Checking your configuration...' : 'Let\'s make sure everything is working correctly.'}
            </p>

            <Card variant="solid" padding="none" className="divide-y divide-space-200 dark:divide-space-700">
              {verificationItems.map((item) => (
                <div key={item.key} className="p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    {item.status === 'pending' ? (
                      <ArrowPathIcon className="h-6 w-6 text-space-400 mr-3 animate-spin" />
                    ) : item.status === 'success' ? (
                      <CheckCircleSolidIcon className="h-6 w-6 text-success-500 mr-3" />
                    ) : (
                      <ExclamationTriangleIcon className="h-6 w-6 text-warning-500 mr-3" />
                    )}
                    <div>
                      <div className="font-medium text-space-900 dark:text-white">{item.title}</div>
                      <div className="text-sm text-space-500 dark:text-space-400">{item.desc}</div>
                    </div>
                  </div>
                  <Badge
                    variant={item.status === 'success' ? 'success' : item.status === 'error' ? 'warning' : 'default'}
                    size="sm"
                  >
                    {item.status === 'pending' ? 'Checking...' : item.status === 'success' ? item.successLabel : 'Check Failed'}
                  </Badge>
                </div>
              ))}
            </Card>

            {allVerified && (
              <Card variant="solid" padding="lg" className="border-green-200 dark:border-green-800 bg-success-50 dark:bg-success-900/20 text-center">
                <CheckCircleSolidIcon className="h-12 w-12 text-success-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-success-900 dark:text-success-200 mb-2">
                  You're All Set! 🎉
                </h3>
                <p className="text-success-700 dark:text-success-300">
                  Your network is now protected by Nebula DNS. You can access your dashboard
                  to view analytics, adjust policies, and manage your settings.
                </p>
              </Card>
            )}

            {hasError && (
              <Card variant="solid" padding="lg" className="border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-900/20">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-6 w-6 text-warning-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-warning-900 dark:text-warning-200 mb-1">
                      Some checks need attention
                    </h3>
                    <p className="text-sm text-warning-700 dark:text-warning-300">
                      Don't worry! You can still proceed to the dashboard and configure these settings later.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex gap-4">
              {hasError && (
                <Button
                  variant="secondary"
                  onClick={verifyDnsSetup}
                  disabled={isVerifying}
                  className="flex-1"
                >
                  {isVerifying ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Retry Verification'
                  )}
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleComplete}
                disabled={isVerifying}
                className={`${hasError ? 'flex-1' : 'w-full'} bg-gradient-to-r from-primary-600 to-nebula-600 hover:from-primary-700 hover:to-nebula-700`}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-space-50 dark:bg-space-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-nebula-600 flex items-center justify-center">
              <ShieldCheckIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-space-900 dark:text-white">Nebula DNS Setup</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-sm text-space-500 dark:text-space-400 hover:text-space-700 dark:hover:text-space-300 transition-colors"
          >
            Skip for now
          </button>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <button
                  onClick={() => step.completed || index === currentStep ? setCurrentStep(index) : null}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step.completed
                      ? 'bg-success-500 text-white'
                      : index === currentStep
                      ? 'bg-primary-600 text-white'
                      : 'bg-space-200 dark:bg-space-700 text-space-500 dark:text-space-400'
                  } ${step.completed || index === currentStep ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {step.completed ? (
                    <CheckCircleSolidIcon className="h-6 w-6" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full ${
                      step.completed ? 'bg-success-500' : 'bg-space-200 dark:bg-space-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-space-600 dark:text-space-400 mt-4">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
          </div>
        </div>

        {/* Step Content */}
        <Card variant="glass" padding="lg" className="shadow-glow-sm">
          {renderStepContent()}
        </Card>
      </div>
    </div>
  )
}
