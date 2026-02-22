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
}

interface PageProps {
  params: Promise<{ slug: string }>
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Security': 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300',
    'Tutorial': 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
    'Guide': 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300',
    'Product': 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300',
  }
  return colors[category] || 'bg-space-100 dark:bg-space-700 text-space-700 dark:text-space-300'
}

function parseMarkdownContent(content: string): string {
  // Simple markdown parsing for common elements
  let html = content

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-2xl font-bold text-space-900 dark:text-white mt-8 mb-4">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-3xl font-bold text-space-900 dark:text-white mt-10 mb-5">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-4xl font-bold text-space-900 dark:text-white mt-12 mb-6">$1</h1>')

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-space-900 dark:text-white">$1</strong>')

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-600 dark:text-indigo-400 hover:underline">$1</a>')

  // Unordered lists
  html = html.replace(/^\- (.*$)/gim, '<li class="ml-6 mb-2">$1</li>')
  html = html.replace(/(<li[\s\S]*<\/li>)/, '<ul class="list-disc space-y-2 my-4">$1</ul>')

  // Ordered lists
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-6 mb-2">$1</li>')

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-space-100 dark:bg-space-800 p-4 rounded-lg overflow-x-auto my-4"><code class="text-sm text-space-800 dark:text-space-200">$1</code></pre>')

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-space-100 dark:bg-space-800 px-2 py-1 rounded text-sm text-space-800 dark:text-space-200">$1</code>')

  // Paragraphs
  const paragraphs = html.split('\n\n')
  html = paragraphs
    .map(p => {
      p = p.trim()
      if (!p) return ''
      if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol') || p.startsWith('<pre') || p.startsWith('<li')) {
        return p
      }
      return `<p class="text-lg text-space-700 dark:text-space-300 leading-relaxed mb-6">${p}</p>`
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

  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 border-b border-space-200 dark:border-space-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back to Blog */}
          <Link
            href="/blog"
            className="inline-flex items-center text-space-600 dark:text-space-400 hover:text-space-900 dark:hover:text-white mb-8 group"
          >
            <svg className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Blog
          </Link>

          {/* Category Badge */}
          <div className="mb-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(frontmatter.category)}`}>
              {frontmatter.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold text-space-900 dark:text-white mb-6">
            {frontmatter.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-space-600 dark:text-space-400">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold mr-3">
                {frontmatter.author.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="font-medium text-space-900 dark:text-white">{frontmatter.author}</div>
              </div>
            </div>
            <span className="text-space-400 dark:text-space-600">•</span>
            <time dateTime={frontmatter.date}>
              {new Date(frontmatter.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </time>
          </div>
        </div>
      </div>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </article>

      {/* Share Section */}
      <div className="border-t border-space-200 dark:border-space-800 bg-space-50 dark:bg-space-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-1">
                Share this article
              </h3>
              <p className="text-sm text-space-600 dark:text-space-400">
                Help others learn about DNS security
              </p>
            </div>
            <div className="flex gap-3">
              <button className="h-10 w-10 rounded-full bg-white dark:bg-space-700 border border-space-200 dark:border-space-600 flex items-center justify-center text-space-600 dark:text-space-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
                </svg>
              </button>
              <button className="h-10 w-10 rounded-full bg-white dark:bg-space-700 border border-space-200 dark:border-space-600 flex items-center justify-center text-space-600 dark:text-space-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Related Articles CTA */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <Link
            href="/blog"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            View All Articles
            <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
