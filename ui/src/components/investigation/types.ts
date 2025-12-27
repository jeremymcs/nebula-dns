/**
 * Nebula DNS - Domain Investigation Types
 */

export interface DomainIntel {
  domain: string
  registrar?: string
  registrationDate?: string
  expirationDate?: string
  domainAge?: string
  sslIssuer?: string
  sslExpiry?: string
  hostingProvider?: string
  asn?: string
  ipAddresses: string[]
  nameservers: string[]
  country?: string
}

export interface NetworkActivity {
  firstSeen: string
  lastSeen: string
  totalQueries: number
  uniqueClients: number
  zones: string[]
  topClients: Array<{ ip: string; queries: number }>
}

export interface ThreatIndicator {
  source: string
  score: number
  maxScore: number
  status: 'clean' | 'suspicious' | 'malicious' | 'unknown'
  details?: string
}

export interface RelatedDomain {
  domain: string
  relationship: 'subdomain' | 'sibling' | 'redirect' | 'similar'
  status: 'allowed' | 'blocked' | 'unknown'
}

export interface DomainTimeline {
  timestamp: string
  event: 'first_seen' | 'blocked' | 'allowed' | 'policy_change' | 'threat_detected'
  details: string
  zone?: string
}

export interface InvestigationData {
  domain: string
  intel: DomainIntel
  activity: NetworkActivity
  threats: ThreatIndicator[]
  relatedDomains: RelatedDomain[]
  timeline: DomainTimeline[]
}

// Demo data generator
export function generateDemoInvestigation(domain: string): InvestigationData {
  const isMalicious = domain.includes('malware') || domain.includes('phishing')
  const isTracker = domain.includes('tracker') || domain.includes('ad')

  return {
    domain,
    intel: {
      domain,
      registrar: isMalicious ? 'Shady Registrar Inc.' : 'GoDaddy LLC',
      registrationDate: isMalicious ? '2024-01-01' : '2015-03-15',
      expirationDate: '2025-03-15',
      domainAge: isMalicious ? '11 months' : '9 years',
      sslIssuer: isMalicious ? 'Self-signed' : "Let's Encrypt",
      sslExpiry: '2024-12-15',
      hostingProvider: isMalicious ? 'Bulletproof Hosting' : 'Cloudflare, Inc.',
      asn: isMalicious ? 'AS12345' : 'AS13335',
      ipAddresses: ['104.21.32.128', '172.67.182.31'],
      nameservers: ['ns1.example.com', 'ns2.example.com'],
      country: isMalicious ? 'RU' : 'US',
    },
    activity: {
      firstSeen: '2024-01-15T10:30:00Z',
      lastSeen: new Date().toISOString(),
      totalQueries: isMalicious ? 47 : 1247,
      uniqueClients: isMalicious ? 3 : 45,
      zones: ['Headquarters', 'Remote Workers'],
      topClients: [
        { ip: '192.168.1.100', queries: 234 },
        { ip: '192.168.1.105', queries: 189 },
      ],
    },
    threats: [
      {
        source: 'VirusTotal',
        score: isMalicious ? 45 : 0,
        maxScore: 90,
        status: isMalicious ? 'malicious' : 'clean',
        details: isMalicious ? '45/90 vendors flagged' : '0/90 vendors flagged',
      },
      {
        source: 'Google Safe Browsing',
        score: isMalicious ? 1 : 0,
        maxScore: 1,
        status: isMalicious ? 'malicious' : 'clean',
        details: isMalicious ? 'Flagged as malware' : 'No threats detected',
      },
      {
        source: 'PhishTank',
        score: domain.includes('phishing') ? 1 : 0,
        maxScore: 1,
        status: domain.includes('phishing') ? 'malicious' : 'clean',
        details: domain.includes('phishing') ? 'Known phishing site' : 'Not in database',
      },
    ],
    relatedDomains: [
      { domain: `www.${domain}`, relationship: 'subdomain', status: isMalicious ? 'blocked' : 'allowed' },
      { domain: `api.${domain}`, relationship: 'subdomain', status: 'unknown' },
    ],
    timeline: [
      { timestamp: '2024-01-15T10:30:00Z', event: 'first_seen', details: 'First DNS query observed', zone: 'Headquarters' },
      { timestamp: '2024-02-01T14:22:00Z', event: isMalicious ? 'blocked' : 'allowed', details: isMalicious ? 'Blocked by threat intelligence' : 'Allowed by policy' },
    ],
  }
}

