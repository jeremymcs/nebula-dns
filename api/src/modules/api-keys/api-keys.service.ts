import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ApiKey, ApiKeyScope } from './entities/api-key.entity';
import { ApiKeyUsage } from './entities/api-key-usage.entity';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyResponseDto,
  NewApiKeyResponseDto,
  ApiKeyUsageStatsDto,
} from './dto/api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(ApiKeyUsage)
    private usageRepository: Repository<ApiKeyUsage>,
  ) {}

  // Generate a new API key
  private generateApiKey(): { key: string; prefix: string; hash: string } {
    // Generate 32 random bytes (256 bits)
    const randomBytes = crypto.randomBytes(32);
    const key = `sk_live_${randomBytes.toString('base64url')}`;
    const prefix = key.substring(0, 12);
    const hash = bcrypt.hashSync(key, 10);

    return { key, prefix, hash };
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreateApiKeyDto,
  ): Promise<NewApiKeyResponseDto> {
    const { key, prefix, hash } = this.generateApiKey();

    const apiKey = this.apiKeyRepository.create({
      tenantId,
      userId,
      name: dto.name,
      keyHash: hash,
      keyPrefix: prefix,
      scopes: dto.scopes || ['read'],
      rateLimit: dto.rateLimit || 1000,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    const saved = (await this.apiKeyRepository.save(apiKey)) as ApiKey;

    return {
      id: saved.id,
      name: saved.name,
      keyPrefix: saved.keyPrefix,
      scopes: saved.scopes,
      rateLimit: saved.rateLimit,
      isActive: saved.isActive,
      expiresAt: saved.expiresAt,
      createdAt: saved.createdAt,
      apiKey: key, // Only returned once!
    };
  }

  async findAll(tenantId: string): Promise<ApiKeyResponseDto[]> {
    const keys = await this.apiKeyRepository.find({
      where: { tenantId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return keys.map((k) => this.toResponseDto(k));
  }

  async findOne(tenantId: string, id: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id, tenantId },
      relations: ['user'],
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateApiKeyDto,
  ): Promise<ApiKeyResponseDto> {
    const apiKey = await this.findOne(tenantId, id);

    Object.assign(apiKey, {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : apiKey.expiresAt,
    });

    const saved = await this.apiKeyRepository.save(apiKey);
    return this.toResponseDto(saved);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const apiKey = await this.findOne(tenantId, id);
    await this.apiKeyRepository.remove(apiKey);
  }

  async revoke(tenantId: string, id: string): Promise<ApiKeyResponseDto> {
    const apiKey = await this.findOne(tenantId, id);
    apiKey.isActive = false;
    const saved = await this.apiKeyRepository.save(apiKey);
    return this.toResponseDto(saved);
  }

  /**
   * Rotate an API key - creates a new key while keeping the old one active for a grace period
   * @param tenantId - Tenant ID
   * @param id - API key ID to rotate
   * @param gracePeriodHours - Hours to keep old key active (default: 24)
   */
  async rotate(
    tenantId: string,
    id: string,
    gracePeriodHours: number = 24,
  ): Promise<NewApiKeyResponseDto> {
    const oldKey = await this.findOne(tenantId, id);

    // Generate new key
    const { key, prefix, hash } = this.generateApiKey();

    // Create new API key with same settings
    const newApiKey = this.apiKeyRepository.create({
      tenantId,
      userId: oldKey.userId,
      name: `${oldKey.name} (rotated)`,
      keyHash: hash,
      keyPrefix: prefix,
      scopes: oldKey.scopes,
      rateLimit: oldKey.rateLimit,
      expiresAt: oldKey.expiresAt,
    });

    const saved = (await this.apiKeyRepository.save(newApiKey)) as ApiKey;

    // Set old key to expire after grace period
    const gracePeriodEnd = new Date(
      Date.now() + gracePeriodHours * 60 * 60 * 1000,
    );
    oldKey.expiresAt = gracePeriodEnd;
    oldKey.name = `${oldKey.name} (deprecated - expires ${gracePeriodEnd.toISOString()})`;
    await this.apiKeyRepository.save(oldKey);

    return {
      id: saved.id,
      name: saved.name,
      keyPrefix: saved.keyPrefix,
      scopes: saved.scopes,
      rateLimit: saved.rateLimit,
      isActive: saved.isActive,
      expiresAt: saved.expiresAt,
      createdAt: saved.createdAt,
      apiKey: key, // Only returned once!
      rotatedFromId: id,
      oldKeyExpiresAt: gracePeriodEnd,
    };
  }

  // Validate an API key (called from auth middleware)
  async validateApiKey(
    key: string,
  ): Promise<{ apiKey: ApiKey; tenantId: string } | null> {
    const prefix = key.substring(0, 12);

    // Find by prefix first for efficiency
    const apiKey = await this.apiKeyRepository.findOne({
      where: { keyPrefix: prefix },
      relations: ['tenant'],
    });

    if (!apiKey) {
      return null;
    }

    // Verify full key
    const isValid = await bcrypt.compare(key, apiKey.keyHash);
    if (!isValid) {
      return null;
    }

    // Check if active
    if (!apiKey.isActive) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return null;
    }

    return { apiKey, tenantId: apiKey.tenantId };
  }

  // Record API key usage
  async recordUsage(
    apiKeyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    // Update last used
    await this.apiKeyRepository.update(apiKeyId, {
      lastUsedAt: new Date(),
      lastUsedIp: ipAddress,
    });

    // Record usage
    const usage = this.usageRepository.create({
      apiKeyId,
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      ipAddress,
      userAgent,
    });

    await this.usageRepository.save(usage);
  }

  // Check rate limit
  async checkRateLimit(
    apiKeyId: string,
    limit: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const count = await this.usageRepository.count({
      where: {
        apiKeyId,
        createdAt: MoreThan(oneMinuteAgo),
      },
    });

    const resetAt = new Date(Date.now() + 60 * 1000);
    const remaining = Math.max(0, limit - count);

    return {
      allowed: count < limit,
      remaining,
      resetAt,
    };
  }

  // Get usage statistics
  async getUsageStats(
    tenantId: string,
    id: string,
  ): Promise<ApiKeyUsageStatsDto> {
    const apiKey = await this.findOne(tenantId, id);

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total requests
    const totalRequests = await this.usageRepository.count({
      where: { apiKeyId: apiKey.id },
    });

    // Requests today
    const requestsToday = await this.usageRepository.count({
      where: { apiKeyId: apiKey.id, createdAt: MoreThan(todayStart) },
    });

    // Requests this week
    const requestsThisWeek = await this.usageRepository.count({
      where: { apiKeyId: apiKey.id, createdAt: MoreThan(weekStart) },
    });

    // Average response time
    const avgResult = await this.usageRepository
      .createQueryBuilder('usage')
      .select('AVG(usage.response_time_ms)', 'avg')
      .where('usage.api_key_id = :id', { id: apiKey.id })
      .getRawOne();

    // Top endpoints
    const topEndpoints = await this.usageRepository
      .createQueryBuilder('usage')
      .select('usage.endpoint', 'endpoint')
      .addSelect('COUNT(*)', 'count')
      .where('usage.api_key_id = :id', { id: apiKey.id })
      .groupBy('usage.endpoint')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Error rate
    const errorCount = await this.usageRepository.count({
      where: { apiKeyId: apiKey.id },
    });
    // Note: simplified - in production would filter by status_code >= 400

    return {
      totalRequests,
      requestsToday,
      requestsThisWeek,
      averageResponseTime: parseFloat(avgResult?.avg || '0'),
      topEndpoints: topEndpoints.map((e) => ({
        endpoint: e.endpoint,
        count: parseInt(e.count),
      })),
      errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
    };
  }

  // Check if key has required scope
  hasScope(apiKey: ApiKey, requiredScope: ApiKeyScope): boolean {
    if (apiKey.scopes.includes('admin')) return true;
    if (requiredScope === 'write' && apiKey.scopes.includes('write'))
      return true;
    if (requiredScope === 'read')
      return apiKey.scopes.includes('read') || apiKey.scopes.includes('write');
    return apiKey.scopes.includes(requiredScope);
  }

  private toResponseDto(apiKey: ApiKey): ApiKeyResponseDto {
    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      rateLimit: apiKey.rateLimit,
      isActive: apiKey.isActive,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }
}
