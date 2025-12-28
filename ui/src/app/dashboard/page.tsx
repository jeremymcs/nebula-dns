/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Dashboard - Redirects to Mission Control
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/mission-control')
  }, [router])

  return null
}
