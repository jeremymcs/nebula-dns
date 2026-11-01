// Flux Shield - Blog Post Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketingPageShell, MarketingCard } from '@/components/marketing/MarketingPageShell'
import { MarketingPageHero, MarketingSerifAccent } from '@/components/marketing/MarketingPageHero'
import { MarketingCtaBand } from '@/components/marketing/MarketingCtaBand'
import { SITE_URL } from '@/lib/config'

interface BlogPostFrontmatter {
  title: string
  date: string
  author: string
  excerpt: string
  category: string
  readTime?: string
}

interface PageProps {
  params: Promise<{ slug: string }>
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

function parseMarkdownContent(content: string): string {
  let html = content

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-ink mt-8 mb-4">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold text-ink mt-10 mb-5">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-semibold text-ink mt-12 mb-6">$1</h1>')

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-ink">$1</strong>')

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-[var(--fs-txt)]">$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-400 hover:text-primary-300 underline underline-offset-2">$1</a>')

  // Unordered lists
  html = html.replace(/^\- (.*$)/gim, '<li class="ml-6 mb-2 text-[var(--fs-txt)]">$1</li>')
  html = html.replace(/(<li[\s\S]*<\/li>)/, '<ul class="list-disc space-y-2 my-4">$1</ul>')

  // Ordered lists
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-6 mb-2 text-[var(--fs-txt)]">$1</li>')

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="fs-card rounded-[14px] border border-[var(--fs-line)] p-4 overflow-x-auto my-6"><code class="text-sm text-[var(--fs-blue)] font-mono">$1</code></pre>')

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="rounded-md border border-[var(--fs-line)] bg-[var(--fs-surface)] px-2 py-0.5 text-sm text-[var(--fs-blue)] font-mono">$1</code>')

  // Paragraphs
  const paragraphs = html.split('\n\n')
  html = paragraphs
    .map(p => {
      p = p.trim()
      if (!p) return ''
      if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol') || p.startsWith('<pre') || p.startsWith('<li')) {
        return p
      }
      return `<p class="text-lg text-[var(--fs-txt)] leading-relaxed mb-6">${p}</p>`
    })
    .join('\n')

  return html
}

function getBlogPost(slug: string): { frontmatter: BlogPostFrontmatter; content: string } | null {
  const postsDirectory = path.join(process.cwd(), 'src/content/blog')
  const filePath = path.join(postsDirectory, `${slug}.mdx`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const fileContents = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContents)

  return {
    frontmatter: data as BlogPostFrontmatter,
    content
  }
}

export async function generateStaticParams() {
  const postsDirectory = path.join(process.cwd(), 'src/content/blog')

  if (!fs.existsSync(postsDirectory)) {
    return []
  }

  const filenames = fs.readdirSync(postsDirectory)
    .filter(name => name.endsWith('.mdx'))

  return filenames.map(filename => ({
    slug: filename.replace('.mdx', '')
  }))
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = getBlogPost(slug)

  if (!post) {
    notFound()
  }

  const { frontmatter, content } = post
  const htmlContent = parseMarkdownContent(content)
  const readTime = frontmatter.readTime || '5 min read'

  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(frontmatter.title)}&url=${encodeURIComponent(`${SITE_URL}/blog/${slug}`)}`
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${SITE_URL}/blog/${slug}`)}`

  return (
    <MarketingPageShell>
      <section className="border-b border-[var(--fs-line)] bg-canvas">
        <div className="section-container relative z-[1] py-12 sm:py-16 max-w-4xl">
          <nav className="mb-8 flex items-center gap-2 text-sm text-[var(--fs-mut)]">
            <Link href="/blog" className="hover:text-[var(--fs-blue)] transition-colors">
              Blog
            </Link>
            <span aria-hidden>→</span>
            <span className="truncate text-[var(--fs-txt)]">{frontmatter.title}</span>
          </nav>

          <div className="mb-5">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-[var(--fs-line)] bg-[var(--fs-surface)] text-[var(--fs-txt)]`}>
              {frontmatter.category}
            </span>
          </div>

          <h1 className="fs-section-title mt-0 max-w-none text-left">{frontmatter.title}</h1>

          <div className="mt-8 flex flex-wrap items-center gap-5 text-[var(--fs-txt)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--fs-navy)] text-sm font-semibold text-white">
                {frontmatter.author.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="text-sm font-medium text-ink">{frontmatter.author}</div>
                <div className="text-xs text-[var(--fs-mut)]">Author</div>
              </div>
            </div>
            <time dateTime={frontmatter.date} className="text-sm">
              {new Date(frontmatter.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
            <span className="text-sm">{readTime}</span>
          </div>
        </div>
      </section>

      <article className="section-container max-w-4xl py-14">
        <div className="prose-nebula mx-auto" dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </article>

      <div className="border-t border-[var(--fs-line)] py-10">
        <div className="section-container max-w-4xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-ink mb-1">Share this article</p>
              <p className="text-sm text-[var(--fs-mut)]">Help others learn about DNS security</p>
            </div>
            <div className="flex gap-3">
              <a href={twitterShareUrl} target="_blank" rel="noopener noreferrer" className="fs-btn no-underline text-sm">
                Share on X
              </a>
              <a href={linkedinShareUrl} target="_blank" rel="noopener noreferrer" className="fs-btn no-underline text-sm">
                Share on LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="section-container max-w-4xl pb-20">
        <MarketingCtaBand
          title={
            <>
              Explore more on the <MarketingSerifAccent>blog</MarketingSerifAccent>
            </>
          }
          description="Browse guides, product updates, and DNS security best practices."
          primaryHref="/blog"
          primaryLabel="View all posts"
          secondaryHref="/signup"
          secondaryLabel="Start free trial"
          finePrint=""
        />
      </div>
    </MarketingPageShell>
  )
}
