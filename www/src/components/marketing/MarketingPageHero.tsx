/**
 * Design C marketing page hero (light canvas + optional grid)
 */

import type { ReactNode } from 'react'
import clsx from 'clsx'

export interface MarketingPageHeroProps {
  eyebrow?: string
  title: ReactNode
  lede?: string
  children?: ReactNode
  centered?: boolean
  className?: string
}

export function MarketingPageHero({
  eyebrow,
  title,
  lede,
  children,
  centered = true,
  className,
}: MarketingPageHeroProps) {
  return (
    <section
      className={clsx(
        'relative overflow-hidden border-b border-[var(--fs-line)] bg-canvas',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 fs-hero-backdrop fs-hero-grid opacity-80" aria-hidden />
      <div
        className={clsx(
          'section-container relative z-[1] py-16 sm:py-20 lg:py-24',
          centered && 'text-center',
        )}
      >
        {eyebrow && <div className="fs-eyebrow">{eyebrow}</div>}
        <h1 className={clsx('fs-section-title mt-3', centered && 'mx-auto')}>{title}</h1>
        {lede && (
          <p
            className={clsx(
              'mt-5 max-w-[640px] text-[17px] leading-relaxed text-[var(--fs-txt)]',
              centered && 'mx-auto',
            )}
          >
            {lede}
          </p>
        )}
        {children && <div className={clsx('mt-8', centered && 'flex flex-wrap justify-center gap-3')}>{children}</div>}
      </div>
    </section>
  )
}

/** Serif accent span for marketing headings */
export function MarketingSerifAccent({ children }: { children: ReactNode }) {
  return <span className="font-serif-accent">{children}</span>
}
