/**
 * Nebula DNS - Policy Templates Types
 */

export interface PolicyTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  author: TemplateAuthor
  rating: number
  reviewCount: number
  usageCount: number
  tags: string[]
  features: string[]
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
  isOfficial: boolean
  isFeatured: boolean
}

export type TemplateCategory =
  | 'education'
  | 'healthcare'
  | 'enterprise'
  | 'family'
  | 'gaming'
  | 'minimal'
  | 'security'
  | 'compliance'

export interface TemplateAuthor {
  id: string
  name: string
  avatar?: string
  isVerified: boolean
}

export interface TemplateReview {
  id: string
  templateId: string
  author: TemplateAuthor
  rating: number
  comment: string
  createdAt: string
}

export const TEMPLATE_CATEGORIES: Array<{
  id: TemplateCategory
  name: string
  icon: string
  description: string
}> = [
  { id: 'education', name: 'Education', icon: '🎓', description: 'Schools and universities' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', description: 'HIPAA compliant settings' },
  { id: 'enterprise', name: 'Enterprise', icon: '🏢', description: 'Corporate environments' },
  { id: 'family', name: 'Family', icon: '👨‍👩‍👧‍👦', description: 'Home and family use' },
  { id: 'gaming', name: 'Gaming', icon: '🎮', description: 'Optimized for gaming' },
  { id: 'minimal', name: 'Minimal', icon: '⚡', description: 'Basic protection only' },
  { id: 'security', name: 'Security', icon: '🛡️', description: 'Maximum protection' },
  { id: 'compliance', name: 'Compliance', icon: '📋', description: 'Regulatory compliance' },
]

// Demo data generator
export function generateDemoTemplates(): PolicyTemplate[] {
  return [
    {
      id: 't1',
      name: 'K-12 Education Standard',
      description: 'CIPA-compliant filtering for K-12 schools with age-appropriate content blocking.',
      category: 'education',
      author: { id: 'flux-shield', name: 'Flux Shield', isVerified: true },
      rating: 4.8,
      reviewCount: 234,
      usageCount: 12500,
      tags: ['CIPA', 'K-12', 'SafeSearch'],
      features: ['Adult content blocking', 'SafeSearch enforcement', 'Social media limits', 'Gaming restrictions'],
      config: {},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-03-15T00:00:00Z',
      isOfficial: true,
      isFeatured: true,
    },
    {
      id: 't2',
      name: 'Enterprise Security Plus',
      description: 'Maximum threat protection for corporate networks with DGA and NRD blocking.',
      category: 'enterprise',
      author: { id: 'flux-shield', name: 'Flux Shield', isVerified: true },
      rating: 4.9,
      reviewCount: 567,
      usageCount: 34000,
      tags: ['Enterprise', 'DGA', 'NRD', 'Malware'],
      features: ['All threat categories', 'NRD blocking', 'DGA detection', 'DNS tunneling prevention'],
      config: {},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-03-20T00:00:00Z',
      isOfficial: true,
      isFeatured: true,
    },
    {
      id: 't3',
      name: 'Family Safe Home',
      description: 'Protect your family with age-appropriate filtering and screen time awareness.',
      category: 'family',
      author: { id: 'flux-shield', name: 'Flux Shield', isVerified: true },
      rating: 4.7,
      reviewCount: 1234,
      usageCount: 89000,
      tags: ['Family', 'Kids', 'SafeSearch', 'Parental'],
      features: ['Adult content blocking', 'SafeSearch', 'Social media awareness', 'Malware protection'],
      config: {},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-03-18T00:00:00Z',
      isOfficial: true,
      isFeatured: true,
    },
    {
      id: 't4',
      name: 'HIPAA Healthcare',
      description: 'Healthcare-focused policy with HIPAA compliance considerations.',
      category: 'healthcare',
      author: { id: 'u1', name: 'HealthIT Pro', isVerified: true },
      rating: 4.6,
      reviewCount: 89,
      usageCount: 2300,
      tags: ['HIPAA', 'Healthcare', 'Compliance'],
      features: ['Threat blocking', 'Audit logging', 'Restricted categories', 'Compliance reporting'],
      config: {},
      createdAt: '2024-02-01T00:00:00Z',
      updatedAt: '2024-03-10T00:00:00Z',
      isOfficial: false,
      isFeatured: false,
    },
    {
      id: 't5',
      name: 'Gaming Optimized',
      description: 'Minimal filtering with gaming platform allowlisting for low latency.',
      category: 'gaming',
      author: { id: 'u2', name: 'GamerAdmin', isVerified: false },
      rating: 4.3,
      reviewCount: 456,
      usageCount: 15600,
      tags: ['Gaming', 'Low Latency', 'Minimal'],
      features: ['Gaming platforms allowed', 'Malware only blocking', 'Fast resolution'],
      config: {},
      createdAt: '2024-02-15T00:00:00Z',
      updatedAt: '2024-03-05T00:00:00Z',
      isOfficial: false,
      isFeatured: false,
    },
  ]
}

