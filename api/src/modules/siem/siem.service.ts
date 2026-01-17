// Nebula DNS - SIEM Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// SIEM integration service with AES-256-GCM encryption for credentials

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as https from 'https';
import * as dgram from 'dgram';
import * as net from 'net';
import {
  SiemIntegration,
  SiemIntegrationType,
} from './entities/siem-integration.entity';
import {
  CreateSplunkIntegrationDto,
  CreateElasticIntegrationDto,
  CreateSentinelIntegrationDto,
  CreateSyslogIntegrationDto,
  UpdateSiemIntegrationDto,
  SiemTestResultDto,
  SiemIntegrationResponseDto,
} from './dto/siem.dto';
import { getEncryptionKey } from '../../config/encryption.config';
import {
  encrypt,
  decrypt,
  deriveKey,
  detectEncryptionFormat,
  EncryptionError,
} from '../../common/utils/encryption.util';

@Injectable()
export class SiemService {
  private readonly logger = new Logger(SiemService.name);
  private readonly encryptionKey: Buffer;
  private readonly legacyEncryptionKey: Buffer;

  constructor(
    @InjectRepository(SiemIntegration)
    private siemRepository: Repository<SiemIntegration>,
  ) {
    // Use centralized encryption key management with GCM key derivation
    const key = getEncryptionKey('SIEM_ENCRYPTION_KEY');
    this.encryptionKey = deriveKey(key, 'siem-gcm-salt');

    // Keep legacy key for backward compatibility during migration
    // Legacy SIEM used a hex key from sha256 hash
    if (/^[0-9a-fA-F]{64}$/.test(key)) {
      this.legacyEncryptionKey = Buffer.from(key, 'hex');
    } else {
      this.legacyEncryptionKey = crypto
        .createHash('sha256')
        .update(key)
        .digest();
    }
  }

  // Encrypt using AES-256-GCM
  private encryptSecret(text: string): string {
    return encrypt(text, this.encryptionKey);
  }

