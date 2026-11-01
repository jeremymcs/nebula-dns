import { notFound } from 'next/navigation'

/** Unknown dashboard paths render the dashboard-scoped not-found UI. */
export default function DashboardUnknownRoutePage() {
  notFound()
}
