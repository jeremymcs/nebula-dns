/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Onboarding Wizard - Cosmic Security Theme
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ShieldCheckIcon,
  MapPinIcon,
  Cog6ToothIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'
import { Button, Card, Badge } from '@/components/ui'

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
    title: 'Welcome to SafeDNS',
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
    description: 'Point your DNS to SafeDNS',
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
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<OnboardingStep[]>(initialSteps)
  const [dnsToken, setDnsToken] = useState('')
  const [copied, setCopied] = useState(false)

  const completeStep = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ))
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSkip = () => {
    // Save that onboarding was skipped
    localStorage.setItem('onboardingSkipped', 'true')
    router.push('/dashboard')
  }

  const handleComplete = () => {
    // Save that onboarding was completed
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
              A location represents a network site that will use Nebula DNS. We've created a
              default "Primary Network" for you with your security policy already assigned.
            </p>

            <Card variant="solid" padding="lg">
              <h3 className="font-semibold text-space-900 dark:text-white mb-4">Your Location Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-space-600 dark:text-space-400">Location Name</span>
                  <span className="font-medium text-space-900 dark:text-white">Primary Network</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-space-600 dark:text-space-400">Policy</span>
                  <span className="font-medium text-space-900 dark:text-white">Default Security Policy</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-space-600 dark:text-space-400">Status</span>
                  <Badge variant="success" size="sm">Active</Badge>
                </div>
              </div>
            </Card>

            <Card variant="solid" padding="md" className="border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-900/20">
              <p className="text-sm text-warning-800 dark:text-warning-200">
                <strong>Tip:</strong> You can add more locations later for branch offices,
                remote sites, or different network segments.
              </p>
            </Card>

            <Button variant="primary" onClick={() => completeStep('location')} className="w-full">
              Continue
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
              <Card variant="solid" padding="md" className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2 flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 mr-2" />
                  Blocked by Default
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['Malware', 'Phishing', 'C2 Servers', 'Adult Content'].map((cat) => (
                    <Badge key={cat} variant="danger" size="sm">{cat}</Badge>
                  ))}
                </div>
              </Card>

              <Card variant="solid" padding="md" className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">Available to Enable</h3>
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
                <div className="mt-2 text-sm text-green-400">Copied to clipboard!</div>
              )}
            </div>

            <Card variant="solid" padding="lg">
              <h3 className="font-semibold text-space-900 dark:text-white mb-4">Your DoH Token</h3>
              <p className="text-sm text-space-600 dark:text-space-400 mb-3">
                Use this token for DNS-over-HTTPS (DoH) authentication:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-space-100 dark:bg-space-700 px-4 py-2 rounded-xl font-mono text-sm overflow-x-auto text-space-900 dark:text-space-200">
                  nebula_loc_demo1234567890abcdef
                </code>
                <button
                  onClick={() => handleCopy('nebula_loc_demo1234567890abcdef')}
                  className="p-2 bg-space-200 dark:bg-space-600 hover:bg-space-300 dark:hover:bg-space-500 rounded-lg transition-colors"
                >
                  <ClipboardDocumentIcon className="h-5 w-5 text-space-600 dark:text-space-300" />
                </button>
              </div>
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
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-space-900 dark:text-white">Verify Your Setup</h2>
            <p className="text-space-600 dark:text-space-400">
              Let's make sure everything is working correctly.
            </p>

            <Card variant="solid" padding="none" className="divide-y divide-space-200 dark:divide-space-700">
              {[
                { title: 'DNS Resolution', desc: 'Your DNS queries are being processed', status: 'Working' },
                { title: 'Policy Active', desc: 'Your security policy is enforced', status: 'Active' },
                { title: 'Logging Enabled', desc: 'Query logs are being collected', status: 'Enabled' },
              ].map((item) => (
                <div key={item.title} className="p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircleSolidIcon className="h-6 w-6 text-green-500 mr-3" />
                    <div>
                      <div className="font-medium text-space-900 dark:text-white">{item.title}</div>
                      <div className="text-sm text-space-500 dark:text-space-400">{item.desc}</div>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">{item.status}</Badge>
                </div>
              ))}
            </Card>

            <Card variant="solid" padding="lg" className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-center">
              <CheckCircleSolidIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-2">
                You're All Set! 🎉
              </h3>
              <p className="text-green-700 dark:text-green-300">
                Your network is now protected by Nebula DNS. You can access your dashboard
                to view analytics, adjust policies, and manage your settings.
              </p>
            </Card>

            <Button
              variant="primary"
              onClick={handleComplete}
              className="w-full bg-gradient-to-r from-primary-600 to-nebula-600 hover:from-primary-700 hover:to-nebula-700"
            >
              Go to Dashboard
            </Button>
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
                      ? 'bg-green-500 text-white'
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
                      step.completed ? 'bg-green-500' : 'bg-space-200 dark:bg-space-700'
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
