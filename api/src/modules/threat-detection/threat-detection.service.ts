// Nebula DNS - Threat Detection Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  GetRecentThreatsDto,
  GetThreatStatsDto,
  ThreatDetectionStatusDto,
  PaginatedThreatsResponseDto,
  ThreatStatsDto,
  DomainAnalysisDto,
  DetectedThreatDto,
} from './dto/threat-detection.dto';

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
    lowFrequencyTLDs: [
      '.tk',
      '.ml',
      '.ga',
      '.cf',
      '.gq',
      '.xyz',
      '.top',
      '.work',
      '.click',
    ],
  };

  // Data exfiltration thresholds
  private readonly exfiltrationIndicators = {
    minDataLength: 100, // Minimum subdomain data length to consider
    suspiciousQueryTypes: ['TXT', 'MX', 'CNAME'],
    hexEncodingPattern: /^[0-9a-f]+$/i,
  };

  // Per-client query tracking for rate analysis
  private clientQueryHistory: Map<
    string,
    { timestamps: number[]; domains: Set<string> }
  > = new Map();

  constructor(private readonly realtimeGateway: RealtimeGateway) {}

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
    const c2Result = this.detectC2(
      query.domain,
      query.clientIp,
      query.timestamp,
    );
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
      this.logger.warn(
        `Threat detected: ${alert.type} - ${alert.domain} from ${alert.clientIp}`,
      );
      this.realtimeGateway.broadcastThreat(alert.tenantId, alert);
    }

    return alerts.length > 0 ? alerts[0] : null;
  }

  private detectDGA(domain: string): {
    isDGA: boolean;
    entropy: number;
    confidence: number;
    reason: string;
  } {
    const parts = domain.split('.');
    const subdomain =
      parts.length > 2 ? parts.slice(0, -2).join('.') : parts[0];

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
    const numericRatio =
      (subdomain.match(/\d/g) || []).length / subdomain.length;
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

  private detectTunneling(
    domain: string,
    queryType: string,
  ): {
    isTunneling: boolean;
    indicators: string[];
    subdomainLength: number;
  } {
    const indicators: string[] = [];
    const parts = domain.split('.');
    const subdomain =
      parts.length > 2 ? parts.slice(0, -2).join('.') : parts[0];

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

  private detectC2(
    domain: string,
    clientIp: string,
    timestamp: Date,
  ): {
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
      this.clientQueryHistory.set(clientKey, {
        timestamps: [],
        domains: new Set(),
      });
    }

    const history = this.clientQueryHistory.get(clientKey)!;
    history.timestamps.push(now);
    history.domains.add(domain);

    // Clean up old entries (keep last hour)
    const oneHourAgo = now - 3600000;
    history.timestamps = history.timestamps.filter((t) => t > oneHourAgo);

    // Check for suspicious TLD
    const lowFreqTLD = this.c2Indicators.lowFrequencyTLDs.find((tld) =>
      domain.endsWith(tld),
    );
    if (lowFreqTLD) {
      indicators.push(`Suspicious TLD: ${lowFreqTLD}`);
      confidence += 0.3;
    }

    // Check for beaconing behavior (regular intervals)
    if (history.timestamps.length >= 5) {
      const intervals: number[] = [];
      for (let i = 1; i < history.timestamps.length; i++) {
        intervals.push(
          (history.timestamps[i] - history.timestamps[i - 1]) / 1000,
        );
      }

      // Check if intervals are consistent (potential beaconing)
      const avgInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance =
        intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) /
        intervals.length;
      const stdDev = Math.sqrt(variance);

      // If standard deviation is low relative to average, it's regular
      if (stdDev < avgInterval * 0.2 && avgInterval > 30) {
        indicators.push(
          `Regular beacon interval: ~${Math.round(avgInterval)}s`,
        );
        confidence += 0.4;
      }
    }

    // Check for DGA-like domain with suspicious TLD combination
    const parts = domain.split('.');
    const subdomain =
      parts.length > 2 ? parts.slice(0, -2).join('.') : parts[0];
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

  private detectExfiltration(
    domain: string,
    queryType: string,
  ): {
    isExfiltration: boolean;
    indicators: string[];
    estimatedDataSize: number;
  } {
    const indicators: string[] = [];
    const parts = domain.split('.');
    const subdomain =
      parts.length > 2 ? parts.slice(0, -2).join('.') : parts[0];
    const subdomainNoDelim = subdomain.replace(/[-_.]/g, '');

    let estimatedDataSize = 0;

    // Check for large data in subdomain
    if (subdomainNoDelim.length > this.exfiltrationIndicators.minDataLength) {
      indicators.push(`Large subdomain data: ${subdomainNoDelim.length} chars`);
      estimatedDataSize = subdomainNoDelim.length;
    }

    // Check for hex encoding (common for binary data)
    if (
      this.exfiltrationIndicators.hexEncodingPattern.test(subdomainNoDelim) &&
      subdomainNoDelim.length > 50
    ) {
      indicators.push('Hex-encoded data detected');
      estimatedDataSize = Math.floor(subdomainNoDelim.length / 2); // Hex is 2 chars per byte
    }

    // Check for base64 encoding
    if (
      /^[A-Za-z0-9+/]+=*$/.test(subdomainNoDelim) &&
      subdomainNoDelim.length > 50
    ) {
      indicators.push('Base64-encoded data detected');
      estimatedDataSize = Math.floor(subdomainNoDelim.length * 0.75); // Base64 ratio
    }

    // Check for suspicious query type for data transfer
    if (this.exfiltrationIndicators.suspiciousQueryTypes.includes(queryType)) {
      indicators.push(`Suspicious query type for exfiltration: ${queryType}`);
    }

    // Multiple long subdomains (chunked data)
    const longParts = parts.filter((p) => p.length > 40);
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
      history.timestamps = history.timestamps.filter((t) => t > oneHourAgo);
      if (history.timestamps.length === 0) {
        this.clientQueryHistory.delete(key);
      }
    }
  }

  // In-memory storage for detected threats (would be ClickHouse in production)
  private detectedThreats: Map<string, ThreatAlert[]> = new Map();

  // Store a detected threat
  private storeDetectedThreat(alert: ThreatAlert): void {
    const tenantThreats = this.detectedThreats.get(alert.tenantId) || [];
    tenantThreats.unshift(alert);
    // Keep only last 10000 threats per tenant in memory
    if (tenantThreats.length > 10000) {
      tenantThreats.pop();
    }
    this.detectedThreats.set(alert.tenantId, tenantThreats);
  }

  /**
   * Get threat detection status including enabled feeds, last update times, and total threats tracked
   */
  async getStatus(tenantId: string): Promise<ThreatDetectionStatusDto> {
    this.logger.log(`Getting threat detection status for tenant: ${tenantId}`);

    // Get threats detected in last 24 hours
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tenantThreats = this.detectedThreats.get(tenantId) || [];
    const threatsLast24h = tenantThreats.filter(
      (t) => t.timestamp >= oneDayAgo,
    ).length;

    return {
      enabled: true,
      feeds: [
        {
          id: 'dga-detection',
          name: 'DGA Detection Algorithm',
          enabled: true,
          lastUpdated: now.toISOString(),
          indicatorCount: 0, // Algorithm-based, no static indicators
        },
        {
          id: 'tunneling-detection',
          name: 'DNS Tunneling Detection',
          enabled: true,
          lastUpdated: now.toISOString(),
          indicatorCount: 0,
        },
        {
          id: 'c2-detection',
          name: 'C2 Communication Detection',
          enabled: true,
          lastUpdated: now.toISOString(),
          indicatorCount: this.c2Indicators.lowFrequencyTLDs.length,
        },
        {
          id: 'exfiltration-detection',
          name: 'Data Exfiltration Detection',
          enabled: true,
          lastUpdated: now.toISOString(),
          indicatorCount: 0,
        },
      ],
      totalThreatsTracked: this.c2Indicators.lowFrequencyTLDs.length,
      lastGlobalUpdate: now.toISOString(),
      threatsDetectedLast24h: threatsLast24h,
    };
  }

  /**
   * Get recent detected threats with pagination and filtering
   */
  async getRecentThreats(
    tenantId: string,
    query: GetRecentThreatsDto,
  ): Promise<PaginatedThreatsResponseDto> {
    this.logger.log(
      `Getting recent threats for tenant: ${tenantId}, query: ${JSON.stringify(query)}`,
    );

    let tenantThreats = this.detectedThreats.get(tenantId) || [];

    // Apply severity filter
    if (query.severity) {
      tenantThreats = tenantThreats.filter(
        (t) => t.severity === query.severity,
      );
    }

    // Apply category filter
    if (query.category) {
      tenantThreats = tenantThreats.filter((t) => t.type === query.category);
    }

    // Apply date filters
    if (query.startDate) {
      const startDate = new Date(query.startDate);
      tenantThreats = tenantThreats.filter((t) => t.timestamp >= startDate);
    }
    if (query.endDate) {
      const endDate = new Date(query.endDate);
      tenantThreats = tenantThreats.filter((t) => t.timestamp <= endDate);
    }

    const total = tenantThreats.length;

    // Apply cursor-based pagination
    let startIndex = 0;
    if (query.cursor) {
      const cursorIndex = tenantThreats.findIndex((t) => t.id === query.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const limit = query.limit || 50;
    const paginatedThreats = tenantThreats.slice(
      startIndex,
      startIndex + limit,
    );
    const nextCursor =
      paginatedThreats.length === limit && startIndex + limit < total
        ? paginatedThreats[paginatedThreats.length - 1].id
        : null;

    return {
      data: paginatedThreats.map((t) => this.mapAlertToDto(t)),
      nextCursor,
      total,
    };
  }

  /**
   * Get threat statistics grouped by category, severity, or day
   */
  async getStats(
    tenantId: string,
    query: GetThreatStatsDto,
  ): Promise<ThreatStatsDto> {
    this.logger.log(
      `Getting threat stats for tenant: ${tenantId}, query: ${JSON.stringify(query)}`,
    );

    const now = new Date();
    const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodStart = query.startDate
      ? new Date(query.startDate)
      : defaultStart;
    const periodEnd = query.endDate ? new Date(query.endDate) : now;

    let tenantThreats = this.detectedThreats.get(tenantId) || [];

    // Filter by date range
    tenantThreats = tenantThreats.filter(
      (t) => t.timestamp >= periodStart && t.timestamp <= periodEnd,
    );

    // Group by category
    const byCategory = this.groupBy(tenantThreats, 'type');
    const categoryStats = Object.entries(byCategory).map(
      ([category, threats]) => ({
        category,
        count: (threats as ThreatAlert[]).length,
      }),
    );

    // Group by severity
    const bySeverity = this.groupBy(tenantThreats, 'severity');
    const severityStats = Object.entries(bySeverity).map(
      ([severity, threats]) => ({
        severity,
        count: (threats as ThreatAlert[]).length,
      }),
    );

    // Group by day
    const byDay: Record<string, number> = {};
    tenantThreats.forEach((t) => {
      const dateKey = t.timestamp.toISOString().split('T')[0];
      byDay[dateKey] = (byDay[dateKey] || 0) + 1;
    });
    const dayStats = Object.entries(byDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      byCategory: categoryStats,
      bySeverity: severityStats,
      byDay: dayStats,
      totalThreats: tenantThreats.length,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    };
  }

  /**
   * Analyze a specific domain for threats
   */
  async analyzeDomain(
    tenantId: string,
    domain: string,
  ): Promise<DomainAnalysisDto> {
    this.logger.log(
      `Analyzing domain for tenant: ${tenantId}, domain: ${domain}`,
    );

    const normalizedDomain = domain.toLowerCase();
    const categories: string[] = [];
    const sources: { source: string; confidence: number; lastSeen: string }[] =
      [];
    const analysisDetails: {
      entropy?: number;
      consonantRatio?: number;
      subdomainLength?: number;
      indicators?: string[];
    } = {};
    const allIndicators: string[] = [];

    let overallConfidence = 0;
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' | null = null;

    // Check for DGA
    const dgaResult = this.detectDGA(normalizedDomain);
    if (dgaResult.isDGA) {
      categories.push('dga');
      sources.push({
        source: 'DGA Detection Algorithm',
        confidence: Math.round(dgaResult.confidence * 100),
        lastSeen: new Date().toISOString(),
      });
      overallConfidence = Math.max(
        overallConfidence,
        dgaResult.confidence * 100,
      );
      analysisDetails.entropy = dgaResult.entropy;
      analysisDetails.consonantRatio = this.calculateConsonantRatio(
        this.getSubdomain(normalizedDomain),
      );
      maxSeverity = dgaResult.confidence > 0.8 ? 'high' : 'medium';
    }

    // Check for tunneling indicators
    const tunnelingResult = this.detectTunneling(normalizedDomain, 'A');
    if (tunnelingResult.indicators.length > 0) {
      if (tunnelingResult.isTunneling) {
        categories.push('tunneling');
        maxSeverity = 'high';
      }
      sources.push({
        source: 'DNS Tunneling Detection',
        confidence: tunnelingResult.isTunneling ? 80 : 40,
        lastSeen: new Date().toISOString(),
      });
      analysisDetails.subdomainLength = tunnelingResult.subdomainLength;
      allIndicators.push(...tunnelingResult.indicators);
      overallConfidence = Math.max(
        overallConfidence,
        tunnelingResult.isTunneling ? 80 : 40,
      );
    }

    // Check for C2 indicators (without historical context)
    const lowFreqTLD = this.c2Indicators.lowFrequencyTLDs.find((tld) =>
      normalizedDomain.endsWith(tld),
    );
    if (lowFreqTLD) {
      allIndicators.push(`Suspicious TLD: ${lowFreqTLD}`);
      sources.push({
        source: 'C2 TLD Analysis',
        confidence: 30,
        lastSeen: new Date().toISOString(),
      });
      overallConfidence = Math.max(overallConfidence, 30);
    }

    // Check for exfiltration indicators
    const exfilResult = this.detectExfiltration(normalizedDomain, 'A');
    if (exfilResult.indicators.length > 0) {
      if (exfilResult.isExfiltration) {
        categories.push('exfiltration');
        maxSeverity = 'critical';
      }
      sources.push({
        source: 'Data Exfiltration Detection',
        confidence: exfilResult.isExfiltration ? 90 : 30,
        lastSeen: new Date().toISOString(),
      });
      allIndicators.push(...exfilResult.indicators);
      overallConfidence = Math.max(
        overallConfidence,
        exfilResult.isExfiltration ? 90 : 30,
      );
    }

    analysisDetails.indicators = allIndicators;

    const isThreat = categories.length > 0;

    return {
      domain: normalizedDomain,
      isThreat,
      confidence: Math.round(overallConfidence),
      categories,
      severity: isThreat ? maxSeverity : null,
      sources,
      analysis: analysisDetails,
      analyzedAt: new Date().toISOString(),
    };
  }

  // Helper methods

  private getSubdomain(domain: string): string {
    const parts = domain.split('.');
    return parts.length > 2 ? parts.slice(0, -2).join('.') : parts[0];
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce(
      (result, item) => {
        const groupKey = String(item[key]);
        if (!result[groupKey]) {
          result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
      },
      {} as Record<string, T[]>,
    );
  }

  private mapAlertToDto(alert: ThreatAlert): DetectedThreatDto {
    return {
      id: alert.id,
      tenantId: alert.tenantId,
      type: alert.type,
      severity: alert.severity,
      domain: alert.domain,
      clientIp: alert.clientIp,
      locationId: alert.locationId,
      details: alert.details,
      timestamp: alert.timestamp.toISOString(),
    };
  }
}
