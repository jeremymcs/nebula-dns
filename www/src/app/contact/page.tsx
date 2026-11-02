// Flux Shield - Contact Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MarketingPageShell, MarketingCard } from '@/components/marketing/MarketingPageShell'
import { MarketingPageHero } from '@/components/marketing/MarketingPageHero'
import { FLUX_LABS_PHONE, FLUX_LABS_PHONE_HREF } from '@/lib/branding'
// Matches the addresses shown on this page and the legal pages.
const SALES_EMAIL = 'sales@shield.fluxlabs.net'
const SUPPORT_EMAIL = 'support@shield.fluxlabs.net'

const subjects = [
  'Protect my business',
  'I’m already a Flux Labs client',
  'Larger organization',
  'MSP partnership',
  'Something else',
]

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // No backend endpoint yet: hand the message to the visitor's mail app so it actually reaches us.
    const subject = `${formState.subject || 'Flux Shield inquiry'}${formState.company ? ` · ${formState.company}` : ''}`
    const body = `${formState.message}\n\n${formState.name}\n${formState.email}${formState.company ? `\n${formState.company}` : ''}`
    window.location.href = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setSubmitted(true)
    setIsSubmitting(false)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    })
  }

  if (submitted) {
    return (
      <MarketingPageShell>
        <div className="section-container py-24 sm:py-32">
          <div className="mx-auto max-w-3xl">
            <MarketingCard className="p-12 text-center">
              <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-[var(--fs-success-soft)] text-[var(--fs-success)]">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-semibold text-ink mb-4">Your email is ready to send</h2>
              <p className="text-[var(--fs-txt)] text-lg mb-8">
                Your email app should have opened with your message. Send it and the Flux Labs team will get back to you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/pricing" className="fs-btn fs-btn-primary fs-btn-lg no-underline">
                  See pricing
                </Link>
                <Link href="/" className="fs-btn no-underline">
                  Back to home
                </Link>
              </div>
            </MarketingCard>
          </div>
        </div>
      </MarketingPageShell>
    )
  }

  const steps = [
    { lead: 'We call you back', rest: 'within one business day.' },
    { lead: 'We look at how your offices work', rest: 'and show you what Flux Shield would block.' },
    { lead: 'You decide.', rest: 'If it’s a fit, our team sets it up.' },
  ]

  return (
    <MarketingPageShell>
      <MarketingPageHero
        eyebrow="Talk to Flux Labs"
        title="A real person will get back to you."
        lede="Tell us about your business: how many offices, how many people, and what worries you."
        className="pb-24 sm:pb-28"
      />
      <section className="relative z-[2] -mt-20 pb-24">
        <div className="section-container">
          <div className="grid gap-8 lg:grid-cols-[5fr_6fr]">
            <div className="fs-card order-2 bg-panel p-7 sm:p-9 lg:order-1 lg:self-start">
              <div className="fs-eyebrow">What happens next</div>
              <ol className="mt-4">
                {steps.map((step, i) => (
                  <li key={step.lead} className="flex gap-5 border-b border-line py-4 last:border-0">
                    <span className="fx-num text-sm">0{i + 1}</span>
                    <p className="text-[15px] leading-relaxed text-txt">
                      <strong className="font-semibold text-ink">{step.lead}</strong> {step.rest}
                    </p>
                  </li>
                ))}
              </ol>

              <div className="mt-6 space-y-4 rounded-2xl bg-surface p-5 text-[15px]">
                <div>
                  <div className="font-semibold text-ink">Rather just call?</div>
                  <a href={FLUX_LABS_PHONE_HREF} className="font-semibold text-brand no-underline hover:underline">
                    {FLUX_LABS_PHONE}
                  </a>
                </div>
                <div>
                  <div className="font-semibold text-ink">Sales</div>
                  <a href={`mailto:${SALES_EMAIL}`} className="text-brand no-underline hover:underline">
                    {SALES_EMAIL}
                  </a>
                </div>
                <div>
                  <div className="font-semibold text-ink">Already a client?</div>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand no-underline hover:underline">
                    {SUPPORT_EMAIL}
                  </a>
                </div>
                <div className="text-txt">Flux Labs · Panama City, Florida</div>
              </div>
            </div>

            <div className="fs-card order-1 bg-panel p-7 shadow-[0_24px_48px_-24px_rgba(15,31,66,0.3)] sm:p-10 lg:order-2">
              <h2 className="text-2xl font-semibold text-ink">Send us a message</h2>
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="fs-label">Name</label>
                    <input type="text" id="name" name="name" required value={formState.name} onChange={handleChange} placeholder="Jane Smith" className="fs-input" />
                  </div>
                  <div>
                    <label htmlFor="email" className="fs-label">Work email</label>
                    <input type="email" id="email" name="email" required value={formState.email} onChange={handleChange} placeholder="jane@yourbusiness.com" className="fs-input" />
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="company" className="fs-label">
                      Business <span className="font-normal text-mut">(optional)</span>
                    </label>
                    <input type="text" id="company" name="company" value={formState.company} onChange={handleChange} placeholder="Smith Dental" className="fs-input" />
                  </div>
                  <div>
                    <label htmlFor="subject" className="fs-label">What’s this about?</label>
                    <select id="subject" name="subject" required value={formState.subject} onChange={handleChange} className="fs-input">
                      <option value="" disabled>
                        Choose one…
                      </option>
                      {subjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="message" className="fs-label">What’s on your mind?</label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formState.message}
                    onChange={handleChange}
                    placeholder="A phishing scare, guest Wi-Fi, laptops on the road…"
                    className="fs-input resize-none"
                  />
                </div>
                <button type="submit" disabled={isSubmitting} className="fs-btn fs-btn-primary fs-btn-lg w-full disabled:cursor-not-allowed disabled:opacity-50">
                  {isSubmitting ? 'Opening your email…' : 'Send to Flux Labs'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  )
}
