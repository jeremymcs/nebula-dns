/**
 * Marketing page hero — navy band in the fluxlabs.net style:
 * amber tagline, white heading, light body text, left aligned.
 */

import type { ReactNode } from 'react'
import clsx from 'clsx'

export interface MarketingPageHeroProps {
  eyebrow?: string
  title: ReactNode
  lede?: string
  children?: ReactNode
  /** Kept for older call sites; heroes are left aligned now. */
  centered?: boolean
  className?: string
}

export function MarketingPageHero({ eyebrow, title, lede, children, className }: MarketingPageHeroProps) {
  return (
    <section className={clsx('fx-band relative overflow-hidden', className)}>
      <div className="section-container relative z-[1] py-16 sm:py-20">
        <div className="max-w-[780px]">
          {eyebrow && <div className="fx-tagline text-[17px] sm:text-[19px]">{eyebrow}</div>}
          <h1 className="mt-3 text-balance text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.08] tracking-[-1.4px] text-white">
            {title}
          </h1>
          {lede && <p className="mt-5 max-w-[640px] text-[17px] leading-relaxed text-[var(--fx-navy-text)] sm:text-lg">{lede}</p>}
          {children && <div className="fx-hero-actions mt-8 flex flex-wrap gap-3">{children}</div>}
        </div>
      </div>
    </section>
  )
}

/** Heading accent span (kept for older call sites; renders in the heading font). */
export function MarketingSerifAccent({ children }: { children: ReactNode }) {
  return <span className="font-serif-accent">{children}</span>
}
