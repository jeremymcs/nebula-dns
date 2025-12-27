/**
 * Nebula DNS - AI Insights Types
 */

export interface WeeklyInsight {
  id: string
  weekStart: string
  weekEnd: string
  generatedAt: string
  summary: string
  highlights: InsightHighlight[]
  recommendations: InsightRecommendation[]
  metrics: WeeklyMetrics
  trends: TrendData[]
}

export interface InsightHighlight {
  id: string
  type: 'positive' | 'warning' | 'info'
  title: string
  description: string
  metric?: {
    value: number
    change: number
    unit: string
  }
}

export interface InsightRecommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
  impact: string
}

export interface WeeklyMetrics {
  totalQueries: number
  blockedQueries: number
  threatsBlocked: number
  uniqueClients: number
  avgResponseTime: number
  uptime: number
}

export interface TrendData {
  label: string
  current: number
  previous: number
  change: number
  trend: 'up' | 'down' | 'stable'
}

export interface ComparativeAnalytics {
  category: string
  yourValue: number
  industryAverage: number
  topPerformers: number
  percentile: number
}

// Demo data generator
export function generateDemoWeeklyInsight(): WeeklyInsight {
  const now = new Date()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  return {
    id: 'insight-1',
    weekStart: weekStart.toISOString(),
    weekEnd: now.toISOString(),
    generatedAt: now.toISOString(),
    summary: `This week saw a 15% decrease in blocked threats compared to last week, with your network maintaining excellent protection. The Guest WiFi zone showed unusual activity on Tuesday that was automatically contained.`,
    highlights: [
      {
        id: 'h1',
        type: 'positive',
        title: 'Threat Reduction',
        description: 'Blocked threats decreased by 15% this week',
        metric: { value: 847, change: -15, unit: 'threats' },
      },
      {
        id: 'h2',
        type: 'warning',
        title: 'Unusual Activity Detected',
        description: 'Guest WiFi zone had a spike in blocked queries on Tuesday',
        metric: { value: 2340, change: 340, unit: 'queries' },
      },
      {
        id: 'h3',
        type: 'info',
        title: 'New Devices',
        description: '12 new devices joined your network this week',
        metric: { value: 12, change: 0, unit: 'devices' },
      },
    ],
    recommendations: [
      {
        id: 'r1',
        priority: 'high',
        title: 'Enable NRD Blocking',
        description: 'Newly Registered Domain blocking would have prevented 23 additional threats this week.',
        action: { label: 'Enable Now', href: '/settings/security' },
        impact: '+23 threats blocked',
      },
      {
        id: 'r2',
        priority: 'medium',
        title: 'Review Guest WiFi Policy',
        description: 'Consider adding social media restrictions during business hours.',
        action: { label: 'Edit Policy', href: '/policies/guest-wifi' },
        impact: 'Reduce bandwidth usage',
      },
      {
        id: 'r3',
        priority: 'low',
        title: 'Schedule Weekly Reports',
        description: 'Set up automated weekly reports to stay informed.',
        action: { label: 'Configure', href: '/settings/reports' },
        impact: 'Better visibility',
      },
    ],
    metrics: {
      totalQueries: 8547000,
      blockedQueries: 85470,
      threatsBlocked: 847,
      uniqueClients: 456,
      avgResponseTime: 12,
      uptime: 99.99,
    },
    trends: [
      { label: 'Total Queries', current: 8547000, previous: 8123000, change: 5.2, trend: 'up' },
      { label: 'Block Rate', current: 1.0, previous: 1.2, change: -16.7, trend: 'down' },
      { label: 'Threats', current: 847, previous: 996, change: -15.0, trend: 'down' },
      { label: 'Response Time', current: 12, previous: 14, change: -14.3, trend: 'down' },
    ],
  }
}

