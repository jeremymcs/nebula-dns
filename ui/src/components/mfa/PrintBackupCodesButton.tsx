'use client'

import { PrinterIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import { printMfaBackupCodes } from '../../../../shared/print-mfa-backup-codes'
import type { ButtonProps } from '@/components/ui/Button'

type PrintBackupCodesButtonProps = {
  codes: readonly string[]
  accountLabel: string
  generatedAt?: Date
  onError?: (message: string) => void
  onPrinted?: () => void
} & Pick<ButtonProps, 'variant' | 'size' | 'className'>

export function PrintBackupCodesButton({
  codes,
  accountLabel,
  generatedAt,
  onError,
  onPrinted,
  variant = 'secondary',
  size,
  className,
}: PrintBackupCodesButtonProps) {
  const disabled = codes.length === 0

  const handlePrint = () => {
    try {
      printMfaBackupCodes({ codes, accountLabel, generatedAt })
      onPrinted?.()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to open print dialog'
      onError?.(message)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onClick={handlePrint}
      aria-label="Print backup codes"
    >
      <PrinterIcon className="h-4 w-4 mr-2" aria-hidden />
      Print
    </Button>
  )
}
