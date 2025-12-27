/**
 * Nebula DNS - Mission Control Types
 */

export interface LiveQuery {
  id: string
  domain: string
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT'
  decision: 'allow' | 'block' | 'warn'
  reason?: string
  zone: string
  timestamp: Date
  responseTime: number
}

export interface ThreatBlip {
  id: string
  type: string
  domain?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  angle: number
  distance: number
  timestamp: number
}

export interface HeatmapData {
  hour: number
  day: string
  value: number
}

// Demo data generators
export function generateDemoQueryStream(): LiveQuery[] {
  const domains = [
    { domain: 'google.com', decision: 'allow' as const },
    { domain: 'facebook.com', decision: 'allow' as const },
    { domain: 'malware-c2.bad', decision: 'block' as const, reason: 'Malware' },
    { domain: 'api.github.com', decision: 'allow' as const },
    { domain: 'tracker.ads.net', decision: 'block' as const, reason: 'Advertising' },
    { domain: 'office365.com', decision: 'allow' as const },
    { domain: 'phishing-site.xyz', decision: 'block' as const, reason: 'Phishing' },
    { domain: 'cdn.cloudflare.com', decision: 'allow' as const },
    { domain: 'suspicious.domain', decision: 'warn' as const, reason: 'NRD' },
    { domain: 'slack.com', decision: 'allow' as const },
  ]

  const zones = ['Main Office', 'Guest WiFi', 'Branch Office', 'Remote Users']
  const types: LiveQuery['type'][] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT']

  return Array.from({ length: 20 }, (_, i) => {
    const d = domains[i % domains.length]
    return {
      id: `q-${Date.now()}-${i}`,
      domain: d.domain,
      type: types[Math.floor(Math.random() * types.length)],
      decision: d.decision,
      reason: d.reason,
      zone: zones[Math.floor(Math.random() * zones.length)],
      timestamp: new Date(Date.now() - i * 1000 * Math.random() * 5),
      responseTime: Math.floor(Math.random() * 20) + 5,
    }
  })
}

export function generateDemoThreats(): ThreatBlip[] {
  const types = ['malware', 'phishing', 'ransomware', 'dga', 'tunnel']
  const severities: ThreatBlip['severity'][] = ['low', 'medium', 'high', 'critical']

  return Array.from({ length: 8 }, (_, i) => ({
    id: `t-${i}`,
    type: types[Math.floor(Math.random() * types.length)],
    domain: `threat-${i}.malicious.com`,
    severity: severities[Math.floor(Math.random() * severities.length)],
    angle: Math.random() * 360,
    distance: 0.3 + Math.random() * 0.6,
    timestamp: Date.now() - Math.random() * 3600000,
  }))
}

export function generateDemoHeatmapData(): HeatmapData[] {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const data: HeatmapData[] = []

  for (let hour = 0; hour < 24; hour++) {
    for (const day of days) {
      // Business hours have more activity
      const isBusinessHours = hour >= 9 && hour <= 17
      const isWeekday = !['Sat', 'Sun'].includes(day)
      const baseValue = isBusinessHours && isWeekday ? 50 : 10
      const randomFactor = Math.random() * 50

      data.push({
        hour,
        day,
        value: Math.floor(baseValue + randomFactor),
      })
    }
  }

  return data
}

