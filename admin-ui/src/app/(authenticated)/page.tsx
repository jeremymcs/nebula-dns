/**
 * Nebula DNS - Admin UI Dashboard Page
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Admin overview dashboard for managing MSPs, tenants, and system health.
 */

'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import {
  BuildingOffice2Icon,
  UsersIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'

// Quick stat card component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  color = 'primary',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color?: 'primary' | 'success' | 'warning' | 'danger'
}) {
  const colorStyles = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400',
    warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400',
    danger: 'bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400',
  }

  return (
    <Link
      href={href}
      className="block bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-6 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-space-500 dark:text-space-400">{title}</p>
          <p className="text-3xl font-bold text-space-900 dark:text-white mt-2">{value}</p>
          {subtitle && (
            <p className="text-sm text-space-500 dark:text-space-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorStyles[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Link>
  )
}

// Quick action card
function ActionCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-4 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all"
    >
      <div className="p-3 rounded-lg bg-space-100 dark:bg-space-700">
        <Icon className="h-5 w-5 text-space-600 dark:text-space-300" />
      </div>
      <div>
        <p className="font-medium text-space-900 dark:text-white">{title}</p>
        <p className="text-sm text-space-500 dark:text-space-400">{description}</p>
      </div>
    </Link>
  )
}

// System status indicator
function StatusIndicator({ status, label }: { status: 'healthy' | 'degraded' | 'down'; label: string }) {
  const styles = {
    healthy: { bg: 'bg-success-500', text: 'text-success-600 dark:text-success-400', label: 'Healthy' },
    degraded: { bg: 'bg-warning-500', text: 'text-warning-600 dark:text-warning-400', label: 'Degraded' },
    down: { bg: 'bg-danger-500', text: 'text-danger-600 dark:text-danger-400', label: 'Down' },
  }

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-space-600 dark:text-space-300">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${styles[status].bg}`} />
        <span className={`text-sm font-medium ${styles[status].text}`}>{styles[status].label}</span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { admin } = useAuth()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-space-900 dark:text-white">
          Welcome back, {admin?.name || 'Admin'}
        </h1>
        <p className="text-space-500 dark:text-space-400 mt-1">
          Mission Control Admin Dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total MSPs"
          value="24"
          subtitle="3 pending approval"
          icon={BuildingOffice2Icon}
          href="/msps"
          color="primary"
        />
        <StatCard
          title="Total Tenants"
          value="1,247"
          subtitle="89 active this week"
          icon={UsersIcon}
          href="/tenants"
          color="success"
        />
        <StatCard
          title="System Health"
          value="99.9%"
          subtitle="All services operational"
          icon={HeartIcon}
          href="/health"
          color="success"
        />
        <StatCard
          title="Monthly Revenue"
          value="$45.2K"
          subtitle="+12% from last month"
          icon={CurrencyDollarIcon}
          href="/tenants"
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ActionCard
              title="Manage MSPs"
              description="View and manage MSP accounts"
              href="/msps"
              icon={BuildingOffice2Icon}
            />
            <ActionCard
              title="Onboard New MSP"
              description="Create a new MSP organization"
              href="/msps/new"
              icon={BuildingOffice2Icon}
            />
            <ActionCard
              title="View Tenants"
              description="Search and manage tenants"
              href="/tenants"
              icon={UsersIcon}
            />
            <ActionCard
              title="System Health"
              description="Monitor service status"
              href="/health"
              icon={HeartIcon}
            />
          </div>
        </div>

        {/* System Status Panel */}
        <div>
          <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">System Status</h2>
          <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 p-4">
            <div className="divide-y divide-space-200 dark:divide-space-700">
              <StatusIndicator status="healthy" label="API Services" />
              <StatusIndicator status="healthy" label="DNS Resolution" />
              <StatusIndicator status="healthy" label="Database" />
              <StatusIndicator status="healthy" label="Redis Cache" />
              <StatusIndicator status="healthy" label="ClickHouse Analytics" />
            </div>
            <Link
              href="/health"
              className="block mt-4 text-center text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              View detailed health →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Recent Activity</h2>
        <div className="bg-white dark:bg-space-800 rounded-xl border border-space-200 dark:border-space-700 overflow-hidden">
          <div className="divide-y divide-space-200 dark:divide-space-700">
            {[
              { icon: CheckCircleIcon, color: 'text-success-500', text: 'MSP "TechCorp Solutions" approved', time: '5 min ago' },
              { icon: UsersIcon, color: 'text-primary-500', text: 'New tenant signup: "Acme Inc"', time: '23 min ago' },
              { icon: ExclamationTriangleIcon, color: 'text-warning-500', text: 'Payment retry scheduled for tenant #1234', time: '1 hour ago' },
              { icon: ClockIcon, color: 'text-space-500', text: 'System maintenance completed', time: '3 hours ago' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="flex-1 text-space-700 dark:text-space-300">{item.text}</span>
                <span className="text-sm text-space-500 dark:text-space-400">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
