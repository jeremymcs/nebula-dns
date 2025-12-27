/**
 * Nebula DNS - Security Score Types
 */

export interface SecurityGrade {
  letter: 'A' | 'B' | 'C' | 'D' | 'F'
  label: string
  color: string
  bgColor: string
}

export interface SecurityFactor {
  id: string
  name: string
  description: string
  score: number
  maxScore: number
  category: 'authentication' | 'protection' | 'monitoring' | 'configuration'
  recommendation?: string
}

export interface SecurityScoreData {
  totalScore: number
  factors: SecurityFactor[]
  lastUpdated: string
  trend: 'up' | 'down' | 'stable'
  trendValue: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'security' | 'milestone' | 'streak' | 'special'
  unlockedAt?: string
  progress?: number
  maxProgress?: number
}

export interface ScoreHistory {
  date: string
  score: number
  factors: Record<string, number>
}

// Demo data generators
export function generateDemoScore(): SecurityScoreData {
  return generateDemoScoreData()
}

export function generateDemoScoreData(): SecurityScoreData {
  return {
    totalScore: 78,
    factors: [
      {
        id: 'mfa',
        name: 'Multi-Factor Auth',
        description: 'MFA enabled for all admin accounts',
        score: 10,
        maxScore: 10,
        category: 'authentication',
      },
      {
        id: 'threat-blocking',
        name: 'Threat Blocking',
        description: 'Malware and phishing protection enabled',
        score: 15,
        maxScore: 15,
        category: 'protection',
      },
      {
        id: 'policy-coverage',
        name: 'Policy Coverage',
        description: 'All zones have active policies',
        score: 12,
        maxScore: 15,
        category: 'configuration',
        recommendation: 'Apply policies to 2 remaining zones',
      },
      {
        id: 'nrd-blocking',
        name: 'NRD Blocking',
        description: 'Newly registered domain blocking',
        score: 8,
        maxScore: 10,
        category: 'protection',
        recommendation: 'Enable NRD blocking for Guest WiFi zone',
      },
      {
        id: 'backup-zones',
        name: 'Backup DNS',
        description: 'Redundant DNS configuration',
        score: 5,
        maxScore: 10,
        category: 'configuration',
        recommendation: 'Configure secondary DNS for 3 zones',
      },
      {
        id: 'logging',
        name: 'Query Logging',
        description: 'DNS query logging enabled',
        score: 10,
        maxScore: 10,
        category: 'monitoring',
      },
      {
        id: 'alerts',
        name: 'Alert Configuration',
        description: 'Security alerts configured',
        score: 8,
        maxScore: 10,
        category: 'monitoring',
        recommendation: 'Add email alerts for critical threats',
      },
      {
        id: 'safesearch',
        name: 'SafeSearch',
        description: 'SafeSearch enforcement',
        score: 10,
        maxScore: 10,
        category: 'protection',
      },
      {
        id: 'api-security',
        name: 'API Security',
        description: 'API key rotation and restrictions',
        score: 0,
        maxScore: 10,
        category: 'authentication',
        recommendation: 'Enable API key restrictions and set rotation policy',
      },
    ],
    lastUpdated: new Date().toISOString(),
    trend: 'up',
    trendValue: 5,
  }
}

export function generateDemoAchievements(): Achievement[] {
  return [
    {
      id: 'first-block',
      name: 'First Block',
      description: 'Blocked your first malicious domain',
      icon: '🛡️',
      category: 'milestone',
      unlockedAt: '2024-01-15T10:30:00Z',
    },
    {
      id: '30-days',
      name: '30 Days Protected',
      description: 'Network protected for 30 consecutive days',
      icon: '📅',
      category: 'streak',
      unlockedAt: '2024-02-15T00:00:00Z',
    },
    {
      id: 'zero-threats',
      name: 'Zero Threats Week',
      description: 'No threats detected for 7 days',
      icon: '✨',
      category: 'security',
      unlockedAt: '2024-03-01T00:00:00Z',
    },
    {
      id: 'policy-master',
      name: 'Policy Master',
      description: 'Created 10 custom policies',
      icon: '📋',
      category: 'milestone',
      progress: 7,
      maxProgress: 10,
    },
    {
      id: 'threat-hunter',
      name: 'Threat Hunter',
      description: 'Blocked 1000 threats',
      icon: '🎯',
      category: 'security',
      progress: 847,
      maxProgress: 1000,
    },
    {
      id: 'early-adopter',
      name: 'Early Adopter',
      description: 'Joined during beta',
      icon: '🚀',
      category: 'special',
      unlockedAt: '2024-01-01T00:00:00Z',
    },
  ]
}

