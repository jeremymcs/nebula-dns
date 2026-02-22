// Nebula DNS - Blog Index Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'

interface BlogPost {
  slug: string
  title: string
  date: string
  author: string
  excerpt: string
  category: string
  readTime?: string
}

function getBlogPosts(): BlogPost[] {
  const postsDirectory = path.join(process.cwd(), 'src/content/blog')

  if (!fs.existsSync(postsDirectory)) {
    return []
  }

  const filenames = fs.readdirSync(postsDirectory)
    .filter(name => name.endsWith('.mdx'))

  const posts = filenames.map(filename => {
    const filePath = path.join(postsDirectory, filename)
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const { data } = matter(fileContents)

    return {
      slug: filename.replace('.mdx', ''),
      title: data.title || '',
      date: data.date || '',
      author: data.author || '',
      excerpt: data.excerpt || '',
      category: data.category || '',
      readTime: data.readTime || '5 min read',
    }
  })

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function getCategoryBadge(category: string): string {
  const badges: Record<string, string> = {
    'Security': 'bg-danger-900/50 text-danger-300 border border-danger-800/50',
    'DNS': 'bg-accent-900/50 text-accent-300 border border-accent-800/50',
    'Product': 'bg-success-900/50 text-success-300 border border-success-800/50',
    'Tutorial': 'bg-primary-900/50 text-primary-300 border border-primary-800/50',
    'Guide': 'bg-accent-900/50 text-accent-300 border border-accent-800/50',
  }
  return badges[category] || 'bg-primary-900/50 text-primary-300 border border-primary-800/50'
}

// Static fallback posts shown when no MDX files exist
const fallbackPosts: BlogPost[] = [
  {
    slug: 'understanding-dns-security',
    title: 'Understanding DNS Security: A Complete Guide',
    date: '2026-02-15',
    author: 'Jeremy McSpadden',
    excerpt: 'DNS is the backbone of internet communication, yet it remains one of the most exploited vectors for cyberattacks. Learn how DNS security works and how to protect your organization.',
    category: 'Security',
    readTime: '8 min read',
  },
  {
    slug: 'block-malware-dns-level',
    title: 'How to Block Malware at the DNS Level',
    date: '2026-02-08',
    author: 'Jeremy McSpadden',
    excerpt: 'DNS-level filtering stops threats before they ever reach your network. Discover the techniques Nebula DNS uses to identify and block malicious domains in real time.',
    category: 'DNS',
    readTime: '6 min read',
  },
  {
    slug: 'nebula-dns-v1-3-release',
    title: 'Nebula DNS v1.3: Enhanced Analytics and Enterprise SSO',
    date: '2026-02-01',
    author: 'Jeremy McSpadden',
    excerpt: 'Version 1.3 brings a completely redesigned analytics dashboard, enterprise SSO integration, and significant performance improvements to the policy engine.',
    category: 'Product',
    readTime: '4 min read',
  },
  {
    slug: 'content-filtering-policies',
    title: 'Building Effective Content Filtering Policies',
    date: '2026-01-22',
    author: 'Jeremy McSpadden',
    excerpt: 'Crafting DNS filtering policies requires balancing security with usability. This guide walks through best practices for building policies that protect without disrupting productivity.',
    category: 'Guide',
    readTime: '7 min read',
  },
  {
    slug: 'dns-over-https-explained',
    title: 'DNS-over-HTTPS Explained: Privacy, Security, and Tradeoffs',
    date: '2026-01-14',
    author: 'Jeremy McSpadden',
    excerpt: 'DoH encrypts DNS traffic to prevent eavesdropping and manipulation, but it also introduces new challenges for corporate security monitoring. Here\'s what you need to know.',
    category: 'DNS',
    readTime: '9 min read',
  },
  {
    slug: 'phishing-prevention-dns',
    title: 'Stopping Phishing Attacks Before They Start',
    date: '2026-01-06',
    author: 'Jeremy McSpadden',
    excerpt: 'Phishing remains the top entry point for data breaches. DNS-layer protection can block phishing sites even before users click the link, making it one of the most effective defenses available.',
    category: 'Security',
    readTime: '5 min read',
  },
]

export default function BlogPage() {
  const mdxPosts = getBlogPosts()
  const posts = mdxPosts.length > 0 ? mdxPosts : fallbackPosts

  const categories = ['all', 'security', 'dns', 'product', 'guide']

  return (
    <div className="bg-space-950 min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden py-24">
        {/* Nebula orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-4">
            BLOG
          </p>
          <h1 className="text-5xl sm:text-6xl font-bold mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
              Insights &amp; Updates
            </span>
          </h1>
          <p className="text-xl text-space-400 max-w-3xl mx-auto">
            Deep dives into DNS security, content filtering, network protection, and the latest from
            the Nebula DNS team.
          </p>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                cat === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-space-800 text-space-400 hover:text-white hover:bg-space-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-6 flex flex-col hover:border-primary-700/50 transition-all group"
            >
              {/* Category Badge */}
              <div className="mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadge(post.category)}`}>
                  {post.category}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-lg font-bold text-white mb-3 group-hover:text-primary-300 transition-colors leading-snug">
                <Link href={`/blog/${post.slug}`}>
                  {post.title}
                </Link>
              </h2>

              {/* Excerpt */}
              <p className="text-space-400 text-sm mb-5 line-clamp-3 flex-1">
                {post.excerpt}
              </p>

              {/* Meta Info */}
              <div className="flex items-center justify-between text-xs text-space-500 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {post.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span>{post.author}</span>
                </div>
                <div className="flex items-center gap-3">
                  <time dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                  <span className="text-space-700">·</span>
                  <span>{post.readTime}</span>
                </div>
              </div>

              {/* Read More */}
              <Link
                href={`/blog/${post.slug}`}
                className="inline-flex items-center gap-1 text-primary-400 text-sm font-medium hover:text-primary-300 transition-colors group-hover:translate-x-0.5 transform"
              >
                Read More
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </article>
          ))}
        </div>
      </div>

      {/* Newsletter CTA */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-10 text-center">
          <p className="text-primary-400 text-xs font-semibold tracking-widest uppercase mb-3">
            NEWSLETTER
          </p>
          <h2 className="text-3xl font-bold text-white mb-3">
            Stay in the Loop
          </h2>
          <p className="text-space-400 mb-8 max-w-xl mx-auto">
            Get the latest DNS security insights, product updates, and threat intelligence
            delivered straight to your inbox. No spam, ever.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="you@company.com"
              className="flex-1 px-4 py-3 rounded-xl bg-space-800 border border-space-700 text-white placeholder-space-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button className="bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center gap-2 justify-center whitespace-nowrap">
              Subscribe
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
          <p className="text-space-600 text-xs mt-4">
            Unsubscribe anytime. We respect your privacy.
          </p>
        </div>
      </div>
    </div>
  )
}
