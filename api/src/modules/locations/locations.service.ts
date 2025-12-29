import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Location } from './entities/location.entity';
import { LocationToken } from './entities/location-token.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateTokenDto } from './dto/create-token.dto';
import { PaginationQueryDto, PaginatedResponse } from '@/common/dto/pagination.dto';
import { RedisService } from '../redis/redis.service';
import { PolicyCompilerService } from '../policies/policy-compiler.service';

export interface TokenInfo {
  tenantId: string;
  locationId: string;
  label: string;
  expiresAt: string | null;
  createdAt: string;
}

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(LocationToken)
    private readonly tokenRepository: Repository<LocationToken>,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => PolicyCompilerService))
    private readonly policyCompilerService: PolicyCompilerService,
  ) {}

  async findAll(
    tenantId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<Location>> {
    const { limit = 20, cursor } = pagination;

    const queryBuilder = this.locationRepository
      .createQueryBuilder('location')
      .where('location.tenant_id = :tenantId', { tenantId })
      .orderBy('location.created_at', 'DESC')
      .take(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('location.created_at < :cursor', {
        cursor: new Date(Buffer.from(cursor, 'base64').toString()),
      });
    }

    const locations = await queryBuilder.getMany();
    const hasMore = locations.length > limit;

    if (hasMore) {
      locations.pop();
    }

    const nextCursor =
      hasMore && locations.length > 0
        ? Buffer.from(
            locations[locations.length - 1].createdAt.toISOString(),
          ).toString('base64')
        : null;

    return {
      data: locations,
      pagination: {
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  async findOne(tenantId: string, id: string): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { id, tenantId },
    });

    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }

    return location;
  }

  async create(tenantId: string, createDto: CreateLocationDto): Promise<Location> {
    // Validate that either ipRange or dyndns is provided
    if (!createDto.ipRange && !createDto.dyndns) {
      throw new BadRequestException('Either ipRange or dyndns must be provided');
    }

    // Check uniqueness of ipRange
    if (createDto.ipRange) {
      const existingByIp = await this.locationRepository.findOne({
        where: { ipRange: createDto.ipRange },
      });
      if (existingByIp) {
        throw new ConflictException(`IP range ${createDto.ipRange} is already in use by another location`);
      }
    }

    // Check uniqueness of dyndns
    if (createDto.dyndns) {
      const existingByDyndns = await this.locationRepository.findOne({
        where: { dyndns: createDto.dyndns },
      });
      if (existingByDyndns) {
        throw new ConflictException(`DynDNS hostname ${createDto.dyndns} is already in use by another location`);
      }
    }

    const location = this.locationRepository.create({
      ...createDto,
      tenantId,
      status: 'active',
    });

    await this.locationRepository.save(location);
    this.logger.log(`Location ${location.id} created in tenant ${tenantId}`);

    // Store IP range mapping in Redis for policy-svc lookups
    if (location.ipRange) {
      await this.redisService.storeIPRange(location.id, {
        tenant_id: tenantId,
        location_id: location.id,
        ip_range: location.ipRange,
        rate_limit: location.rateLimit || 1000,
      });
    }

    return location;
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateLocationDto,
  ): Promise<Location> {
    const location = await this.findOne(tenantId, id);

    // Check uniqueness of ipRange if being updated
    if (updateDto.ipRange && updateDto.ipRange !== location.ipRange) {
      const existingByIp = await this.locationRepository.findOne({
        where: { ipRange: updateDto.ipRange },
      });
      if (existingByIp && existingByIp.id !== id) {
        throw new ConflictException(`IP range ${updateDto.ipRange} is already in use by another location`);
      }
    }

    // Check uniqueness of dyndns if being updated
    if (updateDto.dyndns && updateDto.dyndns !== location.dyndns) {
      const existingByDyndns = await this.locationRepository.findOne({
        where: { dyndns: updateDto.dyndns },
      });
      if (existingByDyndns && existingByDyndns.id !== id) {
        throw new ConflictException(`DynDNS hostname ${updateDto.dyndns} is already in use by another location`);
      }
    }

    Object.assign(location, updateDto);
    await this.locationRepository.save(location);

    // Update IP range mapping in Redis
    if (location.ipRange) {
      await this.redisService.storeIPRange(location.id, {
        tenant_id: tenantId,
        location_id: location.id,
        ip_range: location.ipRange,
        rate_limit: location.rateLimit || 1000,
      });
    } else {
      // Remove IP range mapping if ipRange was cleared
      await this.redisService.deleteIPRange(location.id);
    }

    this.logger.log(`Location ${id} updated in tenant ${tenantId}`);
    return location;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const location = await this.findOne(tenantId, id);

    // Revoke all tokens first
    await this.tokenRepository.delete({ locationId: id });

    // Remove IP range mapping from Redis
    await this.redisService.deleteIPRange(id);

    await this.locationRepository.remove(location);

    this.logger.log(`Location ${id} deleted from tenant ${tenantId}`);
  }

  async getTokens(tenantId: string, locationId: string): Promise<LocationToken[]> {
    // Verify location belongs to tenant
    await this.findOne(tenantId, locationId);

    return this.tokenRepository.find({
      where: { locationId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createToken(
    tenantId: string,
    locationId: string,
    createTokenDto: CreateTokenDto,
  ): Promise<{ token: string; tokenId: string; expiresAt: Date | null }> {
    // Verify location belongs to tenant
    const location = await this.findOne(tenantId, locationId);

    // Generate a secure token
    const tokenValue = this.generateSecureToken(locationId);
    const tokenHash = this.hashToken(tokenValue);
    const tokenPrefix = tokenValue.substring(0, 8);

    const expiresAt = createTokenDto.expiresInDays
      ? new Date(Date.now() + createTokenDto.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const token = this.tokenRepository.create({
      locationId,
      tokenHash,
      tokenPrefix,
      label: createTokenDto.label,
      expiresAt,
      isActive: true,
    });

    await this.tokenRepository.save(token);

    // Store token info in Redis for policy-svc validation
    const tokenInfo: TokenInfo = {
      tenantId,
      locationId,
      label: createTokenDto.label || 'Default Token',
      expiresAt: expiresAt?.toISOString() || null,
      createdAt: new Date().toISOString(),
    };
    await this.redisService.storeToken(tokenHash, tokenInfo);

    // Compile policy for this location if it has one
    if (location.policyId) {
      await this.policyCompilerService.compile(tenantId, location.policyId, locationId);
    }

    this.logger.log(`Token created for location ${locationId} in tenant ${tenantId}`);

    // Return the raw token - this is the only time it's visible
    return {
      token: tokenValue,
      tokenId: token.id,
      expiresAt,
    };
  }

  async revokeToken(
    tenantId: string,
    locationId: string,
    tokenId: string,
  ): Promise<void> {
    // Verify location belongs to tenant
    await this.findOne(tenantId, locationId);

    const token = await this.tokenRepository.findOne({
      where: { id: tokenId, locationId },
    });

    if (!token) {
      throw new NotFoundException(`Token ${tokenId} not found`);
    }

    token.isActive = false;
    await this.tokenRepository.save(token);

    // Remove token from Redis and notify policy-svc
    await this.redisService.deleteToken(token.tokenHash);

    this.logger.log(`Token ${tokenId} revoked for location ${locationId}`);
  }

  async validateToken(
    tokenValue: string,
  ): Promise<{ valid: boolean; tenantId?: string; locationId?: string }> {
    const tokenHash = this.hashToken(tokenValue);

    const token = await this.tokenRepository.findOne({
      where: { tokenHash, isActive: true },
      relations: ['location'],
    });

    if (!token) {
      return { valid: false };
    }

    // Check expiration
    if (token.expiresAt && token.expiresAt < new Date()) {
      return { valid: false };
    }

    // Update last used timestamp
    token.lastUsedAt = new Date();
    await this.tokenRepository.save(token);

    return {
      valid: true,
      tenantId: token.location.tenantId,
      locationId: token.locationId,
    };
  }

  private generateSecureToken(locationId: string): string {
    const hmacSecret = this.configService.get<string>('HMAC_SECRET') || 'dev-secret';
    const timestamp = Date.now().toString(36);
    const randomPart = crypto.randomBytes(16).toString('base64url');
    const locationIdEncoded = Buffer.from(locationId).toString('base64url');

    const payload = `${locationIdEncoded}.${timestamp}.${randomPart}`;
    const signature = crypto
      .createHmac('sha256', hmacSecret)
      .update(payload)
      .digest('base64url')
      .substring(0, 16);

    return `${payload}.${signature}`;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Look up a location by client IP address
   * Searches all locations' IP ranges to find a matching location
   */
  async findByIP(
    clientIP: string,
  ): Promise<{ found: boolean; tenantId?: string; locationId?: string }> {
    // Get all IP range mappings from Redis
    const mappings = await this.redisService.getAllIPRanges();

    for (const mapping of mappings) {
      if (this.ipMatchesRange(clientIP, mapping.ip_range)) {
        return {
          found: true,
          tenantId: mapping.tenant_id,
          locationId: mapping.location_id,
        };
      }
    }

    // Fallback: check database for locations with ipRange field
    // This handles cases where Redis might not have all mappings
    const locations = await this.locationRepository
      .createQueryBuilder('location')
      .where('location.ip_range IS NOT NULL')
      .getMany();

    for (const location of locations) {
      if (location.ipRange && this.ipMatchesRange(clientIP, location.ipRange)) {
        return {
          found: true,
          tenantId: location.tenantId,
          locationId: location.id,
        };
      }
    }

    return { found: false };
  }

  /**
   * Check if an IP address matches a CIDR range or individual IP
   */
  private ipMatchesRange(ip: string, range: string): boolean {
    // Handle comma-separated ranges
    const ranges = range.split(',').map((r) => r.trim());

    for (const r of ranges) {
      if (this.ipMatchesSingleRange(ip, r)) {
        return true;
      }
    }

    return false;
  }

  private ipMatchesSingleRange(ip: string, range: string): boolean {
    try {
      const ipNum = this.ipToNumber(ip);
      const rangeIP = range.includes('/') ? range.split('/')[0] : range;
      const rangeNum = this.ipToNumber(rangeIP);

      if (ipNum === null || rangeNum === null) {
        return false;
      }

      // Handle exact IP match
      if (!range.includes('/')) {
        return ipNum === rangeNum;
      }

      // Handle CIDR notation
      const prefix = parseInt(range.split('/')[1], 10);
      const mask = ~((1 << (32 - prefix)) - 1) >>> 0;
      return (ipNum & mask) === (rangeNum & mask);
    } catch {
      return false;
    }
  }

  private ipToNumber(ip: string): number | null {
    // Handle IPv6 mapped addresses (::ffff:192.168.1.1)
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    const parts = ip.split('.');
    if (parts.length !== 4) {
      return null;
    }

    let num = 0;
    for (const part of parts) {
      const n = parseInt(part, 10);
      if (isNaN(n) || n < 0 || n > 255) {
        return null;
      }
      num = (num << 8) + n;
    }

    return num >>> 0;
  }
}
