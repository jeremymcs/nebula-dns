// Flux Shield - Blog Index Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { MarketingPageShell, MarketingCard } from '@/components/marketing/MarketingPageShell'
import { MarketingPageHero, MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'
import { BlogPostGrid } from '@/components/marketing/BlogPostGrid'

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
    'Security': 'bg-[var(--fs-danger-soft)] text-[var(--fs-danger)] border border-transparent',
    'DNS': 'bg-[var(--fs-danger-soft)] text-[var(--fx-coral)] border border-transparent',
    'Product': 'bg-[var(--fs-success-soft)] text-[var(--fs-success)] border border-transparent',
    'Tutorial': 'bg-primary-500/10 text-brand border border-primary-500/30',
    'Guide': 'bg-[var(--fs-danger-soft)] text-[var(--fx-coral)] border border-transparent',
  }
  return badges[category] || 'bg-primary-500/10 text-brand border border-primary-500/30'
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
    excerpt: 'DNS-level filtering stops threats before they ever reach your network. Discover the techniques Flux Shield uses to identify and block malicious domains in real time.',
    category: 'DNS',
    readTime: '6 min read',
  },
  {
    slug: 'flux-shield-v1-3-release',
    title: 'Flux Shield v1.3: Enhanced Analytics and Enterprise SSO',
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

  return (
    <MarketingPageShell>
      <MarketingPageHero
        eyebrow="Blog"
        title={<><MarketingSerifAccent>Insights</MarketingSerifAccent> & Updates</>}
        lede="Deep dives into DNS security, content filtering, network protection, and the latest from the Flux Shield team."
      >
      </MarketingPageHero>

      <BlogPostGrid
        posts={posts.map((post) => ({ ...post, badgeClass: getCategoryBadge(post.category) }))}
      />

      {/* Newsletter CTA */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="fs-card rounded-[14px] p-10 text-center">
          <p className="fs-eyebrow mb-3">
            NEWSLETTER
          </p>
          <h2 className="text-3xl font-bold text-ink mb-3">
            Stay in the Loop
          </h2>
          <p className="text-[var(--fs-txt)] mb-8 max-w-xl mx-auto">
            Get the latest DNS security insights, product updates, and threat intelligence
            delivered straight to your inbox. No spam, ever.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="you@company.com"
              className="flex-1 px-4 py-3 rounded-xl bg-panel border border-line text-ink placeholder-space-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button className="fs-btn fs-btn-primary fs-btn-lg no-underline px-6 py-3 transition-all inline-flex items-center gap-2 justify-center whitespace-nowrap">
              Subscribe
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
          <p className="text-[var(--fs-mut)] text-xs mt-4">
            Unsubscribe anytime. We respect your privacy.
          </p>
        </div>
      </div>
    </MarketingPageShell>
  )
}
