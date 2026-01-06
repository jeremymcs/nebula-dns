/**
 * Nebula DNS - Policy Management Constants
 * Extracted from policies page for reusability
 */

export interface SafeSearchSettings {
  google: 'off' | 'moderate' | 'strict'
  bing: 'off' | 'moderate' | 'strict'
  youtube: 'off' | 'moderate' | 'strict'
  duckduckgo: 'off' | 'moderate' | 'strict'
}

export interface PolicyConfig {
  blockCategories: string[]
  warnCategories?: string[]
  threatBlocking: {
    enabled: boolean
    feeds: string[]
  }
  safesearch: {
    enabled: boolean
    services: string[]
    settings?: SafeSearchSettings
  }
}

export interface Policy {
  id: string
  name: string
  description: string
  currentVersion: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
  currentConfig?: PolicyConfig
}

export const DEFAULT_SAFESEARCH_SETTINGS: SafeSearchSettings = {
  google: 'off',
  bing: 'off',
  youtube: 'off',
  duckduckgo: 'off',
}

export const SEARCH_ENGINES = [
  { id: 'google', name: 'Google' },
  { id: 'bing', name: 'Bing' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'duckduckgo', name: 'DuckDuckGo' },
] as const

// Category groups for organized display
export const CATEGORY_GROUPS = {
  'Security Threats': {
    icon: '🛡️',
    categories: ['malware', 'phishing', 'hacking', 'scam', 'cryptominer'],
    color: 'danger' as const,
  },
  'Adult & Mature': {
    icon: '🔞',
    categories: ['adult', 'violence', 'drugs', 'weapons', 'alcohol', 'gambling', 'dating'],
    color: 'danger' as const,
  },
  'Social & Entertainment': {
    icon: '💬',
    categories: ['social_media', 'streaming', 'gaming', 'chat', 'forums'],
    color: 'warning' as const,
  },
  'Productivity': {
    icon: '⏰',
    categories: ['advertising', 'ads', 'tracking', 'news', 'shopping'],
    color: 'warning' as const,
  },
  'Privacy & Anonymity': {
    icon: '🕵️',
    categories: ['proxy', 'vpn', 'dynamic_dns', 'url_shorteners', 'remote_access'],
    color: 'accent' as const,
  },
  'File Sharing': {
    icon: '📁',
    categories: ['piracy', 'downloads', 'file_sharing'],
    color: 'warning' as const,
  },
} as const

// Policy presets for quick setup
export const POLICY_PRESETS = {
  'Family Safe': {
    description: 'Block adult content, violence, and enforce safe search',
    blockCategories: ['adult', 'violence', 'drugs', 'weapons', 'gambling', 'dating', 'alcohol'],
    warnCategories: ['social_media', 'gaming', 'streaming'],
    threatBlocking: { enabled: true, feeds: ['malware', 'phishing', 'c2', 'ransomware'] },
    safesearch: {
      enabled: true,
      services: ['google', 'bing', 'youtube', 'duckduckgo'],
      settings: { google: 'strict', bing: 'strict', youtube: 'strict', duckduckgo: 'strict' } as SafeSearchSettings,
    },
  },
  'Corporate Security': {
    description: 'High security for business environments',
    blockCategories: ['malware', 'phishing', 'hacking', 'scam', 'adult', 'gambling', 'piracy', 'proxy', 'vpn', 'file_sharing', 'cryptominer'],
    warnCategories: ['social_media', 'streaming', 'gaming'],
    threatBlocking: { enabled: true, feeds: ['malware', 'phishing', 'c2', 'ransomware', 'botnet', 'cryptominer', 'spam'] },
    safesearch: {
      enabled: true,
      services: ['google', 'bing', 'youtube', 'duckduckgo'],
      settings: { google: 'moderate', bing: 'moderate', youtube: 'moderate', duckduckgo: 'moderate' } as SafeSearchSettings,
    },
  },
  'Education K-12': {
    description: 'Safe browsing for schools',
    blockCategories: ['adult', 'violence', 'drugs', 'weapons', 'gambling', 'dating', 'alcohol', 'hacking', 'proxy', 'vpn', 'piracy'],
    warnCategories: ['social_media', 'gaming', 'streaming', 'chat'],
    threatBlocking: { enabled: true, feeds: ['malware', 'phishing', 'c2'] },
    safesearch: {
      enabled: true,
      services: ['google', 'bing', 'youtube', 'duckduckgo'],
      settings: { google: 'strict', bing: 'strict', youtube: 'strict', duckduckgo: 'strict' } as SafeSearchSettings,
    },
  },
  'Minimal Blocking': {
    description: 'Only block security threats',
    blockCategories: ['malware', 'phishing', 'scam', 'cryptominer'],
    warnCategories: [],
    threatBlocking: { enabled: true, feeds: ['malware', 'phishing', 'c2', 'ransomware'] },
    safesearch: {
      enabled: false,
      services: [],
      settings: { google: 'off', bing: 'off', youtube: 'off', duckduckgo: 'off' } as SafeSearchSettings,
    },
  },
} as const

// All categories flat list
export const CATEGORIES = Object.values(CATEGORY_GROUPS).flatMap(g => g.categories)

// Threat feeds available
export const THREAT_FEEDS = [
  { id: 'malware', name: 'Malware', description: 'Known malware distribution sites' },
  { id: 'phishing', name: 'Phishing', description: 'Phishing and credential theft sites' },
  { id: 'c2', name: 'Command & Control', description: 'Botnet C2 servers' },
  { id: 'ransomware', name: 'Ransomware', description: 'Ransomware infrastructure' },
  { id: 'botnet', name: 'Botnet', description: 'Known botnet IPs and domains' },
  { id: 'cryptominer', name: 'Cryptominer', description: 'Cryptojacking scripts' },
  { id: 'spam', name: 'Spam', description: 'Spam sources' },
] as const
