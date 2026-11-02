// Flux Shield - MSP Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { MarketingPageHero, MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'

export const metadata: Metadata = {
  title: 'For MSPs',
  description:
    'Run DNS filtering for every client from one console. Client workspaces, policy templates, cross-client reporting, white label and an RMM-ready agent.',
}

const capabilities = [
  {
    title: 'A workspace per client',
    body: 'Each client gets its own policies, networks, users and query logs. Nothing mixes between clients, and you can jump into any of them from your MSP view.',
  },
  {
    title: 'Policy templates',
    body: 'Build your baseline once, then apply it to every new client. Override a category or add an allow entry for one client without touching the rest.',
  },
  {
    title: 'Cross-client reporting',
    body: 'Threats blocked, top domains and query volume across all of your clients in one report. Find the client that needs a conversation this week.',
  },
  {
    title: 'White label',
    body: 'Put your logo and colors on the client portal, and design block pages that carry your brand when something gets stopped.',
  },
  {
    title: 'RMM-ready Windows agent',
    body: 'Push the agent from your RMM with one install token. It keeps laptops filtered off-network, and split DNS keeps Active Directory lookups on the local network.',
  },
  {
    title: 'Alerts your team will see',
    body: 'Send threat alerts to Slack or PagerDuty, fire webhooks, and stream every query to Splunk, Elastic, Microsoft Sentinel or syslog.',
  },
] as const

const onboarding = [
  {
    n: '01',
    title: 'Add the client',
    body: 'Create the client workspace and invite their contacts with the right role: owner, admin, analyst or read-only.',
  },
  {
    n: '02',
    title: 'Apply your template',
    body: 'Start from your standard policy. Threat protection, categories and SafeSearch are set before the first query arrives.',
  },
  {
    n: '03',
    title: 'Point DNS or deploy the agent',
    body: 'Change the resolver on the firewall, use the DoH or DoT address, or push the Windows agent from your RMM.',
  },
  {
    n: '04',
    title: 'Report on it',
    body: 'Schedule a PDF report to the client each month, and use the security score to show progress over time.',
  },
] as const

export default function MspPage() {
  return (
    <MarketingPageShell>
      <MarketingPageHero
        eyebrow="For MSPs"
        title={
          <>
            Every client&apos;s DNS, <MarketingSerifAccent>one console.</MarketingSerifAccent>
          </>
        }
        lede="Flux Shield was built by Flux Labs, a managed service provider, for the way MSPs work. Onboard a client in minutes, roll out a standard policy, and see every client's threats in one place."
      >
        <Link href="/signup" className="fs-btn fs-btn-primary fs-btn-lg no-underline">
          Start free trial <span className="opacity-70">→</span>
        </Link>
        <Link href="/contact" className="fs-btn fs-btn-lg no-underline">
          Talk to us
        </Link>
      </MarketingPageHero>

      <div className="section-container">
        <section className="py-[96px]">
          <div className="fs-eyebrow">What you get</div>
          <h2 className="fs-section-title text-balance">
            Built for <MarketingSerifAccent>many tenants,</MarketingSerifAccent> not one.
          </h2>

          <div className="mt-[52px] grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((item) => (
              <div key={item.title} className="border-b border-r border-line bg-panel p-[30px]">
                <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{item.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-txt">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-[96px]">
          <div className="fs-eyebrow">Onboarding</div>
          <h2 className="fs-section-title">
            A new client, <MarketingSerifAccent>same afternoon.</MarketingSerifAccent>
          </h2>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {onboarding.map((step) => (
              <div key={step.n} className="border-t border-ink pt-[22px]">
                <div className="font-mono text-xs text-mut">{step.n}</div>
                <h3 className="mb-2 mt-[18px] text-xl font-semibold tracking-[-0.025em] text-ink">{step.title}</h3>
                <p className="text-[15px] leading-relaxed text-txt">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-[96px]">
          <div className="fs-card grid gap-8 rounded-[14px] p-8 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <div className="fs-eyebrow">More than filtering</div>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-ink">
                Host client DNS zones in the same console.
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-txt">
                The DNS Management module lets you manage your clients&apos; public DNS records next to their filtering
                policies, on Cloudflare&apos;s network. DMARC monitoring is next on the roadmap.
              </p>
            </div>
            <ul className="space-y-3 text-[14.5px] text-txt">
              {[
                'DNS Filter: threat protection, categories, logs and reports',
                'DNS Management: zones and records for each client',
                'DMARC: coming soon',
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[var(--fs-coral)]" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <MarketingCtaBand
          className="mb-[120px]"
          title={
            <>
              Bring your clients <span className="font-serif-accent">under one roof.</span>
            </>
          }
          description="Start with your own office, then add clients as you go."
          secondaryHref="/contact"
          secondaryLabel="Talk to us"
        />
      </div>
    </MarketingPageShell>
  )
}
