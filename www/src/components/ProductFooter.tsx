import Link from 'next/link'
import { currentCopyrightYear, FLUX_LABS_NAME, FLUX_LABS_URL } from '@/lib/branding'

/** Inline attribution for pages without the global marketing footer (e.g. signup). */
export function ProductFooterInline({ className = '' }: { className?: string }) {
  const year = currentCopyrightYear()

  return (
    <footer
      className={`text-center pt-8 ${className}`.trim()}
      aria-label="Site footer"
    >
      <p className="text-xs text-mut">
        © {year} · Powered by{' '}
        <Link
          href={FLUX_LABS_URL}
          className="font-medium text-accent-500 hover:text-[var(--fx-coral)] transition-colors underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {FLUX_LABS_NAME}
        </Link>
      </p>
    </footer>
  )
}
