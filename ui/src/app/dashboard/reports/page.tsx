/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Reports & Analytics Page - Cosmic Security Theme (Enhanced)
 */

'use client'

import { useState, useMemo } from 'react'
import { useSummaryStats, useTopBlocked, useBlocksByCategory, useLocationStats, useQueryTrends } from '@/hooks/useApi'
import {
  ArrowDownTrayIcon,
  ShieldExclamationIcon,
  GlobeAltIcon,
  ClockIcon,
  BoltIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  CodeBracketIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  SignalIcon,
  CpuChipIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  PlayIcon,
  PauseIcon,
  CloudArrowDownIcon,
  MapPinIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'
import { LineChart, DonutChart, BarChart, ProgressRing } from '@/components/Charts'
import { Button, Card, Badge, Select, Modal, Tabs } from '@/components/ui'
import { HeroMetric, HeroMetricsGrid } from '@/components/dashboard'
import Link from 'next/link'
import clsx from 'clsx'

// Report type definitions
const reportTypes = [
  { id: 'overview', label: 'Overview', icon: ChartBarIcon },
  { id: 'security', label: 'Security', icon: ShieldExclamationIcon },
  { id: 'performance', label: 'Performance', icon: BoltIcon },
  { id: 'compliance', label: 'Compliance', icon: DocumentChartBarIcon },
]

// Quick insights data (would come from API)
const quickInsights = [
  {
    type: 'warning',
    title: 'Unusual Traffic Spike',
    description: 'Query volume increased 45% between 2-4 AM',
    action: 'Investigate',
  },
  {
    type: 'success',
    title: 'Threat Reduction',
    description: 'Blocked threats down 23% from last week',
    action: 'View Details',
  },
  {
    type: 'info',
    title: 'New Category Detected',
    description: '12 domains categorized as cryptocurrency mining',
    action: 'Review',
  },
]

// Recent exports history
const recentExports = [
  { id: 1, name: 'Weekly Security Report', format: 'PDF', date: '2024-01-15 09:30', size: '2.4 MB', status: 'completed' },
  { id: 2, name: 'Threat Analysis - Q4', format: 'PDF', date: '2024-01-14 16:45', size: '5.1 MB', status: 'completed' },
  { id: 3, name: 'Query Logs Export', format: 'CSV', date: '2024-01-14 11:20', size: '12.8 MB', status: 'completed' },
  { id: 4, name: 'Compliance Audit Report', format: 'PDF', date: '2024-01-13 14:00', size: '1.8 MB', status: 'completed' },
]

// Scheduled reports
const scheduledReports = [
  { id: 1, name: 'Executive Summary', schedule: 'Weekly (Mon 9AM)', recipients: 3, nextRun: 'Jan 22, 2024', active: true },
  { id: 2, name: 'Security Digest', schedule: 'Daily (8AM)', recipients: 5, nextRun: 'Tomorrow', active: true },
  { id: 3, name: 'Compliance Report', schedule: 'Monthly (1st)', recipients: 2, nextRun: 'Feb 1, 2024', active: false },
]

// Detected anomalies
const detectedAnomalies = [
  { id: 1, type: 'spike', title: 'Query Volume Spike', description: 'Unusual 340% increase in DNS queries from subnet 10.0.5.0/24', severity: 'high', time: '2 hours ago' },
  { id: 2, type: 'pattern', title: 'Suspicious Pattern', description: 'Repeated queries to DGA-like domains detected', severity: 'critical', time: '4 hours ago' },
  { id: 3, type: 'new', title: 'New Domain Category', description: '45 queries to previously unseen cryptocurrency domains', severity: 'medium', time: '6 hours ago' },
]

// Filter options
const filterOptions = {
  locations: ['All Locations', 'Headquarters', 'Branch Office A', 'Branch Office B', 'Remote Workers'],
  policies: ['All Policies', 'Default Security', 'High Security', 'Guest Network', 'IoT Devices'],
  userGroups: ['All Users', 'Executives', 'Engineering', 'Marketing', 'Sales', 'Guest'],
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('7d')
  const [activeReportType, setActiveReportType] = useState('overview')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState('pdf')
  const [compareEnabled, setCompareEnabled] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showAnomalies, setShowAnomalies] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState('All Locations')
  const [selectedPolicy, setSelectedPolicy] = useState('All Policies')
  const [selectedUserGroup, setSelectedUserGroup] = useState('All Users')

  const { data: summary, isLoading: summaryLoading } = useSummaryStats(dateRange)
  const { data: topBlocked, isLoading: topBlockedLoading } = useTopBlocked(dateRange, 8)
  const { data: categoryStats, isLoading: categoryLoading } = useBlocksByCategory(dateRange)
  const { data: locationStats, isLoading: locationLoading } = useLocationStats(dateRange)
  const { data: queryTrends, isLoading: trendsLoading } = useQueryTrends(dateRange)

  const isLoading = summaryLoading || topBlockedLoading || categoryLoading || locationLoading || trendsLoading

  // Transform trend data from API for LineChart format
  const trendData = useMemo(() => {
    if (!queryTrends || queryTrends.length === 0) {
      return []
    }
    return queryTrends.map(item => {
      const date = new Date(item.timestamp)
      return {
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: item.total,
      }
    })
  }, [queryTrends])

  // Transform category stats for donut chart
  const categoryColors = ['#ef4444', '#3b82f6', '#f97316', '#eab308', '#8b5cf6', '#6b7280']
  const donutData = (categoryStats || []).map((item: any, idx: number) => ({
    label: item.category || 'Unknown',
    value: item.count || 0,
    color: categoryColors[idx % categoryColors.length],
  }))

  // Generate threat trend data
  const threatTrendData = [
    { label: 'Mon', value: 120, color: '#f97316' },
    { label: 'Tue', value: 145, color: '#f97316' },
    { label: 'Wed', value: 98, color: '#f97316' },
    { label: 'Thu', value: 167, color: '#f97316' },
    { label: 'Fri', value: 132, color: '#f97316' },
    { label: 'Sat', value: 78, color: '#f97316' },
    { label: 'Sun', value: 56, color: '#f97316' },
  ]

  const blockRate = summary?.blockRate || 0
  const cacheHitRate = summary?.cacheHitRate || 0

  // Calculate security score (mock calculation)
  const securityScore = Math.min(100, Math.max(0, 100 - (blockRate * 2) + (cacheHitRate / 2)))

  const dateRangeOptions = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
  ]

  const handleExport = () => {
    // Handle export logic
    setShowExportModal(false)
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-nebula-600 via-cosmic-600 to-nebula-700 p-6 lg:p-8">
        {/* Background decorations */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-cosmic-400/20 rounded-full blur-2xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <DocumentChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">Reports & Analytics</h1>
            </div>
            <p className="text-white/80 max-w-xl">
              Comprehensive insights into your DNS security posture, traffic patterns, and threat landscape.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Selector */}
            <div className="flex items-center gap-1 bg-space-900/50 backdrop-blur-sm rounded-xl p-1 ring-1 ring-white/20">
              {dateRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDateRange(option.value)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                    dateRange === option.value
                      ? 'bg-white text-space-900 shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  )}
                >
                  {option.value === '24h' ? '24h' : option.value === '7d' ? '7d' : option.value === '30d' ? '30d' : '90d'}
                </button>
              ))}
            </div>

            {/* Compare Toggle */}
            <button
              onClick={() => setCompareEnabled(!compareEnabled)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ring-1',
                compareEnabled
                  ? 'bg-white text-space-900 ring-white'
                  : 'bg-white/10 text-white ring-white/20 hover:bg-white/20'
              )}
            >
              <ArrowPathIcon className="h-4 w-4" />
              Compare
            </button>

            {/* Advanced Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ring-1',
                showFilters
                  ? 'bg-white text-space-900 ring-white'
                  : 'bg-white/10 text-white ring-white/20 hover:bg-white/20'
              )}
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
              Filters
              {(selectedLocation !== 'All Locations' || selectedPolicy !== 'All Policies' || selectedUserGroup !== 'All Users') && (
                <span className="w-2 h-2 rounded-full bg-cosmic-400" />
              )}
            </button>

            {/* Anomaly Detection */}
            <button
              onClick={() => setShowAnomalies(!showAnomalies)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all relative ring-1',
                showAnomalies
                  ? 'bg-white text-space-900 ring-white'
                  : 'bg-white/10 text-white ring-white/20 hover:bg-white/20'
              )}
            >
              <CpuChipIcon className="h-4 w-4" />
              AI Insights
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger-500 text-white text-xs flex items-center justify-center">
                {detectedAnomalies.length}
              </span>
            </button>

            <Link href="/dashboard/reports/scheduled">
              <Button variant="secondary" size="sm" leftIcon={<CalendarDaysIcon className="h-4 w-4" />} className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20">
                Scheduled
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
              onClick={() => setShowExportModal(true)}
              className="!bg-white !text-space-900 hover:!bg-white/90 !border-white"
            >
              Export Report
            </Button>
          </div>
        </div>

        {/* Data Freshness Indicator */}
        <div className="relative mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <SignalIcon className="h-4 w-4 text-success-400" />
            <span>Data updated <strong className="text-white">2 minutes ago</strong></span>
            <button className="ml-2 p-1 rounded-lg hover:bg-white/10 transition-colors">
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>
          {compareEnabled && (
            <div className="flex items-center gap-2 text-sm text-white/70">
              <span>Comparing to: <strong className="text-white">Previous {dateRange === '24h' ? '24 hours' : dateRange === '7d' ? '7 days' : dateRange === '30d' ? '30 days' : '90 days'}</strong></span>
            </div>
          )}
        </div>

        {/* Report Type Tabs */}
        <div className="relative mt-4 flex gap-2 overflow-x-auto pb-1">
          {reportTypes.map((type) => {
            const Icon = type.icon
            return (
              <button
                key={type.id}
                onClick={() => setActiveReportType(type.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ring-1',
                  activeReportType === type.id
                    ? 'bg-white text-space-900 shadow-lg ring-white'
                    : 'bg-white/10 text-white/70 ring-white/20 hover:bg-white/20 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                {type.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card variant="solid" padding="lg" className="ring-2 ring-nebula-500/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-nebula-500" />
              <h3 className="font-semibold text-space-900 dark:text-white">Advanced Filters</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => {
                setSelectedLocation('All Locations')
                setSelectedPolicy('All Policies')
                setSelectedUserGroup('All Users')
              }}>
                Reset All
              </Button>
              <button onClick={() => setShowFilters(false)} className="p-1 rounded-lg hover:bg-space-100 dark:hover:bg-space-700 transition-colors">
                <XMarkIcon className="h-5 w-5 text-space-500" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-space-600 dark:text-space-400 mb-2">
                <MapPinIcon className="h-4 w-4 inline mr-1" />
                Location
              </label>
              <Select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                options={filterOptions.locations.map(l => ({ value: l, label: l }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-space-600 dark:text-space-400 mb-2">
                <ShieldExclamationIcon className="h-4 w-4 inline mr-1" />
                Policy
              </label>
              <Select
                value={selectedPolicy}
                onChange={(e) => setSelectedPolicy(e.target.value)}
                options={filterOptions.policies.map(p => ({ value: p, label: p }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-space-600 dark:text-space-400 mb-2">
                <UserGroupIcon className="h-4 w-4 inline mr-1" />
                User Group
              </label>
              <Select
                value={selectedUserGroup}
                onChange={(e) => setSelectedUserGroup(e.target.value)}
                options={filterOptions.userGroups.map(u => ({ value: u, label: u }))}
              />
            </div>
          </div>
        </Card>
      )}

      {/* AI-Detected Anomalies Panel */}
      {showAnomalies && (
        <Card variant="solid" padding="lg" className="ring-2 ring-cosmic-500/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CpuChipIcon className="h-5 w-5 text-cosmic-500" />
              <h3 className="font-semibold text-space-900 dark:text-white">AI-Detected Anomalies</h3>
              <Badge variant="danger" size="sm">{detectedAnomalies.length} Active</Badge>
            </div>
            <button onClick={() => setShowAnomalies(false)} className="p-1 rounded-lg hover:bg-space-100 dark:hover:bg-space-700 transition-colors">
              <XMarkIcon className="h-5 w-5 text-space-500" />
            </button>
          </div>
          <div className="space-y-3">
            {detectedAnomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={clsx(
                  'flex items-start gap-4 p-4 rounded-xl ring-1',
                  anomaly.severity === 'critical' && 'bg-danger-50 dark:bg-danger-900/20 ring-danger-200 dark:ring-danger-800',
                  anomaly.severity === 'high' && 'bg-warning-50 dark:bg-warning-900/20 ring-warning-200 dark:ring-warning-800',
                  anomaly.severity === 'medium' && 'bg-accent-50 dark:bg-accent-900/20 ring-accent-200 dark:ring-accent-800'
                )}
              >
                <div className={clsx(
                  'flex-shrink-0 p-2 rounded-lg',
                  anomaly.severity === 'critical' && 'bg-danger-100 dark:bg-danger-900/50',
                  anomaly.severity === 'high' && 'bg-warning-100 dark:bg-warning-900/50',
                  anomaly.severity === 'medium' && 'bg-accent-100 dark:bg-accent-900/50'
                )}>
                  <ExclamationTriangleIcon className={clsx(
                    'h-5 w-5',
                    anomaly.severity === 'critical' && 'text-danger-600 dark:text-danger-400',
                    anomaly.severity === 'high' && 'text-warning-600 dark:text-warning-400',
                    anomaly.severity === 'medium' && 'text-accent-600 dark:text-accent-400'
                  )} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-space-900 dark:text-white">{anomaly.title}</p>
                    <Badge variant={anomaly.severity === 'critical' ? 'danger' : anomaly.severity === 'high' ? 'warning' : 'neutral'} size="sm">
                      {anomaly.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-space-600 dark:text-space-400">{anomaly.description}</p>
                  <p className="text-xs text-space-500 dark:text-space-500 mt-1">{anomaly.time}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">Dismiss</Button>
                  <Button variant="primary" size="sm">Investigate</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Insights Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickInsights.map((insight, idx) => (
          <div
            key={idx}
            className={clsx(
              'flex items-start gap-3 p-4 rounded-xl ring-1 transition-all hover:shadow-md',
              insight.type === 'warning' && 'bg-warning-50 dark:bg-warning-900/20 ring-warning-200 dark:ring-warning-800',
              insight.type === 'success' && 'bg-success-50 dark:bg-success-900/20 ring-success-200 dark:ring-success-800',
              insight.type === 'info' && 'bg-accent-50 dark:bg-accent-900/20 ring-accent-200 dark:ring-accent-800'
            )}
          >
            <div className={clsx(
              'flex-shrink-0 p-2 rounded-lg',
              insight.type === 'warning' && 'bg-warning-100 dark:bg-warning-900/50',
              insight.type === 'success' && 'bg-success-100 dark:bg-success-900/50',
              insight.type === 'info' && 'bg-accent-100 dark:bg-accent-900/50'
            )}>
              {insight.type === 'warning' && <ExclamationTriangleIcon className="h-5 w-5 text-warning-600 dark:text-warning-400" />}
              {insight.type === 'success' && <CheckCircleIcon className="h-5 w-5 text-success-600 dark:text-success-400" />}
              {insight.type === 'info' && <LightBulbIcon className="h-5 w-5 text-accent-600 dark:text-accent-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={clsx(
                'font-medium text-sm',
                insight.type === 'warning' && 'text-warning-800 dark:text-warning-200',
                insight.type === 'success' && 'text-success-800 dark:text-success-200',
                insight.type === 'info' && 'text-accent-800 dark:text-accent-200'
              )}>
                {insight.title}
              </p>
              <p className={clsx(
                'text-xs mt-0.5',
                insight.type === 'warning' && 'text-warning-700 dark:text-warning-300',
                insight.type === 'success' && 'text-success-700 dark:text-success-300',
                insight.type === 'info' && 'text-accent-700 dark:text-accent-300'
              )}>
                {insight.description}
              </p>
            </div>
            <button className={clsx(
              'text-xs font-medium px-2 py-1 rounded-lg whitespace-nowrap',
              insight.type === 'warning' && 'text-warning-700 dark:text-warning-300 hover:bg-warning-100 dark:hover:bg-warning-900/50',
              insight.type === 'success' && 'text-success-700 dark:text-success-300 hover:bg-success-100 dark:hover:bg-success-900/50',
              insight.type === 'info' && 'text-accent-700 dark:text-accent-300 hover:bg-accent-100 dark:hover:bg-accent-900/50'
            )}>
              {insight.action}
            </button>
          </div>
        ))}
      </div>

      {/* Enhanced Metrics Grid with Security Score */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        {/* Security Score - Large Card */}
        <Card variant="solid" padding="lg" className="lg:col-span-2 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-gradient-to-br from-nebula-500/20 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-space-900 dark:text-white">Security Score</h3>
                <p className="text-sm text-space-500 dark:text-space-400">Overall protection rating</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={securityScore >= 80 ? 'success' : securityScore >= 60 ? 'warning' : 'danger'}>
                  {securityScore >= 80 ? 'Excellent' : securityScore >= 60 ? 'Good' : 'Needs Attention'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <ProgressRing
                value={Math.round(securityScore)}
                max={100}
                size={120}
                strokeWidth={10}
                color={securityScore >= 80 ? '#22c55e' : securityScore >= 60 ? '#f59e0b' : '#ef4444'}
                label="score"
              />

              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-space-600 dark:text-space-400">Threats Blocked</span>
                  <span className="text-sm font-medium text-success-600 dark:text-success-400 flex items-center gap-1">
                    <ArrowTrendingDownIcon className="h-4 w-4" />
                    23%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-space-600 dark:text-space-400">Policy Coverage</span>
                  <span className="text-sm font-medium text-space-900 dark:text-white">98%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-space-600 dark:text-space-400">Response Time</span>
                  <span className="text-sm font-medium text-success-600 dark:text-success-400 flex items-center gap-1">
                    <ArrowTrendingDownIcon className="h-4 w-4" />
                    12ms
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Metrics Grid */}
        <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-3 gap-4">
          <HeroMetric
            title="Total Queries"
            value={summary?.totalQueries || 0}
            icon={<GlobeAltIcon />}
            variant="primary"
            trend={{ value: 12, isUp: true }}
          />
          <HeroMetric
            title="Blocked"
            value={summary?.blockedQueries || 0}
            icon={<ShieldExclamationIcon />}
            variant="danger"
            subtitle={`${blockRate}% of total`}
          />
          <HeroMetric
            title="Threats"
            value={summary?.threatsBlocked || 0}
            icon={<ExclamationTriangleIcon />}
            variant="warning"
            trend={{ value: 15, isUp: false }}
          />
          <HeroMetric
            title="Avg Response"
            value={`${summary?.avgResponseTime || 0}ms`}
            icon={<BoltIcon />}
            variant="success"
            formatValue={false}
          />
          <HeroMetric
            title="Cache Hit Rate"
            value={`${cacheHitRate}%`}
            icon={<ArrowTrendingUpIcon />}
            variant="accent"
            formatValue={false}
          />
          <HeroMetric
            title="Active Zones"
            value={locationStats?.length || 0}
            icon={<GlobeAltIcon />}
            variant="primary"
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Query Trends Chart */}
        <Card variant="solid" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">Query Trends</h3>
            <div className="flex items-center gap-4 text-sm text-space-500 dark:text-space-400">
              <span className="flex items-center">
                <span className="h-2 w-2 rounded-full bg-primary-500 mr-2" />
                Total Queries
              </span>
            </div>
          </div>
          <LineChart data={trendData} height={260} color="#4f46e5" />
        </Card>

        {/* Block Reasons Donut Chart */}
        <Card variant="solid" padding="lg">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Blocks by Category</h3>
          {categoryLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="skeleton h-44 w-44 rounded-full" />
            </div>
          ) : donutData.length > 0 ? (
            <div className="flex items-center justify-center py-4">
              <DonutChart data={donutData} size={180} thickness={35} />
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-space-500 dark:text-space-400">
              No category data available
            </div>
          )}
        </Card>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Threat Trends */}
        <Card variant="solid" padding="lg">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Threat Activity</h3>
          <BarChart data={threatTrendData} height={200} />
        </Card>

        {/* Block Rate */}
        <Card variant="solid" padding="lg">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Block Rate</h3>
          <div className="flex items-center justify-center py-4">
            <ProgressRing
              value={parseFloat(blockRate.toString()) || 0}
              max={100}
              size={140}
              strokeWidth={12}
              color="#ef4444"
              label="of queries"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-space-900 dark:text-white">
                {(summary?.blockedQueries || 0).toLocaleString()}
              </p>
              <p className="text-sm text-space-500 dark:text-space-400">Blocked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-space-900 dark:text-white">
                {((summary?.totalQueries || 0) - (summary?.blockedQueries || 0)).toLocaleString()}
              </p>
              <p className="text-sm text-space-500 dark:text-space-400">Allowed</p>
            </div>
          </div>
        </Card>

        {/* Cache Performance */}
        <Card variant="solid" padding="lg">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Cache Performance</h3>
          <div className="flex items-center justify-center py-4">
            <ProgressRing
              value={parseFloat(cacheHitRate.toString()) || 0}
              max={100}
              size={140}
              strokeWidth={12}
              color="#22c55e"
              label="hit rate"
            />
          </div>
        </Card>
      </div>

      {/* Top Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Blocked Domains */}
        <Card variant="solid" padding="lg">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Top Blocked Domains</h3>
          {topBlockedLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-10 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Domain</th>
                    <th className="table-header-cell">Category</th>
                    <th className="table-header-cell text-right">Blocks</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {(topBlocked || []).map((item: any, idx: number) => (
                    <tr key={idx} className="table-row">
                      <td className="table-cell font-mono text-sm">{item.domain}</td>
                      <td className="table-cell">
                        <Badge variant="danger" size="sm">{item.category?.replace('_', ' ')}</Badge>
                      </td>
                      <td className="table-cell text-right font-medium">{item.count?.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!topBlocked || topBlocked.length === 0) && (
                    <tr>
                      <td colSpan={3} className="table-cell text-center py-8 text-space-500 dark:text-space-400">
                        No blocked domains
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Location Performance */}
        <Card variant="solid" padding="lg">
          <h3 className="text-lg font-semibold text-space-900 dark:text-white mb-4">Location Performance</h3>
          {locationLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-10 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Location</th>
                    <th className="table-header-cell text-right">Queries</th>
                    <th className="table-header-cell text-right">Block Rate</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {(locationStats || []).map((loc: any, idx: number) => (
                    <tr key={idx} className="table-row">
                      <td className="table-cell font-medium text-space-900 dark:text-white">{loc.locationName}</td>
                      <td className="table-cell text-right">{loc.totalQueries?.toLocaleString()}</td>
                      <td className="table-cell text-right">
                        <Badge variant="danger">{loc.blockRate}%</Badge>
                      </td>
                    </tr>
                  ))}
                  {(!locationStats || locationStats.length === 0) && (
                    <tr>
                      <td colSpan={3} className="table-cell text-center py-8 text-space-500 dark:text-space-400">
                        No location data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Report Templates Section */}
      <Card variant="solid" padding="lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-space-900 dark:text-white">Report Templates</h3>
            <p className="text-sm text-space-500 dark:text-space-400">Quick access to pre-built report formats</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<SparklesIcon className="h-4 w-4" />}>
            Create Custom
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Executive Summary', description: 'High-level overview for leadership', icon: DocumentChartBarIcon, color: 'nebula' },
            { name: 'Threat Analysis', description: 'Detailed security threat breakdown', icon: ShieldExclamationIcon, color: 'danger' },
            { name: 'Compliance Report', description: 'Regulatory compliance status', icon: CheckCircleIcon, color: 'success' },
            { name: 'Performance Metrics', description: 'DNS performance and latency', icon: BoltIcon, color: 'warning' },
          ].map((template) => {
            const Icon = template.icon
            return (
              <button
                key={template.name}
                onClick={() => setShowExportModal(true)}
                className="flex items-start gap-3 p-4 rounded-xl bg-space-50 dark:bg-space-800/50 ring-1 ring-space-200 dark:ring-space-700 hover:ring-nebula-500 dark:hover:ring-nebula-500 transition-all text-left group"
              >
                <div className={clsx(
                  'flex-shrink-0 p-2 rounded-lg',
                  template.color === 'nebula' && 'bg-nebula-100 dark:bg-nebula-900/50',
                  template.color === 'danger' && 'bg-danger-100 dark:bg-danger-900/50',
                  template.color === 'success' && 'bg-success-100 dark:bg-success-900/50',
                  template.color === 'warning' && 'bg-warning-100 dark:bg-warning-900/50'
                )}>
                  <Icon className={clsx(
                    'h-5 w-5',
                    template.color === 'nebula' && 'text-nebula-600 dark:text-nebula-400',
                    template.color === 'danger' && 'text-danger-600 dark:text-danger-400',
                    template.color === 'success' && 'text-success-600 dark:text-success-400',
                    template.color === 'warning' && 'text-warning-600 dark:text-warning-400'
                  )} />
                </div>
                <div>
                  <p className="font-medium text-space-900 dark:text-white group-hover:text-nebula-600 dark:group-hover:text-nebula-400 transition-colors">
                    {template.name}
                  </p>
                  <p className="text-xs text-space-500 dark:text-space-400 mt-0.5">
                    {template.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Recent Exports & Scheduled Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Exports */}
        <Card variant="solid" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CloudArrowDownIcon className="h-5 w-5 text-nebula-500" />
              <h3 className="text-lg font-semibold text-space-900 dark:text-white">Recent Exports</h3>
            </div>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          <div className="space-y-3">
            {recentExports.map((export_) => (
              <div key={export_.id} className="flex items-center gap-4 p-3 rounded-xl bg-space-50 dark:bg-space-800/50 hover:bg-space-100 dark:hover:bg-space-700/50 transition-colors group">
                <div className={clsx(
                  'flex-shrink-0 p-2 rounded-lg',
                  export_.format === 'PDF' && 'bg-danger-100 dark:bg-danger-900/50',
                  export_.format === 'CSV' && 'bg-success-100 dark:bg-success-900/50',
                  export_.format === 'JSON' && 'bg-accent-100 dark:bg-accent-900/50'
                )}>
                  {export_.format === 'PDF' && <DocumentArrowDownIcon className="h-5 w-5 text-danger-600 dark:text-danger-400" />}
                  {export_.format === 'CSV' && <TableCellsIcon className="h-5 w-5 text-success-600 dark:text-success-400" />}
                  {export_.format === 'JSON' && <CodeBracketIcon className="h-5 w-5 text-accent-600 dark:text-accent-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-space-900 dark:text-white truncate">{export_.name}</p>
                  <p className="text-xs text-space-500 dark:text-space-400">{export_.date} • {export_.size}</p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded-lg hover:bg-space-200 dark:hover:bg-space-600 transition-colors">
                    <ArrowDownTrayIcon className="h-4 w-4 text-space-600 dark:text-space-400" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-space-200 dark:hover:bg-space-600 transition-colors">
                    <EyeIcon className="h-4 w-4 text-space-600 dark:text-space-400" />
                  </button>
                </div>
                <Badge variant="success" size="sm">{export_.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Scheduled Reports */}
        <Card variant="solid" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-cosmic-500" />
              <h3 className="text-lg font-semibold text-space-900 dark:text-white">Scheduled Reports</h3>
            </div>
            <Link href="/dashboard/reports/scheduled">
              <Button variant="ghost" size="sm">Manage</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {scheduledReports.map((report) => (
              <div key={report.id} className="flex items-center gap-4 p-3 rounded-xl bg-space-50 dark:bg-space-800/50 hover:bg-space-100 dark:hover:bg-space-700/50 transition-colors group">
                <div className={clsx(
                  'flex-shrink-0 p-2 rounded-lg',
                  report.active ? 'bg-success-100 dark:bg-success-900/50' : 'bg-space-200 dark:bg-space-700'
                )}>
                  {report.active ? (
                    <PlayIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
                  ) : (
                    <PauseIcon className="h-5 w-5 text-space-500 dark:text-space-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-space-900 dark:text-white truncate">{report.name}</p>
                  <p className="text-xs text-space-500 dark:text-space-400">
                    {report.schedule} • {report.recipients} recipients
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-space-700 dark:text-space-300">Next Run</p>
                  <p className="text-sm text-space-900 dark:text-white">{report.nextRun}</p>
                </div>
                <Badge variant={report.active ? 'success' : 'neutral'} size="sm">
                  {report.active ? 'Active' : 'Paused'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        size="md"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-nebula-500/20 to-cosmic-500/20 ring-1 ring-nebula-500/30">
            <DocumentArrowDownIcon className="h-8 w-8 text-nebula-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-space-900 dark:text-white">Export Report</h2>
            <p className="text-sm text-space-500 dark:text-space-400">
              Choose format and options for your report
            </p>
          </div>
        </div>

        {/* Date Range Summary */}
        <div className="p-4 rounded-xl bg-space-50 dark:bg-space-800/50 ring-1 ring-space-200 dark:ring-space-700 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-space-600 dark:text-space-400">Report Period</span>
            <span className="text-sm font-medium text-space-900 dark:text-white">
              {dateRange === '24h' ? 'Last 24 Hours' : dateRange === '7d' ? 'Last 7 Days' : dateRange === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
            </span>
          </div>
        </div>

        {/* Format Selection */}
        <div className="space-y-3 mb-6">
          <label className="text-sm font-medium text-space-700 dark:text-space-300">Export Format</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'pdf', label: 'PDF', icon: DocumentArrowDownIcon, description: 'Best for sharing' },
              { id: 'csv', label: 'CSV', icon: TableCellsIcon, description: 'For spreadsheets' },
              { id: 'json', label: 'JSON', icon: CodeBracketIcon, description: 'For developers' },
            ].map((format) => {
              const Icon = format.icon
              return (
                <button
                  key={format.id}
                  onClick={() => setExportFormat(format.id)}
                  className={clsx(
                    'flex flex-col items-center gap-2 p-4 rounded-xl ring-1 transition-all',
                    exportFormat === format.id
                      ? 'bg-nebula-50 dark:bg-nebula-900/30 ring-nebula-500 text-nebula-700 dark:text-nebula-300'
                      : 'bg-space-50 dark:bg-space-800/50 ring-space-200 dark:ring-space-700 text-space-600 dark:text-space-400 hover:ring-space-300 dark:hover:ring-space-600'
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="font-medium text-sm">{format.label}</span>
                  <span className="text-xs opacity-75">{format.description}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Include Options */}
        <div className="space-y-3 mb-6">
          <label className="text-sm font-medium text-space-700 dark:text-space-300">Include in Report</label>
          <div className="space-y-2">
            {[
              { id: 'summary', label: 'Executive Summary', checked: true },
              { id: 'charts', label: 'Charts & Visualizations', checked: true },
              { id: 'tables', label: 'Detailed Tables', checked: true },
              { id: 'insights', label: 'AI-Generated Insights', checked: false },
            ].map((option) => (
              <label key={option.id} className="flex items-center gap-3 p-3 rounded-lg bg-space-50 dark:bg-space-800/50 cursor-pointer hover:bg-space-100 dark:hover:bg-space-700/50 transition-colors">
                <input
                  type="checkbox"
                  defaultChecked={option.checked}
                  className="h-4 w-4 rounded border-space-300 text-nebula-600 focus:ring-nebula-500"
                />
                <span className="text-sm text-space-700 dark:text-space-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-space-200 dark:border-space-700">
          <Button variant="ghost" onClick={() => setShowExportModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}>
            Export {exportFormat.toUpperCase()}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
