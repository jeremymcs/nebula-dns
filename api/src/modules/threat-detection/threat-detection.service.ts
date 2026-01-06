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

  // C2 communication indicators
  private readonly c2Indicators = {
    beaconIntervals: [60, 300, 600, 900, 1800, 3600], // Common C2 beacon intervals in seconds
    suspiciousPorts: ['8080', '8443', '4444', '5555', '9001'],
    lowFrequencyTLDs: ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.work', '.click'],
  };

  // Data exfiltration thresholds
  private readonly exfiltrationIndicators = {
    minDataLength: 100, // Minimum subdomain data length to consider
    suspiciousQueryTypes: ['TXT', 'MX', 'CNAME'],
    hexEncodingPattern: /^[0-9a-f]+$/i,
  };

  // Per-client query tracking for rate analysis
  private clientQueryHistory: Map<string, { timestamps: number[]; domains: Set<string> }> = new Map();

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

    // Check for C2 communication
    const c2Result = this.detectC2(query.domain, query.clientIp, query.timestamp);
    if (c2Result.isC2) {
      alerts.push({
        id: this.generateId(),
        tenantId: query.tenantId,
        type: 'c2',
        severity: c2Result.confidence > 0.7 ? 'critical' : 'high',
        domain: query.domain,
        clientIp: query.clientIp,
        locationId: query.locationId,
        details: {
          indicators: c2Result.indicators,
          confidence: c2Result.confidence,
        },
        timestamp: query.timestamp,
      });
    }

    // Check for data exfiltration
    const exfilResult = this.detectExfiltration(query.domain, query.queryType);
    if (exfilResult.isExfiltration) {
      alerts.push({
        id: this.generateId(),
        tenantId: query.tenantId,
        type: 'exfiltration',
        severity: 'critical',
        domain: query.domain,
        clientIp: query.clientIp,
        locationId: query.locationId,
        details: {
          indicators: exfilResult.indicators,
          dataSize: exfilResult.estimatedDataSize,
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

  private detectC2(domain: string, clientIp: string, timestamp: Date): {
    isC2: boolean;
    indicators: string[];
    confidence: number;
  } {
    const indicators: string[] = [];
    let confidence = 0;

    // Track query history for this client
    const clientKey = clientIp;
    const now = timestamp.getTime();

    if (!this.clientQueryHistory.has(clientKey)) {
      this.clientQueryHistory.set(clientKey, { timestamps: [], domains: new Set() });
    }

    const history = this.clientQueryHistory.get(clientKey)!;
    history.timestamps.push(now);
    history.domains.add(domain);

    // Clean up old entries (keep last hour)
    const oneHourAgo = now - 3600000;
    history.timestamps = history.timestamps.filter(t => t > oneHourAgo);

    // Check for suspicious TLD
    const lowFreqTLD = this.c2Indicators.lowFrequencyTLDs.find(tld => domain.endsWith(tld));
    if (lowFreqTLD) {
      indicators.push(`Suspicious TLD: ${lowFreqTLD}`);
      confidence += 0.3;
    }

    // Check for beaconing behavior (regular intervals)
    if (history.timestamps.length >= 5) {
      const intervals: number[] = [];
      for (let i = 1; i < history.timestamps.length; i++) {
        intervals.push((history.timestamps[i] - history.timestamps[i - 1]) / 1000);
      }

      // Check if intervals are consistent (potential beaconing)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);

      // If standard deviation is low relative to average, it's regular
      if (stdDev < avgInterval * 0.2 && avgInterval > 30) {
        indicators.push(`Regular beacon interval: ~${Math.round(avgInterval)}s`);
        confidence += 0.4;
      }
    }

    // Check for DGA-like domain with suspicious TLD combination
    const parts = domain.split('.');
    const subdomain = parts.length > 2 ? parts.slice(0, -2).join('.') : parts[0];
    const entropy = this.calculateEntropy(subdomain);

    if (entropy > 3.5 && lowFreqTLD) {
      indicators.push('High entropy domain with suspicious TLD');
      confidence += 0.3;
    }

    return {
      isC2: confidence >= 0.5,
      indicators,
      confidence,
    };
  }

  private detectExfiltration(domain: string, queryType: string): {
    isExfiltration: boolean;
    indicators: string[];
    estimatedDataSize: number;
  } {
    const indicators: string[] = [];
    const parts = domain.split('.');
    const subdomain = parts.length > 2 ? parts.slice(0, -2).join('.') : parts[0];
    const subdomainNoDelim = subdomain.replace(/[-_.]/g, '');

    let estimatedDataSize = 0;

    // Check for large data in subdomain
    if (subdomainNoDelim.length > this.exfiltrationIndicators.minDataLength) {
      indicators.push(`Large subdomain data: ${subdomainNoDelim.length} chars`);
      estimatedDataSize = subdomainNoDelim.length;
    }

    // Check for hex encoding (common for binary data)
    if (this.exfiltrationIndicators.hexEncodingPattern.test(subdomainNoDelim) && subdomainNoDelim.length > 50) {
      indicators.push('Hex-encoded data detected');
      estimatedDataSize = Math.floor(subdomainNoDelim.length / 2); // Hex is 2 chars per byte
    }

    // Check for base64 encoding
    if (/^[A-Za-z0-9+/]+=*$/.test(subdomainNoDelim) && subdomainNoDelim.length > 50) {
      indicators.push('Base64-encoded data detected');
      estimatedDataSize = Math.floor(subdomainNoDelim.length * 0.75); // Base64 ratio
    }

    // Check for suspicious query type for data transfer
    if (this.exfiltrationIndicators.suspiciousQueryTypes.includes(queryType)) {
      indicators.push(`Suspicious query type for exfiltration: ${queryType}`);
    }

    // Multiple long subdomains (chunked data)
    const longParts = parts.filter(p => p.length > 40);
    if (longParts.length >= 2) {
      indicators.push('Multiple long labels (chunked exfiltration)');
    }

    return {
      isExfiltration: indicators.length >= 2,
      indicators,
      estimatedDataSize,
    };
  }

  // Clean up old client history periodically
  cleanupHistory() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    for (const [key, history] of this.clientQueryHistory.entries()) {
      history.timestamps = history.timestamps.filter(t => t > oneHourAgo);
      if (history.timestamps.length === 0) {
        this.clientQueryHistory.delete(key);
      }
    }
  }
}
