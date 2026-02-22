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
    }
  })

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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

export default function BlogPage() {
  const posts = getBlogPosts()

  return (
    <div className="bg-white dark:bg-space-900 transition-colors">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-space-900 dark:text-white mb-4">
              Blog
            </h1>
            <p className="text-xl text-space-600 dark:text-space-300 max-w-3xl mx-auto">
              Insights on DNS security, content filtering, and network protection
            </p>
          </div>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-space-600 dark:text-space-400">No blog posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg transition-all overflow-hidden group"
              >
                <div className="p-6">
                  {/* Category Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(post.category)}`}>
                      {post.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-space-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    <Link href={`/blog/${post.slug}`}>
                      {post.title}
                    </Link>
                  </h2>

                  {/* Excerpt */}
                  <p className="text-space-600 dark:text-space-400 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-sm text-space-500 dark:text-space-400 mb-4">
                    <span>{post.author}</span>
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </time>
                  </div>

                  {/* Read More Link */}
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium text-sm group-hover:translate-x-1 transition-transform"
                  >
                    Read more
                    <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Newsletter CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Stay Updated
          </h2>
          <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
            Get the latest insights on DNS security and content filtering delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg border-0 focus:ring-2 focus:ring-white text-space-900"
            />
            <button className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-space-100 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
