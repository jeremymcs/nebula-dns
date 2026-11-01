// Flux Shield - Features Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { MarketingPageHero, MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'

export const metadata: Metadata = {
  title: 'What’s included',
  description:
    'Threat protection, content filtering, query logs, live stream, reports, playbooks, a roaming agent and a full MSP console, all at the DNS layer.',
}

type FeatureGroup = {
  id: string
  eyebrow: string
  title: ReactNode
  lede: string
  items: { name: string; body: string; badge?: string }[]
}

const groups: FeatureGroup[] = [
  {
    id: 'protect',
    eyebrow: 'Protect',
    title: (
      <>
        Stop it <MarketingSerifAccent>before it connects.</MarketingSerifAccent>
      </>
    ),
    lede: 'Every lookup is checked against your policy before an answer goes back, so a bad domain never gets a connection.',
    items: [
      {
        name: 'Threat intelligence',
        body: 'Malware and phishing feeds such as URLhaus and PhishTank refresh continuously and apply to every policy.',
      },
      {
        name: 'Behavior detection',
        body: 'Spots machine-generated (DGA) domains, DNS tunneling and data exfiltration patterns that no list has caught yet.',
      },
      {
        name: 'Content categories',
        body: 'Block adult, gambling, dating, social, streaming, gaming, VPN and proxy, drugs and more, per policy.',
      },
      {
        name: 'SafeSearch',
        body: 'Force SafeSearch on Google, Bing and DuckDuckGo, and restricted mode on YouTube. Nothing to install.',
      },
      {
        name: 'Allow and block lists',
        body: 'Add single domains or import thousands at once. Exceptions win over categories, so business apps keep working.',
      },
      {
        name: 'Schedules',
        body: 'Loosen or tighten a policy by time of day, for school hours, work hours or the weekend.',
      },
      {
        name: 'Visual policy builder',
        body: 'Build a policy by dragging blocks together, or start from a ready-made template.',
        badge: 'New',
      },
      {
        name: 'Branded block pages',
        body: 'Design the page people see when a site is blocked. With the Shield certificate installed, HTTPS sites show it too.',
      },
    ],
  },
  {
    id: 'see',
    eyebrow: 'See',
    title: (
      <>
        Every query, <MarketingSerifAccent>in plain view.</MarketingSerifAccent>
      </>
    ),
    lede: 'When someone asks why a site is blocked, or whether a laptop talked to something it should not have, the answer is a search away.',
    items: [
      {
        name: 'Query logs',
        body: 'Search the full history by domain, device, location or decision, and see the rule behind each answer.',
        badge: 'New',
      },
      {
        name: 'Live stream',
        body: 'Watch queries arrive as they happen. Pause, filter and click through to investigate.',
        badge: 'New',
      },
      {
        name: 'Domain lookup',
        body: 'Look up any domain to see its category, threat verdict, WHOIS details and recent activity on your networks.',
      },
      {
        name: 'Reports',
        body: 'Threats blocked, top domains, categories and usage trends, by location or across everything.',
      },
      {
        name: 'Scheduled reports',
        body: 'Email reports on a schedule as PDF, CSV or HTML, to your team or to a client.',
      },
      {
        name: 'Security score',
        body: 'A simple score for each network with clear steps to raise it, so progress is easy to show.',
      },
      {
        name: 'Weekly insights',
        body: 'A weekly summary that points out unusual activity and trends worth a look.',
        badge: 'Beta',
      },
    ],
  },
  {
    id: 'respond',
    eyebrow: 'Respond',
    title: (
      <>
        Act on it <MarketingSerifAccent>automatically.</MarketingSerifAccent>
      </>
    ),
    lede: 'Send the right signal to the right place, and let routine responses run on their own.',
    items: [
      {
        name: 'Playbooks',
        body: 'When a threat is detected, a block rate spikes or a new domain appears, block it, alert your team or start an investigation.',
      },
      {
        name: 'Alerts',
        body: 'Send alerts to Slack or PagerDuty, with the severity you choose.',
      },
      {
        name: 'SIEM streaming',
        body: 'Forward query logs to Splunk, Elastic, Microsoft Sentinel or any syslog collector.',
      },
      {
        name: 'Webhooks and API',
        body: 'Signed webhooks for events and a REST API with scoped keys for everything you can do in the console.',
      },
    ],
  },
  {
    id: 'manage',
    eyebrow: 'Manage',
    title: (
      <>
        One console, <MarketingSerifAccent>every tenant.</MarketingSerifAccent>
      </>
    ),
    lede: 'Whether you run one office or a hundred clients, everything lives in the same place with the same controls.',
    items: [
      {
        name: 'Locations and networks',
        body: 'Give each office, branch or home network its own policy, resolver addresses and reports.',
      },
      {
        name: 'MSP client workspaces',
        body: 'Each client is fully separate, with its own policies, users and logs, and you can move between them in a click.',
      },
      {
        name: 'Policy templates',
        body: 'Roll out your standard policy to every client, then adjust one client without touching the rest.',
      },
      {
        name: 'Cross-client reporting',
        body: 'Threats and usage across every client in a single report.',
      },
      {
        name: 'White label',
        body: 'Your logo and colors on the client portal, so clients see your brand.',
      },
      {
        name: 'SSO, MFA and roles',
        body: 'Sign in with SAML or OIDC, require MFA, and give people owner, admin, analyst or read-only access.',
      },
      {
        name: 'Audit log',
        body: 'Every change to policies, lists and users is recorded with who made it and when.',
      },
      {
        name: 'Family mode',
        body: 'Per-device rules for kids, with bedtime and homework schedules.',
      },
    ],
  },
]

