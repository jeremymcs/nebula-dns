// Flux Shield - Contact Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState } from 'react'
import Link from 'next/link'

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
      <div className="bg-space-950 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-12 text-center">
            {/* Gradient checkmark */}
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-success-600 to-accent-500 text-white mx-auto mb-6">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Message Sent!
            </h2>
            <p className="text-space-400 text-lg mb-8">
              We&apos;ve received your message and will get back to you within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/pricing"
                className="bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center justify-center gap-2"
              >
                View Pricing
              </Link>
              <Link
                href="/"
                className="bg-space-800 border border-space-700 text-white hover:bg-space-700 rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center justify-center"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-space-950">

      {/* Hero Section */}
      <section className="py-24 bg-space-950 relative overflow-hidden">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-primary-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 w-72 h-72 bg-accent-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-4">
            Contact Us
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white">
            Get in{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
              Touch
            </span>
          </h1>
          <p className="mt-4 text-lg text-space-400 max-w-2xl mx-auto">
            Have questions about Flux Shield? We&apos;re here to help. Send us a message and our team will get back to you shortly.
          </p>
        </div>
      </section>

      {/* Contact Form + Sidebar */}
      <section className="py-24 bg-space-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">

            {/* Form — wider column */}
            <div className="lg:col-span-2">
              <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Send us a message
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Name + Email row */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-space-400 mb-2">
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
                        className="bg-space-900 border border-space-700 rounded-xl px-4 py-3 text-white placeholder-space-500 focus:ring-2 focus:ring-primary-500 outline-none w-full transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-space-400 mb-2">
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
                        className="bg-space-900 border border-space-700 rounded-xl px-4 py-3 text-white placeholder-space-500 focus:ring-2 focus:ring-primary-500 outline-none w-full transition-all"
                      />
                    </div>
                  </div>

                  {/* Company (optional) */}
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-space-400 mb-2">
                      Company{' '}
                      <span className="text-space-600 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formState.company}
                      onChange={handleChange}
                      placeholder="Acme Corp"
                      className="bg-space-900 border border-space-700 rounded-xl px-4 py-3 text-white placeholder-space-500 focus:ring-2 focus:ring-primary-500 outline-none w-full transition-all"
                    />
                  </div>

                  {/* Subject dropdown */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-space-400 mb-2">
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
                      <option value="" disabled className="text-space-500">
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
                    <label htmlFor="message" className="block text-sm font-medium text-space-400 mb-2">
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
                      className="bg-space-900 border border-space-700 rounded-xl px-4 py-3 text-white placeholder-space-500 focus:ring-2 focus:ring-primary-500 outline-none w-full transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary-900/50 border border-primary-800/50 flex items-center justify-center text-primary-400 flex-shrink-0">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Sales</h3>
                    <p className="text-space-400 text-sm mb-2">
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
              <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent-900/50 border border-accent-800/50 flex items-center justify-center text-accent-400 flex-shrink-0">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Support</h3>
                    <p className="text-space-400 text-sm mb-2">
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
              <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary-900/50 border border-primary-800/50 flex items-center justify-center text-primary-400 flex-shrink-0">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Live Chat</h3>
                    <p className="text-space-400 text-sm">
                      Get instant answers via the chat widget in the bottom right corner.
                      Available during business hours.
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">Business Hours</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-space-400">Monday – Friday</span>
                    <span className="text-white font-medium">9am – 6pm EST</span>
                  </div>
                  <div className="border-t border-space-700/50 pt-3 flex justify-between">
                    <span className="text-space-400">Saturday – Sunday</span>
                    <span className="text-space-500">Closed</span>
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

    </div>
  )
}
