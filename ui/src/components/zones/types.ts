/**
 * Nebula DNS - Zone Types
 */

export type ZoneHealth = 'healthy' | 'warning' | 'critical' | 'offline'

export interface Zone {
  id: string
  name: string
  description?: string
  parentId?: string
  policyId?: string
  health: ZoneHealth
  metrics: ZoneMetrics
  devices?: number
  createdAt: string
  updatedAt: string
}

export interface ZoneMetrics {
  queriesPerSecond: number
  totalQueries24h: number
  blockedQueries24h: number
  blockRate: number
  avgResponseTime: number
  threatsBlocked24h: number
}

export interface ZoneGroup {
  id: string
  name: string
  zones: Zone[]
}

// Demo data generator
export function generateDemoZones(): Zone[] {
  return [
    {
      id: 'hq',
      name: 'Headquarters',
      description: 'Main office network',
      health: 'healthy',
      metrics: {
        queriesPerSecond: 245,
        totalQueries24h: 1250000,
        blockedQueries24h: 12500,
        blockRate: 1.0,
        avgResponseTime: 12,
        threatsBlocked24h: 47,
      },
      devices: 450,
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'hq-guest',
      name: 'Guest WiFi',
      description: 'Visitor network',
      parentId: 'hq',
      health: 'healthy',
      metrics: {
        queriesPerSecond: 45,
        totalQueries24h: 85000,
        blockedQueries24h: 4250,
        blockRate: 5.0,
        avgResponseTime: 15,
        threatsBlocked24h: 12,
      },
      devices: 120,
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'hq-iot',
      name: 'IoT Devices',
      description: 'Smart devices and sensors',
      parentId: 'hq',
      health: 'warning',
      metrics: {
        queriesPerSecond: 12,
        totalQueries24h: 25000,
        blockedQueries24h: 500,
        blockRate: 2.0,
        avgResponseTime: 8,
        threatsBlocked24h: 3,
      },
      devices: 85,
      createdAt: '2024-02-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'remote',
      name: 'Remote Workers',
      description: 'VPN and remote access',
      health: 'healthy',
      metrics: {
        queriesPerSecond: 180,
        totalQueries24h: 950000,
        blockedQueries24h: 9500,
        blockRate: 1.0,
        avgResponseTime: 25,
        threatsBlocked24h: 28,
      },
      devices: 320,
      createdAt: '2024-01-20T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'branch-ny',
      name: 'New York Branch',
      description: 'NYC office network',
      health: 'healthy',
      metrics: {
        queriesPerSecond: 95,
        totalQueries24h: 450000,
        blockedQueries24h: 4500,
        blockRate: 1.0,
        avgResponseTime: 18,
        threatsBlocked24h: 15,
      },
      devices: 180,
      createdAt: '2024-03-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'branch-la',
      name: 'Los Angeles Branch',
      description: 'LA office network',
      health: 'critical',
      metrics: {
        queriesPerSecond: 0,
        totalQueries24h: 280000,
        blockedQueries24h: 2800,
        blockRate: 1.0,
        avgResponseTime: 0,
        threatsBlocked24h: 8,
      },
      devices: 95,
      createdAt: '2024-03-15T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  ]
}

