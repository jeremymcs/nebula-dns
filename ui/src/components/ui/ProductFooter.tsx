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
      : 'flex flex-col items-center gap-1 py-4 px-4 border-t border-space-200/80 dark:border-space-800/80'

  return (
    <footer className={`${base} ${className}`.trim()} aria-label="Site footer">
      <p className="text-xs text-space-500 dark:text-space-400">
        © {year} {COPYRIGHT_HOLDER}
        {variant === 'dashboard' && (
          <>
            {' '}
            · {PRODUCT_NAME}
          </>
        )}
      </p>
      <p className="text-xs text-space-400 dark:text-space-500">
        Powered by{' '}
        <Link
          href={FLUX_LABS_URL}
          className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {FLUX_LABS_NAME}
        </Link>
      </p>
    </footer>
  )
}
