import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { AgentInstallation, AgentPlatform } from './entities/agent-installation.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { CreateDownloadLinkDto, RegisterAgentDto, AgentHeartbeatDto, UpdateAgentDto } from './dto/agent.dto';

interface AgentVersion {
  version: string;
  releaseDate: string;
  downloadUrl: string;
  sha256: string;
  releaseNotes: string;
}

@Injectable()
export class AgentsService {
  // Agent versions (in production, this would come from a database or config)
  private readonly agentVersions: Record<AgentPlatform, AgentVersion> = {
    windows: {
      version: '1.2.0',
      releaseDate: '2024-01-15',
      downloadUrl: '/downloads/SafeDNS-Agent-1.2.0.msi',
      sha256: 'abc123...',
      releaseNotes: 'Improved DNS-over-HTTPS performance, bug fixes',
    },
    macos: {
      version: '1.2.0',
      releaseDate: '2024-01-15',
      downloadUrl: '/downloads/SafeDNS-Agent-1.2.0.pkg',
      sha256: 'def456...',
      releaseNotes: 'Native Apple Silicon support, improved stability',
    },
    linux: {
      version: '1.1.0',
      releaseDate: '2024-01-10',
      downloadUrl: '/downloads/safedns-agent-1.1.0.deb',
      sha256: 'ghi789...',
      releaseNotes: 'Support for Ubuntu 22.04, Debian 12',
    },
    ios: {
      version: '1.0.5',
      releaseDate: '2024-01-12',
      downloadUrl: 'https://apps.apple.com/app/safedns/id123456789',
      sha256: '',
      releaseNotes: 'iOS 17 support, improved battery life',
    },
    android: {
      version: '1.0.5',
      releaseDate: '2024-01-12',
      downloadUrl: 'https://play.google.com/store/apps/details?id=com.safedns.agent',
      sha256: '',
      releaseNotes: 'Android 14 support, Private DNS configuration',
    },
  };

  // Installation tokens (short-lived, tenant-specific)
  private installationTokens: Map<string, { tenantId: string; locationId?: string; expires: Date }> = new Map();

  constructor(
    @InjectRepository(AgentInstallation)
    private agentRepository: Repository<AgentInstallation>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async getAgentVersions(): Promise<Record<AgentPlatform, AgentVersion>> {
    return this.agentVersions;
  }

  async getLatestVersion(platform: AgentPlatform): Promise<AgentVersion> {
    const version = this.agentVersions[platform];
    if (!version) {
      throw new NotFoundException(`No agent available for platform: ${platform}`);
    }
    return version;
  }

  async createDownloadLink(tenantId: string, dto: CreateDownloadLinkDto): Promise<{ 
    downloadUrl: string; 
    installationToken: string;
    expiresAt: Date;
    version: AgentVersion;
  }> {
    const version = await this.getLatestVersion(dto.platform);
    
    // Generate installation token (valid for 24 hours)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    this.installationTokens.set(token, {
      tenantId,
      locationId: dto.locationId,
      expires: expiresAt,
    });

    // Clean up expired tokens periodically
    this.cleanupExpiredTokens();

    return {
      downloadUrl: version.downloadUrl,
      installationToken: token,
      expiresAt,
      version,
    };
  }

  async registerAgent(dto: RegisterAgentDto): Promise<AgentInstallation> {
    // Validate installation token
    const tokenData = this.installationTokens.get(dto.installationToken);
    if (!tokenData) {
      throw new BadRequestException('Invalid installation token');
    }
    if (tokenData.expires < new Date()) {
      this.installationTokens.delete(dto.installationToken);
      throw new BadRequestException('Installation token has expired');
    }

    // Check if device already registered
    let agent = await this.agentRepository.findOne({
      where: { tenantId: tokenData.tenantId, deviceId: dto.deviceId },
    });

    if (agent) {
      // Update existing registration
      agent.agentVersion = dto.agentVersion;
      agent.osVersion = dto.osVersion;
      agent.status = 'active';
      agent.lastSeenAt = new Date();
      agent.errorMessage = null;
    } else {
      // Create new registration
      agent = this.agentRepository.create({
        tenantId: tokenData.tenantId,
        locationId: tokenData.locationId,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName || `${dto.platform}-${dto.deviceId.substring(0, 8)}`,
        platform: dto.platform,
        osVersion: dto.osVersion,
        agentVersion: dto.agentVersion,
        status: 'active',
        lastSeenAt: new Date(),
      });
    }

    // Invalidate the token after successful registration
    this.installationTokens.delete(dto.installationToken);

    return this.agentRepository.save(agent);
  }

  async handleHeartbeat(tenantId: string, dto: AgentHeartbeatDto): Promise<{ 
    configUpdated: boolean;
    updateAvailable: boolean;
    latestVersion?: string;
  }> {
    const agent = await this.agentRepository.findOne({
      where: { tenantId, deviceId: dto.deviceId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Update agent status
    agent.lastSeenAt = new Date();
    agent.agentVersion = dto.agentVersion;
    if (dto.ipAddress) agent.ipAddress = dto.ipAddress;
    if (dto.status) agent.status = dto.status;
    if (dto.errorMessage) agent.errorMessage = dto.errorMessage;

    await this.agentRepository.save(agent);

    // Check if update is available
    const latestVersion = this.agentVersions[agent.platform];
    const updateAvailable = latestVersion && latestVersion.version !== dto.agentVersion;

    return {
      configUpdated: false, // Would check if policy changed
      updateAvailable,
      latestVersion: updateAvailable ? latestVersion.version : undefined,
    };
  }

  async getAgents(tenantId: string): Promise<AgentInstallation[]> {
    return this.agentRepository.find({
      where: { tenantId },
      relations: ['location'],
      order: { lastSeenAt: 'DESC' },
    });
  }

  async getAgent(tenantId: string, id: string): Promise<AgentInstallation> {
    const agent = await this.agentRepository.findOne({
      where: { id, tenantId },
      relations: ['location'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return agent;
  }

  async updateAgent(tenantId: string, id: string, dto: UpdateAgentDto): Promise<AgentInstallation> {
    const agent = await this.getAgent(tenantId, id);
    
    if (dto.deviceName) agent.deviceName = dto.deviceName;
    if (dto.locationId) agent.locationId = dto.locationId;

    return this.agentRepository.save(agent);
  }

  async deleteAgent(tenantId: string, id: string): Promise<void> {
    const agent = await this.getAgent(tenantId, id);
    await this.agentRepository.remove(agent);
  }

  async getAgentStats(tenantId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    byPlatform: Record<string, number>;
  }> {
    const agents = await this.agentRepository.find({ where: { tenantId } });
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const active = agents.filter(a => a.lastSeenAt && a.lastSeenAt > oneHourAgo).length;
    
    const byPlatform: Record<string, number> = {};
    for (const agent of agents) {
      byPlatform[agent.platform] = (byPlatform[agent.platform] || 0) + 1;
    }

    return {
      total: agents.length,
      active,
      inactive: agents.length - active,
      byPlatform,
    };
  }

  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of this.installationTokens.entries()) {
      if (data.expires < now) {
        this.installationTokens.delete(token);
      }
    }
  }
}
