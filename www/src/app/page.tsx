// Flux Shield - Marketing Website Landing Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'
import { QueryTraceHero } from '@/components/marketing/QueryTraceHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'

const features = [
  {
    title: 'Threat protection',
    description:
      'Malware and phishing feeds refresh continuously, and behavior checks catch generated (DGA) domains and DNS tunneling that no list has seen yet.',
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
          <span>xq7v2kd9pl.top</span>
          <span className="text-[var(--fs-danger)]">dga</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Content categories',
    description:
      'Turn categories on or off per policy, enforce SafeSearch on Google, Bing, YouTube and DuckDuckGo, and set schedules for school or work hours.',
    art: (
      <div className="font-sans">
        {[
          ['Adult', true],
          ['Gambling', true],
          ['Social', false],
          ['Dating', true],
          ['Streaming', false],
          ['Gaming', false],
          ['VPN & proxy', true],
          ['Drugs', true],
          ['Shopping', false],
        ].map(([label, on]) => (
          <span key={label as string} className={on ? 'fs-tag-on' : 'fs-tag'}>
            {label}
          </span>
        ))}
      </div>
    ),
  },
  {
    title: 'Query logs and live stream',
    description:
      'Search every DNS query by device, location, domain or decision, or watch them arrive live. See why each one was allowed or blocked.',
    art: (
      <div className="font-mono">
        <div className="fs-feature-art-line">
          <span>10:42:07 · office.com</span>
          <span className="text-[var(--fs-success)]">allowed</span>
        </div>
        <div className="fs-feature-art-line">
          <span>10:42:08 · bet-now.io</span>
          <span className="text-[var(--fs-danger)]">gambling</span>
        </div>
        <div className="fs-feature-art-line">
          <span>10:42:08 · github.com</span>
          <span className="text-[var(--fs-success)]">allowed</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Roaming agent',
    description:
      'The Windows agent keeps laptops filtered off the office network. Deploy it from your RMM with one token, and split DNS keeps Active Directory working.',
    art: (
      <div className="font-mono">
        <div className="fs-feature-art-line">
          <span>Head office</span>
          <span className="text-[var(--fs-success)]">● protected</span>
        </div>
        <div className="fs-feature-art-line">
          <span>LAPTOP-0417 · hotel wifi</span>
          <span className="text-[var(--fs-success)]">● protected</span>
        </div>
        <div className="fs-feature-art-line">
          <span>corp.local</span>
          <span className="text-[var(--fs-blue)]">split dns</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Branded block pages',
    description:
      'Show people why a site was blocked, in your words and your brand. Install the Shield certificate and HTTPS sites get a clean block page too.',
    art: (
      <div className="font-mono">
        <div className="fs-feature-art-line">
          <span>https://bet-now.io</span>
          <span className="text-[var(--fs-danger)]">blocked</span>
        </div>
        <div className="fs-feature-art-line">
          <span>page · Acme IT template</span>
          <span className="text-[var(--fs-blue)]">branded</span>
        </div>
        <div className="fs-feature-art-line">
          <span>cert · Shield CA</span>
          <span className="text-[var(--fs-success)]">trusted</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Reports and security score',
    description:
      'Clear reports on threats, top domains and usage, emailed on a schedule as PDF or CSV. A security score shows where each network can improve.',
    art: (
      <svg className="h-full w-full" viewBox="0 0 340 120" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="af-chart" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4B7CBB" stopOpacity={0.25} />
            <stop offset="1" stopColor="#4B7CBB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d="M0 80 C40 70 60 90 100 76 S160 40 200 50 S260 30 340 22 V120 H0Z" fill="url(#af-chart)" />
        <path d="M0 80 C40 70 60 90 100 76 S160 40 200 50 S260 30 340 22" stroke="#4B7CBB" strokeWidth="1.5" fill="none" />
        <path d="M0 104 C60 102 120 100 180 96 S280 90 340 86" stroke="#FF6E62" strokeWidth="1.5" fill="none" />
      </svg>
    ),
    artClassName: 'p-0',
  },
] as const

const problems = [
  {
    pain: 'A console per client',
    answer: 'One login, every client. Each one is a separate workspace with its own policies, users and logs, and you switch between them in a click.',
  },
  {
    pain: 'Every client set up by hand',
    answer: 'Build your baseline policy once as a template and apply it to each new client. Adjust one client without touching the rest.',
  },
  {
    pain: 'Work the client never sees',
    answer: 'Scheduled, white-labeled reports and a security score show each client what was blocked and why it mattered.',
  },
] as const

const lifecycle = [
  {
    n: '01',
    meta: 'minutes',
    title: 'Add the client',
    body: 'Create the workspace, invite their contacts as owner, admin, analyst or read-only.',
  },
  {
    n: '02',
    meta: 'one click',
    title: 'Apply your template',
    body: 'Threat protection, categories, SafeSearch and allow lists are in place before the first query.',
  },
  {
    n: '03',
    meta: 'your RMM',
    title: 'Deploy',
    body: 'Point the firewall at Flux Shield, use the per-site DoH or DoT address, or push the Windows agent with one install token.',
  },
  {
    n: '04',
    meta: 'monthly',
    title: 'Show the value',
    body: 'A branded PDF report lands in the client inbox each month, ready for your next business review.',
  },
] as const

const billing = [
  { value: 'Shared', label: 'Query bundles across all clients' },
  { value: 'Per client', label: 'Usage breakdown to bill back' },
  { value: 'Live', label: "Today's usage, as it happens" },
] as const

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line fs-hero-backdrop fs-hero-grid">
        <div className="section-container relative z-[2] pb-0 pt-0 text-center">
          <div className="pt-[92px]">
            <div className="inline-flex h-[30px] items-center gap-2.5 rounded-full bg-panel/70 px-3 pl-1.5 text-[13px] text-txt shadow-[0_0_0_1px_var(--fs-line)] backdrop-blur-md">
              <span className="inline-flex h-[21px] items-center rounded-full bg-[var(--fs-danger-soft)] px-2 text-xs font-medium text-[#D9483C]">
                MSP
              </span>
              Built by Flux Labs, a managed service provider
            </div>

            <h1 className="fs-hero-title text-balance">
              DNS security built for <span className="fs-hero-title-accent">MSPs,</span> not bolted on.
            </h1>

            <p className="mx-auto mt-[26px] max-w-[640px] text-[19px] leading-[1.55] text-txt">
              Protect every client from one console. Roll out your standard policy in minutes, deploy from your RMM, and
              send each client a branded report that shows the work you&apos;re doing.
            </p>

            <div className="mt-[34px] flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup" className="fs-btn fs-btn-primary fs-btn-lg no-underline">
                Start free trial <span className="opacity-70">→</span>
              </Link>
              <Link href="/contact" className="fs-btn fs-btn-lg no-underline">
                Book a demo
              </Link>
            </div>

            <p className="mt-4 text-[13px] text-mut">14-day free trial · No credit card required · Add clients as you go</p>
          </div>

          <QueryTraceHero />
        </div>
      </section>

      <div className="section-container">
        <section className="py-[120px]">
          <div className="fs-eyebrow">Why MSPs switch</div>
          <h2 className="fs-section-title text-balance">
            Less clicking, <span className="font-serif-accent">more clients.</span>
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {problems.map((item) => (
              <div key={item.pain} className="fs-card rounded-[14px] p-7">
                <div className="font-mono text-xs uppercase tracking-[0.08em] text-mut line-through decoration-[var(--fs-coral)]">
                  {item.pain}
                </div>
                <p className="mt-4 text-[15.5px] leading-relaxed text-ink">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-[120px]">
          <div className="fs-eyebrow">Client lifecycle</div>
          <h2 className="fs-section-title text-balance">
            From signed to protected <span className="font-serif-accent">the same day.</span>
          </h2>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {lifecycle.map((step) => (
              <div key={step.n} className="border-t border-ink pt-[22px]">
                <div className="flex justify-between font-mono text-xs text-mut">
                  <span>{step.n}</span>
                  <span>{step.meta}</span>
                </div>
                <h3 className="mb-2 mt-[18px] text-xl font-semibold tracking-[-0.025em] text-ink">{step.title}</h3>
                <p className="text-[15px] leading-relaxed text-txt">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-[120px]">
          <div className="fs-eyebrow">What every client gets</div>
          <h2 className="fs-section-title text-balance">
            Protection you can <span className="font-serif-accent">see working.</span>
          </h2>

          <div className="mt-[60px] grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="relative border-b border-r border-line bg-panel p-[30px] pb-[34px]">
                <div
                  className={`mb-[26px] h-[120px] overflow-hidden rounded-xl bg-surface p-4 shadow-[inset_0_0_0_1px_var(--fs-line)] ${'artClassName' in feature && feature.artClassName ? feature.artClassName : ''}`}
                >
                  {feature.art}
                </div>
                <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{feature.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-txt">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link href="/features" className="text-sm font-medium text-brand no-underline hover:underline">
              See every feature →
            </Link>
          </div>
        </section>

        <section className="pb-[120px]">
          <div className="fs-card grid gap-10 rounded-[14px] p-8 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <div className="fs-eyebrow">Billing</div>
              <h2 className="mt-3 text-[clamp(1.6rem,3vw,2.25rem)] font-semibold tracking-[-0.03em] text-ink">
                Usage you can <span className="font-serif-accent">bill back.</span>
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-txt">
                Buy query bundles once and share them across every client. Flux Shield breaks usage down by client, so
                your invoices match what each one actually used.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {billing.map((item) => (
                <div key={item.value} className="border-t border-line pt-4">
                  <b className="block text-lg font-semibold tracking-[-0.02em] text-ink">{item.value}</b>
                  <span className="text-[13px] leading-snug text-mut">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-[120px]">
          <div className="fs-eyebrow">Fits your stack</div>
          <h2 className="fs-section-title text-balance">
            Plugs into the tools <span className="font-serif-accent">you already run.</span>
          </h2>
          <div className="mt-10 flex flex-wrap gap-2.5">
            {[
              'Your RMM',
              'Splunk',
              'Elastic',
              'Microsoft Sentinel',
              'Syslog',
              'Slack',
              'PagerDuty',
              'Webhooks',
              'REST API',
              'SAML and OIDC SSO',
            ].map((name) => (
              <span key={name} className="rounded-full border border-line bg-panel px-4 py-2 text-sm text-ink">
                {name}
              </span>
            ))}
          </div>
          <p className="mt-10 text-sm text-txt">
            Not an MSP?{' '}
            <Link href="/enterprise" className="font-medium text-brand no-underline hover:underline">
              Flux Shield for your own organization
            </Link>{' '}
            ·{' '}
            <Link href="/pricing" className="font-medium text-brand no-underline hover:underline">
              Plans for home and family
            </Link>
          </p>
        </section>

        <MarketingCtaBand
          className="mb-[120px]"
          title={
            <>
              Bring every client <span className="font-serif-accent">under one roof.</span>
            </>
          }
          description="Start with your own office, then add clients as you go."
          secondaryHref="/contact"
          secondaryLabel="Book a demo"
        />
      </div>
    </>
  )
}
