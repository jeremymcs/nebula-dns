// Nebula DNS - Alerting Service Unit Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AlertingService } from './alerting.service';
import { AlertConfig } from './entities/alert-config.entity';
import {
  AlertSeverity,
  AlertEventType,
} from './interfaces/alert-provider.interface';

// Mock the encryption module
jest.mock('../../config/encryption.config', () => ({
  getEncryptionKey: jest
    .fn()
    .mockReturnValue('test-encryption-key-for-alerting'),
}));

jest.mock('../../common/utils/encryption.util', () => ({
  encrypt: jest.fn().mockImplementation((text: string) => `encrypted_${text}`),
  decrypt: jest
    .fn()
    .mockImplementation((text: string) => text.replace('encrypted_', '')),
  deriveKey: jest
    .fn()
    .mockImplementation((key: string, salt: string) =>
      Buffer.from(`${key}_${salt}`),
    ),
}));

describe('AlertingService', () => {
  let service: AlertingService;
  let alertConfigRepository: any;

  const mockAlertConfig: Required<AlertConfig> = {
    id: 'alert-config-123',
    name: 'Test Slack',
    providerType: 'slack',
    isEnabled: true,
    severityFilter: ['critical', 'error'],
    eventTypes: ['system_health', 'billing'],
    configEncrypted: {
      webhookUrl:
        'encrypted_https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
    },
    errorCount: 0,
    lastSentAt: null,
    lastError: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  } as Required<AlertConfig>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertingService,
        {
          provide: getRepositoryToken(AlertConfig),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AlertingService>(AlertingService);
    alertConfigRepository = module.get(getRepositoryToken(AlertConfig));
    jest.clearAllMocks();
  });

  describe('createSlack', () => {
    it('should create Slack alert config with encrypted webhook URL', async () => {
      const createDto = {
        name: 'Production Slack',
        webhookUrl:
          'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
        severityFilter: ['critical', 'error'] as AlertSeverity[],
        eventTypes: ['system_health'] as AlertEventType[],
      };

      mockRepository.create.mockImplementation((data) => data);
      mockRepository.save.mockImplementation(async (data) => ({
        ...data,
        id: 'new-alert-config',
        createdAt: new Date(),
      }));

      const result = await service.createSlack(createDto);

      // Verify repository create was called with encrypted URL
      expect(mockRepository.create).toHaveBeenCalled();
      const createCall = mockRepository.create.mock.calls[0][0];
      expect(createCall.providerType).toBe('slack');
      expect(createCall.name).toBe('Production Slack');
      expect(createCall.configEncrypted.webhookUrl).toContain('encrypted_');
      expect(createCall.isEnabled).toBe(true);
      expect(createCall.severityFilter).toEqual(['critical', 'error']);
    });

    it('should throw BadRequestException for invalid Slack webhook URL', async () => {
      const createDto = {
        name: 'Invalid Slack',
        webhookUrl: 'https://example.com/webhook', // Not a Slack URL
      };

      await expect(service.createSlack(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-HTTPS Slack webhook URL', async () => {
      const createDto = {
        name: 'Non-HTTPS Slack',
        webhookUrl:
          'http://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      };

      await expect(service.createSlack(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should use default severity filter when not provided', async () => {
      const createDto = {
        name: 'Slack without severity',
        webhookUrl:
          'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      };

      mockRepository.create.mockImplementation((data) => data);
      mockRepository.save.mockImplementation(async (data) => ({
        ...data,
        id: 'new-alert-config',
        createdAt: new Date(),
      }));

      await service.createSlack(createDto);

      const createCall = mockRepository.create.mock.calls[0][0];
      expect(createCall.severityFilter).toEqual(['critical', 'error']);
    });
  });

  describe('createPagerDuty', () => {
    it('should create PagerDuty alert config with encrypted routing key', async () => {
      const createDto = {
        name: 'Production PagerDuty',
        routingKey: 'a'.repeat(32), // Valid 32-char key
        severityFilter: ['critical'] as AlertSeverity[],
        eventTypes: ['security'] as AlertEventType[],
      };

      mockRepository.create.mockImplementation((data) => data);
      mockRepository.save.mockImplementation(async (data) => ({
        ...data,
        id: 'new-pagerduty-config',
        createdAt: new Date(),
      }));

      const result = await service.createPagerDuty(createDto);

      expect(mockRepository.create).toHaveBeenCalled();
      const createCall = mockRepository.create.mock.calls[0][0];
      expect(createCall.providerType).toBe('pagerduty');
      expect(createCall.name).toBe('Production PagerDuty');
      expect(createCall.configEncrypted.routingKey).toContain('encrypted_');
      expect(createCall.isEnabled).toBe(true);
    });

    it('should throw BadRequestException for invalid PagerDuty routing key length', async () => {
      const createDto = {
        name: 'Invalid PagerDuty',
        routingKey: 'too-short', // Not 32 characters
      };

      await expect(service.createPagerDuty(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for exactly 31 character routing key', async () => {
      const createDto = {
        name: 'Invalid PagerDuty',
        routingKey: 'a'.repeat(31),
      };

      await expect(service.createPagerDuty(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for 33 character routing key', async () => {
      const createDto = {
        name: 'Invalid PagerDuty',
        routingKey: 'a'.repeat(33),
      };

      await expect(service.createPagerDuty(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should use default severity filter excluding warning', async () => {
      const createDto = {
        name: 'PagerDuty without severity',
        routingKey: 'a'.repeat(32),
      };

      mockRepository.create.mockImplementation((data) => data);
      mockRepository.save.mockImplementation(async (data) => ({
        ...data,
        id: 'new-pagerduty-config',
        createdAt: new Date(),
      }));

      await service.createPagerDuty(createDto);

      const createCall = mockRepository.create.mock.calls[0][0];
      expect(createCall.severityFilter).toEqual(['critical', 'error']);
    });
  });

  describe('findAll', () => {
    it('should return all alert configs ordered by createdAt descending', async () => {
      const configs = [
        {
          ...mockAlertConfig,
          id: 'config-1',
          name: 'First Config',
          createdAt: new Date('2026-01-02'),
        },
        {
          ...mockAlertConfig,
          id: 'config-2',
          name: 'Second Config',
          createdAt: new Date('2026-01-01'),
        },
      ];

      mockRepository.find.mockResolvedValue(configs);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no configs exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });

    it('should map entity to response DTO without encrypted data', async () => {
      mockRepository.find.mockResolvedValue([mockAlertConfig]);

      const result = await service.findAll();

      expect(result[0]).not.toHaveProperty('configEncrypted');
      expect(result[0].id).toBe(mockAlertConfig.id);
      expect(result[0].name).toBe(mockAlertConfig.name);
      expect(result[0].providerType).toBe(mockAlertConfig.providerType);
      expect(result[0].isEnabled).toBe(mockAlertConfig.isEnabled);
    });
  });

  describe('findOne', () => {
    it('should return alert config by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockAlertConfig);

      const result = await service.findOne(mockAlertConfig.id);

      expect(result.id).toBe(mockAlertConfig.id);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockAlertConfig.id },
      });
    });

    it('should throw NotFoundException for non-existent config', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findEnabled', () => {
    it('should return only enabled alert configs', async () => {
      const enabledConfigs = [
        { ...mockAlertConfig, id: 'config-1', isEnabled: true },
        { ...mockAlertConfig, id: 'config-2', isEnabled: true },
      ];

      mockRepository.find.mockResolvedValue(enabledConfigs);

      const result = await service.findEnabled();

      expect(result).toHaveLength(2);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { isEnabled: true },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('update', () => {
    it('should update name field', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockAlertConfig });
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.update(mockAlertConfig.id, {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should update isEnabled field', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockAlertConfig });
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.update(mockAlertConfig.id, {
        isEnabled: false,
      });

      expect(result.isEnabled).toBe(false);
    });

    it('should update severityFilter field', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockAlertConfig });
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.update(mockAlertConfig.id, {
        severityFilter: ['critical', 'warning', 'error'],
      });

      expect(result.severityFilter).toEqual(['critical', 'warning', 'error']);
    });

    it('should update eventTypes field', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockAlertConfig });
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.update(mockAlertConfig.id, {
        eventTypes: ['billing', 'security', 'system_health'],
      });

      expect(result.eventTypes).toEqual([
        'billing',
        'security',
        'system_health',
      ]);
    });

    it('should throw NotFoundException for non-existent config', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('enable', () => {
    it('should enable alert config and reset error tracking', async () => {
      const configWithErrors = {
        ...mockAlertConfig,
        isEnabled: false,
        errorCount: 5,
        lastError: 'Previous error',
      };

      mockRepository.findOne.mockResolvedValue(configWithErrors);
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.enable(mockAlertConfig.id);

      expect(result.isEnabled).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.lastError).toBeNull();
    });

    it('should throw NotFoundException for non-existent config', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.enable('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('disable', () => {
    it('should disable alert config', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockAlertConfig,
        isEnabled: true,
      });
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.disable(mockAlertConfig.id);

      expect(result.isEnabled).toBe(false);
    });

    it('should throw NotFoundException for non-existent config', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.disable('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete alert config', async () => {
      mockRepository.findOne.mockResolvedValue(mockAlertConfig);
      mockRepository.remove.mockResolvedValue({});

      await expect(service.delete(mockAlertConfig.id)).resolves.toBeUndefined();
      expect(mockRepository.remove).toHaveBeenCalledWith(mockAlertConfig);
    });

    it('should throw NotFoundException for non-existent config', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDecryptedConfig', () => {
    it('should return config with decrypted secrets', async () => {
      mockRepository.findOne.mockResolvedValue(mockAlertConfig);

      const result = await service.getDecryptedConfig(mockAlertConfig.id);

      expect(result.config).toBeDefined();
      expect(result.decrypted).toBeDefined();
      expect(result.decrypted.webhookUrl).toBe(
        'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      );
    });

    it('should handle decryption errors gracefully', async () => {
      const configWithBadEncryption = {
        ...mockAlertConfig,
        configEncrypted: {
          webhookUrl: 'invalid-encrypted-data',
        },
      };

      // Mock decrypt to throw error
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { decrypt } = require('../../common/utils/encryption.util');
      decrypt.mockImplementationOnce(() => {
        throw new Error('Decryption failed');
      });

      mockRepository.findOne.mockResolvedValue(configWithBadEncryption);

      const result = await service.getDecryptedConfig(mockAlertConfig.id);

      // Should skip the field that failed to decrypt
      expect(result.decrypted.webhookUrl).toBeUndefined();
    });

    it('should throw NotFoundException for non-existent config', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getDecryptedConfig('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should update status on successful delivery', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockAlertConfig,
        errorCount: 3,
      });
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      await service.updateDeliveryStatus(mockAlertConfig.id, true);

      const saveCall = mockRepository.save.mock.calls[0][0];
      expect(saveCall.errorCount).toBe(0);
      expect(saveCall.lastError).toBeNull();
      expect(saveCall.lastSentAt).toBeDefined();
    });

    it('should increment error count on failed delivery', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockAlertConfig,
        errorCount: 3,
      });
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      await service.updateDeliveryStatus(
        mockAlertConfig.id,
        false,
        'Network error',
      );

      const saveCall = mockRepository.save.mock.calls[0][0];
      expect(saveCall.errorCount).toBe(4);
      expect(saveCall.lastError).toBe('Network error');
    });

    it('should auto-disable after 10 consecutive failures', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockAlertConfig,
        errorCount: 9,
      });
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      await service.updateDeliveryStatus(
        mockAlertConfig.id,
        false,
        'Persistent error',
      );

      const saveCall = mockRepository.save.mock.calls[0][0];
      expect(saveCall.errorCount).toBe(10);
      expect(saveCall.isEnabled).toBe(false);
    });

    it('should throw NotFoundException for non-existent config', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateDeliveryStatus('non-existent', true),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
