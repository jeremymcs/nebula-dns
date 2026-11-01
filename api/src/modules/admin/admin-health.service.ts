// Nebula DNS - Admin Health Service
// Aggregates health data from multiple sources for system monitoring
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dns from 'dns';
import * as net from 'net';
import * as tls from 'tls';

import { ClickHouseService } from '../clickhouse/clickhouse.service';
import { RedisService } from '../redis/redis.service';
import { AlertDispatcherService } from '../alerting/alert-dispatcher.service';
import {
  SystemHealthResponseDto,
  ServiceStatusDto,
  ServiceHealthStatus,
  OverallHealthStatus,
  StorageStatusDto,
  ErrorRatesDto,
  ErrorWindowDto,
  QueryVolumeDto,
  RecentErrorDto,
} from './dto/system-health.dto';
import {
  CertificateExpiryEntryDto,
  CertificateExpiryResponseDto,
} from './dto/certificate-expiry.dto';

const dnsLookup = dns.promises.lookup;

function parsePort(
  value: string | number | undefined,
  fallback: number,
): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 65535
    ? parsed
    : fallback;
}

/**
 * AdminHealthService
 *
 * Aggregates health check data from multiple sources:
 * - External DNS services (policy-svc, dnsdist, unbound)
 * - Storage backends (ClickHouse, Redis)
 * - Error rates and query volume from ClickHouse analytics
 *
 * Uses fail-safe patterns - individual check failures don't block
 * the overall health response.
 */
@Injectable()
export class AdminHealthService {
  private readonly logger = new Logger(AdminHealthService.name);

  // Service URLs with defaults for docker-compose environment
  private readonly policySvcUrl: string;
  private readonly dnsdistUrl: string;
  private readonly dnsdistApiKey: string;
  private readonly unboundHost: string;
  private readonly unboundPort: number;
  private readonly certProbeTargets: Array<{
    hostname: string;
    port: number;
    service: string;
  }>;

  // HTTP request timeout
  private readonly requestTimeoutMs = 5000;

