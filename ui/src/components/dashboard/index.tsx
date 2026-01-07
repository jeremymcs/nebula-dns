/**
 * Nebula DNS - Dashboard Components
 * Cosmic Security Theme
 * Charts are lazy-loaded to reduce initial bundle size
 */

import dynamic from 'next/dynamic'

export { HeroMetric, HeroMetricsGrid } from './HeroMetrics'
export { TopBlockedList } from './TopBlockedList'
export { ActivityFeed } from './ActivityFeed'

// Lazy-loaded chart components (reduces initial bundle by ~150KB)
export const QueryTrendsChart = dynamic(
  () => import('./QueryTrendsChart').then((mod) => mod.QueryTrendsChart),
  {
    loading: () => (
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-4">
        <div className="h-6 w-32 skeleton rounded mb-4" />
        <div className="h-64 skeleton rounded-xl" />
      </div>
    ),
    ssr: false,
  }
)

export const CategoryBreakdownChart = dynamic(
  () => import('./CategoryBreakdownChart').then((mod) => mod.CategoryBreakdownChart),
  {
    loading: () => (
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-4">
        <div className="h-6 w-40 skeleton rounded mb-4" />
        <div className="h-64 skeleton rounded-xl" />
      </div>
    ),
    ssr: false,
  }
)