const deploy = [
  {
    name: 'Network DNS',
    body: 'Set Flux Shield as the DNS server on a router or firewall. Every device behind it is covered.',
  },
  {
    name: 'DNS over HTTPS and TLS',
    body: 'Each location gets its own encrypted DoH and DoT address for routers and devices that support it.',
  },
  {
    name: 'Windows agent',
    body: 'Keeps laptops protected on any network. Installs silently from your RMM, with split DNS for Active Directory.',
  },
]

const modules = [
  { name: 'DNS Filter', body: 'Everything on this page.', status: 'Available' },
  { name: 'DNS Management', body: 'Host and edit public DNS zones on Cloudflare, next to your filtering.', status: 'Available' },
  { name: 'DMARC', body: 'Email authentication monitoring for your domains.', status: 'Coming soon' },
]

export default function FeaturesPage() {
  return (
    <MarketingPageShell>
      <MarketingPageHero
        eyebrow="What’s included"
        title={
          <>
            Everything we run <MarketingSerifAccent>to protect you.</MarketingSerifAccent>
          </>
        }
        lede="Here’s the full toolkit behind Flux Shield. The Flux Labs team configures and watches all of it for you, and you can sign in to see it any time."
      >
        <nav aria-label="Feature groups" className="flex flex-wrap justify-center gap-2">
          {[...groups.map((g) => ({ id: g.id, label: g.eyebrow })), { id: 'deploy', label: 'Deploy' }].map((g) => (
            <a
              key={g.id}
              href={`#${g.id}`}
              className="rounded-full border border-line bg-panel px-4 py-1.5 text-sm text-txt no-underline transition-colors hover:text-ink"
            >
              {g.label}
            </a>
          ))}
        </nav>
      </MarketingPageHero>

      <div className="section-container">
        {groups.map((group) => (
          <section key={group.id} id={group.id} className="scroll-mt-24 border-b border-line py-[96px]">
            <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
              <div>
                <div className="fs-eyebrow">{group.eyebrow}</div>
                <h2 className="fs-section-title mt-3 text-balance">{group.title}</h2>
                <p className="mt-4 text-[16px] leading-relaxed text-txt">{group.lede}</p>
              </div>
              <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {group.items.map((item) => (
                  <div key={item.name} className="border-t border-line pt-5">
                    <h3 className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.015em] text-ink">
                      {item.name}
                      {item.badge && (
                        <span className="rounded-full bg-[var(--fs-danger-soft)] px-2 py-0.5 text-[11px] font-medium text-[#D9483C]">
                          {item.badge}
                        </span>
                      )}
                    </h3>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-txt">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        <section id="deploy" className="scroll-mt-24 py-[96px]">
          <div className="fs-eyebrow">Deploy</div>
          <h2 className="fs-section-title mt-3 text-balance">
            Live in minutes, <MarketingSerifAccent>three ways.</MarketingSerifAccent>
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {deploy.map((option) => (
              <div key={option.name} className="fs-card rounded-[14px] p-7">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-ink">{option.name}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-txt">{option.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-[96px]">
          <div className="fs-eyebrow">Modules</div>
          <h2 className="fs-section-title mt-3 text-balance">
            A platform <MarketingSerifAccent>that keeps growing.</MarketingSerifAccent>
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {modules.map((mod) => (
              <div key={mod.name} className="border-t border-ink pt-[22px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold tracking-[-0.025em] text-ink">{mod.name}</h3>
                  <span
                    className={`font-mono text-xs ${mod.status === 'Available' ? 'text-[var(--fs-success)]' : 'text-mut'}`}
                  >
                    {mod.status}
                  </span>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-txt">{mod.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-sm text-txt">
            Not sure what you need?{' '}
            <Link href="/contact" className="font-medium text-brand no-underline hover:underline">
              Talk to Flux Labs and we&apos;ll walk you through it →
            </Link>
          </p>
        </section>

        <MarketingCtaBand
          className="mb-[120px]"
          title={
            <>
              Want this <span className="font-serif-accent">looking after you?</span>
            </>
          }
        />
      </div>
    </MarketingPageShell>
  )
}