  // Alert cooldown tracking (prevent alert spam)
  private lastAlertTime: Map<string, number> = new Map();
  private readonly ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly clickhouseService: ClickHouseService,
    private readonly redisService: RedisService,
    @Optional()
    private readonly alertDispatcher?: AlertDispatcherService,
  ) {
    this.policySvcUrl = this.configService.get<string>(
      'POLICY_SVC_URL',
      'http://policy-svc:8080',
    );
    this.dnsdistUrl = this.configService.get<string>(
      'DNSDIST_URL',
      'http://dnsdist:8083',
    );
    this.dnsdistApiKey =
      this.configService.get<string>('DNSDIST_API_KEY', '') ?? '';
    this.unboundHost = this.configService.get<string>(
      'UNBOUND_HOST',
      'unbound',
    );
    this.unboundPort = parsePort(
      this.configService.get<string>('UNBOUND_PORT'),
      53,
    );
    this.certProbeTargets = this.parseCertProbeTargets(
      this.configService.get<string>('ADMIN_CERT_PROBE_HOSTS'),
    );
  }

  private parseCertProbeTargets(raw?: string): Array<{
    hostname: string;
    port: number;
    service: string;
  }> {
    const defaultTargets =
      'dns.shield.fluxlabs.net:853:DoT,dns.shield.fluxlabs.net:443:DoH';
    const source = raw?.trim() || defaultTargets;
    return source.split(',').map((entry) => {
      const [hostname, portStr, service] = entry.trim().split(':');
      return {
        hostname: hostname || 'dns.shield.fluxlabs.net',
        port: Number(portStr) || 443,
        service: service || 'TLS',
      };
    });
  }

  /**
   * Probe public TLS endpoints and return certificate notAfter dates
   */
  async getCertificateExpiry(): Promise<CertificateExpiryResponseDto> {
    const checkedAt = new Date().toISOString();
    const certificates: CertificateExpiryEntryDto[] = [];

    for (const target of this.certProbeTargets) {
      certificates.push(await this.probeCertificate(target));
    }

    return { certificates, checkedAt };
  }

  private probeCertificate(target: {
    hostname: string;
    port: number;
    service: string;
  }): Promise<CertificateExpiryEntryDto> {
    return new Promise((resolve) => {
      const socket = tls.connect(
        {
          host: target.hostname,
          port: target.port,
          servername: target.hostname,
          timeout: this.requestTimeoutMs,
        },
        () => {
          const cert = socket.getPeerCertificate();
          socket.end();

          if (!cert || !cert.valid_to) {
            resolve({
              hostname: target.hostname,
              service: target.service,
              port: target.port,
              notAfter: null,
              daysRemaining: null,
              status: 'unknown',
              errorMessage: 'No certificate returned',
            });
            return;
          }

          const notAfterDate = new Date(cert.valid_to);
          const daysRemaining = Math.floor(
            (notAfterDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          );
          let status: CertificateExpiryEntryDto['status'] = 'ok';
          if (daysRemaining < 0) status = 'critical';
          else if (daysRemaining < 14) status = 'critical';
          else if (daysRemaining < 30) status = 'warning';

          resolve({
            hostname: target.hostname,
            service: target.service,
            port: target.port,
            notAfter: notAfterDate.toISOString(),
            daysRemaining,
            status,
            errorMessage: null,
          });
        },
      );

      socket.on('error', (err) => {
        resolve({
          hostname: target.hostname,
          service: target.service,
          port: target.port,
          notAfter: null,
          daysRemaining: null,
          status: 'error',
          errorMessage: err.message,
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          hostname: target.hostname,
          service: target.service,
          port: target.port,
          notAfter: null,
          daysRemaining: null,
          status: 'error',
          errorMessage: 'TLS probe timed out',
        });
      });
    });
  }

  /**
   * Get comprehensive system health status
   *
   * Aggregates health checks from all services in parallel.
   * Uses Promise.allSettled to ensure one failure doesn't block others.
   */
  async getSystemHealth(
    period: '1h' | '24h' = '24h',
  ): Promise<SystemHealthResponseDto> {
    const timestamp = new Date().toISOString();

    // Execute all health checks in parallel
    const [
      policySvcResult,
      dnsdistResult,
      unboundResult,
      storageResult,
      errorRatesResult,
      queryVolumeResult,
    ] = await Promise.allSettled([
      this.checkPolicySvc(),
      this.checkDnsdist(),
      this.checkUnbound(),
      this.getStorageStatus(),
      this.getErrorRates(),
      this.getQueryVolume(period),
    ]);

    // Extract results with fallbacks for rejected promises
    const policySvc = this.extractResult(policySvcResult, () =>
      this.createUnhealthyService('policy-svc', 'Health check failed'),
    );
    const dnsdist = this.extractResult(dnsdistResult, () =>
      this.createUnhealthyService('dnsdist', 'Health check failed'),
    );
    const unbound = this.extractResult(unboundResult, () =>
      this.createUnhealthyService('unbound', 'Health check failed'),
    );

    const storage = this.extractResult(storageResult, () => ({
      clickhouse: {
        connected: false,
        consecutiveFailures: 0,
        error: 'Status check failed',
      },
      redis: { connected: false, error: 'Status check failed' },
    }));

    const errorRates = this.extractResult(errorRatesResult, () => ({
      lastHour: { errorCount: 0, totalQueries: 0, errorRate: 0 },
      last24Hours: { errorCount: 0, totalQueries: 0, errorRate: 0 },
      isMockData: true,
    }));

    const queryVolume = this.extractResult(queryVolumeResult, () => ({
      totalQueries: 0,
      blockedQueries: 0,
      allowedQueries: 0,
      period,
      isMockData: true,
    }));

    const services = [policySvc, dnsdist, unbound];

    // Compute overall status
    const overallStatus = this.computeOverallStatus(services, storage);

    // ALERT-04: Trigger alerts on health status changes
    await this.checkAndSendAlerts(overallStatus, services, storage);

    return {
      overallStatus,
      services,
      storage,
      errorRates,
      queryVolume,
      timestamp,
    };
  }

  /**
   * Check policy-svc health endpoint
   */
  async checkPolicySvc(): Promise<ServiceStatusDto> {
    const name = 'policy-svc';
    const lastChecked = new Date().toISOString();

    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.requestTimeoutMs,
      );

      const response = await fetch(`${this.policySvcUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - start;

      if (response.ok) {
        return { name, status: 'healthy', latencyMs, lastChecked };
      } else {
        return {
          name,
          status: 'degraded',
          latencyMs,
          error: `HTTP ${response.status}`,
          lastChecked,
        };
      }
    } catch (error) {
      this.logger.warn(
        `policy-svc health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        name,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked,
      };
    }
  }

  /**
   * Check dnsdist web server
   *
   * Uses the authenticated API (X-API-Key) — the root path requires auth and
   * may reject clients outside the webserver ACL.
   */
  async checkDnsdist(): Promise<ServiceStatusDto> {
    const name = 'dnsdist';
    const lastChecked = new Date().toISOString();

    if (!this.dnsdistApiKey) {
      return {
        name,
        status: 'unhealthy',
        error: 'DNSDIST_API_KEY is not configured',
        lastChecked,
      };
    }

    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.requestTimeoutMs,
      );

      const response = await fetch(
        `${this.dnsdistUrl}/api/v1/servers/localhost`,
        {
          signal: controller.signal,
          headers: {
            'X-API-Key': this.dnsdistApiKey,
          },
        },
      );
      clearTimeout(timeout);

      const latencyMs = Date.now() - start;

      if (response.ok) {
        return { name, status: 'healthy', latencyMs, lastChecked };
      } else {
        return {
          name,
          status: 'degraded',
          latencyMs,
          error: `HTTP ${response.status}`,
          lastChecked,
        };
      }
    } catch (error) {
      this.logger.warn(
        `dnsdist health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        name,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked,
      };
    }
  }

  /**
   * Check unbound DNS resolver
   *
   * Since remote-control is disabled, we verify by attempting
   * to resolve a well-known domain through unbound.
   */
  async checkUnbound(): Promise<ServiceStatusDto> {
    const name = 'unbound';
    const lastChecked = new Date().toISOString();

    try {
      const start = Date.now();

      const resolverAddress = await this.resolveUnboundServerAddress();

      // Create a custom DNS resolver pointing to unbound
      const resolver = new dns.Resolver();
      resolver.setServers([resolverAddress]);

      // Attempt to resolve a reliable domain with timeout
      const resolveWithTimeout = Promise.race([
        new Promise<string[]>((resolve, reject) => {
          resolver.resolve4('google.com', (err, addresses) => {
            if (err) reject(err);
            else resolve(addresses);
          });
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('DNS resolution timeout')),
            this.requestTimeoutMs,
          ),
        ),
      ]);

      await resolveWithTimeout;
      const latencyMs = Date.now() - start;

      return { name, status: 'healthy', latencyMs, lastChecked };
    } catch (error) {
      this.logger.warn(
        `unbound health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        name,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked,
      };
    }
  }

  /**
   * Resolve UNBOUND_HOST to an IP for dns.Resolver.setServers (IP only).
   */
  private async resolveUnboundServerAddress(): Promise<string> {
    let address = this.unboundHost;
    if (net.isIP(this.unboundHost) === 0) {
      const { address: resolved } = await dnsLookup(this.unboundHost, {
        family: 4,
      });
      address = resolved;
    }
    return `${address}:${this.unboundPort}`;
  }

  /**
   * Get storage backend status (Redis + ClickHouse)
   */
  async getStorageStatus(): Promise<StorageStatusDto> {
    const [redisResult, clickhouseResult] = await Promise.allSettled([
      this.checkRedis(),
      this.checkClickhouse(),
    ]);

    const redis =
      redisResult.status === 'fulfilled'
        ? redisResult.value
        : { connected: false, error: 'Status check failed' };

    const clickhouse =
      clickhouseResult.status === 'fulfilled'
        ? clickhouseResult.value
        : {
            connected: false,
            consecutiveFailures: 0,
            error: 'Status check failed',
          };

    return { clickhouse, redis };
  }

  /**
   * Check Redis connection by pinging
   */
  private async checkRedis(): Promise<{
    connected: boolean;
    latencyMs?: number;
    error?: string;
  }> {
    try {
      const start = Date.now();
      await this.redisService.getClient().ping();
      return { connected: true, latencyMs: Date.now() - start };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check ClickHouse connection status
   */
  private async checkClickhouse(): Promise<{
    connected: boolean;
    latencyMs?: number;
    consecutiveFailures: number;
    error?: string;
  }> {
    const start = Date.now();
    const status = this.clickhouseService.getConnectionStatus();

    return {
      connected: status.connected,
      latencyMs: status.connected ? Date.now() - start : undefined,
      consecutiveFailures: status.consecutiveFailures,
      error: status.connected
        ? undefined
        : `Not connected (${status.consecutiveFailures} failures)`,
    };
  }

  /**
   * Get error rates from ClickHouse for 1h and 24h windows
   */
  async getErrorRates(): Promise<ErrorRatesDto> {
    if (!this.clickhouseService.isHealthy()) {
      return this.getEmptyErrorRates(true);
    }

    try {
      const [lastHour, last24Hours] = await Promise.all([
        this.queryErrorWindow('1 HOUR'),
        this.queryErrorWindow('24 HOUR'),
      ]);

      const isMockData = lastHour === null || last24Hours === null;

      return {
        lastHour: lastHour ?? { errorCount: 0, totalQueries: 0, errorRate: 0 },
        last24Hours:
          last24Hours ?? { errorCount: 0, totalQueries: 0, errorRate: 0 },
        isMockData,
      };
    } catch (error) {
      this.logger.warn(
        `Error rates query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return this.getEmptyErrorRates(true);
    }
  }

  /**
   * Query error counts for a specific time window
   */
  private async queryErrorWindow(
    interval: string,
  ): Promise<ErrorWindowDto | null> {
    const row = await this.clickhouseService.queryJsonRows<{
      total: string;
      errors: string;
    }>(
      `
        SELECT
          count() AS total,
          countIf(
            reason LIKE '%error%'
            OR reason = 'policy_error'
            OR action = 'block' AND reason != ''
          ) AS errors
        FROM query_logs
        WHERE timestamp >= now() - INTERVAL ${interval}
      `,
    );

    if (row === null) {
      return null;
    }

    const totalQueries = Number(row[0]?.total ?? 0);
    const errorCount = Number(row[0]?.errors ?? 0);
    const errorRate =
      totalQueries > 0 ? errorCount / totalQueries : 0;

    return { errorCount, totalQueries, errorRate };
  }

  /**
   * Get aggregate query volume across all tenants
   */
  async getQueryVolume(period: '1h' | '24h' = '24h'): Promise<QueryVolumeDto> {
    const interval = period === '1h' ? '1 HOUR' : '24 HOUR';

    if (!this.clickhouseService.isHealthy()) {
      return this.getEmptyQueryVolume(period, true);
    }

    try {
      const rows = await this.clickhouseService.queryJsonRows<{
        total: string;
        blocked: string;
        allowed: string;
      }>(
        `
          SELECT
            count() AS total,
            countIf(action = 'block') AS blocked,
            countIf(action = 'allow') AS allowed
          FROM query_logs
          WHERE timestamp >= now() - INTERVAL ${interval}
        `,
      );

      if (rows === null) {
        return this.getEmptyQueryVolume(period, true);
      }

      const row = rows[0] ?? {};
      return {
        totalQueries: Number(row.total ?? 0),
        blockedQueries: Number(row.blocked ?? 0),
        allowedQueries: Number(row.allowed ?? 0),
        period,
        isMockData: false,
      };
    } catch (error) {
      this.logger.warn(
        `Query volume failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return this.getEmptyQueryVolume(period, true);
    }
  }

  /**
   * Get recent error entries from ClickHouse
   */
  async getRecentErrors(limit: number = 20): Promise<RecentErrorDto[]> {
    if (!this.clickhouseService.isHealthy()) {
      return [];
    }

    try {
      const rows = await this.clickhouseService.queryJsonRows<{
        timestamp: string;
        domain: string;
        reason: string;
        client_ip: string;
        tenant_id: string;
      }>(
        `
          SELECT
            timestamp,
            domain,
            reason,
            client_ip,
            tenant_id
          FROM query_logs
          WHERE
            reason LIKE '%error%'
            OR reason = 'policy_error'
          ORDER BY timestamp DESC
          LIMIT {limit:UInt32}
        `,
        { limit },
      );

      if (rows === null) {
        return [];
      }

      return rows.map((row) => ({
        timestamp: row.timestamp,
        domain: row.domain,
        reason: row.reason,
        clientIp: row.client_ip,
        tenantId: row.tenant_id,
      }));
    } catch (error) {
      this.logger.warn(
        `Recent errors query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  /**
   * Compute overall system health from component statuses
   */
  private computeOverallStatus(
    services: ServiceStatusDto[],
    storage: StorageStatusDto,
  ): OverallHealthStatus {
    const serviceStatuses = services.map((s) => s.status);
    const hasUnhealthyService = serviceStatuses.includes('unhealthy');
    const hasDegradedService = serviceStatuses.includes('degraded');

    // Critical storage check - Redis is essential
    const redisDown = !storage.redis.connected;

    if (hasUnhealthyService || redisDown) {
      return 'unhealthy';
    }

    // ClickHouse down is degraded (analytics only)
    const clickhouseDown = !storage.clickhouse.connected;
    if (hasDegradedService || clickhouseDown) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Create an unhealthy service status object
   */
  private createUnhealthyService(
    name: string,
    error: string,
  ): ServiceStatusDto {
    return {
      name,
      status: 'unhealthy',
      error,
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * Extract result from Promise.allSettled with fallback
   */
  private extractResult<T>(
    result: PromiseSettledResult<T>,
    fallback: () => T,
  ): T {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    this.logger.warn(`Health check rejected: ${result.reason}`);
    return fallback();
  }

  /**
   * Zeroed error rates when ClickHouse is unavailable (UI shows no-data note via isMockData)
   */
  private getEmptyErrorRates(isMockData: boolean): ErrorRatesDto {
    const emptyWindow = { errorCount: 0, totalQueries: 0, errorRate: 0 };
    return {
      lastHour: emptyWindow,
      last24Hours: emptyWindow,
      isMockData,
    };
  }

  /**
   * Zeroed query volume when ClickHouse is unavailable
   */
  private getEmptyQueryVolume(
    period: '1h' | '24h',
    isMockData: boolean,
  ): QueryVolumeDto {
    return {
      totalQueries: 0,
      blockedQueries: 0,
      allowedQueries: 0,
      period,
      isMockData,
    };
  }

  /**
   * Check health status and send alerts if needed
   * ALERT-04: System health issues trigger alerts
   * Implements 5-minute cooldown to prevent alert spam
   */
  private async checkAndSendAlerts(
    overallStatus: OverallHealthStatus,
    services: ServiceStatusDto[],
    storage: StorageStatusDto,
  ): Promise<void> {
    // Skip if alerting not configured
    if (!this.alertDispatcher) {
      return;
    }

    // Check if we're in cooldown period
    const now = Date.now();
    const lastAlert = this.lastAlertTime.get(overallStatus) || 0;
    if (now - lastAlert < this.ALERT_COOLDOWN_MS) {
      return; // Still in cooldown
    }

    // Send alerts based on status
    if (overallStatus === 'unhealthy') {
      const unhealthyServices = services
        .filter((s) => s.status === 'unhealthy')
        .map((s) => s.name);

      const redisDown = !storage.redis.connected;
      if (redisDown) {
        unhealthyServices.push('redis');
      }

      if (unhealthyServices.length > 0) {
        await this.alertDispatcher.dispatchSystemHealth(
          'Service Down',
          `Services unhealthy: ${unhealthyServices.join(', ')}`,
          'critical',
          'system_unhealthy',
        );
        this.lastAlertTime.set('unhealthy', now);
      }
    } else if (overallStatus === 'degraded') {
      const degradedServices = services
        .filter((s) => s.status === 'degraded')
        .map((s) => s.name);

      const clickhouseDown = !storage.clickhouse.connected;
      if (clickhouseDown) {
        degradedServices.push('clickhouse');
      }

      if (degradedServices.length > 0) {
        await this.alertDispatcher.dispatchSystemHealth(
          'Service Degraded',
          `Services degraded: ${degradedServices.join(', ')}`,
          'warning',
          'system_degraded',
        );
        this.lastAlertTime.set('degraded', now);
      }
    }
  }
}
