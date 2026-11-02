// Flux Shield - Enterprise Offering Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { MarketingPageHero, MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'

export const metadata: Metadata = {
  title: 'Enterprise',
  description:
    'Flux Shield for larger organizations: SSO, role-based access, audit logs, SIEM streaming, an API, custom terms and hands-on rollout help.',
}

const controls = [
  {
    title: 'Single sign-on',
    body: 'Sign in through your identity provider with SAML or OIDC, including Microsoft Entra ID, Okta and Google Workspace.',
  },
  {
    title: 'Roles and MFA',
    body: 'Owner, admin, analyst and read-only roles, with multi-factor authentication for every account.',
  },
  {
    title: 'Audit log',
    body: 'A record of every change to policies, lists, users and settings, with who made it and when.',
  },
  {
    title: 'SIEM streaming',
    body: 'Send DNS query logs to Splunk, Elastic, Microsoft Sentinel or syslog, next to the rest of your security data.',
  },
  {
    title: 'API and webhooks',
    body: 'A REST API with scoped keys, plus webhooks for threats and policy events, so DNS fits into your automation.',
  },
  {
    title: 'Scheduled reporting',
    body: 'PDF, CSV or HTML reports delivered on a schedule to security, IT leadership or auditors.',
  },
] as const

const services = [
  {
    title: 'Custom terms',
    body: 'Volume pricing, annual agreements and service levels written around your environment.',
  },
  {
    title: 'Rollout help',
    body: 'We help plan locations and policies, deploy the agent through your RMM or MDM, and roll out the Shield certificate.',
  },
  {
    title: 'A direct line',
    body: 'Talk to the people who build Flux Shield, not a ticket queue.',
  },
] as const

const rollout = [
  { step: 'Plan', body: 'Map your locations, networks and existing block lists, and agree on a baseline policy.' },
  { step: 'Pilot', body: 'Point one site at Flux Shield, review Query Logs together and tune the policy.' },
  { step: 'Roll out', body: 'Move the remaining sites, deploy the agent to laptops, and connect SSO and your SIEM.' },
  { step: 'Report', body: 'Turn on scheduled reports and use the security score to track progress.' },
] as const

export default function EnterprisePage() {
  return (
    <MarketingPageShell>
      <MarketingPageHero
        eyebrow="Enterprise"
        title={
          <>
            DNS security <MarketingSerifAccent>at your scale.</MarketingSerifAccent>
          </>
        }
        lede="Everything in Flux Shield, plus the identity, logging and support that larger teams need to run it with confidence."
      >
        <Link href="/contact" className="fs-btn fs-btn-primary fs-btn-lg no-underline">
          Talk to us <span className="opacity-70">→</span>
        </Link>
        <Link href="/features" className="fs-btn fs-btn-lg no-underline">
          See all features
        </Link>
      </MarketingPageHero>

      <div className="section-container">
        <section className="py-[96px]">
          <div className="fs-eyebrow">Control</div>
          <h2 className="fs-section-title text-balance">
            Fits how <MarketingSerifAccent>your team already works.</MarketingSerifAccent>
          </h2>
          <div className="mt-[52px] grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
            {controls.map((item) => (
              <div key={item.title} className="border-b border-r border-line bg-panel p-[30px]">
                <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{item.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-txt">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-[96px]">
          <div className="fs-eyebrow">Service</div>
          <h2 className="fs-section-title text-balance">
            People behind <MarketingSerifAccent>the platform.</MarketingSerifAccent>
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {services.map((item) => (
              <div key={item.title} className="fs-card rounded-[14px] p-7">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-ink">{item.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-txt">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-[96px]">
          <div className="fs-eyebrow">Rollout</div>
          <h2 className="fs-section-title text-balance">
            A calm switch, <MarketingSerifAccent>site by site.</MarketingSerifAccent>
          </h2>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {rollout.map((phase, i) => (
              <div key={phase.step} className="border-t border-ink pt-[22px]">
                <div className="font-mono text-xs text-mut">0{i + 1}</div>
                <h3 className="mb-2 mt-[18px] text-xl font-semibold tracking-[-0.025em] text-ink">{phase.step}</h3>
                <p className="text-[15px] leading-relaxed text-txt">{phase.body}</p>
              </div>
            ))}
          </div>
        </section>

        <MarketingCtaBand
          className="mb-[120px]"
          title={
            <>
              Let&apos;s plan <span className="font-serif-accent">your rollout.</span>
            </>
          }
          description="Tell us about your sites and tools, and we'll set up a trial that matches them."
          primaryHref="/contact"
          primaryLabel="Talk to us"
          secondaryHref="/pricing"
          secondaryLabel="View pricing"
          finePrint=""
        />
      </div>
    </MarketingPageShell>
  )
}
