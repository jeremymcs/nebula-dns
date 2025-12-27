/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Dashboard - Redirects to Mission Control
 */

import { redirect } from 'next/navigation'

export default function DashboardPage() {
  redirect('/dashboard/mission-control')
}
