// Flux Shield - Contact Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MarketingPageShell, MarketingCard } from '@/components/marketing/MarketingPageShell'
import { MarketingPageHero, MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'

const subjects = [
  'Sales Inquiry',
  'Technical Support',
  'Enterprise Pricing',
  'Partnership',
  'Press / Media',
  'General Question',
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
    await new Promise((resolve) => setTimeout(resolve, 1000))
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
              <h2 className="text-3xl font-semibold text-ink mb-4">Message Sent!</h2>
              <p className="text-[var(--fs-txt)] text-lg mb-8">
                We&apos;ve received your message and will get back to you within 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/pricing" className="fs-btn fs-btn-primary fs-btn-lg no-underline">
                  View Pricing
                </Link>
                <Link href="/" className="fs-btn no-underline">
                  Back to Home
                </Link>
              </div>
            </MarketingCard>
          </div>
        </div>
      </MarketingPageShell>
    )
  }

  return (
    <MarketingPageShell>
      <MarketingPageHero
        eyebrow="Contact Us"
        title={
          <>
            Get in <MarketingSerifAccent>Touch</MarketingSerifAccent>
          </>
        }
        lede="Have questions about Flux Shield? We're here to help. Send us a message and our team will get back to you shortly."
      />
      <section className="py-16 sm:py-20 border-t border-[var(--fs-line)]">
        <div className="section-container">
          <div className="grid lg:grid-cols-3 gap-8">

            {/* Form — wider column */}
            <div className="lg:col-span-2">
              <div className="fs-card rounded-[14px] p-8">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Send us a message
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Name + Email row */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-[var(--fs-txt)] mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formState.name}
                        onChange={handleChange}
                        placeholder="John Smith"
                        className="fs-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-[var(--fs-txt)] mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formState.email}
                        onChange={handleChange}
                        placeholder="john@company.com"
                        className="fs-input"
                      />
                    </div>
                  </div>

                  {/* Company (optional) */}
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-[var(--fs-txt)] mb-2">
                      Company{' '}
                      <span className="text-[var(--fs-mut)] font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formState.company}
                      onChange={handleChange}
                      placeholder="Acme Corp"
                      className="fs-input"
                    />
                  </div>

                  {/* Subject dropdown */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-[var(--fs-txt)] mb-2">
                      Subject
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      value={formState.subject}
                      onChange={handleChange}
                      className="bg-space-900 border border-space-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 outline-none w-full transition-all appearance-none"
                    >
                      <option value="" disabled className="text-[var(--fs-mut)]">
                        Select a subject...
                      </option>
                      {subjects.map((s) => (
                        <option key={s} value={s} className="bg-space-900 text-white">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-[var(--fs-txt)] mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formState.message}
                      onChange={handleChange}
                      placeholder="Tell us about your DNS security needs..."
                      className="fs-input resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full fs-btn fs-btn-primary fs-btn-lg no-underline px-6 py-3 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>

                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">

              {/* Sales */}
              <div className="fs-card rounded-[14px] p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary-900/50 border border-primary-800/50 flex items-center justify-center text-primary-400 flex-shrink-0">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Sales</h3>
                    <p className="text-[var(--fs-txt)] text-sm mb-2">
                      Questions about plans, pricing, or enterprise options?
                    </p>
                    <a
                      href="mailto:sales@shield.fluxlabs.net"
                      className="text-primary-400 text-sm hover:text-primary-300 transition-colors"
                    >
                      sales@shield.fluxlabs.net
                    </a>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="fs-card rounded-[14px] p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent-900/50 border border-accent-800/50 flex items-center justify-center text-accent-400 flex-shrink-0">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Support</h3>
                    <p className="text-[var(--fs-txt)] text-sm mb-2">
                      Technical issues or account help?
                    </p>
                    <a
                      href="mailto:support@shield.fluxlabs.net"
                      className="text-accent-400 text-sm hover:text-accent-300 transition-colors"
                    >
                      support@shield.fluxlabs.net
                    </a>
                  </div>
                </div>
              </div>

              {/* Live Chat */}
              <div className="fs-card rounded-[14px] p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary-900/50 border border-primary-800/50 flex items-center justify-center text-primary-400 flex-shrink-0">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Live Chat</h3>
                    <p className="text-[var(--fs-txt)] text-sm">
                      Get instant answers via the chat widget in the bottom right corner.
                      Available during business hours.
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div className="fs-card rounded-[14px] p-6">
                <h3 className="text-white font-semibold mb-4">Business Hours</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--fs-txt)]">Monday – Friday</span>
                    <span className="text-white font-medium">9am – 6pm EST</span>
                  </div>
                  <div className="border-t border-space-700/50 pt-3 flex justify-between">
                    <span className="text-[var(--fs-txt)]">Saturday – Sunday</span>
                    <span className="text-[var(--fs-mut)]">Closed</span>
                  </div>
                  <div className="border-t border-space-700/50 pt-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-success-400 animate-pulse" />
                      <span className="text-success-400 text-xs font-medium">Currently Online</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  )
}
