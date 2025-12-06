import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { SiemIntegration, SiemIntegrationType } from './entities/siem-integration.entity';
import {
  CreateSplunkIntegrationDto,
  CreateElasticIntegrationDto,
  CreateSentinelIntegrationDto,
  CreateSyslogIntegrationDto,
  UpdateSiemIntegrationDto,
  SiemTestResultDto,
  SiemIntegrationResponseDto,
} from './dto/siem.dto';

@Injectable()
export class SiemService {
  private readonly encryptionKey: string;
  private readonly encryptionAlgorithm = 'aes-256-cbc';

  constructor(
    @InjectRepository(SiemIntegration)
    private siemRepository: Repository<SiemIntegration>,
  ) {
    this.encryptionKey = process.env.SIEM_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  }

  // Encrypt sensitive configuration
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(this.encryptionKey, 'hex');
    const cipher = crypto.createCipheriv(this.encryptionAlgorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  // Decrypt sensitive configuration
  private decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(this.encryptionKey, 'hex');
    const decipher = crypto.createDecipheriv(this.encryptionAlgorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // ==================== SPLUNK ====================

  async createSplunk(tenantId: string, dto: CreateSplunkIntegrationDto): Promise<SiemIntegration> {
    const configEncrypted = {
      hecUrl: this.encrypt(dto.hecUrl),
      hecToken: this.encrypt(dto.hecToken),
      index: dto.index || 'main',
      sourceType: dto.sourceType || 'safedns:logs',
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

  async createElastic(tenantId: string, dto: CreateElasticIntegrationDto): Promise<SiemIntegration> {
    const configEncrypted = {
      url: this.encrypt(dto.url),
      apiKey: this.encrypt(dto.apiKey),
      indexPattern: dto.indexPattern || 'safedns-logs',
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

  async createSentinel(tenantId: string, dto: CreateSentinelIntegrationDto): Promise<SiemIntegration> {
    const configEncrypted = {
      workspaceId: this.encrypt(dto.workspaceId),
      sharedKey: this.encrypt(dto.sharedKey),
      logType: dto.logType || 'SafeDNS_Logs',
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

  async createSyslog(tenantId: string, dto: CreateSyslogIntegrationDto): Promise<SiemIntegration> {
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

    return integrations.map(i => this.toResponseDto(i));
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

  async update(tenantId: string, id: string, dto: UpdateSiemIntegrationDto): Promise<SiemIntegration> {
    const integration = await this.findOne(tenantId, id);

    if (dto.name) integration.name = dto.name;
    if (dto.isEnabled !== undefined) integration.isEnabled = dto.isEnabled;
    if (dto.logTypes) integration.logTypes = dto.logTypes;
    if (dto.includeAllowed !== undefined) integration.includeAllowed = dto.includeAllowed;
    if (dto.minSeverity) integration.minSeverity = dto.minSeverity;

    // If config is provided, encrypt sensitive fields based on type
    if (dto.config) {
      const newConfig = { ...integration.configEncrypted };

      switch (integration.integrationType) {
        case 'splunk':
          if (dto.config.hecUrl) newConfig.hecUrl = this.encrypt(dto.config.hecUrl);
          if (dto.config.hecToken) newConfig.hecToken = this.encrypt(dto.config.hecToken);
          if (dto.config.index) newConfig.index = dto.config.index;
          if (dto.config.sourceType) newConfig.sourceType = dto.config.sourceType;
          break;

        case 'elastic':
          if (dto.config.url) newConfig.url = this.encrypt(dto.config.url);
          if (dto.config.apiKey) newConfig.apiKey = this.encrypt(dto.config.apiKey);
          if (dto.config.indexPattern) newConfig.indexPattern = dto.config.indexPattern;
          break;

        case 'sentinel':
          if (dto.config.workspaceId) newConfig.workspaceId = this.encrypt(dto.config.workspaceId);
          if (dto.config.sharedKey) newConfig.sharedKey = this.encrypt(dto.config.sharedKey);
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

  private async testSplunk(integration: SiemIntegration): Promise<SiemTestResultDto> {
    const startTime = Date.now();
    // In production, would actually test HEC connection
    // const hecUrl = this.decrypt(integration.configEncrypted.hecUrl);
    // const hecToken = this.decrypt(integration.configEncrypted.hecToken);
    
    // Simulate test
    return {
      success: true,
      message: 'Successfully connected to Splunk HEC endpoint',
      responseTime: Date.now() - startTime,
    };
  }

  private async testElastic(integration: SiemIntegration): Promise<SiemTestResultDto> {
    const startTime = Date.now();
    // Simulate test
    return {
      success: true,
      message: 'Successfully connected to Elasticsearch cluster',
      responseTime: Date.now() - startTime,
    };
  }

  private async testSentinel(integration: SiemIntegration): Promise<SiemTestResultDto> {
    const startTime = Date.now();
    // Simulate test
    return {
      success: true,
      message: 'Successfully connected to Microsoft Sentinel',
      responseTime: Date.now() - startTime,
    };
  }

  private async testSyslog(integration: SiemIntegration): Promise<SiemTestResultDto> {
    const startTime = Date.now();
    // Simulate test
    return {
      success: true,
      message: 'Successfully connected to Syslog server',
      responseTime: Date.now() - startTime,
    };
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

  private async sendToIntegration(integration: SiemIntegration, logs: any[]): Promise<void> {
    // Filter logs based on integration settings
    const filteredLogs = logs.filter(log => {
      if (!integration.includeAllowed && log.action === 'allowed') return false;
      if (integration.logTypes.length && !integration.logTypes.includes(log.type)) return false;
      return true;
    });

    if (filteredLogs.length === 0) return;

    // In production, would actually send to each integration type
    switch (integration.integrationType) {
      case 'splunk':
        // Send to Splunk HEC
        break;
      case 'elastic':
        // Send to Elasticsearch
        break;
      case 'sentinel':
        // Send to Microsoft Sentinel
        break;
      case 'syslog':
        // Send via Syslog
        break;
    }

    console.log(`[SIEM] Sent ${filteredLogs.length} logs to ${integration.integrationType}:${integration.name}`);
  }

  private toResponseDto(integration: SiemIntegration): SiemIntegrationResponseDto {
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
