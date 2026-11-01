// Nebula DNS - Agents Service Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AgentsService } from './agents.service';
import {
  AgentInstallation,
  AgentPlatform,
} from './entities/agent-installation.entity';
import { AgentInstallToken } from './entities/agent-install-token.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RedisService } from '../redis/redis.service';
import { AgentBrandingConfig } from './agent-branding.config';
import {
  CreateDownloadLinkDto,
  RegisterAgentDto,
  AgentHeartbeatDto,
  UpdateAgentDto,
} from './dto/agent.dto';

describe('AgentsService', () => {
  let service: AgentsService;
  let agentRepository: jest.Mocked<Repository<AgentInstallation>>;
  let installTokenRepository: jest.Mocked<Repository<AgentInstallToken>>;
  let locationRepository: jest.Mocked<Repository<Location>>;

  const mockTenantId = 'tenant-123';
  const mockDeviceId = 'device-abc-123';

  const mockAgent: Partial<AgentInstallation> = {
    id: 'agent-123',
    tenantId: mockTenantId,
    locationId: 'location-123',
    deviceId: mockDeviceId,
    deviceName: 'Test Device',
    platform: 'windows',
    osVersion: 'Windows 11',
    agentVersion: '1.2.0',
    status: 'active',
    ipAddress: '192.168.1.100',
    lastSeenAt: new Date('2024-01-01'),
    errorMessage: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockAgentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockInstallTokenRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockLocationRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockAuditLogsService = {
    log: jest.fn(),
  };

  const mockRedisService = {
    storeIPRange: jest.fn(),
    invalidatePolicy: jest.fn(),
  };

  const mockBranding = {
    dnsServerHosts: ['dns1.shield.fluxlabs.net', 'dns2.shield.fluxlabs.net'],
    apiEndpoint: 'https://api.shield.fluxlabs.net',
    dohEndpoint: 'https://dns.shield.fluxlabs.net/dns-query',
  };

  const mockTenantRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        {
          provide: getRepositoryToken(AgentInstallation),
          useValue: mockAgentRepository,
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepository,
        },
        {
          provide: getRepositoryToken(AgentInstallToken),
          useValue: mockInstallTokenRepository,
        },
        {
          provide: getRepositoryToken(Location),
          useValue: mockLocationRepository,
        },
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: AgentBrandingConfig,
          useValue: mockBranding,
        },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
    agentRepository = module.get(getRepositoryToken(AgentInstallation));
    installTokenRepository = module.get(getRepositoryToken(AgentInstallToken));
    locationRepository = module.get(getRepositoryToken(Location));

    jest.clearAllMocks();

    mockInstallTokenRepository.create.mockImplementation((v) => v);
    mockInstallTokenRepository.save.mockImplementation(async (v) => v);
    mockInstallTokenRepository.findOne.mockImplementation(async ({ where }) => {
      if (where?.tokenHash) {
        return {
          tenantId: mockTenantId,
          locationId: null,
          roles: ['dns-enforce'],
          expiresAt: new Date(Date.now() + 86400000),
          usedAt: null,
        } as AgentInstallToken;
      }
      return null;
    });
    mockLocationRepository.findOne.mockResolvedValue({
      id: 'location-123',
      tenantId: mockTenantId,
    } as unknown as Location);
  });

  describe('getAgentVersions', () => {
    it('should return all agent versions', async () => {
      const versions = await service.getAgentVersions();

      expect(versions).toBeDefined();
      expect(versions.windows).toBeDefined();
      expect(versions.macos).toBeDefined();
      expect(versions.linux).toBeDefined();
      expect(versions.ios).toBeDefined();
      expect(versions.android).toBeDefined();
    });
  });

  describe('getLatestVersion', () => {
    it('should return version for specific platform', async () => {
      const version = await service.getLatestVersion('windows');

      expect(version).toBeDefined();
      expect(version.version).toBeDefined();
      expect(version.downloadUrl).toBeDefined();
      expect(version.sha256).toBeDefined();
    });

    it('should throw NotFoundException for invalid platform', async () => {
      await expect(
        service.getLatestVersion('invalid' as AgentPlatform),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDownloadLink', () => {
    it('should create download link with installation token', async () => {
      const dto: CreateDownloadLinkDto = {
        platform: 'windows',
        locationId: 'location-123',
      };

      const result = await service.createDownloadLink(mockTenantId, dto);

      expect(result.downloadUrl).toBeDefined();
      expect(result.installationToken).toBeDefined();
      expect(result.installationToken).toHaveLength(64);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.version).toBeDefined();
    });

    it('should create link with 24 hour expiration', async () => {
      const dto: CreateDownloadLinkDto = {
        platform: 'macos',
      };

      const result = await service.createDownloadLink(mockTenantId, dto);

      const expiresIn = result.expiresAt.getTime() - Date.now();
      expect(expiresIn).toBeGreaterThan(23 * 60 * 60 * 1000); // ~23 hours
      expect(expiresIn).toBeLessThan(25 * 60 * 60 * 1000); // ~25 hours
    });
  });

  describe('registerAgent', () => {
    it('should register new agent with valid token', async () => {
      const dto: RegisterAgentDto = {
        installationToken: 'valid-token',
        deviceId: mockDeviceId,
        deviceName: 'My Laptop',
        platform: 'windows',
        osVersion: 'Windows 11',
        agentVersion: '1.2.0',
      };

      // Create installation token first
      const downloadLink = await service.createDownloadLink(mockTenantId, {
        platform: 'windows',
      });

      dto.installationToken = downloadLink.installationToken;

      mockAgentRepository.findOne.mockResolvedValue(null);
      mockAgentRepository.create.mockReturnValue(
        mockAgent as AgentInstallation,
      );
      mockAgentRepository.save.mockResolvedValue(
        mockAgent as AgentInstallation,
      );

      const result = await service.registerAgent(dto);

      expect(result).toBeDefined();
      expect(mockAgentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          deviceId: mockDeviceId,
          platform: 'windows',
        }),
      );
    });

    it('should update existing agent registration', async () => {
      const dto: RegisterAgentDto = {
        installationToken: 'valid-token',
        deviceId: mockDeviceId,
        platform: 'windows',
        agentVersion: '1.3.0',
      };

      const downloadLink = await service.createDownloadLink(mockTenantId, {
        platform: 'windows',
      });
      dto.installationToken = downloadLink.installationToken;

      mockAgentRepository.findOne.mockResolvedValue({
        ...mockAgent,
        agentVersion: '1.2.0',
      } as AgentInstallation);
      mockAgentRepository.save.mockResolvedValue({
        ...mockAgent,
        agentVersion: '1.3.0',
      } as AgentInstallation);

      const result = await service.registerAgent(dto);

      expect(result.agent).toBeDefined();
      expect(mockAgentRepository.save).toHaveBeenCalled();
    });

    it('should throw error for invalid token', async () => {
      const dto: RegisterAgentDto = {
        installationToken: 'invalid-token',
        deviceId: mockDeviceId,
        platform: 'windows',
        agentVersion: '1.2.0',
      };

      mockInstallTokenRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.registerAgent(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for expired token', async () => {
      const dto: RegisterAgentDto = {
        installationToken: 'expired-token',
        deviceId: mockDeviceId,
        platform: 'windows',
        agentVersion: '1.2.0',
      };

      mockInstallTokenRepository.findOne.mockResolvedValueOnce({
        tenantId: mockTenantId,
        locationId: null,
        roles: ['dns-enforce'],
        expiresAt: new Date(Date.now() - 3600000),
        usedAt: null,
      } as AgentInstallToken);

      await expect(service.registerAgent(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleHeartbeat', () => {
    it('should update agent status on heartbeat', async () => {
      const dto: AgentHeartbeatDto = {
        deviceId: mockDeviceId,
        agentVersion: '1.2.0',
        ipAddress: '192.168.1.100',
        status: 'active',
      };

      mockAgentRepository.findOne.mockResolvedValue(
        mockAgent as AgentInstallation,
      );
      mockAgentRepository.save.mockResolvedValue(
        mockAgent as AgentInstallation,
      );

      const result = await service.handleHeartbeat(mockTenantId, dto);

      expect(result.configUpdated).toBe(false);
      expect(result.updateAvailable).toBe(false);
      expect(mockAgentRepository.save).toHaveBeenCalled();
    });

    it('should detect available update', async () => {
      const dto: AgentHeartbeatDto = {
        deviceId: mockDeviceId,
        agentVersion: '0.9.0', // Old version
      };

      mockAgentRepository.findOne.mockResolvedValue({
        ...mockAgent,
        agentVersion: '0.9.0',
      } as AgentInstallation);
      mockAgentRepository.save.mockResolvedValue(
        mockAgent as AgentInstallation,
      );

      const result = await service.handleHeartbeat(mockTenantId, dto);

      expect(result.updateAvailable).toBe(true);
      expect(result.latestVersion).toBe('1.0.0');
    });

    it('should throw NotFoundException for unregistered agent', async () => {
      mockAgentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.handleHeartbeat(mockTenantId, {
          deviceId: 'nonexistent',
          agentVersion: '1.0.0',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update error message if provided', async () => {
      const dto: AgentHeartbeatDto = {
        deviceId: mockDeviceId,
        agentVersion: '1.2.0',
        errorMessage: 'Connection timeout',
      };

      mockAgentRepository.findOne.mockResolvedValue(
        mockAgent as AgentInstallation,
      );
      mockAgentRepository.save.mockResolvedValue({
        ...mockAgent,
        errorMessage: 'Connection timeout',
      } as AgentInstallation);

      await service.handleHeartbeat(mockTenantId, dto);

      expect(mockAgentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: 'Connection timeout',
        }),
      );
    });
  });

  describe('handleHeartbeatPublic', () => {
    it('should handle heartbeat without tenant context', async () => {
      const dto: AgentHeartbeatDto = {
        deviceId: mockDeviceId,
        agentVersion: '1.2.0',
      };

      mockAgentRepository.findOne.mockResolvedValue(
        mockAgent as AgentInstallation,
      );
      mockAgentRepository.save.mockResolvedValue(
        mockAgent as AgentInstallation,
      );

      const result = await service.handleHeartbeatPublic(dto);

      expect(result).toBeDefined();
      expect(result.configUpdated).toBe(false);
    });

    it('should return basic response for unregistered agent', async () => {
      mockAgentRepository.findOne.mockResolvedValue(null);

      const result = await service.handleHeartbeatPublic({
        deviceId: 'unknown',
        agentVersion: '1.0.0',
      });

      expect(result.configUpdated).toBe(false);
      expect(result.updateAvailable).toBe(false);
    });

    it('should include download URL when update available', async () => {
      mockAgentRepository.findOne.mockResolvedValue({
        ...mockAgent,
        agentVersion: '0.9.0',
      } as AgentInstallation);
      mockAgentRepository.save.mockResolvedValue(
        mockAgent as AgentInstallation,
      );

      const result = await service.handleHeartbeatPublic({
        deviceId: mockDeviceId,
        agentVersion: '0.9.0',
      });

      expect(result.updateAvailable).toBe(true);
      expect(result.downloadUrl).toBeDefined();
    });
  });

  describe('getAgents', () => {
    it('should return all agents for tenant', async () => {
      const agents = [mockAgent, { ...mockAgent, id: 'agent-456' }];
      mockAgentRepository.find.mockResolvedValue(agents as AgentInstallation[]);

      const result = await service.getAgents(mockTenantId);

      expect(result).toHaveLength(2);
      expect(mockAgentRepository.find).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        relations: ['location'],
        order: { lastSeenAt: 'DESC' },
      });
    });
  });

  describe('getAgent', () => {
    it('should return specific agent', async () => {
      mockAgentRepository.findOne.mockResolvedValue(
        mockAgent as AgentInstallation,
      );

      const result = await service.getAgent(mockTenantId, 'agent-123');

      expect(result).toEqual(mockAgent);
    });

    it('should throw NotFoundException when agent not found', async () => {
      mockAgentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getAgent(mockTenantId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAgent', () => {
    it('should update agent properties', async () => {
      const dto: UpdateAgentDto = {
        deviceName: 'Updated Name',
        locationId: 'new-location',
      };

      mockAgentRepository.findOne.mockResolvedValue(
        mockAgent as AgentInstallation,
      );
      mockAgentRepository.save.mockResolvedValue({
        ...mockAgent,
        ...dto,
      } as AgentInstallation);

      const result = await service.updateAgent(mockTenantId, 'agent-123', dto);

      expect(result.deviceName).toBe('Updated Name');
      expect(result.locationId).toBe('new-location');
    });
  });

  describe('deleteAgent', () => {
    it('should delete agent', async () => {
      mockAgentRepository.findOne.mockResolvedValue(
        mockAgent as AgentInstallation,
      );
      mockAgentRepository.remove.mockResolvedValue(
        mockAgent as AgentInstallation,
      );

      await service.deleteAgent(mockTenantId, 'agent-123');

      expect(mockAgentRepository.remove).toHaveBeenCalledWith(mockAgent);
    });
  });

  describe('getAgentStats', () => {
    it('should return agent statistics', async () => {
      const now = new Date();
      const fiftyMinutesAgo = new Date(now.getTime() - 50 * 60 * 1000); // Within 1 hour

      const agents = [
        { ...mockAgent, lastSeenAt: now, platform: 'windows' },
        {
          ...mockAgent,
          id: 'agent-2',
          lastSeenAt: fiftyMinutesAgo,
          platform: 'windows',
        },
        {
          ...mockAgent,
          id: 'agent-3',
          lastSeenAt: new Date('2023-01-01'),
          platform: 'macos',
        },
      ] as AgentInstallation[];

      mockAgentRepository.find.mockResolvedValue(agents);

      const result = await service.getAgentStats(mockTenantId);

      expect(result.total).toBe(3);
      expect(result.active).toBe(2); // Within last hour
      expect(result.inactive).toBe(1);
      expect(result.byPlatform.windows).toBe(2);
      expect(result.byPlatform.macos).toBe(1);
    });

    it('should handle zero agents', async () => {
      mockAgentRepository.find.mockResolvedValue([]);

      const result = await service.getAgentStats(mockTenantId);

      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
      expect(result.inactive).toBe(0);
    });
  });

  describe('isNewerVersion', () => {
    it('should detect newer major version', () => {
      const result = (service as any).isNewerVersion('2.0.0', '1.9.9');
      expect(result).toBe(true);
    });

    it('should detect newer minor version', () => {
      const result = (service as any).isNewerVersion('1.3.0', '1.2.9');
      expect(result).toBe(true);
    });

    it('should detect newer patch version', () => {
      const result = (service as any).isNewerVersion('1.2.1', '1.2.0');
      expect(result).toBe(true);
    });

    it('should return false for same version', () => {
      const result = (service as any).isNewerVersion('1.2.0', '1.2.0');
      expect(result).toBe(false);
    });

    it('should return false for older version', () => {
      const result = (service as any).isNewerVersion('1.0.0', '1.2.0');
      expect(result).toBe(false);
    });

    it('should handle missing version parts', () => {
      const result = (service as any).isNewerVersion('1.2', '1.1.9');
      expect(result).toBe(true);
    });
  });
});
