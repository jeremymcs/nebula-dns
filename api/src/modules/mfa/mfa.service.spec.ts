/**
 * Nebula DNS - Enterprise DNS Security Platform
 * MFA Service Unit Tests
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { MfaService } from './mfa.service';
import { UserMfa } from './entities/user-mfa.entity';
import { MfaBackupCode } from './entities/mfa-backup-code.entity';
import { User } from '../users/entities/user.entity';

describe('MfaService', () => {
  let service: MfaService;
  let userMfaRepository: jest.Mocked<Repository<UserMfa>>;
  let backupCodeRepository: jest.Mocked<Repository<MfaBackupCode>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUserMfaRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockBackupCodeRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-encryption-key-minimum-32-bytes-long'),
  };

  // Set test encryption keys in environment before tests run
  beforeAll(() => {
    process.env.MFA_ENCRYPTION_KEY =
      'test-encryption-key-minimum-32-bytes-long';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: getRepositoryToken(UserMfa),
          useValue: mockUserMfaRepository,
        },
        {
          provide: getRepositoryToken(MfaBackupCode),
          useValue: mockBackupCodeRepository,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
    userMfaRepository = module.get(getRepositoryToken(UserMfa));
    backupCodeRepository = module.get(getRepositoryToken(MfaBackupCode));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setupMfa', () => {
    it('should generate secret and backup codes for new MFA setup', async () => {
      const userId = 'user-123';
      const mockUser = { id: userId, email: 'test@example.com' };

      mockUserMfaRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      mockUserMfaRepository.create.mockReturnValue({ userId } as any);
      mockUserMfaRepository.save.mockResolvedValue({ userId } as any);
      mockBackupCodeRepository.delete.mockResolvedValue({} as any);
      mockBackupCodeRepository.create.mockReturnValue({} as any);
      mockBackupCodeRepository.save.mockResolvedValue({} as any);

      const result = await service.setupMfa(userId);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('backupCodes');
      expect(result.secret).toHaveLength(32);
      expect(result.backupCodes).toHaveLength(10);
      expect(result.qrCodeUrl).toContain('otpauth://totp/');
    });

    it('should throw error if MFA is already enabled', async () => {
      const userId = 'user-123';
      mockUserMfaRepository.findOne.mockResolvedValue({
        userId,
        isEnabled: true,
      } as any);

      await expect(service.setupMfa(userId)).rejects.toThrow(
        'MFA is already enabled',
      );
    });

    it('should throw error if user not found', async () => {
      const userId = 'user-123';
      mockUserMfaRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.setupMfa(userId)).rejects.toThrow('User not found');
    });
  });

  describe('isMfaEnabled', () => {
    it('should return true if MFA is enabled', async () => {
      const userId = 'user-123';
      mockUserMfaRepository.findOne.mockResolvedValue({
        userId,
        isEnabled: true,
      } as any);

      const result = await service.isMfaEnabled(userId);

      expect(result).toBe(true);
    });

    it('should return false if MFA is not enabled', async () => {
      const userId = 'user-123';
      mockUserMfaRepository.findOne.mockResolvedValue({
        userId,
        isEnabled: false,
      } as any);

      const result = await service.isMfaEnabled(userId);

      expect(result).toBe(false);
    });

    it('should return false if no MFA record exists', async () => {
      const userId = 'user-123';
      mockUserMfaRepository.findOne.mockResolvedValue(null);

      const result = await service.isMfaEnabled(userId);

      expect(result).toBe(false);
    });
  });

  describe('getBackupCodesCount', () => {
    it('should return total and remaining backup codes count', async () => {
      const userId = 'user-123';
      mockBackupCodeRepository.count.mockResolvedValue(10);
      mockBackupCodeRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(8),
      });

      const result = await service.getBackupCodesCount(userId);

      expect(result).toEqual({ total: 10, remaining: 8 });
    });
  });
});
