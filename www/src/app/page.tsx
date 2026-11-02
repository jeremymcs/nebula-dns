// Flux Shield - Marketing Website Landing Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Image from 'next/image'
import Link from 'next/link'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'
import { APP_URL } from '@/lib/config'
import { FLUX_LABS_URL } from '@/lib/branding'

const evening = [
  {
    time: '8:56 PM',
    where: 'Roaming laptop',
    domain: 'api.github.com',
    verdict: 'Allowed',
    note: 'Your developer, working from home. Nothing to see.',
  },
  {
    time: '8:57 PM',
    where: 'Guest Wi-Fi',
    domain: 'pixel.adtrack-sync.net',
    verdict: 'Blocked',
    note: 'An ad tracker on a visitor’s phone. Stopped quietly.',
  },
  {
    time: '8:57 PM',
    where: 'Destin office',
    domain: 'secure-account-verify.co',
    verdict: 'Blocked',
    note: 'A phishing link in an email. The page never loaded, and we got the alert.',
  },
  {
    time: '8:57 PM',
    where: 'Panama City HQ',
    domain: 'cdn-update-check.top',
    verdict: 'Blocked',
    note: 'Malware on a workstation trying to phone home. We flagged the machine for a look in the morning.',
  },
] as const

const handled = [
  {
    title: 'We set it up',
    body: 'We point your firewall at Flux Shield, install the agent on laptops that leave the office, and build a policy around how your business actually works.',
  },
  {
    title: 'We watch it',
    body: 'Threat alerts come to our team, not your inbox. When something gets blocked that shouldn’t have, or a machine keeps reaching for a bad domain, we deal with it.',
  },
  {
    title: 'We answer the “why”',
    body: 'When someone calls to ask why a site won’t load, we can see the exact lookup, the rule that caught it and the device that asked, and fix it on the spot.',
  },
  {
    title: 'We show you the work',
    body: 'Each month you get a plain-English report: what was blocked, which threats came closest, and what we changed.',
  },
] as const

const screens = [
  {
    eyebrow: 'Live stream',
    title: 'Watch it happen, as it happens.',
    body: 'The screen above is what our technicians open when you call. During an incident we can also watch lookups arrive in real time, filter to blocked only, and confirm the problem has stopped before we hang up.',
    src: '/screens/live-stream.webp',
    alt: 'Flux Shield live stream of DNS queries updating every few seconds',
  },
  {
    eyebrow: 'Reports',
    title: 'A clear picture, not a pile of logs.',
    body: 'Your security score, total queries, blocks and threats, and where they came from. You can sign in and look any time, and we walk through it with you.',
    src: '/screens/reports.webp',
    alt: 'Flux Shield reports page with security score, query totals and blocks by category',
  },
] as const

