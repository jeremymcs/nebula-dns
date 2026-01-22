/**
 * Nebula DNS - Test Alert Button Component
 * Button for testing alert configuration connectivity
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export interface TestAlertButtonProps {
  configId: string
  configName: string
  isTesting: boolean
  onTest: (id: string) => Promise<void>
}

/**
 * Button component for sending test alerts
 * Displays loading state during test execution
 * Toast feedback is handled by the parent component
 */
export function TestAlertButton({
  configId,
  configName,
  isTesting,
  onTest,
}: TestAlertButtonProps) {
  const handleClick = () => {
    onTest(configId)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isTesting}
      aria-label={`Test ${configName} integration`}
      leftIcon={
        isTesting ? (
          <LoadingSpinner size="sm" />
        ) : (
          <PaperAirplaneIcon className="w-4 h-4" />
        )
      }
    >
      {isTesting ? 'Testing...' : 'Test'}
    </Button>
  )
}
