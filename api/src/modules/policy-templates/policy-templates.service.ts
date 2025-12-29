import { Injectable } from '@nestjs/common';

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  config: {
    blockedCategories: string[];
    allowedCategories: string[];
    safeSearch: boolean;
    blockMalware: boolean;
    blockPhishing: boolean;
    blockAds: boolean;
  };
}

@Injectable()
export class PolicyTemplatesService {
  private readonly templates: PolicyTemplate[] = [
    {
      id: 'family-safe',
      name: 'Family Safe',
      description: 'Block adult content, gambling, and other inappropriate content for families',
      category: 'Home',
      icon: 'Shield',
      config: {
        blockedCategories: ['adult', 'gambling', 'drugs', 'weapons', 'violence'],
        allowedCategories: [],
        safeSearch: true,
        blockMalware: true,
        blockPhishing: true,
        blockAds: true,
      },
    },
    {
      id: 'work-productivity',
      name: 'Work Productivity',
      description: 'Block social media, streaming, and other distracting content during work hours',
      category: 'Business',
      icon: 'Briefcase',
      config: {
        blockedCategories: ['social-media', 'streaming', 'gaming', 'gambling'],
        allowedCategories: [],
        safeSearch: false,
        blockMalware: true,
        blockPhishing: true,
        blockAds: false,
      },
    },
    {
      id: 'security-focused',
      name: 'Security Focused',
      description: 'Maximum security with malware, phishing, and threat blocking',
      category: 'Security',
      icon: 'Lock',
      config: {
        blockedCategories: ['malware', 'phishing', 'cryptomining', 'newly-registered'],
        allowedCategories: [],
        safeSearch: false,
        blockMalware: true,
        blockPhishing: true,
        blockAds: true,
      },
    },
    {
      id: 'education',
      name: 'Education',
      description: 'Safe browsing for schools and educational institutions',
      category: 'Education',
      icon: 'GraduationCap',
      config: {
        blockedCategories: ['adult', 'gambling', 'drugs', 'weapons', 'violence', 'social-media', 'gaming'],
        allowedCategories: ['education', 'reference', 'news'],
        safeSearch: true,
        blockMalware: true,
        blockPhishing: true,
        blockAds: true,
      },
    },
    {
      id: 'minimal',
      name: 'Minimal Protection',
      description: 'Basic security with minimal content filtering',
      category: 'Basic',
      icon: 'Zap',
      config: {
        blockedCategories: [],
        allowedCategories: [],
        safeSearch: false,
        blockMalware: true,
        blockPhishing: true,
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
}

