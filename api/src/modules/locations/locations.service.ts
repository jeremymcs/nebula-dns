import {
  Injectable,
  NotFoundException,
  Logger,
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

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(LocationToken)
    private readonly tokenRepository: Repository<LocationToken>,
    private readonly configService: ConfigService,
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
    const location = this.locationRepository.create({
      ...createDto,
      tenantId,
      status: 'active',
    });

    await this.locationRepository.save(location);
    this.logger.log(`Location ${location.id} created in tenant ${tenantId}`);

    return location;
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateLocationDto,
  ): Promise<Location> {
    const location = await this.findOne(tenantId, id);

    Object.assign(location, updateDto);
    await this.locationRepository.save(location);

    this.logger.log(`Location ${id} updated in tenant ${tenantId}`);
    return location;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const location = await this.findOne(tenantId, id);

    // Revoke all tokens first
    await this.tokenRepository.delete({ locationId: id });
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
}
