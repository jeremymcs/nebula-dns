import Link from 'next/link'
import { PRODUCT_NAME } from '@/lib/branding'

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white dark:bg-space-900">
      <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">404</p>
      <h1 className="mt-2 text-3xl font-bold text-space-900 dark:text-white">Page not found</h1>
      <p className="mt-3 max-w-md text-space-600 dark:text-space-400">
        The page you requested does not exist or may have been moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
      >
        Go to dashboard
      </Link>
      <p className="mt-6 text-xs text-space-500">{PRODUCT_NAME}</p>
    </main>
  )
}
