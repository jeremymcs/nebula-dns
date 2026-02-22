// Nebula DNS - Agents Controller Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService, AgentVersion } from './agents.service';
import {
  CreateDownloadLinkDto,
  RegisterAgentDto,
  AgentHeartbeatDto,
  UpdateAgentDto,
} from './dto/agent.dto';

describe('AgentsController', () => {
  let controller: AgentsController;
  let service: AgentsService;

  const mockTenantId = 'tenant-123';
  const mockAgentId = 'agent-123';
  const mockLocationId = 'location-123';

  const mockAgent = {
    id: mockAgentId,
    tenantId: mockTenantId,
    locationId: mockLocationId,
    deviceId: 'device-abc-123',
    deviceName: 'Office-PC-01',
    platform: 'windows',
    version: '1.2.0',
    status: 'online',
    lastSeenAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockVersion: AgentVersion = {
    version: '1.2.0',
    releaseDate: '2024-01-01',
    downloadUrl: 'https://example.com/agent-windows-1.2.0.exe',
    sha256: 'abc123...',
    releaseNotes: 'Bug fixes and improvements',
  };

  const mockAgentsService = {
    getAgentVersions: jest.fn(),
    getLatestVersion: jest.fn(),
    registerAgent: jest.fn(),
    handleHeartbeatPublic: jest.fn(),
    getAgents: jest.fn(),
    getAgentStats: jest.fn(),
    getAgent: jest.fn(),
    createDownloadLink: jest.fn(),
    updateAgent: jest.fn(),
    deleteAgent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [
        {
          provide: AgentsService,
          useValue: mockAgentsService,
        },
      ],
    }).compile();

    controller = module.get<AgentsController>(AgentsController);
    service = module.get<AgentsService>(AgentsService);

    jest.clearAllMocks();
  });

  describe('GET /agents/versions (Public)', () => {
    it('should return all agent versions', async () => {
      const mockVersions = [mockVersion];
      mockAgentsService.getAgentVersions.mockResolvedValue(mockVersions);

      const result = await controller.getVersions();

      expect(service.getAgentVersions).toHaveBeenCalled();
      expect(result.data).toEqual(mockVersions);
    });

    it('should return versions for all platforms', async () => {
      const mockVersions = [
        { ...mockVersion, version: '1.2.0' },
        { ...mockVersion, version: '1.2.0' },
        { ...mockVersion, version: '1.1.0' },
      ];

      mockAgentsService.getAgentVersions.mockResolvedValue(mockVersions);

      const result = await controller.getVersions();

      expect(result.data).toHaveLength(3);
    });
  });

  describe('GET /agents/versions/:platform (Public)', () => {
    it('should return latest version for platform', async () => {
      mockAgentsService.getLatestVersion.mockResolvedValue(mockVersion);

      const result = await controller.getLatestVersion('windows');

      expect(service.getLatestVersion).toHaveBeenCalledWith('windows');
      expect(result.data).toEqual(mockVersion);
    });

    it('should handle unsupported platform', async () => {
      mockAgentsService.getLatestVersion.mockResolvedValue(null);

      const result = await controller.getLatestVersion('unsupported');

      expect(result.data).toBeNull();
    });
  });

  describe('POST /agents/register (Public)', () => {
    it('should register agent with valid data', async () => {
      const registerDto: RegisterAgentDto = {
        installationToken: 'installation-token-123',
        deviceId: 'device-abc-123',
        deviceName: 'Office-PC-01',
        platform: 'windows',
        agentVersion: '1.2.0',
      };

      mockAgentsService.registerAgent.mockResolvedValue(mockAgent);

      const result = await controller.registerAgent(registerDto);

      expect(service.registerAgent).toHaveBeenCalledWith(registerDto);
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(mockAgentId);
    });

    it('should reject invalid installation token', async () => {
      const registerDto: RegisterAgentDto = {
        installationToken: 'invalid-token',
        deviceId: 'device-abc-123',
        deviceName: 'Office-PC-01',
        platform: 'windows',
        agentVersion: '1.2.0',
      };

      mockAgentsService.registerAgent.mockRejectedValue(
        new BadRequestException('Invalid installation token'),
      );

      await expect(controller.registerAgent(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject invalid platform', async () => {
      const registerDto = {
        installationToken: 'installation-token-123',
        deviceId: 'device-abc-123',
        deviceName: 'Office-PC-01',
        platform: 'invalid-platform',
        agentVersion: '1.2.0',
      } as any;

      mockAgentsService.registerAgent.mockRejectedValue(
        new BadRequestException('Invalid platform'),
      );

      await expect(controller.registerAgent(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('POST /agents/heartbeat (Public)', () => {
    it('should handle heartbeat with valid data', async () => {
      const heartbeatDto: AgentHeartbeatDto = {
        deviceId: 'device-abc-123',
        agentVersion: '1.2.0',
        status: 'active',
      };

      const mockResponse = {
        updateAvailable: false,
        config: {},
      };

      mockAgentsService.handleHeartbeatPublic.mockResolvedValue(mockResponse);

      const result = await controller.heartbeat(heartbeatDto);

      expect(service.handleHeartbeatPublic).toHaveBeenCalledWith(heartbeatDto);
      expect(result.success).toBe(true);
      expect(result.updateAvailable).toBe(false);
    });

    it('should indicate update available', async () => {
      const heartbeatDto: AgentHeartbeatDto = {
        deviceId: 'device-abc-123',
        agentVersion: '1.0.0',
        status: 'active',
      };

      const mockResponse = {
        updateAvailable: true,
        latestVersion: '1.2.0',
        downloadUrl: 'https://example.com/agent-windows-1.2.0.exe',
      };

      mockAgentsService.handleHeartbeatPublic.mockResolvedValue(mockResponse);

      const result = await controller.heartbeat(heartbeatDto);

      expect(result.updateAvailable).toBe(true);
      expect(result.latestVersion).toBe('1.2.0');
    });

    it('should reject heartbeat from unknown device', async () => {
      const heartbeatDto: AgentHeartbeatDto = {
        deviceId: 'unknown-device',
        agentVersion: '1.2.0',
        status: 'active',
      };

      mockAgentsService.handleHeartbeatPublic.mockRejectedValue(
        new NotFoundException('Device not found'),
      );

      await expect(controller.heartbeat(heartbeatDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('GET /agents/update/:platform (Public)', () => {
    it('should return update information', async () => {
      mockAgentsService.getLatestVersion.mockResolvedValue(mockVersion);

      const result = await controller.getUpdate('windows');

      expect(service.getLatestVersion).toHaveBeenCalledWith('windows');
      expect(result.success).toBe(true);
      expect(result.data?.version).toBe(mockVersion.version);
      expect(result.data?.downloadUrl).toBe(mockVersion.downloadUrl);
    });

    it('should handle platform not found', async () => {
      mockAgentsService.getLatestVersion.mockResolvedValue(null);

      const result = await controller.getUpdate('unsupported');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Platform not found');
    });
  });

  describe('GET /agents (Authenticated)', () => {
    it('should return all agents for tenant', async () => {
      const mockAgents = [mockAgent];
      mockAgentsService.getAgents.mockResolvedValue(mockAgents);

      const result = await controller.getAgents(mockTenantId);

      expect(service.getAgents).toHaveBeenCalledWith(mockTenantId);
      expect(result.data).toEqual(mockAgents);
    });

    it('should filter by tenant', async () => {
      mockAgentsService.getAgents.mockResolvedValue([mockAgent]);

      await controller.getAgents(mockTenantId);

      expect(service.getAgents).toHaveBeenCalledWith(mockTenantId);
    });

    it('should return empty array when no agents exist', async () => {
      mockAgentsService.getAgents.mockResolvedValue([]);

      const result = await controller.getAgents(mockTenantId);

      expect(result.data).toEqual([]);
    });
  });

  describe('GET /agents/stats (Authenticated)', () => {
    it('should return agent statistics', async () => {
      const mockStats = {
        total: 10,
        online: 8,
        offline: 2,
        byPlatform: {
          windows: 5,
          macos: 3,
          linux: 2,
        },
      };

      mockAgentsService.getAgentStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockTenantId);

      expect(service.getAgentStats).toHaveBeenCalledWith(mockTenantId);
      expect(result.data).toEqual(mockStats);
      expect(result.data.total).toBe(10);
    });
  });

  describe('GET /agents/:id (Authenticated)', () => {
    it('should return agent by ID', async () => {
      mockAgentsService.getAgent.mockResolvedValue(mockAgent);

      const result = await controller.getAgent(mockTenantId, mockAgentId);

      expect(service.getAgent).toHaveBeenCalledWith(mockTenantId, mockAgentId);
      expect(result.data).toEqual(mockAgent);
    });

    it('should throw NotFoundException for non-existent agent', async () => {
      mockAgentsService.getAgent.mockRejectedValue(
        new NotFoundException('Agent not found'),
      );

      await expect(
        controller.getAgent(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation', async () => {
      mockAgentsService.getAgent.mockResolvedValue(mockAgent);

      await controller.getAgent(mockTenantId, mockAgentId);

      expect(service.getAgent).toHaveBeenCalledWith(mockTenantId, mockAgentId);
    });
  });

  describe('POST /agents/download-link (Authenticated)', () => {
    it('should create download link', async () => {
      const createDto: CreateDownloadLinkDto = {
        platform: 'windows',
        locationId: mockLocationId,
      };

      const mockLink = {
        downloadUrl: 'https://example.com/download/agent-windows.exe?token=xyz',
        installationToken: 'token-123',
        expiresAt: new Date('2024-01-02'),
        version: mockVersion,
      };

      mockAgentsService.createDownloadLink.mockResolvedValue(mockLink);

      const result = await controller.createDownloadLink(
        mockTenantId,
        createDto,
      );

      expect(service.createDownloadLink).toHaveBeenCalledWith(
        mockTenantId,
        createDto,
      );
      expect(result.success).toBe(true);
      expect(result.data.downloadUrl).toBeDefined();
    });

    it('should reject invalid platform', async () => {
      const createDto = {
        platform: 'invalid-platform',
        locationId: mockLocationId,
      } as any;

      mockAgentsService.createDownloadLink.mockRejectedValue(
        new BadRequestException('Invalid platform'),
      );

      await expect(
        controller.createDownloadLink(mockTenantId, createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PATCH /agents/:id (Authenticated)', () => {
    it('should update agent with valid data', async () => {
      const updateDto: UpdateAgentDto = {
        deviceName: 'Updated-PC-01',
      };

      const updatedAgent = { ...mockAgent, ...updateDto };
      mockAgentsService.updateAgent.mockResolvedValue(updatedAgent);

      const result = await controller.updateAgent(
        mockTenantId,
        mockAgentId,
        updateDto,
      );

      expect(service.updateAgent).toHaveBeenCalledWith(
        mockTenantId,
        mockAgentId,
        updateDto,
      );
      expect(result.data.deviceName).toBe(updateDto.deviceName);
    });

    it('should throw NotFoundException for non-existent agent', async () => {
      const updateDto: UpdateAgentDto = {
        deviceName: 'Updated',
      };

      mockAgentsService.updateAgent.mockRejectedValue(
        new NotFoundException('Agent not found'),
      );

      await expect(
        controller.updateAgent(mockTenantId, 'nonexistent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /agents/:id (Authenticated)', () => {
    it('should delete agent successfully', async () => {
      mockAgentsService.deleteAgent.mockResolvedValue(undefined);

      const result = await controller.deleteAgent(mockTenantId, mockAgentId);

      expect(service.deleteAgent).toHaveBeenCalledWith(
        mockTenantId,
        mockAgentId,
      );
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException for non-existent agent', async () => {
      mockAgentsService.deleteAgent.mockRejectedValue(
        new NotFoundException('Agent not found'),
      );

      await expect(
        controller.deleteAgent(mockTenantId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Authorization', () => {
    it('should require ADMIN or OWNER for createDownloadLink', () => {
      const roles = Reflect.getMetadata('roles', controller.createDownloadLink);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });

    it('should require ADMIN or OWNER for updateAgent', () => {
      const roles = Reflect.getMetadata('roles', controller.updateAgent);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });

    it('should require ADMIN or OWNER for deleteAgent', () => {
      const roles = Reflect.getMetadata('roles', controller.deleteAgent);
      expect(roles).toEqual(expect.arrayContaining(['admin', 'owner']));
    });
  });

  describe('Public vs Authenticated Endpoints', () => {
    it('should allow public access to version endpoints', async () => {
      mockAgentsService.getAgentVersions.mockResolvedValue([mockVersion]);

      const result = await controller.getVersions();

      expect(result.data).toBeDefined();
    });

    it('should allow public access to registration', async () => {
      const registerDto: RegisterAgentDto = {
        installationToken: 'installation-token-123',
        deviceId: 'device-abc-123',
        deviceName: 'Office-PC-01',
        platform: 'windows',
        agentVersion: '1.2.0',
      };

      mockAgentsService.registerAgent.mockResolvedValue(mockAgent);

      const result = await controller.registerAgent(registerDto);

      expect(result.success).toBe(true);
    });

    it('should require authentication for agent management', async () => {
      const guards = Reflect.getMetadata('__guards__', controller.getAgents);
      expect(guards).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockAgentsService.getAgents.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.getAgents(mockTenantId)).rejects.toThrow(Error);
    });

    it('should propagate validation errors', async () => {
      const registerDto: RegisterAgentDto = {
        installationToken: 'invalid',
        deviceId: 'device-abc-123',
        deviceName: 'Office-PC-01',
        platform: 'windows',
        agentVersion: '1.2.0',
      };

      mockAgentsService.registerAgent.mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await expect(controller.registerAgent(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
