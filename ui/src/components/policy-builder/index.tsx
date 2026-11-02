/**
 * Nebula DNS - Policy Builder Components
 * Heavy components are lazy-loaded since policy builder is accessed less frequently
 */

import dynamic from 'next/dynamic'

// Type exports (no lazy loading needed for types)
export * from './types'
export * from './templates'

// Lazy-loaded policy builder components (reduces initial bundle)
export const PolicyFlowCanvas = dynamic(
  () => import('./PolicyFlowCanvas').then((mod) => mod.PolicyFlowCanvas),
  {
    loading: () => (
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-8">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
          <p className="mt-4 text-space-500">Loading policy canvas...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
)

export const NodeConfigPanel = dynamic(
  () => import('./NodeConfigPanel').then((mod) => mod.NodeConfigPanel),
  {
    loading: () => (
      <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-4">
        <div className="h-6 w-32 bg-space-200 dark:bg-space-700 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-space-100 dark:bg-space-800 rounded animate-pulse" />
          <div className="h-10 bg-space-100 dark:bg-space-800 rounded animate-pulse" />
          <div className="h-10 bg-space-100 dark:bg-space-800 rounded animate-pulse" />
        </div>
      </div>
    ),
    ssr: false,
  }
)

export const TemplateSelector = dynamic(
  () => import('./TemplateSelector').then((mod) => mod.TemplateSelector),
  {
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-4"
          >
            <div className="h-6 w-24 bg-space-200 dark:bg-space-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-full bg-space-100 dark:bg-space-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    ),
    ssr: false,
  }
)

export const NodePalette = dynamic(
  () => import('./NodePalette').then((mod) => mod.NodePalette),
  { ssr: false }
)

// Lighter components - normal exports
export { FlowNode } from './FlowNode'
export { ConnectionLine } from './ConnectionLine'
