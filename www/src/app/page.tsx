// Flux Shield - Marketing Website Landing Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'
import { QueryTraceHero } from '@/components/marketing/QueryTraceHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'

const facts = [
  { value: 'Every query', label: 'Logged, searchable and live' },
  { value: '3 ways', label: 'Network, DoH/DoT or agent' },
  { value: '4 SIEMs', label: 'Splunk, Elastic, Sentinel, syslog' },
  { value: 'Multi-tenant', label: 'Built for MSPs from day one' },
] as const

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

const deployOptions = [
  {
    label: 'Network',
    title: 'Point your firewall at us',
    body: 'Set Flux Shield as the DNS server on the router or firewall at each location. Every device on that network is covered, with nothing to install.',
  },
  {
    label: 'Encrypted DNS',
    title: 'DNS over HTTPS or TLS',
    body: 'Each location gets its own DoH and DoT address, so routers and devices that support encrypted DNS stay private and still get the right policy.',
  },
  {
    label: 'Agent',
    title: 'Windows roaming agent',
    body: 'For laptops that leave the building. Install from your RMM with a token, recover DNS with one command if you ever need to.',
  },
] as const

const audiences = [
  {
    title: 'MSPs',
    body: 'A workspace per client, policy templates, cross-client reporting and white label. Built by an MSP.',
    href: '/msp',
    cta: 'Flux Shield for MSPs',
  },
  {
    title: 'Businesses',
    body: 'Protect every office and remote laptop with SSO, role-based access, audit logs and SIEM streaming.',
    href: '/features',
    cta: 'See all features',
  },
  {
    title: 'Families',
    body: 'Family mode with per-device rules, bedtime and homework schedules, and SafeSearch everywhere.',
    href: '/pricing',
    cta: 'See plans',
  },
] as const

const integrations = [
  'Splunk',
  'Elastic',
  'Microsoft Sentinel',
  'Syslog',
  'Slack',
  'PagerDuty',
  'Webhooks',
  'REST API',
  'SAML and OIDC SSO',
] as const

const steps = [
  {
    n: '01',
    meta: 'identified',
    title: 'Query arrives',
    body: 'From a network, an encrypted connection or the agent. Flux Shield knows which client, location and policy it belongs to.',
  },
  {
    n: '02',
    meta: 'single lookup',
    title: 'Policy checked',
    body: 'Your allow and block lists, categories and threat feeds are evaluated together in one cached lookup.',
  },
  {
    n: '03',
    meta: 'logged',
    title: 'Answered and logged',
    body: 'Allowed domains resolve normally. Blocked ones get your block page. Every decision shows up in Query Logs and the Live Stream.',
  },
] as const

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line fs-hero-backdrop fs-hero-grid">
        <div className="section-container relative z-[2] pb-0 pt-0 text-center">
          <div className="pt-[92px]">
            <Link
              href="/msp"
              className="inline-flex h-[30px] items-center gap-2.5 rounded-full bg-panel/70 px-3 pl-1.5 text-[13px] text-txt no-underline shadow-[0_0_0_1px_var(--fs-line)] backdrop-blur-md transition-colors hover:text-ink"
            >
              <span className="inline-flex h-[21px] items-center rounded-full bg-[var(--fs-danger-soft)] px-2 text-xs font-medium text-[#D9483C]">
                New
              </span>
              Query Logs, Live Stream and DNS Management are here →
            </Link>

            <h1 className="fs-hero-title text-balance">
              DNS security for <span className="fs-hero-title-accent">every network</span> you manage.
            </h1>

            <p className="mx-auto mt-[26px] max-w-[640px] text-[19px] leading-[1.55] text-txt">
              Flux Shield blocks malware, phishing and unwanted content at the DNS layer, then shows you every query as it
              happens. One console for your office, your clients or your home.
            </p>

            <div className="mt-[34px] flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup" className="fs-btn fs-btn-primary fs-btn-lg no-underline">
                Start free trial <span className="opacity-70">→</span>
              </Link>
              <Link href="/contact" className="fs-btn fs-btn-lg no-underline">
                Book a demo
              </Link>
            </div>

            <p className="mt-4 text-[13px] text-mut">
              14-day free trial · No credit card required · Live in minutes
            </p>
          </div>

          <QueryTraceHero />
        </div>
      </section>

      <div className="section-container">
        <div className="grid grid-cols-2 border-b border-line md:grid-cols-4">
          {facts.map((fact, i) => (
            <div
              key={fact.label}
              className={`py-[34px] ${i > 0 ? 'border-l border-line pl-10 max-md:border-l-0 max-md:pl-0 max-md:pt-8' : ''}`}
            >
              <b className="block text-[clamp(1.5rem,2.6vw,2.125rem)] font-medium tracking-[-0.04em] text-ink">
                {fact.value}
              </b>
              <span className="text-sm text-mut">{fact.label}</span>
            </div>
          ))}
        </div>

        <section className="py-[120px]">
          <div className="fs-eyebrow">Platform</div>
          <h2 className="fs-section-title text-balance">
            Stop threats, <span className="font-serif-accent">see everything.</span>
          </h2>
          <p className="mt-[18px] max-w-[560px] text-[17px] leading-relaxed text-txt">
            Protection that works before a connection is made, and visibility into every lookup your networks make.
          </p>

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
          <div className="fs-eyebrow">Deploy your way</div>
          <h2 className="fs-section-title text-balance">
            On the network, <span className="font-serif-accent">and off it.</span>
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {deployOptions.map((option) => (
              <div key={option.label} className="fs-card rounded-[14px] p-7">
                <div className="font-mono text-xs uppercase tracking-[0.08em] text-mut">{option.label}</div>
                <h3 className="mt-4 text-xl font-semibold tracking-[-0.025em] text-ink">{option.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-txt">{option.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-[120px]">
          <div className="fs-eyebrow">Who it&apos;s for</div>
          <h2 className="fs-section-title text-balance">
            One platform, <span className="font-serif-accent">three kinds of network.</span>
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {audiences.map((audience) => (
              <Link
                key={audience.title}
                href={audience.href}
                className="group border-t border-ink pt-[22px] no-underline"
              >
                <h3 className="text-xl font-semibold tracking-[-0.025em] text-ink">{audience.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-txt">{audience.body}</p>
                <span className="mt-4 inline-block text-sm font-medium text-brand group-hover:underline">
                  {audience.cta} →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="pb-[120px]">
          <div className="fs-eyebrow">Integrations</div>
          <h2 className="fs-section-title text-balance">
            Fits the tools <span className="font-serif-accent">you already run.</span>
          </h2>
          <p className="mt-[18px] max-w-[560px] text-[17px] leading-relaxed text-txt">
            Stream query logs to your SIEM, send alerts where your team works, and automate everything else through the
            API and webhooks.
          </p>
          <div className="mt-10 flex flex-wrap gap-2.5">
            {integrations.map((name) => (
              <span key={name} className="rounded-full border border-line bg-panel px-4 py-2 text-sm text-ink">
                {name}
              </span>
            ))}
          </div>
        </section>

        <section className="pb-[120px]">
          <div className="fs-eyebrow">How it works</div>
          <h2 className="fs-section-title">
            Every query, <span className="font-serif-accent">one decision.</span>
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-3 md:gap-8">
            {steps.map((step) => (
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

        <MarketingCtaBand
          className="mb-[120px]"
          title={
            <>
              Ready to secure <span className="font-serif-accent">your network?</span>
            </>
          }
        />
      </div>
    </>
  )
}
