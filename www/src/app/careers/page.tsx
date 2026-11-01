// Flux Shield - Careers Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'
import { MarketingPageShell, MarketingCard } from '@/components/marketing/MarketingPageShell'
import { MarketingPageHero, MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'

const values = [
  {
    title: 'Remote-First Culture',
    description: 'Work from anywhere in the world. We believe in flexibility, trust, and async-first communication.',
    variant: 'purple',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Competitive Compensation',
    description: 'Industry-leading salaries, meaningful equity, and a comprehensive benefits package that actually matters.',
    variant: 'cyan',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Professional Growth',
    description: 'Annual learning budget, conference attendance, mentorship programs, and a team that invests in you.',
    variant: 'purple',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    title: 'Work-Life Balance',
    description: 'Flexible hours, unlimited PTO, and a culture that deeply respects your time outside of work.',
    variant: 'cyan',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

const openings = [
  {
    title: 'Senior Backend Engineer',
    department: 'Engineering',
    deptColor: 'text-accent-400 bg-accent-900/40 border border-accent-800/50',
    location: 'Remote',
    description: 'Build scalable DNS infrastructure handling billions of queries. Work with Go, PostgreSQL, Redis, and ClickHouse to power real-time threat intelligence at global scale.',
  },
  {
    title: 'Frontend Engineer',
    department: 'Engineering',
    deptColor: 'text-accent-400 bg-accent-900/40 border border-accent-800/50',
    location: 'Remote',
    description: 'Create beautiful, responsive dashboards with React, Next.js, and TypeScript. Build the interfaces that give security teams visibility and control over their DNS environment.',
  },
  {
    title: 'Security Researcher',
    department: 'Security',
    deptColor: 'text-primary-400 bg-primary-900/40 border border-primary-800/50',
    location: 'Remote',
    description: 'Analyze emerging threat intelligence, curate and maintain blocklists, reverse-engineer malware infrastructure, and continuously improve our detection and prevention capabilities.',
  },
  {
    title: 'Customer Success Manager',
    department: 'Success',
    deptColor: 'text-success-400 bg-success-900/40 border border-success-800/50',
    location: 'Remote',
    description: 'Guide enterprise customers through onboarding, help them get maximum value from Flux Shield, and serve as their advocate as we build the product they need.',
  },
]

export default function CareersPage() {
  return (
    <MarketingPageShell>
      <MarketingPageHero
        eyebrow="Careers"
        title={<><MarketingSerifAccent>Join</MarketingSerifAccent> the Team Building the Future of DNS</>}
        lede="Our mission is to make the internet safer for everyone. We're a team of engineers, researchers, and security experts who believe DNS is the most under-leveraged layer of network defense."
      >
      </MarketingPageHero>


      {/* Hero Section */}
      <div className="relative py-16 sm:py-20 overflow-hidden">
<div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative section-container text-center">
          <p className="fs-eyebrow mb-4">
            CAREERS
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
              Join the Team
            </span>{' '}
            Building the Future of DNS
          </h1>
          <p className="mt-6 text-lg text-[var(--fs-txt)] max-w-2xl mx-auto">
            Our mission is to make the internet safer for everyone. We're a team of engineers, researchers, and security experts who believe DNS is the most under-leveraged layer of network defense.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#openings"
              className="fs-btn fs-btn-primary fs-btn-lg no-underline px-6 py-3 transition-all inline-flex items-center gap-2"
            >
              View Open Positions
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
            <Link
              href="/about"
              className="border border-space-700 text-[var(--fs-txt)] hover:text-white hover:border-space-500 rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center gap-2"
            >
              Learn About Us
            </Link>
          </div>
        </div>
      </div>

      {/* Core Values */}
      <div className="py-16 sm:py-20 border-t border-[var(--fs-line)]">
        <div className="section-container">
          <div className="text-center mb-16">
            <p className="fs-eyebrow mb-3">
              WHY NEBULA DNS
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink">
              Built for People Who Care About Their Work
            </h2>
            <p className="mt-4 text-[var(--fs-txt)] max-w-2xl mx-auto">
              We're building something special and we want the people who join us to feel that every day.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div
                key={index}
                className="fs-card rounded-[14px] p-6"
              >
                <div
                  className={
                    value.variant === 'purple'
                      ? 'h-12 w-12 rounded-xl bg-primary-900/50 border border-primary-800/50 flex items-center justify-center text-primary-400 mb-4'
                      : 'h-12 w-12 rounded-xl bg-accent-900/50 border border-accent-800/50 flex items-center justify-center text-accent-400 mb-4'
                  }
                >
                  {value.icon}
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">
                  {value.title}
                </h3>
                <p className="text-[var(--fs-txt)] text-sm">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <div id="openings" className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="fs-eyebrow mb-3">
              OPEN POSITIONS
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink">
              {openings.length} Roles Available
            </h2>
            <p className="mt-4 text-[var(--fs-txt)]">
              All positions are fully remote. We hire globally.
            </p>
          </div>

          <div className="space-y-4">
            {openings.map((job, index) => (
              <div
                key={index}
                className="fs-card rounded-[14px] p-6 hover:border-primary-700/50 transition-all group"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-ink group-hover:text-primary-300 transition-colors">
                      {job.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${job.deptColor}`}>
                        {job.department}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--fs-txt)]">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {job.location}
                      </span>
                    </div>
                    <p className="mt-3 text-[var(--fs-txt)] text-sm leading-relaxed">
                      {job.description}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <a
                      href={`mailto:careers@shield.fluxlabs.net?subject=Application: ${job.title}`}
                      className="text-primary-400 hover:text-primary-300 font-semibold text-sm inline-flex items-center gap-1 transition-colors"
                    >
                      Apply Now
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Don't see your role */}
      <div className="py-16 sm:py-20 border-t border-[var(--fs-line)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="fs-card rounded-[14px] p-10 text-center">
            <div className="h-12 w-12 rounded-xl bg-primary-900/50 border border-primary-800/50 flex items-center justify-center text-primary-400 mx-auto mb-6">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-ink mb-3">
              Don't see your role?
            </h3>
            <p className="text-[var(--fs-txt)] max-w-xl mx-auto mb-8">
              We're always looking for talented people who share our passion for security and innovation. Send us your resume and tell us what makes you exceptional.
            </p>
            <a
              href="mailto:careers@shield.fluxlabs.net"
              className="fs-btn fs-btn-primary fs-btn-lg no-underline px-6 py-3 transition-all inline-flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              careers@shield.fluxlabs.net
            </a>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary-700/10 rounded-full blur-3xl" />
        </div>
        <div className="relative section-container text-center">
          <p className="fs-eyebrow mb-4">
            JOIN US
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-ink mb-4">
            Come build the future of{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
              DNS security
            </span>
          </h2>
          <p className="text-[var(--fs-txt)] max-w-2xl mx-auto mb-8">
            We're on a mission to make the internet safer for billions of people. If that excites you, we want to hear from you.
          </p>
          <a
            href="#openings"
            className="fs-btn fs-btn-primary fs-btn-lg no-underline px-8 py-4 transition-all inline-flex items-center gap-2 text-lg"
          >
            See Open Positions
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </div>
      </div>
    </MarketingPageShell>
  )
}
