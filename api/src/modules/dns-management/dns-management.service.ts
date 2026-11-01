// Nebula DNS - DNS Management Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { DnsPlatformConnection } from './entities/dns-platform-connection.entity';
import { DnsZoneAssignment } from './entities/dns-zone-assignment.entity';
import { DnsPlatformConnectionStatus } from './enums/dns-connection-status.enum';
import { DnsProvisioningModel } from './enums/dns-provisioning-model.enum';
import {
  AdminZoneListItemDto,
  AssignZoneDto,
  CreatePlatformZoneDto,
  DnsRecordResponseDto,
  PlatformConnectionResponseDto,
  TenantZoneResponseDto,
  UpdateZonePermissionsDto,
} from './dto/dns-management.dto';
import {
  DNS_PROVIDER,
  DnsProvider,
  DnsProviderZone,
} from './providers/dns-provider.interface';
import { getEncryptionKey } from '../../config/encryption.config';
import {
  encrypt,
  decrypt,
  deriveKey,
} from '../../common/utils/encryption.util';
import { LimitsService } from '../limits/limits.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AdminActivityService } from '../admin/admin-activity.service';
import { Tenant } from '../tenants/entities/tenant.entity';

@Injectable()
export class DnsManagementService {
  private readonly logger = new Logger(DnsManagementService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(DnsPlatformConnection)
    private readonly connectionRepository: Repository<DnsPlatformConnection>,
    @InjectRepository(DnsZoneAssignment)
    private readonly assignmentRepository: Repository<DnsZoneAssignment>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @Inject(DNS_PROVIDER)
    private readonly dnsProvider: DnsProvider,
    private readonly limitsService: LimitsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly adminActivityService: AdminActivityService,
  ) {
    const key = getEncryptionKey('DNS_MANAGEMENT_ENCRYPTION_KEY');
    this.encryptionKey = deriveKey(key, 'dns-management-gcm-salt');
  }

  async getPlatformConnectionStatus(): Promise<PlatformConnectionResponseDto | null> {
    const connection = await this.getActivePlatformConnection();
    if (!connection) {
      return null;
    }
    return this.toConnectionDto(connection);
  }

  async setPlatformConnection(params: {
    label: string;
    apiToken: string;
    adminId: string;
    ipAddress?: string;
  }): Promise<PlatformConnectionResponseDto> {
    const verify = await this.dnsProvider.verifyToken(params.apiToken);
    if (verify.status !== 'active') {
      throw new BadRequestException('Cloudflare token verification failed');
    }

    const ciphertext = encrypt(params.apiToken, this.encryptionKey);
    const fingerprint = this.tokenFingerprint(ciphertext);

    let connection = await this.connectionRepository.findOne({
      where: { purpose: 'primary', status: DnsPlatformConnectionStatus.ACTIVE },
    });

    if (!connection) {
      connection = this.connectionRepository.create({
        label: params.label,
        purpose: 'primary',
        provider: 'cloudflare',
        tokenCiphertext: ciphertext,
        tokenFingerprint: fingerprint,
        status: DnsPlatformConnectionStatus.ACTIVE,
        verifiedAt: new Date(),
        createdByAdminId: params.adminId,
        metadata: {
          accountId: verify.accountId,
          scopes: verify.scopes,
        },
      });
    } else {
      connection.label = params.label;
      connection.tokenCiphertext = ciphertext;
      connection.tokenFingerprint = fingerprint;
      connection.status = DnsPlatformConnectionStatus.ACTIVE;
      connection.verifiedAt = new Date();
      connection.lastRotatedAt = new Date();
      connection.metadata = {
        ...connection.metadata,
        accountId: verify.accountId,
        scopes: verify.scopes,
      };
    }

    const saved = await this.connectionRepository.save(connection);

    await this.adminActivityService.log({
      adminId: params.adminId,
      action: 'dns_platform_connection_set',
      metadata: {
        connectionId: saved.id,
        tokenFingerprint: fingerprint,
      },
      ipAddress: params.ipAddress,
    });

    return this.toConnectionDto(saved);
  }

  async verifyPlatformConnection(
    adminId: string,
  ): Promise<PlatformConnectionResponseDto> {
    const connection = await this.requireActiveConnection();
    const token = this.decryptToken(connection.tokenCiphertext);
    const verify = await this.dnsProvider.verifyToken(token);

    if (verify.status !== 'active') {
      connection.status = DnsPlatformConnectionStatus.INVALID;
      await this.connectionRepository.save(connection);
      throw new BadRequestException('Cloudflare token is no longer valid');
    }

    connection.status = DnsPlatformConnectionStatus.ACTIVE;
    connection.verifiedAt = new Date();
    connection.metadata = {
      ...connection.metadata,
      accountId: verify.accountId,
      scopes: verify.scopes,
    };
    const saved = await this.connectionRepository.save(connection);

    await this.adminActivityService.log({
      adminId,
      action: 'dns_platform_connection_verified',
      metadata: { connectionId: saved.id },
    });

    return this.toConnectionDto(saved);
  }

