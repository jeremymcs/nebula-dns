// Nebula DNS - Contact Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setSubmitted(true)
    setIsSubmitting(false)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    })
  }

  const faqs = [
    {
      q: 'What is your typical response time?',
      a: 'We respond to all sales inquiries within 24 hours on business days. For urgent matters, please use the live chat in the bottom right corner.',
    },
    {
      q: 'Do you offer demos or consultations?',
      a: 'Yes! We provide personalized demos and free consultations to help you understand how Nebula DNS can fit your organization\'s needs.',
    },
    {
      q: 'Can I schedule a call with your sales team?',
      a: 'Absolutely. After submitting this form, our team will reach out to schedule a call at your convenience.',
    },
    {
      q: 'Do you offer custom enterprise pricing?',
      a: 'Yes. For organizations with specific requirements or high volume needs, we offer custom pricing and dedicated support. Contact us for a quote.',
    },
  ]

  if (submitted) {
    return (
      <div className="bg-white dark:bg-space-900 transition-colors">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="bg-white dark:bg-space-800 rounded-2xl p-12 border border-space-200 dark:border-space-700 text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-success-500 to-success-600 flex items-center justify-center text-white mx-auto mb-6">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-space-900 dark:text-white mb-4">
              Thank you for reaching out!
            </h2>
            <p className="text-lg text-space-600 dark:text-space-300 mb-8">
              We&apos;ve received your message and will get back to you within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                View Pricing
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-space-100 dark:bg-space-700 text-space-900 dark:text-white font-medium hover:bg-space-200 dark:hover:bg-space-600 transition-all"
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
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-space-900 dark:text-white">
            Get in Touch
          </h1>
          <p className="mt-4 text-lg text-space-600 dark:text-space-300 max-w-2xl mx-auto">
            Have questions about Nebula DNS? We&apos;re here to help. Send us a message and our team will get back to you shortly.
          </p>
        </div>
      </div>

      {/* Contact Form & Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-space-800 rounded-2xl p-8 border border-space-200 dark:border-space-700 shadow-lg">
              <h2 className="text-2xl font-bold text-space-900 dark:text-white mb-6">
                Send us a message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2"
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formState.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-space-300 dark:border-space-600 bg-white dark:bg-space-900 text-space-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2"
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formState.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-space-300 dark:border-space-600 bg-white dark:bg-space-900 text-space-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="company"
                    className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2"
                  >
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formState.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-space-300 dark:border-space-600 bg-white dark:bg-space-900 text-space-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Acme Corp (optional)"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-space-700 dark:text-space-300 mb-2"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formState.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-space-300 dark:border-space-600 bg-white dark:bg-space-900 text-space-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                    placeholder="Tell us about your DNS security needs..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>

          {/* Contact Info Sidebar */}
          <div className="space-y-6">
            {/* Contact Methods */}
            <div className="bg-white dark:bg-space-800 rounded-2xl p-6 border border-space-200 dark:border-space-700">
              <h3 className="text-lg font-bold text-space-900 dark:text-white mb-4">
                Contact Information
              </h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-space-600 dark:text-space-400">
                      Sales Inquiries
                    </p>
                    <a
                      href="mailto:sales@nebuladns.io"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      sales@nebuladns.io
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-space-600 dark:text-space-400">
                      Customer Support
                    </p>
                    <a
                      href="mailto:support@nebuladns.io"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      support@nebuladns.io
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-space-600 dark:text-space-400">
                      Live Chat
                    </p>
                    <p className="text-space-700 dark:text-space-300 text-sm">
                      Available 9am-5pm EST
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Office Hours */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800">
              <h3 className="text-lg font-bold text-space-900 dark:text-white mb-3">
                Business Hours
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-space-600 dark:text-space-400">Monday - Friday</span>
                  <span className="font-medium text-space-900 dark:text-white">9am - 6pm EST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-space-600 dark:text-space-400">Saturday - Sunday</span>
                  <span className="font-medium text-space-900 dark:text-white">Closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-space-50 dark:bg-space-800 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-space-900 dark:text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white dark:bg-space-900 rounded-lg p-6 shadow-sm border border-space-200 dark:border-space-700"
              >
                <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-2">
                  {faq.q}
                </h3>
                <p className="text-space-600 dark:text-space-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
