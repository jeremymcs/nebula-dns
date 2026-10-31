// Flux Shield - About Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'

const values = [
  {
    title: 'Privacy by Default',
    description: 'We believe privacy is a fundamental right, not a feature. Every decision we make prioritizes user privacy and data minimization.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    accent: 'purple',
  },
  {
    title: 'Transparency',
    description: 'Open communication about our practices, policies, and roadmap. No hidden data collection or surprise changes.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    accent: 'cyan',
  },
  {
    title: 'Innovation',
    description: 'Continuously pushing boundaries to deliver cutting-edge DNS security without compromising performance or usability.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    accent: 'purple',
  },
  {
    title: 'Customer Success',
    description: 'Your success is our success. We provide world-class support and continuously improve based on customer feedback.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
      </svg>
    ),
    accent: 'cyan',
  },
]

const team = [
  {
    name: 'Jeremy McSpadden',
    role: 'Founder & CEO',
    bio: 'Serial entrepreneur with 15+ years in cybersecurity. Previously founded two successful security startups.',
    initials: 'JM',
    gradient: 'from-primary-600 to-primary-400',
  },
  {
    name: 'Sarah Chen',
    role: 'CTO',
    bio: 'Former Principal Engineer at Cloudflare. Expert in distributed systems and DNS infrastructure at scale.',
    initials: 'SC',
    gradient: 'from-accent-600 to-accent-400',
  },
  {
    name: 'Marcus Johnson',
    role: 'VP of Engineering',
    bio: 'Led engineering teams at major tech companies. Passionate about building reliable, high-performance systems.',
    initials: 'MJ',
    gradient: 'from-primary-500 to-accent-500',
  },
  {
    name: 'Dr. Emily Watson',
    role: 'Head of Security Research',
    bio: 'PhD in Computer Security. Published researcher in DNS security and threat intelligence.',
    initials: 'EW',
    gradient: 'from-accent-500 to-primary-500',
  },
]

const stats = [
  { label: 'Daily Queries', value: '50M+' },
  { label: 'Customers', value: '10K+' },
  { label: 'Uptime', value: '99.99%' },
  { label: 'Countries', value: '50+' },
]

const milestones = [
  { date: 'Q1 2025', event: 'Company Founded', description: 'Flux Shield officially launched with a focus on privacy-first DNS security.' },
  { date: 'Q2 2025', event: '1M Queries Milestone', description: 'Reached 1 million daily queries within months of launch.' },
  { date: 'Q4 2025', event: 'Enterprise Launch', description: 'Introduced enterprise features, SSO, and dedicated support tiers.' },
  { date: 'Q1 2026', event: 'Global Expansion', description: 'Expanded to 15 global data centers covering 50+ countries.' },
  { date: 'Q2 2026', event: 'AI Threat Intelligence', description: 'Launched machine learning-powered threat detection and automated playbooks.' },
]

export default function AboutPage() {
  return (
    <div className="bg-space-950">

      {/* Hero Section */}
      <section className="py-24 bg-space-950 relative overflow-hidden">
        {/* Nebula orbs */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-accent-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-4">
            Our Story
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight max-w-4xl mx-auto">
            Securing the Internet,{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
              One Query at a Time
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-space-400 max-w-3xl mx-auto">
            We are on a mission to make DNS security accessible, privacy-focused, and lightning-fast for
            organizations of all sizes — from home offices to global enterprises.
          </p>
          <p className="mt-4 text-sm text-space-500 max-w-2xl mx-auto">
            Flux Shield is built by{' '}
            <a href="https://fluxlabs.net" className="text-space-400 hover:text-white underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
              Flux Labs
            </a>
            , headquartered in Panama City Beach, Florida.
          </p>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-24 bg-space-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-3">
              What Drives Us
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Our Core Values
            </h2>
            <p className="mt-4 text-space-400 max-w-2xl mx-auto">
              The principles that guide every decision we make.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6 hover:border-primary-700/50 transition-all"
              >
                {value.accent === 'purple' ? (
                  <div className="h-12 w-12 rounded-xl bg-primary-900/50 border border-primary-800/50 flex items-center justify-center text-primary-400 mb-4">
                    {value.icon}
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-accent-900/50 border border-accent-800/50 flex items-center justify-center text-accent-400 mb-4">
                    {value.icon}
                  </div>
                )}
                <h3 className="text-lg font-semibold text-white mb-2">
                  {value.title}
                </h3>
                <p className="text-space-400 text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section className="py-24 bg-space-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6 text-center"
              >
                <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400 mb-2">
                  {stat.value}
                </div>
                <div className="text-space-400 text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 bg-space-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-3">
              The People Behind Flux Shield
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Meet the Team
            </h2>
            <p className="mt-4 text-space-400 max-w-2xl mx-auto">
              Experienced security professionals passionate about building a safer internet.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, index) => (
              <div
                key={index}
                className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6 text-center hover:border-primary-700/50 transition-all"
              >
                <div className={`inline-flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br ${member.gradient} text-white text-2xl font-bold mb-4`}>
                  {member.initials}
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {member.name}
                </h3>
                <div className="text-sm text-primary-400 mb-3">
                  {member.role}
                </div>
                <p className="text-sm text-space-400 leading-relaxed">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24 bg-space-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-3">
              Company Milestones
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Our Journey
            </h2>
            <p className="mt-4 text-space-400">
              From founding to global scale — a brief history of Flux Shield.
            </p>
          </div>

          <div className="relative pl-8 border-l-2 border-primary-700 space-y-10">
            {milestones.map((milestone, index) => (
              <div key={index} className="relative">
                {/* Dot marker */}
                <div className="absolute -left-[2.3rem] top-1 h-5 w-5 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 border-2 border-space-950 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>

                <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6">
                  <div className="text-xs font-semibold text-primary-400 uppercase tracking-widest mb-1">
                    {milestone.date}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {milestone.event}
                  </h3>
                  <p className="text-space-400 text-sm leading-relaxed">
                    {milestone.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Join Us */}
      <section className="py-24 bg-space-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-10 text-center">
            <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-4">
              Join the Mission
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Build the Future of DNS Security
            </h2>
            <p className="text-space-400 mb-8 max-w-xl mx-auto">
              We are always looking for talented individuals who share our passion for security, privacy, and innovation.
              Check out our open positions and become part of the Flux Shield story.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/careers"
                className="bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center justify-center gap-2"
              >
                View Open Positions
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/contact"
                className="bg-space-800 border border-space-700 text-white hover:bg-space-700 rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center justify-center"
              >
                Get in Touch
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
