import Link from 'next/link'
import {
  COPYRIGHT_HOLDER,
  currentCopyrightYear,
  FLUX_LABS_NAME,
  FLUX_LABS_URL,
  PRODUCT_NAME,
} from '@/lib/branding'

type ProductFooterProps = {
  className?: string
  variant?: 'dashboard' | 'auth'
}

export function ProductFooter({ className = '', variant = 'dashboard' }: ProductFooterProps) {
  const year = currentCopyrightYear()

  const base =
    variant === 'auth'
      ? 'mt-10 pt-6 border-t border-space-200 dark:border-space-700 text-center space-y-1.5'
      : 'py-6 text-center space-y-1 border-t border-space-200 dark:border-space-800'

  return (
    <footer className={`${base} ${className}`.trim()} aria-label="Site footer">
      <p className="text-xs text-space-500 dark:text-space-400">
        © {year} {COPYRIGHT_HOLDER} · {PRODUCT_NAME}
      </p>
      <p className="text-xs text-space-400 dark:text-space-500">
        Powered by{' '}
        <Link
          href={FLUX_LABS_URL}
          className="font-medium text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {FLUX_LABS_NAME}
        </Link>
      </p>
    </footer>
  )
}
