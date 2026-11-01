/**
 * Shared layout for legal / policy documents (Design C)
 */

import type { ReactNode } from 'react'
import { MarketingPageShell } from './MarketingPageShell'
import { MarketingPageHero, MarketingSerifAccent } from './MarketingPageHero'
import { MarketingCtaBand } from './MarketingCtaBand'

export interface LegalDocumentLayoutProps {
  eyebrow: string
  title: ReactNode
  lede?: string
  updatedLabel?: string
  children: ReactNode
}

export function LegalDocumentLayout({
  eyebrow,
  title,
  lede,
  updatedLabel,
  children,
}: LegalDocumentLayoutProps) {
  return (
    <MarketingPageShell>
      <MarketingPageHero eyebrow={eyebrow} title={title} lede={lede} centered />
      <div className="section-container py-12 sm:py-16 lg:py-20">
        {updatedLabel && (
          <p className="mb-8 text-sm text-[var(--fs-mut)]">{updatedLabel}</p>
        )}
        <div className="prose-nebula mx-auto max-w-3xl space-y-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink [&_li]:text-[var(--fs-txt)] [&_p]:text-[15px] [&_p]:leading-relaxed [&_strong]:text-ink">
          {children}
        </div>
        <MarketingCtaBand
          className="mt-16"
          title={
            <>
              Questions about <MarketingSerifAccent>compliance?</MarketingSerifAccent>
            </>
          }
          description="Our team can walk through data handling, subprocessors, and your deployment model."
          primaryHref="/contact"
          primaryLabel="Contact us"
          secondaryHref="/security"
          secondaryLabel="Security overview"
          finePrint="We typically respond within one business day."
        />
      </div>
    </MarketingPageShell>
  )
}
