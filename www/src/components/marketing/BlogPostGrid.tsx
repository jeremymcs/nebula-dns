'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export interface BlogGridPost {
  slug: string
  title: string
  date: string
  author: string
  excerpt: string
  category: string
  readTime?: string
  badgeClass: string
}

/** Blog index: category filter pills plus the post cards they filter. */
export function BlogPostGrid({ posts }: { posts: BlogGridPost[] }) {
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(posts.map((p) => p.category).filter(Boolean)))],
    [posts],
  )
  const [active, setActive] = useState('All')
  const shown = active === 'All' ? posts : posts.filter((p) => p.category === active)

  return (
    <div className="section-container pb-20 pt-12">
      <div className="flex flex-wrap gap-2.5" role="group" aria-label="Filter posts by category">
        {categories.map((cat) => {
          const on = cat === active
          return (
            <button
              key={cat}
              type="button"
              aria-pressed={on}
              onClick={() => setActive(cat)}
              className={
                on
                  ? 'fx-btn-grad h-10 rounded-full px-5 text-sm font-semibold'
                  : 'h-10 rounded-full border border-line bg-panel px-5 text-sm font-medium text-ink transition-colors hover:border-[var(--fx-coral)] hover:text-[var(--fx-coral)]'
              }
            >
              {cat}
            </button>
          )
        })}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((post) => (
          <article key={post.slug} className="fs-card group flex flex-col bg-panel p-6">
            <div className="mb-4">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${post.badgeClass}`}>
                {post.category}
              </span>
            </div>

            <h2 className="mb-3 text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-[var(--fx-coral)]">
              <Link href={`/blog/${post.slug}`} className="no-underline">
                {post.title}
              </Link>
            </h2>

            <p className="mb-5 line-clamp-3 flex-1 text-sm text-txt">{post.excerpt}</p>

            <div className="mb-4 flex items-center justify-between gap-3 text-xs text-mut">
              <span>{post.author}</span>
              <span className="flex items-center gap-2">
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                </time>
                <span aria-hidden>·</span>
                <span>{post.readTime}</span>
              </span>
            </div>

            <Link href={`/blog/${post.slug}`} className="text-sm font-semibold text-brand no-underline hover:underline">
              Read more →
            </Link>
          </article>
        ))}
      </div>
    </div>
  )
}
