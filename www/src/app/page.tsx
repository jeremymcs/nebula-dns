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

const towns = ['Panama City', 'Panama City Beach', 'Lynn Haven', 'Callaway', 'Destin'] as const

const screens = [
  {
    eyebrow: 'Live stream',
    title: 'Watch it happen, as it happens.',
    body: 'The query log above is what our technicians open when you call. During an incident we can also watch lookups arrive in real time, filter to blocked only, and confirm the problem has stopped before we hang up.',
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
      <section className="fx-band relative overflow-hidden">
        <div className="section-container relative z-[2] pt-16 sm:pt-20">
          <div className="max-w-[780px]">
            <div className="fx-tagline text-[17px] sm:text-[19px]">
              Stops threats · Watched by our team · Reported monthly
            </div>

            <h1 className="mt-4 text-balance text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.08] tracking-[-1.4px] text-white">
              The phishing link was clicked at 8:57 PM. Nothing happened.
            </h1>

            <p className="mt-6 max-w-[640px] text-[17px] leading-relaxed text-[var(--fx-navy-text)] sm:text-lg">
              Flux Shield stops dangerous websites before they load, on every device in your business. The Flux Labs
              team sets it up, watches it, and tells you what it caught. You get on with your day.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/contact" className="fs-btn fs-btn-primary fs-btn-lg no-underline">
                Talk to Flux Labs
              </Link>
              <Link href="#how" className="fs-btn fs-btn-lg no-underline">
                See how it works
              </Link>
            </div>
            <p className="mt-5 text-[13px] text-[#A7B2C7]">
              Already a Flux Labs client?{' '}
              <a href={APP_URL} className="font-medium text-white underline-offset-2 hover:underline">
                Sign in to your dashboard
              </a>
            </p>
          </div>

          <figure className="relative mt-14 -mb-px overflow-hidden rounded-t-2xl border border-b-0 border-[var(--fx-navy-line)] bg-panel shadow-[0_-20px_60px_rgba(0,0,0,0.25)]">
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

      <div className="border-b border-line bg-surface">
        <div className="section-container flex flex-wrap justify-center gap-x-7 gap-y-2 py-[18px] text-sm text-txt">
          <span className="font-semibold text-ink">Protecting businesses in</span>
          {towns.map((town) => (
            <span key={town}>{town}</span>
          ))}
        </div>
      </div>

      <div className="section-container">
        <section className="py-24">
          <div className="fs-eyebrow">One evening, four lookups</div>
          <h2 className="fs-section-title mt-3 max-w-[640px] text-balance text-ink">What Flux Shield actually does</h2>
          <p className="mt-4 max-w-[640px] text-[17px] leading-relaxed text-txt">
            Every time a computer, phone or printer in your business goes to a website, it asks for directions first.
            Flux Shield answers that question, and refuses to give directions to places that would hurt you.
          </p>

          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {evening.map((row) => (
              <li key={row.domain} className="fs-card flex flex-col bg-panel p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-mut">{row.time}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      row.verdict === 'Blocked'
                        ? 'bg-[var(--fs-danger-soft)] text-[var(--fs-danger)]'
                        : 'bg-[var(--fs-success-soft)] text-[var(--fs-success)]'
                    }`}
                  >
                    {row.verdict}
                  </span>
                </div>
                <div className="mt-4 break-all text-[15px] font-semibold text-ink">{row.domain}</div>
                <div className="mt-0.5 text-[13px] text-mut">{row.where}</div>
                <p className="mt-3 text-[14.5px] leading-relaxed text-txt">{row.note}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="how" className="scroll-mt-28 pb-24">
          <div className="fx-band rounded-3xl px-6 py-12 sm:px-14 sm:py-14">
            <div className="fs-eyebrow">Managed by Flux Labs</div>
            <h2 className="mt-3 text-[clamp(1.875rem,3.4vw,2.5rem)] font-semibold leading-[1.15] tracking-[-1px] text-white">
              You don&apos;t run it. We do.
            </h2>
            <p className="mt-4 max-w-[620px] text-[17px] leading-relaxed text-[var(--fx-navy-text)]">
              Most security tools hand you a dashboard and wish you luck. Flux Shield comes with the people who built
              it.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {handled.map((item, i) => (
                <div key={item.title} className="fx-band-card p-6">
                  <div className="text-sm font-semibold text-[var(--fx-amber)]">0{i + 1}</div>
                  <h3 className="mt-3 text-[17px] font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--fx-navy-text)]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="fx-gray py-24">
        <div className="section-container">
          <div className="fs-eyebrow">What you&apos;ll see</div>
          <h2 className="fs-section-title mt-3 max-w-[640px] text-balance text-ink">
            Every answer, in plain view
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {screens.map((screen) => (
              <article key={screen.src} className="fs-card overflow-hidden bg-panel">
                <Image src={screen.src} alt={screen.alt} width={1440} height={660} className="h-auto w-full border-b border-line" />
                <div className="p-7">
                  <div className="fs-eyebrow">{screen.eyebrow}</div>
                  <h3 className="mt-2 text-xl font-semibold text-ink">{screen.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-txt">{screen.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="section-container">
        <section className="py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <div className="fs-eyebrow">Who it&apos;s for</div>
              <h2 className="fs-section-title mt-3 text-balance text-ink">Built for businesses along the Gulf Coast</h2>
              <p className="mt-5 text-[16px] leading-relaxed text-txt">
                Flux Labs is a managed service provider in Panama City, Florida. Flux Shield is how we protect the
                businesses we look after, from one office to several, and the laptops that travel between them.
              </p>
              <a
                href={FLUX_LABS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="fs-btn mt-7 no-underline"
              >
                More about Flux Labs
              </a>
            </div>
            <ul className="self-end">
              {fits.map((fit, i) => (
                <li key={fit} className="flex items-center gap-5 border-b border-line py-4 text-[16px] text-ink">
                  <span className="fx-num w-6 text-sm">0{i + 1}</span>
                  {fit}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <MarketingCtaBand className="mb-24" title="Let’s look at your network." />
      </div>
    </>
  )
}
