// Flux Shield Marketing Website - Pricing Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { MarketingPageHero } from '@/components/marketing/MarketingPageHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Flux Shield is a managed service from Flux Labs. Setup, monitoring and monthly reports are included in every option.',
}

const options = [
  {
    eyebrow: 'Flux Labs clients',
    title: 'Included',
    sub: null,
    body: 'Already on a Flux Labs managed IT plan? Flux Shield is part of it. Ask your technician to turn it on.',
    href: '/contact',
    cta: 'Ask your tech',
    featured: false,
  },
  {
    eyebrow: 'Flux Shield, managed',
    title: 'Per user',
    sub: 'Quoted after a short call',
    body: 'For businesses that want DNS security run for them, without changing IT providers.',
    href: '/contact',
    cta: 'Talk to Flux Labs',
    featured: true,
  },
  {
    eyebrow: 'Other MSPs',
    title: 'Partner',
    sub: null,
    body: 'Run Flux Shield for your own clients, with a workspace per client and your own branding.',
    href: '/msp',
    cta: 'See the MSP page',
    featured: false,
  },
] as const

const included = [
  { title: 'Setup by a Flux Labs tech', body: 'Your firewall, the laptop agent and a first policy built around your business.' },
  { title: 'Threat and malware blocking', body: 'Phishing, malware and scam domains, from threat feeds that refresh continuously.' },
  { title: 'Alerts watched by our team', body: 'Threat alerts come to us. We follow up so you don’t have to.' },
  { title: 'Content filtering', body: 'Categories, SafeSearch and schedules, set per office or network.' },
  { title: 'Query logs and live stream', body: 'Every lookup, with the reason behind each decision.' },
  { title: 'A monthly report', body: 'In plain English: what was blocked, what came closest, and what we changed.' },
] as const

const faqs = [
  {
    q: 'Do I need new hardware?',
    a: 'No. We point the firewall or router you already have at Flux Shield, and a small agent covers laptops that leave the office.',
  },
  {
    q: 'Can I see what’s being blocked?',
    a: 'Yes. You can sign in to your dashboard any time to see query logs, reports and your security score.',
  },
  {
    q: 'What if something I need gets blocked?',
    a: 'Call or email us. We can see the exact lookup and the rule that caught it, and fix it while you’re on the phone.',
  },
  {
    q: 'Do you work with other MSPs?',
    a: 'Yes. MSPs can run Flux Shield for their own clients, each in its own workspace.',
  },
] as const

export default function PricingPage() {
  return (
    <MarketingPageShell>
      <MarketingPageHero
        eyebrow="Predictable monthly pricing"
        title="One price. We do the work."
        lede="Flux Shield is a managed service, not a plan you set up yourself. Setup, monitoring and monthly reports are part of every option."
      />

      <section className="py-20">
        <div className="section-container grid gap-5 lg:grid-cols-3">
          {options.map((o) => (
            <div
              key={o.eyebrow}
              className={
                o.featured
                  ? 'fx-band flex flex-col gap-4 rounded-2xl p-8'
                  : 'fs-card flex flex-col gap-4 bg-panel p-8'
              }
            >
              <div className={o.featured ? 'fx-tagline text-[13px] uppercase tracking-[1.5px]' : 'fs-eyebrow'}>
                {o.eyebrow}
              </div>
              <div>
                <div className={`text-4xl font-semibold tracking-[-1px] ${o.featured ? 'text-white' : 'text-ink'}`}>
                  {o.title}
                </div>
                {o.sub && <div className="mt-1 text-sm text-[#A7B2C7]">{o.sub}</div>}
              </div>
              <p className={`text-[15px] leading-relaxed ${o.featured ? 'text-[var(--fx-navy-text)]' : 'text-txt'}`}>
                {o.body}
              </p>
              <Link
                href={o.href}
                className={`fs-btn fs-btn-lg mt-auto w-full no-underline ${o.featured ? 'fs-btn-primary' : ''}`}
              >
                {o.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="fx-gray py-20">
        <div className="section-container">
          <div className="fs-eyebrow">In every option</div>
          <h2 className="fs-section-title mt-3 text-ink">What you get</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {included.map((item) => (
              <div key={item.title} className="fs-card bg-panel p-6">
                <h3 className="text-[16px] font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-txt">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="section-container grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <div className="fs-eyebrow">Questions</div>
            <h2 className="fs-section-title mt-3 text-ink">Before you call</h2>
            <Link href="/contact" className="fs-btn fs-btn-primary fs-btn-lg mt-7 no-underline">
              Book a discovery call
            </Link>
          </div>
          <ol>
            {faqs.map((f, i) => (
              <li key={f.q} className="flex gap-5 border-b border-line py-5 last:border-0">
                <span className="fx-num text-sm">0{i + 1}</span>
                <div>
                  <h3 className="text-[16px] font-semibold text-ink">{f.q}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-txt">{f.a}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="section-container pb-24">
        <MarketingCtaBand title="Let’s look at your network." />
      </div>
    </MarketingPageShell>
  )
}
