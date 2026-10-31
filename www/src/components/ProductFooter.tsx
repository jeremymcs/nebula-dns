import Link from 'next/link'
import {
  COPYRIGHT_HOLDER,
  currentCopyrightYear,
  FLUX_LABS_NAME,
  FLUX_LABS_URL,
} from '@/lib/branding'

/** Inline attribution for pages without the global marketing footer (e.g. signup). */
export function ProductFooterInline({ className = '' }: { className?: string }) {
  const year = currentCopyrightYear()

  return (
    <footer
      className={`text-center space-y-1 pt-8 ${className}`.trim()}
      aria-label="Site footer"
    >
      <p className="text-xs text-space-500">© {year} {COPYRIGHT_HOLDER}</p>
      <p className="text-xs text-space-500">
        Powered by{' '}
        <Link
          href={FLUX_LABS_URL}
          className="text-space-400 hover:text-white transition-colors underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {FLUX_LABS_NAME}
        </Link>
      </p>
    </footer>
  )
}
