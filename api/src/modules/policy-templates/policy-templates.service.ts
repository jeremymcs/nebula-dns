import { Injectable } from '@nestjs/common';

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags?: string[];
  compliance?: string[];
  config: {
    blockedCategories: string[];
    allowedCategories: string[];
    warnCategories?: string[];
    safeSearch: boolean;
    safeSearchSettings?: {
      google?: 'off' | 'moderate' | 'strict';
      bing?: 'off' | 'moderate' | 'strict';
      youtube?: 'off' | 'moderate' | 'strict';
      duckduckgo?: 'off' | 'moderate' | 'strict';
    };
    blockMalware: boolean;
    blockPhishing: boolean;
    blockAds: boolean;
    blockNewlyRegistered?: boolean;
    blockCryptomining?: boolean;
    threatFeeds?: string[];
  };
}

@Injectable()
export class PolicyTemplatesService {
  private readonly templates: PolicyTemplate[] = [
    // === HOME & FAMILY ===
    {
      id: 'family-safe',
      name: 'Family Safe',
      description:
        'Block adult content, gambling, and other inappropriate content for families',
      category: 'Home',
      icon: 'Shield',
      tags: ['family', 'parental-controls', 'safe-browsing'],
      config: {
        blockedCategories: [
          'adult',
          'gambling',
          'drugs',
          'weapons',
          'violence',
          'hate-speech',
        ],
        allowedCategories: [],
        safeSearch: true,
        safeSearchSettings: {
          google: 'strict',
          bing: 'strict',
          youtube: 'strict',
          duckduckgo: 'strict',
        },
        blockMalware: true,
        blockPhishing: true,
        blockAds: true,
      },
    },
    {
      id: 'kids-safe',
      name: 'Kids Safe',
      description:
        'Maximum protection for children with strict content filtering',
      category: 'Home',
      icon: 'Heart',
      tags: ['kids', 'children', 'parental-controls'],
      config: {
        blockedCategories: [
          'adult',
          'gambling',
          'drugs',
          'weapons',
          'violence',
          'hate-speech',
          'dating',
          'social-media',
          'gaming',
          'streaming',
        ],
        allowedCategories: ['education', 'kids'],
        safeSearch: true,
        safeSearchSettings: {
          google: 'strict',
          bing: 'strict',
          youtube: 'strict',
          duckduckgo: 'strict',
        },
        blockMalware: true,
        blockPhishing: true,
        blockAds: true,
        blockNewlyRegistered: true,
      },
    },

    // === BUSINESS ===
    {
      id: 'work-productivity',
      name: 'Work Productivity',
      description:
        'Block social media, streaming, and other distracting content during work hours',
      category: 'Business',
      icon: 'Briefcase',
      tags: ['productivity', 'office', 'work'],
      config: {
        blockedCategories: [
          'social-media',
          'streaming',
          'gaming',
          'gambling',
          'adult',
        ],
        allowedCategories: [],
        safeSearch: false,
        blockMalware: true,
        blockPhishing: true,
        blockAds: false,
      },
    },
    {
      id: 'corporate-security',
      name: 'Corporate Security',
      description:
        'Enterprise-grade security for corporate networks with strict threat protection',
      category: 'Business',
      icon: 'Building',
      tags: ['enterprise', 'corporate', 'security'],
      config: {
        blockedCategories: [
          'malware',
          'phishing',
          'c2',
          'cryptomining',
          'newly-registered',
          'proxy-vpn',
          'file-sharing',
        ],
        allowedCategories: [],
        warnCategories: ['uncategorized'],
        safeSearch: false,
        blockMalware: true,
        blockPhishing: true,
        blockAds: true,
        blockNewlyRegistered: true,
        blockCryptomining: true,
        threatFeeds: ['malware', 'phishing', 'c2', 'ransomware', 'botnet'],
      },
    },
    {
      id: 'guest-network',
      name: 'Guest Network',
      description:
        'Balanced policy for guest Wi-Fi with basic security and content filtering',
      category: 'Business',
      icon: 'Wifi',
      tags: ['guest', 'wifi', 'public'],
      config: {
        blockedCategories: [
          'adult',
          'malware',
          'phishing',
          'gambling',
          'drugs',
          'weapons',
        ],
        allowedCategories: [],
        safeSearch: true,
        safeSearchSettings: {
          google: 'moderate',
          bing: 'moderate',
          youtube: 'moderate',
          duckduckgo: 'moderate',
        },
        blockMalware: true,
        blockPhishing: true,
        blockAds: false,
      },
    },

    // === SECURITY ===
    {
      id: 'security-focused',
      name: 'Security Focused',
      description:
        'Maximum security with malware, phishing, and threat blocking',
      category: 'Security',
      icon: 'Lock',
      tags: ['security', 'protection', 'threats'],
      config: {
        blockedCategories: [
          'malware',
          'phishing',
          'c2',
          'cryptomining',
          'newly-registered',
          'proxy-vpn',
        ],
        allowedCategories: [],
        safeSearch: false,
        blockMalware: true,
        blockPhishing: true,
        blockAds: true,
        blockNewlyRegistered: true,
        blockCryptomining: true,
        threatFeeds: [
          'malware',
          'phishing',
          'c2',
          'ransomware',
          'botnet',
          'dga',
        ],
      },
    },
    {
      id: 'zero-trust',
      name: 'Zero Trust',
      description:
        'Block everything by default, only allow explicitly approved domains',
      category: 'Security',
      icon: 'ShieldX',
      tags: ['zero-trust', 'whitelist', 'strict'],
      config: {
        blockedCategories: ['*'],
        allowedCategories: [],
        safeSearch: true,
        blockMalware: true,
        blockPhishing: true,
        blockAds: true,
        blockNewlyRegistered: true,
        blockCryptomining: true,
      },
    },

    // === EDUCATION ===
    {
      id: 'k12-education',
      name: 'K-12 Education',
      description:
        'CIPA-compliant filtering for K-12 schools with age-appropriate content controls',
      category: 'Education',
      icon: 'GraduationCap',
      tags: ['school', 'k12', 'cipa', 'children'],
      compliance: ['CIPA'],
      config: {
        blockedCategories: [
          'adult',
          'gambling',
          'drugs',
          'weapons',
          'violence',
          'hate-speech',
          'dating',
          'social-media',
          'gaming',
        ],
        allowedCategories: ['education', 'reference', 'news', 'government'],
        safeSearch: true,
        safeSearchSettings: {
          google: 'strict',
          bing: 'strict',
          youtube: 'strict',
          duckduckgo: 'strict',
        },
        blockMalware: true,
        blockPhishing: true,
        blockAds: true,
        blockNewlyRegistered: true,
      },
    },
    {
      id: 'higher-education',
      name: 'Higher Education',
      description:
        'Balanced policy for colleges and universities with academic freedom',
      category: 'Education',
      icon: 'BookOpen',
      tags: ['college', 'university', 'academic'],
      config: {
        blockedCategories: ['malware', 'phishing', 'illegal', 'drugs'],
        allowedCategories: ['education', 'reference', 'news', 'social-media'],
        warnCategories: ['adult', 'gambling'],
        safeSearch: false,
        blockMalware: true,
        blockPhishing: true,
        blockAds: false,
      },
    },
    {
      id: 'library',
      name: 'Public Library',
      description:
        'Balanced filtering for public library networks with CIPA compliance',
      category: 'Education',
      icon: 'Library',
      tags: ['library', 'public', 'cipa'],
      compliance: ['CIPA'],
      config: {
        blockedCategories: ['adult', 'malware', 'phishing', 'gambling'],
        allowedCategories: ['education', 'reference', 'news', 'government'],
        warnCategories: ['violence', 'drugs'],
        safeSearch: true,
        blockMalware: true,
        blockPhishing: true,
        blockAds: false,
      },
    },

    // === COMPLIANCE ===
    {
      id: 'hipaa',
      name: 'HIPAA Compliant',
      description:
        'Healthcare-focused policy with strict security for HIPAA compliance',
      category: 'Compliance',
      icon: 'Hospital',
      tags: ['healthcare', 'hipaa', 'medical'],
      compliance: ['HIPAA'],
      config: {
        blockedCategories: [
          'malware',
          'phishing',
          'c2',
          'file-sharing',
          'proxy-vpn',
          'newly-registered',
          'personal-storage',
        ],
        allowedCategories: ['healthcare', 'medical', 'government'],
        safeSearch: false,
        blockMalware: true,
        blockPhishing: true,
        blockAds: true,
        blockNewlyRegistered: true,
        blockCryptomining: true,
        threatFeeds: ['malware', 'phishing', 'c2', 'ransomware'],
      },
    },
    {
      id: 'pci-dss',
      name: 'PCI-DSS Compliant',
      description:
        'Payment card industry security policy for networks handling card data',
      category: 'Compliance',
      icon: 'CreditCard',
      tags: ['pci', 'payment', 'financial'],
      compliance: ['PCI-DSS'],
      config: {
        blockedCategories: [
          'malware',
          'phishing',
          'c2',
          'proxy-vpn',
          'newly-registered',
          'uncategorized',
        ],
        allowedCategories: [],
        safeSearch: false,
        blockMalware: true,
        blockPhishing: true,
        blockAds: true,
        blockNewlyRegistered: true,
        blockCryptomining: true,
        threatFeeds: ['malware', 'phishing', 'c2', 'ransomware', 'botnet'],
      },
    },
    {
      id: 'gdpr',
      name: 'GDPR Privacy Focus',
      description:
        'Privacy-focused policy blocking trackers and data collection services',
      category: 'Compliance',
      icon: 'Eye',
      tags: ['privacy', 'gdpr', 'tracking'],
      compliance: ['GDPR'],
      config: {
        blockedCategories: [
          'tracking',
          'advertising',
          'analytics',
          'malware',
          'phishing',
        ],
        allowedCategories: [],
        safeSearch: false,
        blockMalware: true,
        blockPhishing: true,
        blockAds: true,
      },
    },

    // === BASIC ===
    {
      id: 'minimal',
      name: 'Minimal Protection',
      description:
        'Basic security with minimal content filtering - malware and phishing only',
      category: 'Basic',
      icon: 'Zap',
      tags: ['minimal', 'basic', 'light'],
      config: {
        blockedCategories: [],
        allowedCategories: [],
        safeSearch: false,
        blockMalware: true,
        blockPhishing: true,
        blockAds: false,
      },
    },
    {
      id: 'no-filtering',
      name: 'No Filtering',
      description: 'DNS resolution only with no content or threat filtering',
      category: 'Basic',
      icon: 'Circle',
      tags: ['none', 'bypass', 'disabled'],
      config: {
        blockedCategories: [],
        allowedCategories: [],
        safeSearch: false,
        blockMalware: false,
        blockPhishing: false,
        blockAds: false,
      },
    },
  ];

  findAll(): PolicyTemplate[] {
    return this.templates;
  }

  findOne(id: string): PolicyTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }

  findByCategory(category: string): PolicyTemplate[] {
    return this.templates.filter(
      (t) => t.category.toLowerCase() === category.toLowerCase(),
    );
  }

  findByCompliance(compliance: string): PolicyTemplate[] {
    return this.templates.filter((t) => t.compliance?.includes(compliance));
  }

  findByTag(tag: string): PolicyTemplate[] {
    return this.templates.filter((t) => t.tags?.includes(tag.toLowerCase()));
  }

  getCategories(): string[] {
    return [...new Set(this.templates.map((t) => t.category))];
  }

  getComplianceStandards(): string[] {
    const standards = this.templates.flatMap((t) => t.compliance || []);
    return [...new Set(standards)];
  }
}
