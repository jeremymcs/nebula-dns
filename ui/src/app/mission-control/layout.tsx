/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Mission Control Layout - Uses Dashboard Layout
 */

'use client'

import { DashboardLayout } from '@/components/layout'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}