const fits = [
  'Offices with a few people or a few hundred',
  'Clinics and practices with patient data to protect',
  'Firms that live in email and shared files',
  'Businesses with guest Wi-Fi or people on the road',
] as const

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line fs-hero-backdrop fs-hero-grid">
        <div className="section-container relative z-[2] pt-[84px]">
          <div className="max-w-[820px]">
            <a
              href={FLUX_LABS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[30px] items-center gap-2.5 rounded-full bg-panel/70 px-3 pl-1.5 text-[13px] text-txt no-underline shadow-[0_0_0_1px_var(--fs-line)] backdrop-blur-md transition-colors hover:text-ink"
            >
              <span className="inline-flex h-[21px] items-center rounded-full bg-[var(--fs-danger-soft)] px-2 text-xs font-medium text-[#D9483C]">
                Flux Labs
              </span>
              Managed IT from Panama City, Florida →
            </a>

            <h1 className="mt-7 text-balance text-[clamp(2.25rem,5vw,4.25rem)] font-semibold leading-[1.03] tracking-[-0.045em] text-ink">
              The phishing link was clicked at 8:57 PM.{' '}
              <span className="font-serif-accent font-normal tracking-[-0.02em] text-brand">Nothing happened.</span>
            </h1>

            <p className="mt-[26px] max-w-[640px] text-[19px] leading-[1.55] text-txt">
              Flux Shield stops dangerous websites before they load, on every device in your business. The Flux Labs
              team sets it up, watches it, and tells you what it caught. You get on with your day.
            </p>

            <div className="mt-[34px] flex flex-wrap items-center gap-3">
              <Link href="/contact" className="fs-btn fs-btn-primary fs-btn-lg no-underline">
                Talk to Flux Labs <span className="opacity-70">→</span>
              </Link>
              <Link href="#how" className="fs-btn fs-btn-lg no-underline">
                See how it works
              </Link>
            </div>
            <p className="mt-4 text-[13px] text-mut">
              Already a Flux Labs client?{' '}
              <a href={APP_URL} className="text-brand no-underline hover:underline">
                Sign in to your dashboard
              </a>
            </p>
          </div>

          <figure className="relative mt-16 -mb-px overflow-hidden rounded-t-2xl border border-b-0 border-line bg-panel shadow-[0_30px_80px_-30px_rgba(30,59,120,0.35)]">
            <div className="flex h-9 items-center gap-1.5 border-b border-line bg-surface px-4">
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="ml-4 font-mono text-xs text-mut">app.fluxshield · Query logs</span>
            </div>
            <Image
              src="/screens/query-logs.webp"
              alt="Flux Shield query logs showing a blocked phishing domain from the Destin office"
              width={1440}
              height={660}
              priority
              className="h-auto w-full"
            />
          </figure>
        </div>
      </section>

      <div className="section-container">
        <section className="py-[110px]">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <div>
              <div className="fs-eyebrow">One evening, four lookups</div>
              <h2 className="fs-section-title mt-3 text-balance">
                What Flux Shield <span className="font-serif-accent">actually does.</span>
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-txt">
                Every time a computer, phone or printer in your business goes to a website, it asks for directions
                first. Flux Shield answers that question, and refuses to give directions to places that would hurt you.
              </p>
            </div>

            <ol className="divide-y divide-[var(--fs-line)] border-y border-line">
              {evening.map((row) => (
                <li key={row.domain} className="grid grid-cols-[72px_1fr] gap-4 py-5 sm:grid-cols-[84px_1fr_auto]">
                  <span className="pt-0.5 font-mono text-xs text-mut">{row.time}</span>
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[14px] text-ink">{row.domain}</div>
                    <div className="mt-0.5 text-[13px] text-mut">{row.where}</div>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-txt">{row.note}</p>
                  </div>
                  <span
                    className={`col-start-2 h-fit w-fit rounded-md px-2.5 py-1 text-xs font-medium sm:col-start-3 ${
                      row.verdict === 'Blocked'
                        ? 'bg-[var(--fs-danger-soft)] text-[#D9483C]'
                        : 'bg-[var(--fs-success-soft)] text-[var(--fs-success)]'
                    }`}
                  >
                    {row.verdict}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="how" className="scroll-mt-24 pb-[110px]">
          <div className="fs-eyebrow">Managed by Flux Labs</div>
          <h2 className="fs-section-title mt-3 text-balance">
            You don&apos;t run it. <span className="font-serif-accent">We do.</span>
          </h2>
          <p className="mt-5 max-w-[620px] text-[17px] leading-relaxed text-txt">
            Most security tools hand you a dashboard and wish you luck. Flux Shield comes with the people who built it.
          </p>

          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {handled.map((item, i) => (
              <div key={item.title} className="border-t border-ink pt-[22px]">
                <div className="font-mono text-xs text-mut">0{i + 1}</div>
                <h3 className="mb-2 mt-[18px] text-xl font-semibold tracking-[-0.025em] text-ink">{item.title}</h3>
                <p className="text-[15px] leading-relaxed text-txt">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {screens.map((screen, i) => (
          <section
            key={screen.src}
            className="grid items-center gap-10 border-t border-line py-[90px] lg:grid-cols-[1fr_1.6fr] lg:gap-16"
          >
            <div className={i % 2 === 0 ? 'lg:order-2' : ''}>
              <div className="fs-eyebrow">{screen.eyebrow}</div>
              <h3 className="mt-3 text-[clamp(1.5rem,2.6vw,2rem)] font-semibold leading-tight tracking-[-0.03em] text-ink text-balance">
                {screen.title}
              </h3>
              <p className="mt-4 text-[16px] leading-relaxed text-txt">{screen.body}</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-[0_24px_60px_-30px_rgba(30,59,120,0.35)]">
              <Image src={screen.src} alt={screen.alt} width={1440} height={660} className="h-auto w-full" />
            </div>
          </section>
        ))}

        <section className="border-t border-line py-[110px]">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <div className="fs-eyebrow">Who it&apos;s for</div>
              <h2 className="fs-section-title mt-3 text-balance">
                Built for businesses <span className="font-serif-accent">along the Gulf Coast.</span>
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-txt">
                Flux Labs is a managed service provider in Panama City, Florida. Flux Shield is how we protect the
                businesses we look after, from one office to several, and the laptops that travel between them.
              </p>
              <a
                href={FLUX_LABS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block text-sm font-medium text-brand no-underline hover:underline"
              >
                More about Flux Labs →
              </a>
            </div>
            <ul className="self-end border-t border-line">
              {fits.map((fit) => (
                <li key={fit} className="flex items-center gap-3 border-b border-line py-4 text-[16px] text-ink">
                  <span className="h-1.5 w-1.5 flex-none rounded-full bg-[var(--fs-coral)]" />
                  {fit}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <MarketingCtaBand
          className="mb-[120px]"
          title={
            <>
              Let&apos;s look at <span className="font-serif-accent">your network.</span>
            </>
          }
        />
      </div>
    </>
  )
}
