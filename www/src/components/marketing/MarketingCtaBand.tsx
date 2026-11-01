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
  description = 'Deploy in minutes, not days. Change two resolver addresses and every device is protected.',
  primaryHref = '/signup',
  primaryLabel = 'Start free trial',
  secondaryHref = '/pricing',
  secondaryLabel = 'View pricing',
  finePrint = 'No credit card required · 14-day free trial · Cancel anytime',
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
          <p className="relative mt-4 max-w-[520px] text-[17px] leading-relaxed text-[#AEB9D3]">
            {description}
          </p>
        )}
      </div>
      <div className="relative z-[1] flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Link href={primaryHref} className="fs-cta-band-action-primary w-full sm:w-auto">
            {primaryLabel} <span className="opacity-80">→</span>
          </Link>
          <Link href={secondaryHref} className="fs-cta-band-action-secondary w-full sm:w-auto">
            {secondaryLabel}
          </Link>
        </div>
        {finePrint && <span className="text-[13px] text-[#8590AB]">{finePrint}</span>}
      </div>
    </div>
  )
}
