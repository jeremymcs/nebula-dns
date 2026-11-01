import Link from 'next/link'

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">404</p>
      <h1 className="mt-2 text-3xl font-bold text-space-900 dark:text-white">Page not found</h1>
      <p className="mt-3 max-w-md text-space-600 dark:text-space-400">
        This dashboard page does not exist or may have been moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
