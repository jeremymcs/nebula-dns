/**
 * Partner Portal Root Page
 * Redirects to login or dashboard based on auth state
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PartnerRootPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if partner is authenticated
    const partnerToken = localStorage.getItem('partnerToken')

    if (partnerToken) {
      router.replace('/partner/dashboard')
    } else {
      router.replace('/partner/login')
    }
  }, [router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-space-50 dark:bg-space-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  )
}