  async rotatePlatformConnection(params: {
    apiToken: string;
    adminId: string;
    ipAddress?: string;
  }): Promise<PlatformConnectionResponseDto> {
    return this.setPlatformConnection({
      label: (await this.requireActiveConnection()).label,
      apiToken: params.apiToken,
      adminId: params.adminId,
      ipAddress: params.ipAddress,
    });
  }

  async revokePlatformConnection(params: {
    confirm: boolean;
    adminId: string;
  }): Promise<void> {
    if (!params.confirm) {
      throw new BadRequestException(
        'confirm must be true to revoke connection',
      );
    }

    const connection = await this.getActivePlatformConnection();
    if (!connection) {
      return;
    }

    connection.status = DnsPlatformConnectionStatus.REVOKED;
    connection.tokenCiphertext = '';
    await this.connectionRepository.save(connection);

    await this.adminActivityService.log({
      adminId: params.adminId,
      action: 'dns_platform_connection_revoked',
      metadata: { connectionId: connection.id },
    });
  }

  async syncPlatformZones(adminId: string): Promise<AdminZoneListItemDto[]> {
    const connection = await this.requireActiveConnection();
    const token = this.decryptToken(connection.tokenCiphertext);
    const zones = await this.dnsProvider.listAccountZones(token);

    connection.metadata = {
      ...connection.metadata,
      zoneInventory: zones.map((zone) => ({
        providerZoneId: zone.providerZoneId,
        zoneName: zone.name,
        status: zone.status,
        nameServers: zone.nameServers,
        syncedAt: new Date().toISOString(),
      })),
      inventorySyncedAt: new Date().toISOString(),
    };
    await this.connectionRepository.save(connection);

    await this.adminActivityService.log({
      adminId,
      action: 'dns_platform_zones_synced',
      metadata: { count: zones.length },
    });

    return this.listAdminZones();
  }

  async listAdminZones(): Promise<AdminZoneListItemDto[]> {
    const connection = await this.getActivePlatformConnection();
    const inventory = connection?.metadata?.zoneInventory ?? [];

    const assignments = await this.assignmentRepository.find({
      where: {
        unassignedAt: IsNull(),
        provisioningModel: DnsProvisioningModel.PLATFORM_HOSTED,
      },
      relations: ['tenant'],
    });

    const assignmentByProvider = new Map(
      assignments.map((a) => [a.providerZoneId, a]),
    );

    return inventory.map((zone) => {
      const assignment = assignmentByProvider.get(zone.providerZoneId);
      return {
        providerZoneId: zone.providerZoneId,
        zoneName: zone.zoneName,
        status: zone.status,
        nameServers: zone.nameServers,
        assignmentId: assignment?.id,
        tenantId: assignment?.tenantId,
        tenantName: assignment?.tenant?.name,
      };
    });
  }

