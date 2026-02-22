// Nebula DNS - About Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'

export default function AboutPage() {
  const values = [
    {
      title: 'Privacy by Default',
      description: 'We believe privacy is a fundamental right, not a feature. Every decision we make prioritizes user privacy and data minimization.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
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
    },
    {
      title: 'Innovation',
      description: 'Continuously pushing boundaries to deliver cutting-edge DNS security without compromising performance or usability.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      ),
    },
    {
      title: 'Customer Success',
      description: 'Your success is our success. We provide world-class support and continuously improve based on customer feedback.',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
        </svg>
      ),
    },
  ]

  const team = [
    {
      name: 'Jeremy McSpadden',
      role: 'Founder & CEO',
      bio: 'Serial entrepreneur with 15+ years in cybersecurity. Previously founded two successful security startups.',
      avatar: 'JM',
    },
    {
      name: 'Sarah Chen',
      role: 'CTO',
      bio: 'Former Principal Engineer at Cloudflare. Expert in distributed systems and DNS infrastructure at scale.',
      avatar: 'SC',
    },
    {
      name: 'Marcus Johnson',
      role: 'VP of Engineering',
      bio: 'Led engineering teams at major tech companies. Passionate about building reliable, high-performance systems.',
      avatar: 'MJ',
    },
    {
      name: 'Dr. Emily Watson',
      role: 'Head of Security Research',
      bio: 'PhD in Computer Security. Published researcher in DNS security and threat intelligence.',
      avatar: 'EW',
    },
  ]

  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-space-900 dark:text-white">
            Securing the Internet, One Query at a Time
          </h1>
          <p className="mt-4 text-lg text-space-600 dark:text-space-300 max-w-3xl mx-auto">
            We are on a mission to make DNS security accessible, privacy-focused, and lightning-fast for
            organizations of all sizes.
          </p>
        </div>
      </div>

      {/* Mission Statement */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-white dark:bg-space-800 rounded-2xl border border-space-200 dark:border-space-700 p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white mb-4">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-space-900 dark:text-white">Our Mission</h2>
          </div>
          <p className="text-lg text-space-600 dark:text-space-400 text-center max-w-3xl mx-auto leading-relaxed">
            To provide enterprise-grade DNS security that respects user privacy while blocking malware, phishing,
            and unwanted content. We believe everyone deserves a safer internet experience without sacrificing
            speed, privacy, or control.
          </p>
        </div>
      </div>

      {/* Values */}
      <div className="bg-space-50 dark:bg-space-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-space-900 dark:text-white">
              Our Core Values
            </h2>
            <p className="mt-4 text-lg text-space-600 dark:text-space-300 max-w-2xl mx-auto">
              The principles that guide every decision we make.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-white dark:bg-space-900 rounded-xl border border-space-200 dark:border-space-700 p-6 hover:shadow-lg transition-all"
              >
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-4">
                  {value.icon}
                </div>
                <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-2">
                  {value.title}
                </h3>
                <p className="text-space-600 dark:text-space-400">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Our Story */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-space-900 dark:text-white mb-6">
              Our Story
            </h2>
            <div className="space-y-4 text-space-600 dark:text-space-400">
              <p>
                Nebula DNS was born from frustration with existing DNS security solutions that were either
                too complex, too expensive, or didn't respect user privacy. We knew there had to be a better way.
              </p>
              <p>
                In 2025, our founding team came together with a shared vision: build a DNS security platform
                that combines enterprise-grade protection with consumer-friendly simplicity. We wanted something
                that could scale from a home office to a global enterprise without compromise.
              </p>
              <p>
                Today, we protect millions of DNS queries daily, helping organizations around the world block
                threats while preserving privacy. Our platform is built on modern infrastructure, designed for
                speed, and engineered with security at every layer.
              </p>
              <p>
                But we are just getting started. Our roadmap includes advanced threat intelligence, machine learning-powered
                protection, and expanded integration capabilities. We are committed to staying at the forefront
                of DNS security innovation.
              </p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-space-900 dark:text-white mb-6">Milestones</h3>
            <div className="space-y-6">
              {[
                { date: 'Q1 2025', event: 'Company Founded', description: 'Nebula DNS officially launched' },
                { date: 'Q2 2025', event: '1M Queries Milestone', description: 'Reached 1 million daily queries' },
                { date: 'Q4 2025', event: 'Enterprise Launch', description: 'Introduced enterprise features and SSO' },
                { date: 'Q1 2026', event: 'Global Expansion', description: 'Expanded to 15 global data centers' },
              ].map((milestone, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                    {index + 1}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{milestone.date}</div>
                    <div className="font-semibold text-space-900 dark:text-white">{milestone.event}</div>
                    <div className="text-sm text-space-600 dark:text-space-400">{milestone.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="bg-space-50 dark:bg-space-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-space-900 dark:text-white">
              Meet the Team
            </h2>
            <p className="mt-4 text-lg text-space-600 dark:text-space-300 max-w-2xl mx-auto">
              Experienced security professionals passionate about building a safer internet.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div
                key={index}
                className="bg-white dark:bg-space-900 rounded-xl border border-space-200 dark:border-space-700 p-6 text-center hover:shadow-lg transition-all"
              >
                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl font-bold mb-4">
                  {member.avatar}
                </div>
                <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-1">
                  {member.name}
                </h3>
                <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-3">
                  {member.role}
                </div>
                <p className="text-sm text-space-600 dark:text-space-400">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { label: 'Daily Queries', value: '50M+', icon: '⚡' },
            { label: 'Customers', value: '10K+', icon: '👥' },
            { label: 'Uptime', value: '99.99%', icon: '✓' },
            { label: 'Countries', value: '50+', icon: '🌍' },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6 text-center"
            >
              <div className="text-4xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold text-space-900 dark:text-white mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-space-600 dark:text-space-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Careers CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Join Our Team
          </h2>
          <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
            We are always looking for talented individuals who share our passion for security, privacy, and innovation.
            Check out our open positions and become part of the Nebula DNS story.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/careers"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white text-indigo-600 font-medium hover:bg-space-100 transition-all"
            >
              View Open Positions
            </Link>
            <Link
              href="/contact?subject=careers"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-transparent border-2 border-white text-white font-medium hover:bg-white/10 transition-all"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
