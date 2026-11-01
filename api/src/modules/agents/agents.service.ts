import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  AgentInstallation,
  AgentPlatform,
  AgentRole,
} from './entities/agent-installation.entity';
import { AgentInstallToken } from './entities/agent-install-token.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import {
  CreateDownloadLinkDto,
  RegisterAgentDto,
  AgentHeartbeatDto,
  UpdateAgentDto,
  AgentSiteIpUpdateDto,
  AgentRegistrationResult,
  AgentRuntimeConfig,
} from './dto/agent.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RedisService } from '../redis/redis.service';
import { AgentBrandingConfig } from './agent-branding.config';
import { AgentAuthContext } from './agent-auth.guard';

export interface AgentVersion {
  version: string;
  releaseDate: string;
  downloadUrl: string;
  sha256: string;
  releaseNotes: string;
}

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  private readonly agentVersions: Record<AgentPlatform, AgentVersion> = {
    windows: {
      version: '1.0.0',
      releaseDate: '2026-10-31',
      downloadUrl: '/downloads/FluxShield-Agent-1.0.0-windows-amd64.exe',
      sha256: '',
      releaseNotes:
        'Flux Shield Agent v1: site IP updater and endpoint DNS enforcement',
    },
    macos: {
      version: '0.0.0',
      releaseDate: '2026-10-31',
      downloadUrl: '/downloads/FluxShield-Agent-macos.pkg',
      sha256: '',
      releaseNotes: 'Coming soon',
    },
    linux: {
      version: '0.0.0',
      releaseDate: '2026-10-31',
      downloadUrl: '/downloads/fluxshield-agent-linux-amd64',
      sha256: '',
      releaseNotes: 'Coming soon',
    },
    ios: {
      version: '0.0.0',
      releaseDate: '2026-10-31',
      downloadUrl: 'https://shield.fluxlabs.net/agents/ios',
      sha256: '',
      releaseNotes: 'Mobile profile coming soon',
    },
    android: {
      version: '0.0.0',
      releaseDate: '2026-10-31',
      downloadUrl: 'https://shield.fluxlabs.net/agents/android',
      sha256: '',
      releaseNotes: 'Private DNS profile coming soon',
    },
  };

  constructor(
    @InjectRepository(AgentInstallation)
    private agentRepository: Repository<AgentInstallation>,
    @InjectRepository(AgentInstallToken)
    private installTokenRepository: Repository<AgentInstallToken>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    private readonly auditLogsService: AuditLogsService,
    private readonly redisService: RedisService,
    private readonly branding: AgentBrandingConfig,
  ) {}

  async getAgentVersions(): Promise<Record<AgentPlatform, AgentVersion>> {
    return this.agentVersions;
  }

  async getLatestVersion(platform: AgentPlatform): Promise<AgentVersion> {
    const version = this.agentVersions[platform];
    if (!version) {
      throw new NotFoundException(
        `No agent available for platform: ${platform}`,
      );
    }
    return version;
  }

  async createDownloadLink(
    tenantId: string,
    dto: CreateDownloadLinkDto,
  ): Promise<{
    downloadUrl: string;
    installationToken: string;
    expiresAt: Date;
    version: AgentVersion;
    roles: AgentRole[];
  }> {
    const version = await this.getLatestVersion(dto.platform);
    const roles = this.normalizeRoles(dto.roles, dto.locationId);

    if (roles.includes('site-updater') && !dto.locationId) {
      throw new BadRequestException(
        'locationId is required when site-updater role is enabled',
      );
    }

    if (dto.locationId) {
      const location = await this.locationRepository.findOne({
        where: { id: dto.locationId, tenantId },
      });
      if (!location) {
        throw new NotFoundException('Location not found');
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashSecret(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const record = this.installTokenRepository.create({
      tenantId,
      locationId: dto.locationId ?? null,
      tokenHash,
      tokenPrefix: token.slice(0, 12),
      roles,
      expiresAt,
    });
    await this.installTokenRepository.save(record);

    return {
      downloadUrl: version.downloadUrl,
      installationToken: token,
      expiresAt,
      version,
      roles,
    };
  }

  async registerAgent(dto: RegisterAgentDto): Promise<AgentRegistrationResult> {
    const tokenRecord = await this.installTokenRepository.findOne({
      where: { tokenHash: this.hashSecret(dto.installationToken) },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid installation token');
    }
    if (tokenRecord.usedAt) {
      throw new BadRequestException('Installation token has already been used');
    }
    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Installation token has expired');
    }

    const roles = this.normalizeRoles(dto.roles, tokenRecord.locationId);
    for (const role of roles) {
      if (!tokenRecord.roles.includes(role)) {
        throw new BadRequestException(`Role not permitted: ${role}`);
      }
    }

    if (roles.includes('site-updater') && !tokenRecord.locationId) {
      throw new BadRequestException('Site updater requires a location');
    }

    const deviceSecret = crypto.randomBytes(32).toString('hex');
    const dohToken = crypto.randomBytes(24).toString('base64url');

    let agent = await this.agentRepository.findOne({
      where: { tenantId: tokenRecord.tenantId, deviceId: dto.deviceId },
    });

    if (agent) {
      agent.agentVersion = dto.agentVersion;
      agent.osVersion = dto.osVersion || null;
      agent.status = 'active';
      agent.lastSeenAt = new Date();
      agent.errorMessage = null;
      agent.roles = roles;
      agent.locationId = tokenRecord.locationId ?? agent.locationId;
      agent.deviceSecretHash = this.hashSecret(deviceSecret);
      agent.dohTokenHash = this.hashSecret(dohToken);
    } else {
      agent = this.agentRepository.create({
        tenantId: tokenRecord.tenantId,
        locationId: tokenRecord.locationId,
        deviceId: dto.deviceId,
        deviceName:
          dto.deviceName || `${dto.platform}-${dto.deviceId.substring(0, 8)}`,
        platform: dto.platform,
        osVersion: dto.osVersion,
        agentVersion: dto.agentVersion,
        status: 'active',
        lastSeenAt: new Date(),
        roles,
        deviceSecretHash: this.hashSecret(deviceSecret),
        dohTokenHash: this.hashSecret(dohToken),
      });
    }

    agent = await this.agentRepository.save(agent);

    tokenRecord.usedAt = new Date();
    await this.installTokenRepository.save(tokenRecord);

    return {
      agent: {
        id: agent.id,
        deviceName: agent.deviceName,
        locationId: agent.locationId,
        roles: agent.roles,
      },
      deviceSecret,
      dohToken,
      config: await this.buildRuntimeConfig(agent),
    };
  }

  async handleHeartbeat(
    tenantId: string,
    dto: AgentHeartbeatDto,
  ): Promise<{
    configUpdated: boolean;
    updateAvailable: boolean;
    latestVersion?: string;
    config?: AgentRuntimeConfig;
  }> {
    const agent = await this.agentRepository.findOne({
      where: { tenantId, deviceId: dto.deviceId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    await this.applyHeartbeatFields(agent, dto);

    const runtimeConfig = await this.buildRuntimeConfig(agent);

    const latestVersion = this.agentVersions[agent.platform];
    const updateAvailable =
      latestVersion &&
      this.isNewerVersion(latestVersion.version, dto.agentVersion);

    return {
      configUpdated: false,
      updateAvailable,
      latestVersion: updateAvailable ? latestVersion.version : undefined,
      config: runtimeConfig,
    };
  }

  async handleHeartbeatPublic(dto: AgentHeartbeatDto): Promise<{
    configUpdated: boolean;
    updateAvailable: boolean;
    latestVersion?: string;
    downloadUrl?: string;
    config?: AgentRuntimeConfig;
  }> {
    const agent = await this.agentRepository.findOne({
      where: { deviceId: dto.deviceId },
    });

    if (!agent) {
      return {
        configUpdated: false,
        updateAvailable: false,
      };
    }

    await this.applyHeartbeatFields(agent, dto);

    const runtimeConfig = await this.buildRuntimeConfig(agent);

    const latestVersion = this.agentVersions[agent.platform];
    const updateAvailable =
      latestVersion &&
      this.isNewerVersion(latestVersion.version, dto.agentVersion);

    return {
      configUpdated: false,
      updateAvailable,
      latestVersion: updateAvailable ? latestVersion.version : undefined,
      downloadUrl: updateAvailable ? latestVersion.downloadUrl : undefined,
      config: runtimeConfig,
    };
  }

  async updateSitePublicIp(
    auth: AgentAuthContext,
    dto: AgentSiteIpUpdateDto,
    clientIp?: string,
  ): Promise<{ updated: boolean; ipRange: string | null }> {
    const { agent } = auth;

    if (!agent.roles.includes('site-updater')) {
      throw new ForbiddenException('Agent is not authorized for site IP updates');
    }
    if (!agent.locationId) {
      throw new BadRequestException('Agent is not linked to a location');
    }
    if (!dto.publicIpv4 && !dto.publicIpv6) {
      throw new BadRequestException('At least one public IP must be provided');
    }

    const location = await this.locationRepository.findOne({
      where: { id: agent.locationId, tenantId: agent.tenantId },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const nextRange = this.buildIpRange(dto.publicIpv4, dto.publicIpv6);
    if (location.ipRange === nextRange) {
      return { updated: false, ipRange: location.ipRange };
    }

    const oldRange = location.ipRange;
    const oldDyndns = location.dyndns;
    location.ipRange = nextRange;
    location.dyndns = null;
    location.siteIpUpdatedAt = new Date();
    location.siteIpUpdatedByAgentId = agent.id;
    await this.locationRepository.save(location);

    await this.redisService.storeIPRange(location.id, {
      tenant_id: location.tenantId,
      location_id: location.id,
      ip_range: location.ipRange,
      rate_limit: location.rateLimit,
    });
    await this.redisService.invalidatePolicy(location.id);

    await this.auditLogsService.log({
      tenantId: agent.tenantId,
      action: 'update',
      resourceType: 'location',
      resourceId: location.id,
      resourceName: location.name,
      oldValue: { ipRange: oldRange, dyndns: oldDyndns },
      newValue: {
        ipRange: nextRange,
        source: dto.source ?? 'flux-shield-agent',
        agentId: agent.id,
      },
      ipAddress: clientIp ?? dto.publicIpv4 ?? dto.publicIpv6 ?? null,
      metadata: {
        publicIpv4: dto.publicIpv4,
        publicIpv6: dto.publicIpv6,
      },
    });

    this.logger.log(
      `Site IP updated for location ${location.id} by agent ${agent.id}`,
    );

    return { updated: true, ipRange: nextRange };
  }

  async validateAgentDohToken(
    tenantId: string,
    deviceId: string,
    token: string,
  ): Promise<AgentInstallation | null> {
    const agent = await this.agentRepository.findOne({
      where: { tenantId, deviceId },
    });
    if (!agent?.dohTokenHash) {
      return null;
    }
    const hash = this.hashSecret(token);
    if (hash !== agent.dohTokenHash) {
      return null;
    }
    return agent;
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

  async updateAgent(
    tenantId: string,
    id: string,
    dto: UpdateAgentDto,
  ): Promise<AgentInstallation> {
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
    const active = agents.filter(
      (a) => a.lastSeenAt && a.lastSeenAt > oneHourAgo,
    ).length;

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

  private async applyHeartbeatFields(
    agent: AgentInstallation,
    dto: AgentHeartbeatDto,
  ): Promise<void> {
    agent.lastSeenAt = new Date();
    agent.agentVersion = dto.agentVersion;
    if (dto.ipAddress) agent.ipAddress = dto.ipAddress;
    if (dto.status) agent.status = dto.status;
    if (dto.errorMessage) agent.errorMessage = dto.errorMessage;
    if (typeof dto.dnsEnforced === 'boolean') {
      agent.dnsEnforced = dto.dnsEnforced;
    }
    if (dto.roles?.length) {
      agent.roles = dto.roles;
    }
    if (dto.tamperDetected) {
      agent.tamperCount += 1;
      agent.lastTamperAt = new Date();
      if (dto.tamperDetail) {
        agent.errorMessage = dto.tamperDetail;
      }
    }

    await this.agentRepository.save(agent);
  }

  private async buildRuntimeConfig(agent: AgentInstallation): Promise<AgentRuntimeConfig> {
    const [dns1, dns2] = this.branding.dnsServerHosts;
    let internalDnsZones: string[] | undefined;
    if (agent.locationId) {
      const location = await this.locationRepository.findOne({
        where: { id: agent.locationId, tenantId: agent.tenantId },
      });
      const zones = location?.settings?.internalDnsZones;
      if (Array.isArray(zones)) {
        internalDnsZones = zones.filter((z) => typeof z === 'string');
      }
    }
    return {
      apiEndpoint: this.branding.apiEndpoint,
      dohEndpoint: this.branding.dohEndpoint,
      dnsServers: [dns1, dns2],
      roles: agent.roles,
      tenantId: agent.tenantId,
      locationId: agent.locationId,
      internalDnsZones,
    };
  }

  private normalizeRoles(
    requested: AgentRole[] | undefined,
    locationId?: string | null,
  ): AgentRole[] {
    const roles = requested?.length
      ? [...new Set(requested)]
      : locationId
        ? (['site-updater', 'dns-enforce'] as AgentRole[])
        : (['dns-enforce'] as AgentRole[]);
    return roles;
  }

  private buildIpRange(ipv4?: string, ipv6?: string): string {
    const parts: string[] = [];
    if (ipv4) {
      parts.push(ipv4.includes('/') ? ipv4 : `${ipv4}/32`);
    }
    if (ipv6) {
      parts.push(ipv6.includes('/') ? ipv6 : `${ipv6}/128`);
    }
    return parts.join(', ');
  }

  private hashSecret(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private isNewerVersion(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (
      let i = 0;
      i < Math.max(latestParts.length, currentParts.length);
      i++
    ) {
      const l = latestParts[i] || 0;
      const c = currentParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  }
}
