// Flux Shield - Marketing Website Landing Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'
import { QueryTraceHero } from '@/components/marketing/QueryTraceHero'

const stats = [
  { value: '99.99%', label: 'Uptime SLA' },
  { value: '<50ms', label: 'Response time' },
  { value: '1B+', label: 'Queries per day' },
  { value: '10M+', label: 'Threats blocked' },
] as const

const features = [
  {
    title: 'DNS Security',
    description:
      'Block malware, phishing and zero-day threats before they reach your network. Threat intelligence refreshes every 60 seconds.',
    art: (
      <div className="font-mono">
        <div className="fs-feature-art-line">
          <span>cdn.dropper-x7.ru</span>
          <span className="text-[var(--fs-danger)]">malware</span>
        </div>
        <div className="fs-feature-art-line">
          <span>login-micros0ft.co</span>
          <span className="text-[var(--fs-danger)]">phishing</span>
        </div>
        <div className="fs-feature-art-line">
          <span>feeds updated</span>
          <span className="text-[var(--fs-blue)]">recently</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Content Filtering',
    description: 'Granular control over 20+ categories for businesses, schools and families.',
    art: (
      <div className="font-sans">
        {[
          ['Adult', true],
          ['Gambling', true],
          ['Social', false],
          ['Dating', true],
          ['Streaming', false],
          ['Games', false],
          ['Malware', true],
          ['News', false],
          ['Shopping', false],
        ].map(([label, on]) => (
          <span key={label as string} className={on ? 'fs-tag-on' : 'fs-tag'}>
            {label}
          </span>
        ))}
        <span className="fs-tag text-[var(--fs-mut)]">+11</span>
      </div>
    ),
  },
  {
    title: 'Multi-Location',
    description:
      'Manage policies across offices, branches and networks from one dashboard, with per-location overrides.',
    art: (
      <div className="font-mono">
        <div className="fs-feature-art-line">
          <span>Head office</span>
          <span className="text-[var(--fs-success)]">● protected</span>
        </div>
        <div className="fs-feature-art-line">
          <span>Branch site</span>
          <span className="text-[var(--fs-success)]">● protected</span>
        </div>
        <div className="fs-feature-art-line">
          <span>Roaming agents</span>
          <span className="text-[var(--fs-success)]">● protected</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Real-Time Analytics',
    description: 'Query logs, live stream and exportable reports. Search millions of queries in milliseconds.',
    art: (
      <svg className="h-full w-full" viewBox="0 0 340 120" preserveAspectRatio="none">
        <defs>
          <linearGradient id="af-chart" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4B7CBB" stopOpacity={0.25} />
            <stop offset="1" stopColor="#4B7CBB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path
          d="M0 80 C40 70 60 90 100 76 S160 40 200 50 S260 30 340 22 V120 H0Z"
          fill="url(#af-chart)"
        />
        <path
          d="M0 80 C40 70 60 90 100 76 S160 40 200 50 S260 30 340 22"
          stroke="#4B7CBB"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M0 104 C60 102 120 100 180 96 S280 90 340 86"
          stroke="#FF6E62"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    ),
    artClassName: 'p-0',
  },
  {
    title: 'Custom Lists',
    description:
      'Build allowlists and blocklists. Import thousands of domains at once or subscribe to third-party feeds.',
    art: (
      <div className="font-mono">
        <div className="fs-feature-art-line">
          <span>blocklist-q4.txt</span>
          <span className="text-[var(--fs-blue)]">imported</span>
        </div>
        <div className="fs-feature-art-line">
          <span>allow · *.your-domain.com</span>
          <span className="text-[var(--fs-success)]">allow</span>
        </div>
        <div className="fs-feature-art-line">
          <span>feed · URLhaus</span>
          <span className="text-[var(--fs-blue)]">subscribed</span>
        </div>
      </div>
    ),
  },
  {
    title: 'SafeSearch',
    description: 'Enforce SafeSearch on Google, Bing and YouTube automatically. No client software required.',
    art: (
      <div className="font-mono">
        <div className="fs-feature-art-line">
          <span>www.google.com</span>
          <span className="text-[var(--fs-blue)]">forcesafesearch</span>
        </div>
        <div className="fs-feature-art-line">
          <span>www.youtube.com</span>
          <span className="text-[var(--fs-blue)]">restrict</span>
        </div>
        <div className="fs-feature-art-line">
          <span>www.bing.com</span>
          <span className="text-[var(--fs-blue)]">strict</span>
        </div>
      </div>
    ),
  },
] as const

const steps = [
  {
    n: '01',
    meta: '< 5 ms',
    title: 'Query received',
    body: 'Your device sends a DNS query to our anycast network. Edge resolvers receive it in under 5ms, wherever you are.',
  },
  {
    n: '02',
    meta: 'single lookup',
    title: 'Policy evaluated',
    body: 'The domain is checked against your rules, threat feeds and content categories in one cached lookup.',
  },
  {
    n: '03',
    meta: 'logged',
    title: 'Response returned',
    body: 'Allowed queries resolve instantly. Blocked domains return your custom block page, and every decision is logged.',
  },
] as const

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--fs-line)] fs-hero-backdrop fs-hero-grid">
        <div className="section-container relative z-[2] pb-0 pt-0 text-center">
          <div className="pt-[92px]">
            <div className="inline-flex h-[30px] items-center gap-2.5 rounded-full bg-white/70 px-3 pl-1.5 text-[13px] text-[var(--fs-txt)] shadow-[0_0_0_1px_var(--fs-line)] backdrop-blur-md">
              <span className="inline-flex h-[21px] items-center rounded-full bg-[var(--fs-danger-soft)] px-2 text-xs font-medium text-[#D9483C]">
                Soon
              </span>
              DMARC monitoring joins the DNS Filter module →
            </div>

            <h1 className="fs-hero-title text-balance">
              DNS security,{' '}
              <span className="fs-hero-title-accent">quietly</span> handled for every network you run.
            </h1>

            <p className="mx-auto mt-[26px] max-w-[640px] text-[19px] leading-[1.55] text-[var(--fs-txt)]">
              Flux Shield stops malware, phishing and unwanted content at the DNS layer, before a single packet
              reaches your network. Built for MSPs, businesses and families.
            </p>

            <div className="mt-[34px] flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup" className="fs-btn fs-btn-primary fs-btn-lg no-underline">
                Start free trial <span className="opacity-70">→</span>
              </Link>
              <Link href="/contact" className="fs-btn fs-btn-lg no-underline">
                Book a demo
              </Link>
            </div>

            <p className="mt-4 text-[13px] text-[var(--fs-mut)]">
              No credit card required · 14-day free trial · Setup in 5 minutes
            </p>
          </div>

          <QueryTraceHero />
        </div>
      </section>

      <div className="section-container">
        <div className="grid grid-cols-2 border-b border-[var(--fs-line)] md:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`py-[34px] ${i > 0 ? 'border-l border-[var(--fs-line)] pl-10 max-md:border-l-0 max-md:pl-0 max-md:pt-8' : ''}`}
            >
              <b className="block text-[clamp(1.75rem,3vw,2.5rem)] font-medium tracking-[-0.04em]">{stat.value}</b>
              <span className="text-sm text-[var(--fs-mut)]">{stat.label}</span>
            </div>
          ))}
        </div>

        <section className="py-[120px]">
          <div className="fs-eyebrow">Platform</div>
          <h2 className="fs-section-title text-balance">
            Everything you need, <span className="font-serif-accent">nothing you don&apos;t.</span>
          </h2>
          <p className="mt-[18px] max-w-[560px] text-[17px] leading-relaxed text-[var(--fs-txt)]">
            Comprehensive DNS security and content filtering for every kind of network, from a single office to
            hundreds of MSP clients.
          </p>

          <div className="mt-[60px] grid grid-cols-1 border-l border-t border-[var(--fs-line)] sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="relative border-b border-r border-[var(--fs-line)] bg-white p-[30px] pb-[34px]"
              >
                <div
                  className={`mb-[26px] h-[120px] overflow-hidden rounded-xl bg-gradient-to-b from-[#F6F8FC] to-[#FDFDFE] p-4 shadow-[inset_0_0_0_1px_var(--fs-line)] ${'artClassName' in feature && feature.artClassName ? feature.artClassName : ''}`}
                >
                  {feature.art}
                </div>
                <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{feature.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--fs-txt)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-[120px]">
          <div className="fs-eyebrow">How it works</div>
          <h2 className="fs-section-title">
            Protection in <span className="font-serif-accent">milliseconds.</span>
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-3 md:gap-8">
            {steps.map((step) => (
              <div key={step.n} className="border-t border-ink pt-[22px]">
                <div className="flex justify-between font-mono text-xs text-[var(--fs-mut)]">
                  <span>{step.n}</span>
                  <span>{step.meta}</span>
                </div>
                <h4 className="mb-2 mt-[18px] text-xl font-semibold tracking-[-0.025em] text-ink">{step.title}</h4>
                <p className="text-[15px] leading-relaxed text-[var(--fs-txt)]">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="fs-cta-band mb-[120px] flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative">
            <h2 className="fs-cta-band-title">
              Ready to secure <span className="font-serif-accent">your network?</span>
            </h2>
            <p className="relative mt-4 max-w-[520px] text-[17px] leading-relaxed text-[#AEB9D3]">
              Deploy in minutes, not days. Change two resolver addresses and every device is protected.
            </p>
          </div>
          <div className="relative flex flex-col items-start gap-3.5 lg:items-end">
            <div className="flex flex-wrap gap-2.5">
              <Link href="/signup" className="fs-btn fs-btn-lg bg-white text-ink no-underline shadow-none">
                Start free trial →
              </Link>
              <Link href="/pricing" className="fs-btn-ghost-on-dark fs-btn-lg no-underline">
                View pricing
              </Link>
            </div>
            <span className="text-[13px] text-[#8590AB]">
              No credit card required · 14-day free trial · Cancel anytime
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
