/**
 * Nebula DNS - Partner Dashboard Layout
 * MSP/Reseller Portal with Organization Switcher
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FullPageLoading } from '@/components/LoadingSpinner'
import {
  HomeIcon,
  BuildingOffice2Icon,
  UsersIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline'

interface Partner {
  id: string
  name: string
  slug: string
  plan: string
  branding?: {
    logoUrl?: string
    primaryColor?: string
  }
}

interface PartnerUser {
  id: string
  email: string
  name: string
  role: string
}

interface Organization {
  id: string
  name: string
  slug: string
  status: string
}

const navItems = [
  { href: '/partner/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/partner/organizations', label: 'Organizations', icon: BuildingOffice2Icon },
  { href: '/partner/users', label: 'Partner Users', icon: UsersIcon },
  { href: '/partner/reports', label: 'Reports', icon: ChartBarIcon },
  { href: '/partner/settings', label: 'Settings', icon: Cog6ToothIcon },
]

export function PartnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [partner, setPartner] = useState<Partner | null>(null)
  const [user, setUser] = useState<PartnerUser | null>(null)
  const [impersonating, setImpersonating] = useState<Organization | null>(null)
  const [showOrgDropdown, setShowOrgDropdown] = useState(false)

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('partnerToken')
    const storedUser = localStorage.getItem('partnerUser')
    const storedPartner = localStorage.getItem('partner')

    if (!token || !storedUser || !storedPartner) {
      router.push('/partner/login')
      return
    }

    try {
      setUser(JSON.parse(storedUser))
      setPartner(JSON.parse(storedPartner))
      
      // Check impersonation status
      checkImpersonation(token)
    } catch {
      router.push('/partner/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  const checkImpersonation = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner-dashboard/impersonate/current`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setImpersonating(data.data)
      }
    } catch {
      // Not impersonating
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('partnerToken')
    localStorage.removeItem('partnerUser')
    localStorage.removeItem('partner')
    router.push('/partner/login')
  }

  const stopImpersonation = async () => {
    const token = localStorage.getItem('partnerToken')
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partner-dashboard/impersonate/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      setImpersonating(null)
    } catch {
      // Handle error
    }
  }

  if (loading) {
    return <FullPageLoading />
  }

  if (!partner || !user) {
    return <FullPageLoading />
  }

  return (
    <div className="min-h-screen bg-space-50 dark:bg-space-950">
      {/* Impersonation Banner */}
      {impersonating && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-medium">
            <ArrowsRightLeftIcon className="h-4 w-4 inline mr-2" />
            Viewing as: <strong>{impersonating.name}</strong>
          </span>
          <button
            onClick={stopImpersonation}
            className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
          >
            Exit
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <header className="bg-white dark:bg-space-900 border-b border-space-200 dark:border-space-800 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/partner/dashboard" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <BuildingOffice2Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-space-900 dark:text-white">{partner.name}</span>
                <span className="block text-xs text-emerald-600 dark:text-emerald-400">Partner Portal</span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'text-space-600 dark:text-space-400 hover:bg-space-100 dark:hover:bg-space-800'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-space-100 dark:bg-space-800 hover:bg-space-200 dark:hover:bg-space-700 transition-colors"
                >
                  <span className="text-sm font-medium text-space-700 dark:text-space-300">{user.name}</span>
                  <ChevronDownIcon className="h-4 w-4 text-space-500" />
                </button>

                {showOrgDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-space-800 rounded-xl shadow-lg ring-1 ring-space-200 dark:ring-space-700 py-1 z-50">
                    <div className="px-4 py-2 border-b border-space-200 dark:border-space-700">
                      <p className="text-xs text-space-500">{user.email}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 capitalize">{user.role}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger-600 dark:text-danger-400 hover:bg-space-50 dark:hover:bg-space-700"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}

