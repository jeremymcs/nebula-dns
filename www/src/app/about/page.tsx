// Flux Shield - About Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import type { Metadata } from 'next'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { MarketingPageHero, MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'
import { FLUX_LABS_URL } from '@/lib/branding'

export const metadata: Metadata = {
  title: 'About Flux Labs',
  description:
    'Flux Shield is built and run by Flux Labs, a managed service provider in Panama City, Florida.',
}

const beliefs = [
  {
    title: 'Stop it before it loads',
    body: 'The cheapest incident is the one that never starts. Blocking a bad website at the first lookup beats cleaning up after it.',
  },
  {
    title: 'Show the work',
    body: 'You should be able to see what we blocked and why. Every decision Flux Shield makes is logged, and you can look at it any time.',
  },
  {
    title: 'People, not just software',
    body: 'A tool on its own is one more thing to manage. Flux Shield comes with the team that set it up and answers when you call.',
  },
] as const

export default function AboutPage() {
  return (
    <MarketingPageShell>
      <MarketingPageHero
        eyebrow="About Flux Labs"
        title={
          <>
            Local IT people <MarketingSerifAccent>who built their own shield.</MarketingSerifAccent>
          </>
        }
        lede="Flux Labs is a managed service provider in Panama City, Florida. We look after the computers, networks and security of businesses along the Gulf Coast. Flux Shield is the DNS security platform we built to do that job well."
      >
        <a
          href={FLUX_LABS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fs-btn fs-btn-lg no-underline"
        >
          Visit fluxlabs.net →
        </a>
      </MarketingPageHero>

      <div className="section-container">
        <section className="grid gap-12 py-[96px] lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <div>
            <div className="fs-eyebrow">Why we built it</div>
            <h2 className="fs-section-title mt-3 text-balance">
              We wanted to <MarketingSerifAccent>see everything.</MarketingSerifAccent>
            </h2>
          </div>
          <div className="space-y-5 text-[16.5px] leading-relaxed text-txt">
            <p>
              When a client calls and says a website won&apos;t load, or that an email looked strange, we need answers
              in seconds: which device, which office, what it tried to reach, and what stopped it.
            </p>
            <p>
              So we built Flux Shield around that moment. Every lookup from every office, laptop and guest network
              lands in one place, with the reason behind each decision. Threat alerts come to our team. Reports go to
              our clients in plain English.
            </p>
            <p>
              It runs on infrastructure we operate, and it&apos;s designed, built and supported by the Flux Labs team.
            </p>
          </div>
        </section>

        <section className="border-t border-line py-[96px]">
          <div className="fs-eyebrow">What we believe</div>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {beliefs.map((item) => (
              <div key={item.title} className="border-t border-ink pt-[22px]">
                <h3 className="text-xl font-semibold tracking-[-0.025em] text-ink">{item.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-txt">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <MarketingCtaBand
          className="mb-[120px]"
          title={
            <>
              Come talk <span className="font-serif-accent">to us.</span>
            </>
          }
        />
      </div>
    </MarketingPageShell>
  )
}
