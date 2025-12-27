/**
 * Partner Portal Layout
 * Wraps all partner pages except login
 */

'use client'

import { usePathname } from 'next/navigation'
import { PartnerLayout } from '@/components/layout'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Don't wrap login page with the dashboard layout
  if (pathname === '/partner/login') {
    return <>{children}</>
  }

  return <PartnerLayout>{children}</PartnerLayout>
}