  // Decrypt with legacy CBC support for backward compatibility
  private decryptSecret(encryptedText: string): string {
    try {
      const formatInfo = detectEncryptionFormat(encryptedText);

      if (formatInfo.isLegacy) {
        this.logger.warn(
          'Detected legacy CBC encryption format in SIEM credential - consider running migration',
        );
        return this.decryptLegacyCBC(encryptedText);
      }

      return decrypt(encryptedText, this.encryptionKey);
    } catch (error) {
      this.logger.error('SIEM credential decryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        context: 'SiemService.decryptSecret',
        isLegacy:
          error instanceof EncryptionError ? error.isLegacyFormat : false,
      });
      throw new BadRequestException(
        'Unable to decrypt SIEM configuration. Please contact support.',
      );
    }
  }

  // Decrypt legacy CBC-encrypted data
  private decryptLegacyCBC(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      this.legacyEncryptionKey,
      iv,
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Re-encrypt legacy data to GCM format (opportunistic migration)
  private async reEncryptConfigIfLegacy(
    integration: SiemIntegration,
    configField: string,
    decryptedValue: string,
    encryptedValue: string,
  ): Promise<void> {
    const formatInfo = detectEncryptionFormat(encryptedValue);

    if (formatInfo.isLegacy) {
      try {
        integration.configEncrypted[configField] =
          this.encryptSecret(decryptedValue);
        await this.siemRepository.save(integration);
        this.logger.log(
          `SIEM: Migrated integration ${integration.id} ${configField} to GCM encryption`,
        );
      } catch (error) {
        this.logger.warn(
          `SIEM: Failed to migrate integration ${integration.id} ${configField} to GCM encryption`,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }
  }

  // ==================== SPLUNK ====================

  async createSplunk(
    tenantId: string,
    dto: CreateSplunkIntegrationDto,
  ): Promise<SiemIntegration> {
    const configEncrypted = {
      hecUrl: this.encryptSecret(dto.hecUrl),
      hecToken: this.encryptSecret(dto.hecToken),
      index: dto.index || 'main',
      sourceType: dto.sourceType || 'nebuladns:logs',
    };

    const integration = this.siemRepository.create({
      tenantId,
      name: dto.name,
      integrationType: 'splunk',
      configEncrypted,
      logTypes: dto.logTypes || ['blocked', 'threats'],
      includeAllowed: dto.includeAllowed || false,
      minSeverity: dto.minSeverity || 'low',
    });

    return this.siemRepository.save(integration);
  }

  // ==================== ELASTIC ====================

  async createElastic(
    tenantId: string,
    dto: CreateElasticIntegrationDto,
  ): Promise<SiemIntegration> {
    const configEncrypted = {
      url: this.encryptSecret(dto.url),
      apiKey: this.encryptSecret(dto.apiKey),
      indexPattern: dto.indexPattern || 'nebuladns-logs',
    };

    const integration = this.siemRepository.create({
      tenantId,
      name: dto.name,
      integrationType: 'elastic',
      configEncrypted,
      logTypes: dto.logTypes || ['blocked', 'threats'],
      includeAllowed: dto.includeAllowed || false,
    });

    return this.siemRepository.save(integration);
  }

  // ==================== SENTINEL ====================

  async createSentinel(
    tenantId: string,
    dto: CreateSentinelIntegrationDto,
  ): Promise<SiemIntegration> {
    const configEncrypted = {
      workspaceId: this.encryptSecret(dto.workspaceId),
      sharedKey: this.encryptSecret(dto.sharedKey),
      logType: dto.logType || 'Nebula DNS_Logs',
    };

    const integration = this.siemRepository.create({
      tenantId,
      name: dto.name,
      integrationType: 'sentinel',
      configEncrypted,
      logTypes: dto.logTypes || ['blocked', 'threats'],
    });

    return this.siemRepository.save(integration);
  }

  // ==================== SYSLOG ====================

  async createSyslog(
    tenantId: string,
    dto: CreateSyslogIntegrationDto,
  ): Promise<SiemIntegration> {
    const configEncrypted = {
      host: dto.host,
      port: dto.port,
      protocol: dto.protocol,
      format: dto.format || 'cef',
    };

    const integration = this.siemRepository.create({
      tenantId,
      name: dto.name,
      integrationType: 'syslog',
      configEncrypted,
      logTypes: dto.logTypes || ['blocked', 'threats'],
    });

    return this.siemRepository.save(integration);
  }

  // ==================== COMMON OPERATIONS ====================

  async findAll(tenantId: string): Promise<SiemIntegrationResponseDto[]> {
    const integrations = await this.siemRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    return integrations.map((i) => this.toResponseDto(i));
  }

  async findOne(tenantId: string, id: string): Promise<SiemIntegration> {
    const integration = await this.siemRepository.findOne({
      where: { id, tenantId },
    });

    if (!integration) {
      throw new NotFoundException('SIEM integration not found');
    }

    return integration;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateSiemIntegrationDto,
  ): Promise<SiemIntegration> {
    const integration = await this.findOne(tenantId, id);

    if (dto.name) integration.name = dto.name;
    if (dto.isEnabled !== undefined) integration.isEnabled = dto.isEnabled;
    if (dto.logTypes) integration.logTypes = dto.logTypes;
    if (dto.includeAllowed !== undefined)
      integration.includeAllowed = dto.includeAllowed;
    if (dto.minSeverity) integration.minSeverity = dto.minSeverity;

    // If config is provided, encrypt sensitive fields based on type using GCM
    if (dto.config) {
      const newConfig = { ...integration.configEncrypted };

      switch (integration.integrationType) {
        case 'splunk':
          if (dto.config.hecUrl)
            newConfig.hecUrl = this.encryptSecret(dto.config.hecUrl);
          if (dto.config.hecToken)
            newConfig.hecToken = this.encryptSecret(dto.config.hecToken);
          if (dto.config.index) newConfig.index = dto.config.index;
          if (dto.config.sourceType)
            newConfig.sourceType = dto.config.sourceType;
          break;

        case 'elastic':
          if (dto.config.url)
            newConfig.url = this.encryptSecret(dto.config.url);
          if (dto.config.apiKey)
            newConfig.apiKey = this.encryptSecret(dto.config.apiKey);
          if (dto.config.indexPattern)
            newConfig.indexPattern = dto.config.indexPattern;
          break;

        case 'sentinel':
          if (dto.config.workspaceId)
            newConfig.workspaceId = this.encryptSecret(dto.config.workspaceId);
          if (dto.config.sharedKey)
            newConfig.sharedKey = this.encryptSecret(dto.config.sharedKey);
          if (dto.config.logType) newConfig.logType = dto.config.logType;
          break;

        case 'syslog':
          if (dto.config.host) newConfig.host = dto.config.host;
          if (dto.config.port) newConfig.port = dto.config.port;
          if (dto.config.protocol) newConfig.protocol = dto.config.protocol;
          if (dto.config.format) newConfig.format = dto.config.format;
          break;
      }

      integration.configEncrypted = newConfig;
    }

    return this.siemRepository.save(integration);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const integration = await this.findOne(tenantId, id);
    await this.siemRepository.remove(integration);
  }

  async enable(tenantId: string, id: string): Promise<SiemIntegration> {
    const integration = await this.findOne(tenantId, id);
    integration.isEnabled = true;
    integration.errorCount = 0;
    integration.lastError = null;
    return this.siemRepository.save(integration);
  }

  async disable(tenantId: string, id: string): Promise<SiemIntegration> {
    const integration = await this.findOne(tenantId, id);
    integration.isEnabled = false;
    return this.siemRepository.save(integration);
  }

  // Test connection
  async test(tenantId: string, id: string): Promise<SiemTestResultDto> {
    const integration = await this.findOne(tenantId, id);
    const startTime = Date.now();

    try {
      switch (integration.integrationType) {
        case 'splunk':
          return await this.testSplunk(integration);
        case 'elastic':
          return await this.testElastic(integration);
        case 'sentinel':
          return await this.testSentinel(integration);
        case 'syslog':
          return await this.testSyslog(integration);
        default:
          return { success: false, message: 'Unknown integration type' };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Connection test failed',
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async testSplunk(
    integration: SiemIntegration,
  ): Promise<SiemTestResultDto> {
    const startTime = Date.now();
    try {
      const hecUrlEncrypted = integration.configEncrypted.hecUrl;
      const hecTokenEncrypted = integration.configEncrypted.hecToken;

      const hecUrl = this.decryptSecret(hecUrlEncrypted);
      const hecToken = this.decryptSecret(hecTokenEncrypted);

      // Opportunistically re-encrypt if legacy format
      await this.reEncryptConfigIfLegacy(
        integration,
        'hecUrl',
        hecUrl,
        hecUrlEncrypted,
      );
      await this.reEncryptConfigIfLegacy(
        integration,
        'hecToken',
        hecToken,
        hecTokenEncrypted,
      );

      // Send a test event to Splunk HEC
      const testEvent = {
        event: {
          type: 'test',
          message: 'Nebula DNS SIEM integration test',
          timestamp: new Date().toISOString(),
        },
        index: integration.configEncrypted.index || 'main',
        sourcetype: integration.configEncrypted.sourceType || 'nebuladns:logs',
      };

      await this.httpPost(hecUrl, JSON.stringify(testEvent), {
        Authorization: `Splunk ${hecToken}`,
        'Content-Type': 'application/json',
      });

      return {
        success: true,
        message:
          'Successfully connected to Splunk HEC endpoint and sent test event',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to Splunk: ${error.message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async testElastic(
    integration: SiemIntegration,
  ): Promise<SiemTestResultDto> {
    const startTime = Date.now();
    try {
      const urlEncrypted = integration.configEncrypted.url;
      const apiKeyEncrypted = integration.configEncrypted.apiKey;

      const url = this.decryptSecret(urlEncrypted);
      const apiKey = this.decryptSecret(apiKeyEncrypted);

      // Opportunistically re-encrypt if legacy format
      await this.reEncryptConfigIfLegacy(integration, 'url', url, urlEncrypted);
      await this.reEncryptConfigIfLegacy(
        integration,
        'apiKey',
        apiKey,
        apiKeyEncrypted,
      );

      // Test cluster health endpoint
      await this.httpGet(`${url}/_cluster/health`, {
        Authorization: `ApiKey ${apiKey}`,
      });

      return {
        success: true,
        message: 'Successfully connected to Elasticsearch cluster',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to Elasticsearch: ${error.message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async testSentinel(
    integration: SiemIntegration,
  ): Promise<SiemTestResultDto> {
    const startTime = Date.now();
    try {
      const workspaceIdEncrypted = integration.configEncrypted.workspaceId;
      const sharedKeyEncrypted = integration.configEncrypted.sharedKey;

      const workspaceId = this.decryptSecret(workspaceIdEncrypted);
      const sharedKey = this.decryptSecret(sharedKeyEncrypted);

      // Opportunistically re-encrypt if legacy format
      await this.reEncryptConfigIfLegacy(
        integration,
        'workspaceId',
        workspaceId,
        workspaceIdEncrypted,
      );
      await this.reEncryptConfigIfLegacy(
        integration,
        'sharedKey',
        sharedKey,
        sharedKeyEncrypted,
      );

      const logType = integration.configEncrypted.logType || 'Nebula DNS_Test';

      // Send a test log entry
      const testLog = [
        {
          type: 'test',
          message: 'Nebula DNS SIEM integration test',
          timestamp: new Date().toISOString(),
        },
      ];

      const body = JSON.stringify(testLog);
      const contentLength = Buffer.byteLength(body, 'utf8');
      const date = new Date().toUTCString();

      const stringToSign = `POST\n${contentLength}\napplication/json\nx-ms-date:${date}\n/api/logs`;
      const signature = crypto
        .createHmac('sha256', Buffer.from(sharedKey, 'base64'))
        .update(stringToSign, 'utf8')
        .digest('base64');

      const url = `https://${workspaceId}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01`;

      await this.httpPost(url, body, {
        Authorization: `SharedKey ${workspaceId}:${signature}`,
        'Content-Type': 'application/json',
        'Log-Type': logType,
        'x-ms-date': date,
      });

      return {
        success: true,
        message:
          'Successfully connected to Microsoft Sentinel and sent test event',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to Sentinel: ${error.message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async testSyslog(
    integration: SiemIntegration,
  ): Promise<SiemTestResultDto> {
    const startTime = Date.now();
    try {
      const { host, port, protocol } = integration.configEncrypted;
      const testMessage = `<14>1 ${new Date().toISOString()} nebuladns test - - - Nebula DNS SIEM integration test`;

      if (protocol === 'udp') {
        await this.sendUdp(host, parseInt(port), testMessage);
      } else {
        await this.sendTcp(host, parseInt(port), testMessage);
      }

      return {
        success: true,
        message: `Successfully sent test message to Syslog server via ${protocol.toUpperCase()}`,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to Syslog server: ${error.message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  // Send logs to integration
  async sendLogs(tenantId: string, logs: any[]): Promise<void> {
    const integrations = await this.siemRepository.find({
      where: { tenantId, isEnabled: true },
    });

    for (const integration of integrations) {
      try {
        await this.sendToIntegration(integration, logs);
        integration.lastSentAt = new Date();
        integration.errorCount = 0;
        integration.lastError = null;
      } catch (error) {
        integration.errorCount++;
        integration.lastError = error.message;

        // Disable if too many errors
        if (integration.errorCount >= 10) {
          integration.isEnabled = false;
        }
      }
      await this.siemRepository.save(integration);
    }
  }

  private async sendToIntegration(
    integration: SiemIntegration,
    logs: any[],
  ): Promise<void> {
    // Filter logs based on integration settings
    const filteredLogs = logs.filter((log) => {
      if (!integration.includeAllowed && log.action === 'allowed') return false;
      if (
        integration.logTypes.length &&
        !integration.logTypes.includes(log.type)
      )
        return false;
      return true;
    });

    if (filteredLogs.length === 0) return;

    switch (integration.integrationType) {
      case 'splunk':
        await this.sendToSplunk(integration, filteredLogs);
        break;
      case 'elastic':
        await this.sendToElastic(integration, filteredLogs);
        break;
      case 'sentinel':
        await this.sendToSentinel(integration, filteredLogs);
        break;
      case 'syslog':
        await this.sendToSyslog(integration, filteredLogs);
        break;
    }

    this.logger.log(
      `Sent ${filteredLogs.length} logs to ${integration.integrationType}:${integration.name}`,
    );
  }

  private async sendToSplunk(
    integration: SiemIntegration,
    logs: any[],
  ): Promise<void> {
    const hecUrl = this.decryptSecret(integration.configEncrypted.hecUrl);
    const hecToken = this.decryptSecret(integration.configEncrypted.hecToken);
    const index = integration.configEncrypted.index || 'main';
    const sourceType =
      integration.configEncrypted.sourceType || 'nebuladns:logs';

    const events = logs.map((log) => ({
      event: log,
      index,
      sourcetype: sourceType,
      time: Math.floor(new Date(log.timestamp).getTime() / 1000),
    }));

    const body = events.map((e) => JSON.stringify(e)).join('\n');

    await this.httpPost(hecUrl, body, {
      Authorization: `Splunk ${hecToken}`,
      'Content-Type': 'application/json',
    });
  }

  private async sendToElastic(
    integration: SiemIntegration,
    logs: any[],
  ): Promise<void> {
    const url = this.decryptSecret(integration.configEncrypted.url);
    const apiKey = this.decryptSecret(integration.configEncrypted.apiKey);
    const indexPattern =
      integration.configEncrypted.indexPattern || 'nebuladns-logs';

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    const indexName = `${indexPattern}-${today}`;

    // Bulk format for Elasticsearch
    const bulkBody =
      logs
        .flatMap((log) => [
          JSON.stringify({ index: { _index: indexName } }),
          JSON.stringify({ ...log, '@timestamp': log.timestamp }),
        ])
        .join('\n') + '\n';

    await this.httpPost(`${url}/_bulk`, bulkBody, {
      Authorization: `ApiKey ${apiKey}`,
      'Content-Type': 'application/x-ndjson',
    });
  }

  private async sendToSentinel(
    integration: SiemIntegration,
    logs: any[],
  ): Promise<void> {
    const workspaceId = this.decryptSecret(
      integration.configEncrypted.workspaceId,
    );
    const sharedKey = this.decryptSecret(integration.configEncrypted.sharedKey);
    const logType = integration.configEncrypted.logType || 'Nebula DNS_Logs';

    const body = JSON.stringify(logs);
    const contentLength = Buffer.byteLength(body, 'utf8');
    const date = new Date().toUTCString();

    // Build signature for Azure Log Analytics
    const stringToSign = `POST\n${contentLength}\napplication/json\nx-ms-date:${date}\n/api/logs`;
    const signature = crypto
      .createHmac('sha256', Buffer.from(sharedKey, 'base64'))
      .update(stringToSign, 'utf8')
      .digest('base64');

    const url = `https://${workspaceId}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01`;

    await this.httpPost(url, body, {
      Authorization: `SharedKey ${workspaceId}:${signature}`,
      'Content-Type': 'application/json',
      'Log-Type': logType,
      'x-ms-date': date,
    });
  }

  private async sendToSyslog(
    integration: SiemIntegration,
    logs: any[],
  ): Promise<void> {
    const { host, port, protocol, format } = integration.configEncrypted;

    for (const log of logs) {
      const message =
        format === 'cef' ? this.formatCEF(log) : this.formatLeef(log);

      if (protocol === 'udp') {
        await this.sendUdp(host, port, message);
      } else {
        await this.sendTcp(host, port, message);
      }
    }
  }

  private formatCEF(log: any): string {
    const severity = log.action === 'blocked' ? 7 : 3;
    return (
      `CEF:0|Nebula DNS|DNS-Filter|1.0|${log.action}|DNS Query ${log.action}|${severity}|` +
      `src=${log.clientIp} request=${log.domain} requestMethod=DNS ` +
      `cs1=${log.category || 'unknown'} cs1Label=Category ` +
      `cs2=${log.locationId || 'unknown'} cs2Label=LocationID`
    );
  }

  private formatLeef(log: any): string {
    return (
      `LEEF:2.0|Nebula DNS|DNS-Filter|1.0|${log.action}|` +
      `src=${log.clientIp}\tdomain=${log.domain}\taction=${log.action}\t` +
      `category=${log.category || 'unknown'}\tlocationId=${log.locationId || 'unknown'}`
    );
  }

  private async httpPost(
    url: string,
    body: string,
    headers: Record<string, string>,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  private async httpGet(
    url: string,
    headers: Record<string, string>,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  private async sendUdp(
    host: string,
    port: number,
    message: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = dgram.createSocket('udp4');
      const buffer = Buffer.from(message);
      client.send(buffer, port, host, (err) => {
        client.close();
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async sendTcp(
    host: string,
    port: number,
    message: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.connect(port, host, () => {
        client.write(message + '\n');
        client.end();
        resolve();
      });
      client.on('error', reject);
    });
  }

  private toResponseDto(
    integration: SiemIntegration,
  ): SiemIntegrationResponseDto {
    return {
      id: integration.id,
      name: integration.name,
      integrationType: integration.integrationType,
      isEnabled: integration.isEnabled,
      logTypes: integration.logTypes,
      includeAllowed: integration.includeAllowed,
      minSeverity: integration.minSeverity,
      lastSentAt: integration.lastSentAt,
      lastError: integration.lastError,
      errorCount: integration.errorCount,
      createdAt: integration.createdAt,
    };
  }
}
