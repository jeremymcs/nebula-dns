// Nebula DNS - Usage Export Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ArrowDownTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { downloadUsageReport } from '@/hooks/useUsageStats'

export function UsageExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    setExportSuccess(false)

    try {
      await downloadUsageReport()
      setExportSuccess(true)

      // Reset success message after 3 seconds
      setTimeout(() => {
        setExportSuccess(false)
      }, 3000)
    } catch (error) {
      console.error('Failed to export usage report:', error)
      // You might want to show an error toast here
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {exportSuccess && (
        <div className="flex items-center gap-2 text-sm text-success-600 dark:text-success-400">
          <CheckCircleIcon className="h-5 w-5" />
          <span>Report downloaded</span>
        </div>
      )}
      <Button
        variant="secondary"
        size="md"
        onClick={handleExport}
        isLoading={isExporting}
        leftIcon={!isExporting ? <ArrowDownTrayIcon className="h-5 w-5" /> : undefined}
      >
        {isExporting ? 'Exporting...' : 'Download CSV'}
      </Button>
    </div>
  )
}
