import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export interface ThreatAlert {
  id: string;
  tenantId: string;
  type: 'dga' | 'tunneling' | 'exfiltration' | 'c2' | 'malware';
  severity: 'low' | 'medium' | 'high' | 'critical';
  domain: string;
  clientIp: string;
  locationId: string;
  details: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class ThreatDetectionService {
  private readonly logger = new Logger(ThreatDetectionService.name);

  // DGA detection patterns
  private readonly dgaPatterns = {
    highEntropy: 4.0, // Shannon entropy threshold
    consonantRatio: 0.7, // Consonant to vowel ratio threshold
    lengthThreshold: 20, // Suspiciously long subdomain
  };

  // DNS tunneling indicators
  private readonly tunnelingIndicators = {
    maxSubdomainLength: 63,
    unusualRecordTypes: ['TXT', 'NULL', 'CNAME'],
    highQueryRate: 100, // queries per minute per client
  };

  constructor(
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async analyzeQuery(query: {
    tenantId: string;
    locationId: string;
    domain: string;
    queryType: string;
    clientIp: string;
    timestamp: Date;
  }): Promise<ThreatAlert | null> {
    const alerts: ThreatAlert[] = [];

    // Check for DGA
    const dgaResult = this.detectDGA(query.domain);
    if (dgaResult.isDGA) {
      alerts.push({
        id: this.generateId(),
        tenantId: query.tenantId,
        type: 'dga',
        severity: dgaResult.confidence > 0.8 ? 'high' : 'medium',
        domain: query.domain,
        clientIp: query.clientIp,
        locationId: query.locationId,
        details: {
          entropy: dgaResult.entropy,
          confidence: dgaResult.confidence,
          reason: dgaResult.reason,
        },
        timestamp: query.timestamp,
      });
    }

    // Check for DNS tunneling
    const tunnelingResult = this.detectTunneling(query.domain, query.queryType);
    if (tunnelingResult.isTunneling) {
      alerts.push({
        id: this.generateId(),
        tenantId: query.tenantId,
        type: 'tunneling',
        severity: 'high',
        domain: query.domain,
        clientIp: query.clientIp,
        locationId: query.locationId,
        details: {
          indicators: tunnelingResult.indicators,
          subdomainLength: tunnelingResult.subdomainLength,
        },
        timestamp: query.timestamp,
      });
    }

    // Broadcast alerts
    for (const alert of alerts) {
      this.logger.warn(`Threat detected: ${alert.type} - ${alert.domain} from ${alert.clientIp}`);
      this.realtimeGateway.broadcastThreat(alert.tenantId, alert);
    }

    return alerts.length > 0 ? alerts[0] : null;
  }

  private detectDGA(domain: string): { isDGA: boolean; entropy: number; confidence: number; reason: string } {
    const parts = domain.split('.');
    const subdomain = parts.length > 2 ? parts.slice(0, -2).join('.') : parts[0];

    // Calculate Shannon entropy
    const entropy = this.calculateEntropy(subdomain);

    // Calculate consonant ratio
    const consonantRatio = this.calculateConsonantRatio(subdomain);

    // Check for patterns
    let confidence = 0;
    const reasons: string[] = [];

    if (entropy > this.dgaPatterns.highEntropy) {
      confidence += 0.4;
      reasons.push(`High entropy: ${entropy.toFixed(2)}`);
    }

    if (consonantRatio > this.dgaPatterns.consonantRatio) {
      confidence += 0.3;
      reasons.push(`High consonant ratio: ${consonantRatio.toFixed(2)}`);
    }

    if (subdomain.length > this.dgaPatterns.lengthThreshold) {
      confidence += 0.2;
      reasons.push(`Long subdomain: ${subdomain.length} chars`);
    }

    // Check for numeric patterns (common in DGA)
    const numericRatio = (subdomain.match(/\d/g) || []).length / subdomain.length;
    if (numericRatio > 0.3) {
      confidence += 0.1;
      reasons.push(`High numeric ratio: ${numericRatio.toFixed(2)}`);
    }

    return {
      isDGA: confidence >= 0.5,
      entropy,
      confidence,
      reason: reasons.join('; '),
    };
  }

  private detectTunneling(domain: string, queryType: string): {
    isTunneling: boolean;
    indicators: string[];
    subdomainLength: number
  } {
    const indicators: string[] = [];
    const parts = domain.split('.');
    const subdomain = parts.length > 2 ? parts.slice(0, -2).join('.') : parts[0];

    // Check subdomain length
    if (subdomain.length > this.tunnelingIndicators.maxSubdomainLength * 0.8) {
      indicators.push('Unusually long subdomain');
    }

    // Check for base64-like patterns
    if (/^[A-Za-z0-9+/=]+$/.test(subdomain) && subdomain.length > 30) {
      indicators.push('Base64-like subdomain encoding');
    }

    // Check unusual record types
    if (this.tunnelingIndicators.unusualRecordTypes.includes(queryType)) {
      indicators.push(`Unusual record type: ${queryType}`);
    }

    return {
      isTunneling: indicators.length >= 2,
      indicators,
      subdomainLength: subdomain.length,
    };
  }

  private calculateEntropy(str: string): number {
    const freq: Record<string, number> = {};
    for (const char of str.toLowerCase()) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private calculateConsonantRatio(str: string): number {
    const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
    let consonants = 0;
    let letters = 0;

    for (const char of str.toLowerCase()) {
      if (/[a-z]/.test(char)) {
        letters++;
        if (!vowels.has(char)) consonants++;
      }
    }

    return letters > 0 ? consonants / letters : 0;
  }

  private generateId(): string {
    return `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
