import clsx from 'clsx'

interface ShieldMarkProps {
  className?: string
  /** Kept for older call sites; the mark now fills `className`'s box. */
  iconClassName?: string
}

/**
 * Flux Shield mark — faceted navy/blue shield with a protected core and the
 * coral Flux dot. Same artwork as /favicon.svg.
 */
export function ShieldMark({ className }: ShieldMarkProps) {
  return (
    <span className={clsx('relative inline-flex shrink-0 text-white dark:text-space-950', className)}>
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
        <path d="M32 4L54 12V30C54 44 44.5 54.5 32 60C19.5 54.5 10 44 10 30V12Z" fill="#1E3B78" />
        <path d="M32 4L54 12V30C54 44 44.5 54.5 32 60Z" fill="#4B7CBB" />
        <path d="M32 18L42 22V31C42 38 37.5 43 32 45.5C26.5 43 22 38 22 31V22Z" fill="#FFFFFF" />
        <circle cx="50" cy="12" r="6.5" fill="#FF6E62" stroke="currentColor" strokeWidth="3" />
      </svg>
    </span>
  )
}