  async assignZone(params: {
    providerZoneId: string;
    dto: AssignZoneDto;
    adminId: string;
    ipAddress?: string;
  }): Promise<TenantZoneResponseDto> {
    const connection = await this.requireActiveConnection();
    await this.limitsService.canAssignDnsZone(params.dto.tenantId);

    const tenant = await this.tenantRepository.findOne({
      where: { id: params.dto.tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const inventoryZone = connection.metadata?.zoneInventory?.find(
      (z) => z.providerZoneId === params.providerZoneId,
    );
    if (!inventoryZone) {
      throw new NotFoundException('Zone not found in platform inventory');
    }

    const existing = await this.assignmentRepository.findOne({
      where: {
        providerZoneId: params.providerZoneId,
        provisioningModel: DnsProvisioningModel.PLATFORM_HOSTED,
        unassignedAt: IsNull(),
      },
    });
    if (existing) {
      throw new BadRequestException('Zone is already assigned');
    }

    const assignment = this.assignmentRepository.create({
      tenantId: params.dto.tenantId,
      connectionId: connection.id,
      provisioningModel: DnsProvisioningModel.PLATFORM_HOSTED,
      providerZoneId: params.providerZoneId,
      zoneName: inventoryZone.zoneName,
      status: inventoryZone.status,
      nameServers: inventoryZone.nameServers,
      canEditRecords: params.dto.canEditRecords ?? true,
      canToggleProxy: params.dto.canToggleProxy ?? true,
      canDeleteRecords: params.dto.canDeleteRecords ?? true,
      assignedByAdminId: params.adminId,
      assignedAt: new Date(),
    });

    const saved = await this.assignmentRepository.save(assignment);
    await this.limitsService.invalidateDnsZoneCountCache(saved.tenantId);

    await this.auditLogsService.log({
      tenantId: saved.tenantId,
      userId: null,
      action: 'dns_zone_assigned',
      resourceType: 'dns_zone_assignment',
      resourceId: saved.id,
      resourceName: saved.zoneName,
      newValue: {
        providerZoneId: saved.providerZoneId,
        permissions: {
          canEditRecords: saved.canEditRecords,
          canToggleProxy: saved.canToggleProxy,
          canDeleteRecords: saved.canDeleteRecords,
        },
      },
      ipAddress: params.ipAddress ?? null,
      metadata: { adminActorId: params.adminId },
    });

    return this.toTenantZoneDto(saved);
  }

  async unassignZone(params: {
    assignmentId: string;
    adminId: string;
    ipAddress?: string;
  }): Promise<void> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: params.assignmentId, unassignedAt: IsNull() },
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    assignment.unassignedAt = new Date();
    await this.assignmentRepository.save(assignment);
    await this.limitsService.invalidateDnsZoneCountCache(assignment.tenantId);

    await this.auditLogsService.log({
      tenantId: assignment.tenantId,
      userId: null,
      action: 'dns_zone_unassigned',
      resourceType: 'dns_zone_assignment',
      resourceId: assignment.id,
      resourceName: assignment.zoneName,
      ipAddress: params.ipAddress ?? null,
      metadata: { adminActorId: params.adminId },
    });
  }

  async updateZonePermissions(
    assignmentId: string,
    dto: UpdateZonePermissionsDto,
    adminId: string,
  ): Promise<TenantZoneResponseDto> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId, unassignedAt: IsNull() },
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const oldValue = {
      canEditRecords: assignment.canEditRecords,
      canToggleProxy: assignment.canToggleProxy,
      canDeleteRecords: assignment.canDeleteRecords,
    };

    if (dto.canEditRecords !== undefined) {
      assignment.canEditRecords = dto.canEditRecords;
    }
    if (dto.canToggleProxy !== undefined) {
      assignment.canToggleProxy = dto.canToggleProxy;
    }
    if (dto.canDeleteRecords !== undefined) {
      assignment.canDeleteRecords = dto.canDeleteRecords;
    }

    const saved = await this.assignmentRepository.save(assignment);

    await this.auditLogsService.log({
      tenantId: saved.tenantId,
      userId: null,
      action: 'update',
      resourceType: 'dns_zone_assignment',
      resourceId: saved.id,
      resourceName: saved.zoneName,
      oldValue,
      newValue: {
        canEditRecords: saved.canEditRecords,
        canToggleProxy: saved.canToggleProxy,
        canDeleteRecords: saved.canDeleteRecords,
      },
      metadata: { adminActorId: adminId, permissionsUpdate: true },
    });

