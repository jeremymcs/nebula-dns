/**
 * Onboarding Wizard for New Tenants
 * Guides users through initial setup after signup
 */

'use client'

import { useState, useEffect } from 'react'
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
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">Welcome to SafeDNS! 🎉</h2>
              <p className="text-indigo-100 mb-6">
                You're just a few steps away from protecting your network with enterprise-grade 
                DNS security. Let's get you set up in about 5 minutes.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold">1M+</div>
                  <div className="text-sm text-indigo-200">Threats in database</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold">20+</div>
                  <div className="text-sm text-indigo-200">Content categories</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold">&lt;50ms</div>
                  <div className="text-sm text-indigo-200">Avg response time</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What we've set up for you:</h3>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-center">
                  <CheckCircleSolidIcon className="h-5 w-5 text-blue-500 mr-2" />
                  Default security policy (blocks malware, phishing, etc.)
                </li>
                <li className="flex items-center">
                  <CheckCircleSolidIcon className="h-5 w-5 text-blue-500 mr-2" />
                  Primary network location ready to configure
                </li>
                <li className="flex items-center">
                  <CheckCircleSolidIcon className="h-5 w-5 text-blue-500 mr-2" />
                  Real-time analytics dashboard
                </li>
              </ul>
            </div>

            <button
              onClick={() => completeStep('welcome')}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              Let's Get Started
            </button>
          </div>
        )

      case 'location':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Set Up Your Location</h2>
            <p className="text-gray-600">
              A location represents a network site that will use SafeDNS. We've created a 
              default "Primary Network" for you with your security policy already assigned.
            </p>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Your Location Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Location Name</span>
                  <span className="font-medium">Primary Network</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Policy</span>
                  <span className="font-medium">Default Security Policy</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                    Active
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Tip:</strong> You can add more locations later for branch offices, 
                remote sites, or different network segments.
              </p>
            </div>

            <button
              onClick={() => completeStep('location')}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              Continue
            </button>
          </div>
        )

      case 'policy':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Your Security Policy</h2>
            <p className="text-gray-600">
              Your default policy is configured to block common threats. You can customize it anytime.
            </p>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2 flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 mr-2" />
                  Blocked by Default
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['Malware', 'Phishing', 'C2 Servers', 'Adult Content'].map((cat) => (
                    <span key={cat} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Available to Enable</h3>
                <div className="flex flex-wrap gap-2">
                  {['Social Media', 'Gambling', 'Gaming', 'Streaming', 'Dating'].map((cat) => (
                    <span key={cat} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Link
                href="/dashboard/policies"
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 text-center"
              >
                Customize Policy
              </Link>
              <button
                onClick={() => completeStep('policy')}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
              >
                Keep Defaults & Continue
              </button>
            </div>
          </div>
        )

      case 'configure':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Configure Your Devices</h2>
            <p className="text-gray-600">
              Point your devices or network router to SafeDNS servers to start filtering.
            </p>

            <div className="bg-gray-900 rounded-lg p-6 text-white">
              <h3 className="font-semibold mb-4">DNS Server Addresses</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-gray-800 rounded px-4 py-3">
                  <div>
                    <div className="text-sm text-gray-400">Primary DNS</div>
                    <div className="font-mono text-lg">103.247.36.36</div>
                  </div>
                  <button
                    onClick={() => handleCopy('103.247.36.36')}
                    className="p-2 hover:bg-gray-700 rounded"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex justify-between items-center bg-gray-800 rounded px-4 py-3">
                  <div>
                    <div className="text-sm text-gray-400">Secondary DNS</div>
                    <div className="font-mono text-lg">103.247.37.37</div>
                  </div>
                  <button
                    onClick={() => handleCopy('103.247.37.37')}
                    className="p-2 hover:bg-gray-700 rounded"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {copied && (
                <div className="mt-2 text-sm text-green-400">Copied to clipboard!</div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Your DoH Token</h3>
              <p className="text-sm text-gray-600 mb-3">
                Use this token for DNS-over-HTTPS (DoH) authentication:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-4 py-2 rounded font-mono text-sm overflow-x-auto">
                  safedns_loc_demo1234567890abcdef
                </code>
                <button
                  onClick={() => handleCopy('safedns_loc_demo1234567890abcdef')}
                  className="p-2 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  <ClipboardDocumentIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Link
                href="https://docs.safedns.example.com/setup/windows"
                target="_blank"
                className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all"
              >
                <div className="font-medium text-gray-900">Windows</div>
                <div className="text-sm text-gray-500">Setup guide →</div>
              </Link>
              <Link
                href="https://docs.safedns.example.com/setup/macos"
                target="_blank"
                className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all"
              >
                <div className="font-medium text-gray-900">macOS</div>
                <div className="text-sm text-gray-500">Setup guide →</div>
              </Link>
              <Link
                href="https://docs.safedns.example.com/setup/router"
                target="_blank"
                className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all"
              >
                <div className="font-medium text-gray-900">Router</div>
                <div className="text-sm text-gray-500">Setup guide →</div>
              </Link>
              <Link
                href="https://docs.safedns.example.com/setup/mobile"
                target="_blank"
                className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all"
              >
                <div className="font-medium text-gray-900">Mobile</div>
                <div className="text-sm text-gray-500">Setup guide →</div>
              </Link>
            </div>

            <button
              onClick={() => completeStep('configure')}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              I've Configured My Devices
            </button>
          </div>
        )

      case 'verify':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Verify Your Setup</h2>
            <p className="text-gray-600">
              Let's make sure everything is working correctly.
            </p>

            <div className="bg-white border border-gray-200 rounded-lg divide-y">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircleSolidIcon className="h-6 w-6 text-green-500 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">DNS Resolution</div>
                    <div className="text-sm text-gray-500">Your DNS queries are being processed</div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Working
                </span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircleSolidIcon className="h-6 w-6 text-green-500 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">Policy Active</div>
                    <div className="text-sm text-gray-500">Your security policy is enforced</div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Active
                </span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircleSolidIcon className="h-6 w-6 text-green-500 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">Logging Enabled</div>
                    <div className="text-sm text-gray-500">Query logs are being collected</div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Enabled
                </span>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircleSolidIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                You're All Set! 🎉
              </h3>
              <p className="text-green-700">
                Your network is now protected by SafeDNS. You can access your dashboard 
                to view analytics, adjust policies, and manage your settings.
              </p>
            </div>

            <button
              onClick={handleComplete}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700"
            >
              Go to Dashboard
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <ShieldCheckIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">SafeDNS Setup</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700"
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
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-500'
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
                    className={`flex-1 h-1 mx-2 ${
                      step.completed ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-gray-600 mt-4">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {renderStepContent()}
        </div>
      </div>
    </div>
  )
}
