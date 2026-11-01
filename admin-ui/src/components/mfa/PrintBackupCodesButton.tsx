'use client'

import { PrinterIcon } from '@heroicons/react/24/outline'
import { printMfaBackupCodes } from '@/lib/print-mfa-backup-codes'

type PrintBackupCodesButtonProps = {
  codes: readonly string[]
  accountLabel: string
  generatedAt?: Date
  onError?: (message: string) => void
  className?: string
}

export function PrintBackupCodesButton({
  codes,
  accountLabel,
  generatedAt,
  onError,
  className = '',
}: PrintBackupCodesButtonProps) {
  const disabled = codes.length === 0

  const handlePrint = () => {
    try {
      printMfaBackupCodes({ codes, accountLabel, generatedAt })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to open print dialog'
      onError?.(message)
    }
  }

  return (
    <button
      type="button"
      className={`btn-secondary inline-flex items-center justify-center ${className}`.trim()}
      disabled={disabled}
      onClick={handlePrint}
      aria-label="Print backup codes"
    >
      <PrinterIcon className="h-4 w-4 mr-2" aria-hidden />
      Print
    </button>
  )
}
