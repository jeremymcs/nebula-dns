// Nebula DNS - Guides & Tutorials Listing Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

'use client'

import Link from 'next/link'
import { useState } from 'react'

const guides = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of Nebula DNS and set up your first DNS filter in minutes.',
    time: '5 min',
    difficulty: 'Beginner' as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Setting Up DNS Filtering',
    description: 'Configure your network to route DNS queries through Nebula DNS for comprehensive protection.',
    time: '10 min',
    difficulty: 'Beginner' as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Creating Custom Policies',
    description: 'Build advanced filtering policies tailored to your organization\'s security requirements.',
    time: '15 min',
    difficulty: 'Intermediate' as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    title: 'Managing Multiple Locations',
    description: 'Set up location-based policies for offices, branches, and remote sites with granular control.',
    time: '20 min',
    difficulty: 'Intermediate' as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: 'API Integration Guide',
    description: 'Integrate Nebula DNS into your existing infrastructure using our comprehensive REST API.',
    time: '30 min',
    difficulty: 'Advanced' as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    title: 'Deploying Roaming Agents',
    description: 'Protect remote workers with our lightweight DNS agent for laptops and mobile devices.',
    time: '25 min',
    difficulty: 'Advanced' as const,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
]

const difficultyColors = {
  Beginner: 'bg-success-900/50 text-success-300',
  Intermediate: 'bg-warning-900/50 text-warning-300',
  Advanced: 'bg-danger-900/50 text-danger-300',
}

export default function GuidesPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredGuides = guides.filter(
    (guide) =>
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="bg-space-950 min-h-screen">
      {/* Hero Section */}
      <div className="py-20 border-b border-space-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-4">
              Guides
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
                Learn Nebula DNS
              </span>
            </h1>
            <p className="mt-4 text-lg text-space-400 max-w-2xl mx-auto">
              Step-by-step guides to help you get the most out of Nebula DNS. From beginner setup to advanced integrations.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mt-10 max-w-xl mx-auto">
            <div className="relative">
              <svg
                className="absolute left-3.5 top-3.5 h-5 w-5 text-space-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guides..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-space-900/60 backdrop-blur-sm border border-space-700/50 text-white placeholder-space-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-600/50 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Guides Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {filteredGuides.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-space-400 text-lg">No guides found matching &quot;{searchQuery}&quot;</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-primary-400 hover:text-primary-300 transition-colors"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.map((guide, index) => (
              <Link
                key={index}
                href="/docs/guides"
                className="group bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6 hover:border-primary-600/50 hover:bg-space-900/80 transition-all"
              >
                {/* Icon */}
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white mb-4">
                  {guide.icon}
                </div>

                {/* Difficulty Badge */}
                <div className="mb-3">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${difficultyColors[guide.difficulty]}`}>
                    {guide.difficulty}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-white group-hover:text-primary-300 transition-colors">
                  {guide.title}
                </h3>

                {/* Description */}
                <p className="mt-2 text-space-400 text-sm line-clamp-2">
                  {guide.description}
                </p>

                {/* Meta */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-space-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{guide.time}</span>
                  </div>
                  <span className="text-primary-400 text-sm font-medium group-hover:text-primary-300 transition-colors">
                    Read Guide →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="border-t border-space-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="bg-primary-900/30 border border-primary-800/50 rounded-xl p-8 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Can&apos;t find what you&apos;re looking for?
            </h2>
            <p className="text-space-400 mb-8">
              Our support team is here to help. Browse our full documentation or contact us directly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/docs"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-medium hover:from-primary-500 hover:to-accent-500 transition-all"
              >
                View Full Documentation
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-space-700/50 text-primary-400 hover:text-primary-300 hover:border-primary-700/50 font-medium transition-all"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
