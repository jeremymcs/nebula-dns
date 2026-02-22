// Nebula DNS - Careers Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import Link from 'next/link'

const values = [
  {
    title: 'Remote-First Culture',
    description: 'Work from anywhere in the world. We believe in flexibility and trust.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Competitive Compensation',
    description: 'Industry-leading salaries, equity, and comprehensive benefits package.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Professional Growth',
    description: 'Annual learning budget, conference attendance, and mentorship programs.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    title: 'Work-Life Balance',
    description: 'Flexible hours, unlimited PTO, and a culture that respects your time.',
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
    location: 'Remote',
    type: 'Full-time',
    description: 'Build scalable DNS infrastructure handling billions of queries. Work with Go, PostgreSQL, and Redis.',
  },
  {
    title: 'Senior Frontend Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    description: 'Create beautiful, responsive dashboards with React, Next.js, and TypeScript.',
  },
  {
    title: 'DevOps Engineer',
    department: 'Infrastructure',
    location: 'Remote',
    type: 'Full-time',
    description: 'Manage our Kubernetes clusters, CI/CD pipelines, and monitoring infrastructure.',
  },
  {
    title: 'Security Analyst',
    department: 'Security',
    location: 'Remote',
    type: 'Full-time',
    description: 'Analyze threat intelligence, maintain blocklists, and improve our security posture.',
  },
]

export default function CareersPage() {
  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-space-900 dark:text-white">
              Join Our Team
            </h1>
            <p className="mt-4 text-lg text-space-600 dark:text-space-300 max-w-2xl mx-auto">
              Help us build the future of DNS security. Work with cutting-edge technology and a talented team committed to making the internet safer.
            </p>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-space-900 dark:text-white">
            Why Work at Nebula DNS?
          </h2>
          <p className="mt-4 text-lg text-space-600 dark:text-space-300">
            We're building something special, and we want you to be part of it
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <div
              key={index}
              className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6"
            >
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-4">
                {value.icon}
              </div>
              <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-2">
                {value.title}
              </h3>
              <p className="text-space-600 dark:text-space-400 text-sm">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Open Positions */}
      <div className="bg-space-50 dark:bg-space-800 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-space-900 dark:text-white">
              Current Openings
            </h2>
            <p className="mt-4 text-lg text-space-600 dark:text-space-300">
              {openings.length} open positions
            </p>
          </div>

          <div className="space-y-4">
            {openings.map((job, index) => (
              <div
                key={index}
                className="bg-white dark:bg-space-900 rounded-xl border border-space-200 dark:border-space-700 p-6 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-space-900 dark:text-white">
                      {job.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                        {job.department}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-space-100 dark:bg-space-700 text-space-700 dark:text-space-300">
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {job.location}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-space-100 dark:bg-space-700 text-space-700 dark:text-space-300">
                        {job.type}
                      </span>
                    </div>
                    <p className="mt-3 text-space-600 dark:text-space-400">
                      {job.description}
                    </p>
                  </div>
                  <div className="mt-4 md:mt-0 md:ml-6">
                    <Link
                      href={`/careers/${job.title.toLowerCase().replace(/\s+/g, '-')}`}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all whitespace-nowrap"
                    >
                      View Details
                      <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Don't See Your Role */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-8 text-center">
          <h3 className="text-2xl font-bold text-space-900 dark:text-white">
            Don't see your role?
          </h3>
          <p className="mt-4 text-space-600 dark:text-space-400 max-w-2xl mx-auto">
            We're always looking for talented people who share our passion for security and innovation. Send us your resume and let us know what makes you special.
          </p>
          <div className="mt-6">
            <a
              href="mailto:careers@nebuladns.io"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              careers@nebuladns.io
            </a>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to make an impact?
          </h2>
          <p className="text-lg text-indigo-100 mb-8">
            Join us in building the most advanced DNS security platform in the world
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#openings"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-indigo-600 font-medium hover:bg-space-100 transition-all"
            >
              View Open Positions
            </a>
            <Link
              href="/about"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border-2 border-white text-white font-medium hover:bg-white/10 transition-all"
            >
              Learn More About Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
