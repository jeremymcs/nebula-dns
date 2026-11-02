/**
 * Design C bottom CTA band for marketing pages
 */

import type { ReactNode } from 'react'
import Link from 'next/link'

export interface MarketingCtaBandProps {
  title: ReactNode
  description?: string
  primaryHref?: string
  primaryLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
  finePrint?: string
  className?: string
}

export function MarketingCtaBand({
  title,
  description = 'Tell us about your offices and how your team works. We will show you what Flux Shield would have caught last week.',
  primaryHref = '/contact',
  primaryLabel = 'Talk to Flux Labs',
  secondaryHref = '/features',
  secondaryLabel = 'What’s included',
  finePrint = 'Flux Labs · Managed IT from Panama City, Florida',
  className = '',
}: MarketingCtaBandProps) {
  return (
    <div
      className={`fs-cta-band flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between ${className}`.trim()}
      data-flux-cta-band
    >
      <div className="relative z-[1] min-w-0">
        <h2 className="fs-cta-band-title">{title}</h2>
        {description && (
          <p className="relative mt-4 max-w-[520px] text-[17px] leading-relaxed text-[var(--fx-navy-text)]">
            {description}
          </p>
        )}
      </div>
      <div className="relative z-[1] flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Link href={primaryHref} className="fs-cta-band-action-primary w-full sm:w-auto">
            {primaryLabel}
          </Link>
          <Link href={secondaryHref} className="fs-cta-band-action-secondary w-full sm:w-auto">
            {secondaryLabel}
          </Link>
        </div>
        {finePrint && <span className="text-[13px] text-[#A7B2C7]">{finePrint}</span>}
      </div>
    </div>
  )
}
