// Nebula DNS - Alerting Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Alerting service with AES-256-GCM encryption for alert credentials

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertConfig } from './entities/alert-config.entity';
import {
  CreateSlackConfigDto,
  CreatePagerDutyConfigDto,
  UpdateAlertConfigDto,
  AlertConfigResponseDto,
} from './dto/alert-config.dto';
import { getEncryptionKey } from '../../config/encryption.config';
import { encrypt, decrypt, deriveKey } from '../../common/utils/encryption.util';

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(AlertConfig)
    private alertConfigRepository: Repository<AlertConfig>,
  ) {
    // Use centralized encryption key management with GCM key derivation
    const key = getEncryptionKey('ALERTING_ENCRYPTION_KEY');
    this.encryptionKey = deriveKey(key, 'alerting-gcm-salt');
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Encrypt using AES-256-GCM
   */
  private encryptSecret(text: string): string {
    return encrypt(text, this.encryptionKey);
  }

  /**
   * Decrypt with error handling
   */
  private decryptSecret(encryptedText: string): string {
    try {
      return decrypt(encryptedText, this.encryptionKey);
    } catch (error) {
      this.logger.error('Alert credential decryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        context: 'AlertingService.decryptSecret',
      });
      throw new BadRequestException(
        'Unable to decrypt alert configuration. Please contact support.',
      );
    }
  }

  /**
   * Map entity to response DTO without encrypted data
   */
  private toResponseDto(config: AlertConfig): AlertConfigResponseDto {
    return {
      id: config.id,
      name: config.name,
      providerType: config.providerType,
      isEnabled: config.isEnabled,
      severityFilter: config.severityFilter,
      eventTypes: config.eventTypes,
      lastSentAt: config.lastSentAt,
      lastError: config.lastError,
      errorCount: config.errorCount,
      createdAt: config.createdAt,
    };
  }

  // ==================== SLACK ====================

  /**
   * Create Slack alert configuration
   */
  async createSlack(dto: CreateSlackConfigDto): Promise<AlertConfig> {
    // Validate webhook URL format
    if (!dto.webhookUrl.startsWith('https://hooks.slack.com/')) {
      throw new BadRequestException(
        'Webhook URL must start with https://hooks.slack.com/',
      );
    }

    const configEncrypted = {
      webhookUrl: this.encryptSecret(dto.webhookUrl),
    };

    const config = this.alertConfigRepository.create({
      name: dto.name,
      providerType: 'slack',
      configEncrypted,
      severityFilter: dto.severityFilter || ['critical', 'error'],
      eventTypes: dto.eventTypes || [],
      isEnabled: true,
      errorCount: 0,
      lastSentAt: null,
      lastError: null,
    });

    const saved = await this.alertConfigRepository.save(config);
    this.logger.log(`Created Slack alert config: ${saved.id} (${saved.name})`);
    return saved;
  }

  // ==================== PAGERDUTY ====================

  /**
   * Create PagerDuty alert configuration
   */
  async createPagerDuty(
    dto: CreatePagerDutyConfigDto,
  ): Promise<AlertConfig> {
    // Validate routing key is exactly 32 characters
    if (dto.routingKey.length !== 32) {
      throw new BadRequestException(
        'PagerDuty routing key must be exactly 32 characters',
      );
    }

    const configEncrypted = {
      routingKey: this.encryptSecret(dto.routingKey),
    };

    const config = this.alertConfigRepository.create({
      name: dto.name,
      providerType: 'pagerduty',
      configEncrypted,
      // Default excludes 'warning' per ALERT-07
      severityFilter: dto.severityFilter || ['critical', 'error'],
      eventTypes: dto.eventTypes || [],
      isEnabled: true,
      errorCount: 0,
      lastSentAt: null,
      lastError: null,
    });

    const saved = await this.alertConfigRepository.save(config);
    this.logger.log(
      `Created PagerDuty alert config: ${saved.id} (${saved.name})`,
    );
    return saved;
  }

  // ==================== COMMON OPERATIONS ====================

  /**
   * Find all alert configurations
   */
  async findAll(): Promise<AlertConfigResponseDto[]> {
    const configs = await this.alertConfigRepository.find({
      order: { createdAt: 'DESC' },
    });

    return configs.map((config) => this.toResponseDto(config));
  }

  /**
   * Find one alert configuration by ID
   */
  async findOne(id: string): Promise<AlertConfig> {
    const config = await this.alertConfigRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('Alert configuration not found');
    }

    return config;
  }

  /**
   * Find all enabled alert configurations
   * Used by dispatcher to get active configs
   */
  async findEnabled(): Promise<AlertConfig[]> {
    return this.alertConfigRepository.find({
      where: { isEnabled: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update alert configuration
   */
  async update(
    id: string,
    dto: UpdateAlertConfigDto,
  ): Promise<AlertConfig> {
    const config = await this.findOne(id);

    // Update allowed fields
    if (dto.name !== undefined) {
      config.name = dto.name;
    }
    if (dto.isEnabled !== undefined) {
      config.isEnabled = dto.isEnabled;
    }
    if (dto.severityFilter !== undefined) {
      config.severityFilter = dto.severityFilter;
    }
    if (dto.eventTypes !== undefined) {
      config.eventTypes = dto.eventTypes;
    }

    const saved = await this.alertConfigRepository.save(config);
    this.logger.log(`Updated alert config: ${saved.id} (${saved.name})`);
    return saved;
  }

  /**
   * Enable alert configuration
   */
  async enable(id: string): Promise<AlertConfig> {
    const config = await this.findOne(id);

    config.isEnabled = true;
    config.errorCount = 0;
    config.lastError = null;

    const saved = await this.alertConfigRepository.save(config);
    this.logger.log(`Enabled alert config: ${saved.id} (${saved.name})`);
    return saved;
  }

  /**
   * Disable alert configuration
   */
  async disable(id: string): Promise<AlertConfig> {
    const config = await this.findOne(id);

    config.isEnabled = false;

    const saved = await this.alertConfigRepository.save(config);
    this.logger.log(`Disabled alert config: ${saved.id} (${saved.name})`);
    return saved;
  }

  /**
   * Delete alert configuration
   */
  async delete(id: string): Promise<void> {
    const config = await this.findOne(id);
    await this.alertConfigRepository.remove(config);
    this.logger.log(`Deleted alert config: ${id} (${config.name})`);
  }

  /**
   * Get decrypted configuration for provider use
   * Returns both the full config entity and decrypted secrets
   */
  async getDecryptedConfig(
    id: string,
  ): Promise<{ config: AlertConfig; decrypted: Record<string, string> }> {
    const config = await this.findOne(id);

    const decrypted: Record<string, string> = {};

    // Decrypt all fields in configEncrypted
    for (const [key, value] of Object.entries(config.configEncrypted)) {
      if (typeof value === 'string' && value.length > 0) {
        try {
          decrypted[key] = this.decryptSecret(value);
        } catch (error) {
          this.logger.warn(
            `Failed to decrypt field "${key}" for config ${id}`,
            error,
          );
          // Skip fields that fail to decrypt
        }
      }
    }

    return { config, decrypted };
  }

  /**
   * Update delivery status after sending alert
   * Auto-disables if error count reaches 10
   */
  async updateDeliveryStatus(
    id: string,
    success: boolean,
    error?: string,
  ): Promise<void> {
    const config = await this.findOne(id);

    config.lastSentAt = new Date();

    if (success) {
      // Reset error tracking on success
      config.errorCount = 0;
      config.lastError = null;
      this.logger.log(
        `Alert delivered successfully: ${id} (${config.name})`,
      );
    } else {
      // Increment error count and record error
      config.errorCount++;
      config.lastError = error || 'Unknown error';
      this.logger.warn(
        `Alert delivery failed: ${id} (${config.name}) - Error count: ${config.errorCount}`,
      );

      // Auto-disable after 10 consecutive failures
      if (config.errorCount >= 10) {
        config.isEnabled = false;
        this.logger.error(
          `Auto-disabled alert config after 10 failures: ${id} (${config.name})`,
        );
      }
    }

    await this.alertConfigRepository.save(config);
  }
}
