// Nebula DNS - Blog Post Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'
import { notFound } from 'next/navigation'

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
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-2xl font-bold text-white mt-8 mb-4">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-3xl font-bold text-white mt-10 mb-5">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-4xl font-bold text-white mt-12 mb-6">$1</h1>')

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-space-300">$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-400 hover:text-primary-300 underline underline-offset-2">$1</a>')

  // Unordered lists
  html = html.replace(/^\- (.*$)/gim, '<li class="ml-6 mb-2 text-space-300">$1</li>')
  html = html.replace(/(<li[\s\S]*<\/li>)/, '<ul class="list-disc space-y-2 my-4">$1</ul>')

  // Ordered lists
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-6 mb-2 text-space-300">$1</li>')

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-space-900 border border-space-700 p-4 rounded-xl overflow-x-auto my-6"><code class="text-sm text-accent-400 font-mono">$1</code></pre>')

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-space-900 border border-space-700 px-2 py-0.5 rounded text-sm text-accent-400 font-mono">$1</code>')

  // Paragraphs
  const paragraphs = html.split('\n\n')
  html = paragraphs
    .map(p => {
      p = p.trim()
      if (!p) return ''
      if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol') || p.startsWith('<pre') || p.startsWith('<li')) {
        return p
      }
      return `<p class="text-lg text-space-300 leading-relaxed mb-6">${p}</p>`
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

  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(frontmatter.title)}&url=${encodeURIComponent(`https://nebuladns.io/blog/${slug}`)}`
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://nebuladns.io/blog/${slug}`)}`

  return (
    <div className="bg-space-950 min-h-screen">
      {/* Breadcrumb + Hero */}
      <div className="relative overflow-hidden pt-12 pb-16 border-b border-space-800">
        {/* Nebula orb */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-primary-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-space-500 mb-8">
            <Link href="/blog" className="hover:text-primary-400 transition-colors">
              Blog
            </Link>
            <svg className="h-4 w-4 text-space-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-space-400 truncate max-w-xs">{frontmatter.title}</span>
          </nav>

          {/* Category Badge */}
          <div className="mb-5">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadge(frontmatter.category)}`}>
              {frontmatter.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-8 leading-tight">
            {frontmatter.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-5 text-space-400">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {frontmatter.author.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="font-medium text-white text-sm">{frontmatter.author}</div>
                <div className="text-xs text-space-500">Author</div>
              </div>
            </div>
            <span className="text-space-700">·</span>
            <time dateTime={frontmatter.date} className="text-sm">
              {new Date(frontmatter.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
            <span className="text-space-700">·</span>
            <span className="text-sm">{readTime}</span>
          </div>
        </div>
      </div>

      {/* Article Body */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div
          className="prose-nebula"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </article>

      {/* Social Sharing */}
      <div className="border-t border-space-800 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="text-white font-semibold mb-1">Share this article</p>
              <p className="text-space-500 text-sm">Help others learn about DNS security</p>
            </div>
            <div className="flex gap-3">
              <a
                href={twitterShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-space-800 border border-space-700 text-white hover:bg-space-700 rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center gap-2 text-sm"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
                Share on Twitter
              </a>
              <a
                href={linkedinShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-space-800 border border-space-700 text-white hover:bg-space-700 rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center gap-2 text-sm"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                Share on LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Related CTA */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
        <div className="bg-space-900/60 backdrop-blur-sm border border-space-700/50 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-white font-semibold text-lg mb-1">Want to learn more?</p>
            <p className="text-space-400 text-sm">
              Browse the full collection of DNS security guides, product updates, and best practices.
            </p>
          </div>
          <Link
            href="/blog"
            className="bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow hover:shadow-glow-lg rounded-xl font-semibold px-6 py-3 transition-all inline-flex items-center gap-2 whitespace-nowrap"
          >
            View All Posts
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