    return this.toTenantZoneDto(saved);
  }

  async createPlatformZone(params: {
    dto: CreatePlatformZoneDto;
    adminId: string;
    ipAddress?: string;
  }): Promise<AdminZoneListItemDto & { assignment?: TenantZoneResponseDto }> {
    const connection = await this.requireActiveConnection();
    const token = this.decryptToken(connection.tokenCiphertext);

    const created = await this.dnsProvider.createZone(token, {
      name: params.dto.name,
      accountId: connection.metadata?.accountId,
    });

    await this.mergeInventoryEntry(connection, created);

    let assignment: TenantZoneResponseDto | undefined;
    if (params.dto.tenantId) {
      assignment = await this.assignZone({
        providerZoneId: created.providerZoneId,
        dto: {
          tenantId: params.dto.tenantId,
          canEditRecords: params.dto.canEditRecords,
          canToggleProxy: params.dto.canToggleProxy,
          canDeleteRecords: params.dto.canDeleteRecords,
        },
        adminId: params.adminId,
        ipAddress: params.ipAddress,
      });
    }

    if (params.dto.tenantId) {
      await this.auditLogsService.log({
        tenantId: params.dto.tenantId,
        userId: null,
        action: 'dns_zone_created',
        resourceType: 'dns_zone_assignment',
        resourceId: assignment?.id ?? null,
        resourceName: created.name,
        newValue: {
          providerZoneId: created.providerZoneId,
          nameServers: created.nameServers,
        },
        ipAddress: params.ipAddress ?? null,
        metadata: { adminActorId: params.adminId },
      });
    } else {
      await this.adminActivityService.log({
        adminId: params.adminId,
        action: 'dns_platform_zone_created',
        metadata: {
          zoneName: created.name,
          providerZoneId: created.providerZoneId,
        },
        ipAddress: params.ipAddress,
      });
    }

    return {
      providerZoneId: created.providerZoneId,
      zoneName: created.name,
      status: created.status,
      nameServers: created.nameServers,
      assignmentId: assignment?.id,
      tenantId: params.dto.tenantId,
      assignment,
    };
  }

  async listTenantZones(tenantId: string): Promise<TenantZoneResponseDto[]> {
    const assignments = await this.assignmentRepository.find({
      where: {
        tenantId,
        unassignedAt: IsNull(),
        status: 'active',
      },
      order: { zoneName: 'ASC' },
    });
    return assignments.map((a) => this.toTenantZoneDto(a));
  }

  async listTenantRecords(
    tenantId: string,
    zoneId: string,
  ): Promise<DnsRecordResponseDto[]> {
    const assignment = await this.resolveTenantAssignment(tenantId, zoneId);
    const connection = await this.requireActiveConnection();
    const token = this.decryptToken(connection.tokenCiphertext);

    try {
      const records = await this.dnsProvider.listRecords(
        token,
        assignment.providerZoneId,
      );
      return records;
    } catch (error) {
      if (connection.status === DnsPlatformConnectionStatus.INVALID) {
        throw new ServiceUnavailableException({
          code: 'platformConnectionDegraded',
          message: 'DNS platform connection is degraded',
        });
      }
      throw error;
    }
  }

  async resolveTenantAssignment(
    tenantId: string,
    zoneId: string,
  ): Promise<DnsZoneAssignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: {
        id: zoneId,
        tenantId,
        unassignedAt: IsNull(),
      },
    });

    if (!assignment) {
      throw new NotFoundException('Zone not found');
    }

    return assignment;
  }

  /** Attempt lookup by raw Cloudflare zone id — must still not leak cross-tenant. */
  async resolveByProviderZoneIdForTenant(
    tenantId: string,
    providerZoneId: string,
  ): Promise<DnsZoneAssignment | null> {
    return this.assignmentRepository.findOne({
      where: {
        tenantId,
        providerZoneId,
        unassignedAt: IsNull(),
      },
    });
  }

  private async mergeInventoryEntry(
    connection: DnsPlatformConnection,
    zone: DnsProviderZone,
  ): Promise<void> {
    const inventory = connection.metadata?.zoneInventory ?? [];
    const filtered = inventory.filter(
      (z) => z.providerZoneId !== zone.providerZoneId,
    );
    filtered.push({
      providerZoneId: zone.providerZoneId,
      zoneName: zone.name,
      status: zone.status,
      nameServers: zone.nameServers,
      syncedAt: new Date().toISOString(),
    });
    connection.metadata = {
      ...connection.metadata,
      zoneInventory: filtered,
      inventorySyncedAt: new Date().toISOString(),
    };
    await this.connectionRepository.save(connection);
  }

  private async getActivePlatformConnection(): Promise<DnsPlatformConnection | null> {
    return this.connectionRepository.findOne({
      where: {
        purpose: 'primary',
        status: DnsPlatformConnectionStatus.ACTIVE,
      },
    });
  }

  private async requireActiveConnection(): Promise<DnsPlatformConnection> {
    const connection = await this.getActivePlatformConnection();
    if (!connection) {
      throw new BadRequestException(
        'Platform Cloudflare connection is not configured',
      );
    }
    return connection;
  }

  private decryptToken(ciphertext: string): string {
    return decrypt(ciphertext, this.encryptionKey);
  }

  private tokenFingerprint(tokenCiphertext: string): string {
    return crypto
      .createHash('sha256')
      .update(tokenCiphertext)
      .digest('hex')
      .slice(0, 16);
  }

  private toConnectionDto(
    connection: DnsPlatformConnection,
  ): PlatformConnectionResponseDto {
    return {
      id: connection.id,
      label: connection.label,
      provider: connection.provider,
      purpose: connection.purpose,
      status: connection.status,
      verifiedAt: connection.verifiedAt,
      tokenFingerprint: connection.tokenFingerprint,
      accountId: connection.metadata?.accountId,
      inventorySyncedAt: connection.metadata?.inventorySyncedAt,
    };
  }

  private toTenantZoneDto(
    assignment: DnsZoneAssignment,
  ): TenantZoneResponseDto {
    return {
      id: assignment.id,
      zoneName: assignment.zoneName,
      status: assignment.status,
      nameServers: assignment.nameServers,
      canEditRecords: assignment.canEditRecords,
      canToggleProxy: assignment.canToggleProxy,
      canDeleteRecords: assignment.canDeleteRecords,
    };
  }
}
