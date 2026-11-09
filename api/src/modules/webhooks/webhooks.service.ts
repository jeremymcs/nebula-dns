// Nebula DNS - Webhook Service with Idempotency Support
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { Webhook, WebhookEvent } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookIdempotencyKey } from './entities/webhook-idempotency.entity';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookResponseDto,
  WebhookDeliveryResponseDto,
  TestWebhookResultDto,
  RotateSecretResponseDto,
  WebhookSecretStatusDto,
  WEBHOOK_EVENTS,
} from './dto/webhook.dto';
import { RedisService } from '../redis/redis.service';
import { MetricsService } from '../metrics/metrics.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

// Webhook event message for Redis pub/sub
export interface WebhookEventMessage {
  tenantId: string;
  event: WebhookEvent;
  data: Record<string, unknown>;
  timestamp: string;
}

// Rate limit check result
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

@Injectable()
export class WebhooksService implements OnModuleInit {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly maxRetries = 3;
  private readonly retryDelays = [1000, 5000, 30000]; // 1s, 5s, 30s
  private readonly WEBHOOK_EVENTS_CHANNEL = 'webhook_events';
  private readonly RATE_LIMIT_WINDOW_SECONDS = 60;

  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
    @InjectRepository(WebhookDelivery)
    private deliveryRepository: Repository<WebhookDelivery>,
    @InjectRepository(WebhookIdempotencyKey)
    private idempotencyRepository: Repository<WebhookIdempotencyKey>,
    private readonly redisService: RedisService,
    private readonly metricsService: MetricsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Generate a unique idempotency key for each webhook event.
   * This key is sent as X-Idempotency-Key header to allow consumers
   * to deduplicate webhook events.
   */
  private generateIdempotencyKey(): string {
    return uuidv4();
  }

  /**
   * Check if an idempotency key has already been delivered successfully.
   * Returns the cached response if available.
   */
  async checkIdempotencyKey(
    webhookId: string,
    idempotencyKey: string,
  ): Promise<{
    exists: boolean;
    cachedResponse?: { statusCode: number; body: string };
  }> {
    try {
      const existing = await this.idempotencyRepository.findOne({
        where: { key: idempotencyKey, webhookId },
      });

      if (existing && existing.acknowledged) {
        return {
          exists: true,
          cachedResponse: existing.responseStatus
            ? {
                statusCode: existing.responseStatus,
                body: existing.responseBody || '',
              }
            : undefined,
        };
      }

      return { exists: false };
    } catch (err) {
      this.logger.warn(
        `Idempotency check failed: ${(err as Error).message}. Proceeding with delivery.`,
      );
      return { exists: false };
    }
  }

  /**
   * Store a delivered idempotency key with optional response caching.
   */
  async storeIdempotencyKey(
    idempotencyKey: string,
    webhookId: string,
    eventType: string,
    acknowledged: boolean,
    response?: { statusCode: number; body: string },
  ): Promise<void> {
    try {
      const idempotencyRecord = this.idempotencyRepository.create({
        key: idempotencyKey,
        webhookId,
        eventType,
        acknowledged,
        responseStatus: response?.statusCode,
        responseBody: response?.body?.substring(0, 1000), // Limit stored response
      });

      await this.idempotencyRepository.save(idempotencyRecord);
    } catch (err) {
      // Log but don't fail - idempotency storage is not critical
      this.logger.warn(
        `Failed to store idempotency key: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Cleanup old idempotency keys older than 7 days.
   * Runs daily at 3:00 AM.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldIdempotencyKeys(): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      const result = await this.idempotencyRepository.delete({
        deliveredAt: LessThan(sevenDaysAgo),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(
          `Cleaned up ${result.affected} old idempotency keys older than 7 days`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to cleanup old idempotency keys: ${(err as Error).message}`,
      );
    }
  }

  async onModuleInit(): Promise<void> {
    // Register webhook-specific metrics
    this.registerMetrics();

    // Subscribe to webhook events channel for async dispatch
    this.subscribeToWebhookEvents();
  }

  private registerMetrics(): void {
    // These metrics will be tracked via MetricsService
    this.logger.log('Webhook metrics registered');
  }

  private async subscribeToWebhookEvents(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const subscriber = client.duplicate();

      await subscriber.subscribe(this.WEBHOOK_EVENTS_CHANNEL);

      subscriber.on('message', async (channel, message) => {
        if (channel === this.WEBHOOK_EVENTS_CHANNEL) {
          try {
            const eventMessage: WebhookEventMessage = JSON.parse(message);
            await this.processWebhookEvent(eventMessage);
          } catch (err) {
            this.logger.error(
              `Failed to process webhook event: ${(err as Error).message}`,
            );
          }
        }
      });

      this.logger.log(
        `Subscribed to ${this.WEBHOOK_EVENTS_CHANNEL} channel for async webhook dispatch`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to subscribe to webhook events channel: ${(err as Error).message}. Webhooks will still work synchronously.`,
      );
    }
  }

  private async processWebhookEvent(
    eventMessage: WebhookEventMessage,
  ): Promise<void> {
    const { tenantId, event, data } = eventMessage;

    const webhooks = await this.webhookRepository.find({
      where: { tenantId, isEnabled: true },
    });

    const relevantWebhooks = webhooks.filter((w) => w.events.includes(event));

    const payload = {
      event,
      timestamp: eventMessage.timestamp,
      data,
    };

    await Promise.all(
      relevantWebhooks.map((webhook) =>
        this.deliver(webhook, event, payload, false),
      ),
    );
  }

  // Generate HMAC signature for payload
  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  // Convert IP to number for CIDR comparison
  private ipToNumber(ip: string): number {
    const parts = ip.split('.');
    if (parts.length !== 4) {
      throw new Error('Invalid IPv4 address');
    }

    return (
      parts.reduce((acc, part, i) => {
        const num = parseInt(part, 10);
        if (isNaN(num) || num < 0 || num > 255) {
          throw new Error('Invalid IPv4 address');
        }
        return acc + (num << (24 - i * 8));
      }, 0) >>> 0
    );
  }

  // Check if IP is in CIDR range
  private isIpInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = parseInt(bits, 10);

    if (isNaN(mask) || mask < 0 || mask > 32) return false;

    try {
      const ipNum = this.ipToNumber(ip);
      const rangeNum = this.ipToNumber(range);
      const maskNum = (-1 << (32 - mask)) >>> 0;

      return (ipNum & maskNum) === (rangeNum & maskNum);
    } catch {
      return false;
    }
  }

  // Validate if IP is allowed by webhook's IP allowlist
  validateIpAllowlist(clientIp: string, allowlist: string[]): boolean {
    // Empty allowlist means all IPs are allowed
    if (!allowlist || allowlist.length === 0) {
      return true;
    }

    // Normalize IPv6-mapped IPv4 addresses
    const normalizedIp = clientIp.replace(/^::ffff:/, '');

    for (const entry of allowlist) {
      // Check if it's a CIDR range
      if (entry.includes('/')) {
        if (this.isIpInCidr(normalizedIp, entry)) {
          return true;
        }
      } else {
        // Exact IP match
        if (entry === normalizedIp || entry === clientIp) {
          return true;
        }
      }
    }

    return false;
  }

  // Check rate limit for webhook
  async checkRateLimit(
    webhookId: string,
    tenantId: string,
    limit: number,
  ): Promise<RateLimitResult> {
    // If limit is 0, rate limiting is disabled
    if (limit === 0) {
      return { allowed: true, remaining: -1, resetInSeconds: 0 };
    }

    const key = `webhook_ratelimit:${tenantId}:${webhookId}`;

    try {
      const currentStr = await this.redisService.get(key);
      const current = currentStr ? parseInt(currentStr, 10) : 0;

      if (current >= limit) {
        // Get TTL for reset time
        const client = this.redisService.getClient();
        const ttl = await client.ttl(key);
        return {
          allowed: false,
          remaining: 0,
          resetInSeconds: ttl > 0 ? ttl : this.RATE_LIMIT_WINDOW_SECONDS,
        };
      }

      // Increment counter
      const client = this.redisService.getClient();
      const newCount = await client.incr(key);

      // Set expiration only on first request
      if (newCount === 1) {
        await client.expire(key, this.RATE_LIMIT_WINDOW_SECONDS);
      }

      return {
        allowed: true,
        remaining: limit - newCount,
        resetInSeconds: this.RATE_LIMIT_WINDOW_SECONDS,
      };
    } catch (err) {
      // On Redis error, allow the request (fail-open for rate limiting)
      this.logger.warn(
        `Rate limit check failed for webhook ${webhookId}: ${(err as Error).message}. Allowing request.`,
      );
      return { allowed: true, remaining: -1, resetInSeconds: 0 };
    }
  }

  // Publish webhook event to Redis for async processing
  async publishWebhookEvent(
    tenantId: string,
    event: WebhookEvent,
    data: Record<string, unknown>,
  ): Promise<void> {
    const message: WebhookEventMessage = {
      tenantId,
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.redisService.publish(
        this.WEBHOOK_EVENTS_CHANNEL,
        JSON.stringify(message),
      );
      this.logger.debug(
        `Published ${event} event to ${this.WEBHOOK_EVENTS_CHANNEL}`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to publish webhook event: ${(err as Error).message}. Falling back to sync delivery.`,
      );
      // Fallback to synchronous trigger
      await this.trigger(tenantId, event, data);
    }
  }

  async create(tenantId: string, dto: CreateWebhookDto): Promise<Webhook> {
    // Validate events
    const invalidEvents = dto.events.filter(
      (e) => !WEBHOOK_EVENTS.includes(e as (typeof WEBHOOK_EVENTS)[number]),
    );
    if (invalidEvents.length > 0) {
      throw new BadRequestException(
        `Invalid events: ${invalidEvents.join(', ')}`,
      );
    }

    // Validate IP allowlist format if provided
    if (dto.ipAllowlist && dto.ipAllowlist.length > 0) {
      for (const entry of dto.ipAllowlist) {
        if (!this.isValidIpOrCidr(entry)) {
          throw new BadRequestException(`Invalid IP or CIDR: ${entry}`);
        }
      }
    }

    const webhook = this.webhookRepository.create({
      tenantId,
      name: dto.name,
      url: dto.url,
      // Store secret directly for HMAC signing (in production, encrypt at rest)
      secretHash: dto.secret || null,
      events: dto.events as WebhookEvent[],
      headers: dto.headers || {},
      ipAllowlist: dto.ipAllowlist || [],
      rateLimit: dto.rateLimit ?? 60,
    } as Partial<Webhook>);

    return this.webhookRepository.save(webhook);
  }

  private isValidIpOrCidr(entry: string): boolean {
    // Check if it's a valid CIDR
    if (entry.includes('/')) {
      const [ip, bits] = entry.split('/');
      const mask = parseInt(bits, 10);
      if (isNaN(mask) || mask < 0 || mask > 32) return false;
      return this.isValidIpv4(ip);
    }

    // Check if it's a valid IPv4
    return this.isValidIpv4(entry);
  }

  private isValidIpv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;

    return parts.every((part) => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255 && part === String(num);
    });
  }

  async findAll(tenantId: string): Promise<WebhookResponseDto[]> {
    const webhooks = await this.webhookRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    return webhooks.map((w) => this.toResponseDto(w));
  }

  async findOne(tenantId: string, id: string): Promise<Webhook> {
    const webhook = await this.webhookRepository.findOne({
      where: { id, tenantId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return webhook;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateWebhookDto,
  ): Promise<Webhook> {
    const webhook = await this.findOne(tenantId, id);

    if (dto.events) {
      const invalidEvents = dto.events.filter(
        (e) => !WEBHOOK_EVENTS.includes(e as (typeof WEBHOOK_EVENTS)[number]),
      );
      if (invalidEvents.length > 0) {
        throw new BadRequestException(
          `Invalid events: ${invalidEvents.join(', ')}`,
        );
      }
    }

    // Validate IP allowlist format if provided
    if (dto.ipAllowlist && dto.ipAllowlist.length > 0) {
      for (const entry of dto.ipAllowlist) {
        if (!this.isValidIpOrCidr(entry)) {
          throw new BadRequestException(`Invalid IP or CIDR: ${entry}`);
        }
      }
    }

    if (dto.name) webhook.name = dto.name;
    if (dto.url) webhook.url = dto.url;
    if (dto.secret) webhook.secretHash = dto.secret;
    if (dto.events) webhook.events = dto.events as WebhookEvent[];
    if (dto.isEnabled !== undefined) webhook.isEnabled = dto.isEnabled;
    if (dto.headers) webhook.headers = dto.headers;
    if (dto.ipAllowlist !== undefined) webhook.ipAllowlist = dto.ipAllowlist;
    if (dto.rateLimit !== undefined) webhook.rateLimit = dto.rateLimit;

    return this.webhookRepository.save(webhook);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const webhook = await this.findOne(tenantId, id);
    await this.webhookRepository.remove(webhook);
  }

  async enable(tenantId: string, id: string): Promise<Webhook> {
    const webhook = await this.findOne(tenantId, id);
    webhook.isEnabled = true;
    webhook.failureCount = 0;
    webhook.lastError = null;
    return this.webhookRepository.save(webhook);
  }

  async disable(tenantId: string, id: string): Promise<Webhook> {
    const webhook = await this.findOne(tenantId, id);
    webhook.isEnabled = false;
    return this.webhookRepository.save(webhook);
  }

  // ============================================
  // Secret Rotation Methods
  // ============================================

  /**
   * Generate a new cryptographically secure webhook secret.
   * Format: whsec_<32 random hex characters>
   */
  private generateWebhookSecret(): string {
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `whsec_${randomBytes}`;
  }

  /**
   * Check if a webhook is currently within its secret grace period.
   */
  isInGracePeriod(webhook: Webhook): boolean {
    if (!webhook.secretGracePeriodEnds) {
      return false;
    }
    return new Date() < webhook.secretGracePeriodEnds;
  }

  /**
   * Get the secret status of a webhook.
   */
  async getSecretStatus(
    tenantId: string,
    id: string,
  ): Promise<WebhookSecretStatusDto> {
    const webhook = await this.findOne(tenantId, id);

    return {
      hasSecret: !!webhook.secretHash,
      lastRotatedAt: webhook.secretRotatedAt,
      inGracePeriod: this.isInGracePeriod(webhook),
      gracePeriodEndsAt: webhook.secretGracePeriodEnds,
    };
  }

  /**
   * Rotate the webhook secret with a configurable grace period.
   * During the grace period, both old and new secrets are valid for signature verification.
   *
   * @param tenantId - The tenant ID
   * @param id - The webhook ID
   * @param gracePeriodHours - Hours during which both secrets are valid (default: 24)
   * @param userId - User performing the rotation (for audit logging)
   * @param ipAddress - IP address of the requester (for audit logging)
   * @param userAgent - User agent of the requester (for audit logging)
   */
  async rotateSecret(
    tenantId: string,
    id: string,
    gracePeriodHours: number = 24,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RotateSecretResponseDto> {
    const webhook = await this.findOne(tenantId, id);

    // Generate new secret
    const newSecret = this.generateWebhookSecret();
    const now = new Date();
    const gracePeriodEnds = new Date(
      now.getTime() + gracePeriodHours * 60 * 60 * 1000,
    );

    // Store current secret as previous (if exists)
    const hadPreviousSecret = !!webhook.secretHash;
    if (hadPreviousSecret) {
      webhook.previousSecret = webhook.secretHash;
    }

    // Set new secret and rotation timestamps
    webhook.secretHash = newSecret;
    webhook.secretRotatedAt = now;
    webhook.secretGracePeriodEnds = gracePeriodEnds;

    await this.webhookRepository.save(webhook);

    // Log audit event
    try {
      await this.auditLogsService.log({
        tenantId,
        userId: userId || null,
        action: 'token_rotate',
        resourceType: 'webhook',
        resourceId: webhook.id,
        resourceName: webhook.name,
        oldValue: hadPreviousSecret ? { hasSecret: true } : null,
        newValue: {
          rotatedAt: now.toISOString(),
          gracePeriodEnds: gracePeriodEnds.toISOString(),
          gracePeriodHours,
        },
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: {
          action: 'secret_rotation',
          webhookUrl: webhook.url,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to log audit event for secret rotation: ${(err as Error).message}`,
      );
    }

    this.logger.log(
      `Rotated secret for webhook ${webhook.name} (${webhook.id}). Grace period ends: ${gracePeriodEnds.toISOString()}`,
    );

    return {
      secret: newSecret,
      gracePeriodEndsAt: gracePeriodEnds,
      rotatedAt: now,
      hasPreviousSecret: hadPreviousSecret,
    };
  }

  /**
   * Expire the previous secret for a webhook (clear grace period).
   * Called automatically or manually to end the grace period early.
   */
  async expirePreviousSecret(tenantId: string, id: string): Promise<void> {
    const webhook = await this.findOne(tenantId, id);

    if (!webhook.previousSecret) {
      return; // No previous secret to expire
    }

    webhook.previousSecret = null;
    webhook.secretGracePeriodEnds = null;

    await this.webhookRepository.save(webhook);

    this.logger.log(
      `Expired previous secret for webhook ${webhook.name} (${webhook.id})`,
    );
  }

  /**
   * Cleanup expired grace periods - runs hourly.
   * Clears previousSecret for webhooks whose grace period has ended.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredGracePeriods(): Promise<void> {
    try {
      const now = new Date();
      const expiredWebhooks = await this.webhookRepository
        .createQueryBuilder('webhook')
        .where('webhook.previousSecret IS NOT NULL')
        .andWhere('webhook.secretGracePeriodEnds <= :now', { now })
        .getMany();

      if (expiredWebhooks.length === 0) {
        return;
      }

      for (const webhook of expiredWebhooks) {
        webhook.previousSecret = null;
        webhook.secretGracePeriodEnds = null;
      }

      await this.webhookRepository.save(expiredWebhooks);

      this.logger.log(
        `Cleaned up ${expiredWebhooks.length} webhook(s) with expired grace periods`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to cleanup expired grace periods: ${(err as Error).message}`,
      );
    }
  }

  // Get delivery history
  async getDeliveries(
    tenantId: string,
    id: string,
    limit = 50,
  ): Promise<WebhookDeliveryResponseDto[]> {
    const webhook = await this.findOne(tenantId, id);

    const deliveries = await this.deliveryRepository.find({
      where: { webhookId: webhook.id },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return deliveries.map((d) => ({
      id: d.id,
      eventType: d.eventType,
      payload: d.payload,
      statusCode: d.statusCode,
      responseTimeMs: d.responseTimeMs,
      error: d.error,
      retryCount: d.retryCount,
      idempotencyKey: d.idempotencyKey,
      createdAt: d.createdAt,
    }));
  }

  // Test webhook
  async test(
    tenantId: string,
    id: string,
    eventType?: string,
  ): Promise<TestWebhookResultDto> {
    const webhook = await this.findOne(tenantId, id);
    const event = eventType || webhook.events[0] || 'policy.updated';

    const testPayload = {
      event,
      timestamp: new Date().toISOString(),
      test: true,
      data: {
        id: 'test-123',
        message: 'This is a test webhook delivery',
      },
    };

    return this.deliver(webhook, event, testPayload, true);
  }

  // Trigger webhooks for an event (synchronous)
  async trigger(
    tenantId: string,
    event: WebhookEvent,
    data: Record<string, unknown>,
  ): Promise<void> {
    const webhooks = await this.webhookRepository.find({
      where: { tenantId, isEnabled: true },
    });

    const relevantWebhooks = webhooks.filter((w) => w.events.includes(event));

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    await Promise.all(
      relevantWebhooks.map((webhook) =>
        this.deliver(webhook, event, payload, false),
      ),
    );
  }

  // Deliver webhook with idempotency support
  private async deliver(
    webhook: Webhook,
    eventType: string,
    payload: Record<string, unknown>,
    isTest: boolean,
    providedIdempotencyKey?: string,
  ): Promise<TestWebhookResultDto> {
    const startTime = Date.now();
    const payloadString = JSON.stringify(payload);

    // Generate or use provided idempotency key
    const idempotencyKey =
      providedIdempotencyKey || this.generateIdempotencyKey();

    // Check for existing delivery with same idempotency key (skip for tests)
    if (!isTest) {
      const idempotencyCheck = await this.checkIdempotencyKey(
        webhook.id,
        idempotencyKey,
      );
      if (idempotencyCheck.exists) {
        this.logger.debug(
          `Skipping duplicate delivery for webhook ${webhook.name} with idempotency key ${idempotencyKey}`,
        );

        // Return cached response if available
        if (idempotencyCheck.cachedResponse) {
          return {
            success:
              idempotencyCheck.cachedResponse.statusCode >= 200 &&
              idempotencyCheck.cachedResponse.statusCode < 300,
            statusCode: idempotencyCheck.cachedResponse.statusCode,
            responseTimeMs: 0,
            error: null,
          };
        }

        return {
          success: true,
          statusCode: 200,
          responseTimeMs: 0,
          error: null,
        };
      }
    }

    // Check rate limit (skip for tests)
    if (!isTest) {
      const rateLimitResult = await this.checkRateLimit(
        webhook.id,
        webhook.tenantId,
        webhook.rateLimit,
      );

      if (!rateLimitResult.allowed) {
        this.logger.warn(
          `Rate limit exceeded for webhook ${webhook.name} (${webhook.id})`,
        );

        // Record rate limit as a delivery failure
        this.recordMetrics(
          webhook.tenantId,
          'rate_limited',
          Date.now() - startTime,
        );

        return {
          success: false,
          statusCode: 429,
          responseTimeMs: Date.now() - startTime,
          error: `Rate limit exceeded. Retry after ${rateLimitResult.resetInSeconds} seconds.`,
        };
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'FluxShield-Webhook/1.0',
      'X-Webhook-Event': eventType,
      'X-Webhook-Timestamp': new Date().toISOString(),
      'X-Idempotency-Key': idempotencyKey,
      ...webhook.headers,
    };

    // Add HMAC-SHA256 signature if secret is configured
    if (webhook.secretHash) {
      headers['X-Webhook-Signature'] =
        `sha256=${this.generateSignature(payloadString, webhook.secretHash)}`;

      // During grace period, also include signature with previous secret
      // This allows consumers to gradually migrate to the new secret
      if (this.isInGracePeriod(webhook) && webhook.previousSecret) {
        headers['X-Webhook-Signature-Previous'] =
          `sha256=${this.generateSignature(payloadString, webhook.previousSecret)}`;
      }
    }

    let statusCode: number = 0;
    let responseBody: string = '';
    let error: string | null = null;
    let retryCount = 0;

    // Retry loop with exponential backoff
    while (retryCount <= this.maxRetries) {
      try {
        const result = await this.httpPost(webhook.url, payloadString, headers);
        statusCode = result.statusCode;
        responseBody = result.body;

        // Success - break out of retry loop
        if (statusCode >= 200 && statusCode < 300) {
          this.logger.log(
            `Delivered ${eventType} to ${webhook.name} (${webhook.url}) with idempotency key ${idempotencyKey}`,
          );
          break;
        }

        // Server error (5xx) - retry
        if (statusCode >= 500 && retryCount < this.maxRetries) {
          this.logger.warn(
            `Webhook ${webhook.name} returned ${statusCode}, retrying...`,
          );
          await this.delay(this.retryDelays[retryCount] || 30000);
          retryCount++;
          continue;
        }

        // Client error (4xx) - don't retry
        error = `HTTP ${statusCode}: ${responseBody?.substring(0, 200)}`;
        break;
      } catch (err: unknown) {
        error = (err as Error).message || 'Failed to deliver webhook';

        // Network error - retry
        if (retryCount < this.maxRetries) {
          this.logger.warn(
            `Webhook ${webhook.name} failed: ${error}, retrying...`,
          );
          await this.delay(this.retryDelays[retryCount] || 30000);
          retryCount++;
          continue;
        }
        break;
      }
    }

    const responseTimeMs = Date.now() - startTime;
    const success = statusCode >= 200 && statusCode < 300;

    // Record metrics
    this.recordMetrics(
      webhook.tenantId,
      success ? 'success' : 'failure',
      responseTimeMs,
    );

    // Record delivery and idempotency key (skip for tests)
    if (!isTest) {
      // Store idempotency key with response caching
      await this.storeIdempotencyKey(
        idempotencyKey,
        webhook.id,
        eventType,
        success,
        { statusCode, body: responseBody },
      );

      const delivery = this.deliveryRepository.create({
        webhookId: webhook.id,
        eventType,
        payload,
        statusCode,
        responseBody: responseBody?.substring(0, 1000), // Limit stored response
        responseTimeMs,
        error,
        retryCount,
        idempotencyKey,
      });
      await this.deliveryRepository.save(delivery);

      // Update webhook status
      webhook.lastTriggeredAt = new Date();
      webhook.lastStatusCode = statusCode;

      if (success) {
        webhook.failureCount = 0;
        webhook.lastError = null;
      } else {
        webhook.failureCount++;
        webhook.lastError = error;

        // Disable after 10 consecutive failures
        if (webhook.failureCount >= 10) {
          webhook.isEnabled = false;
          this.logger.warn(
            `Webhook ${webhook.name} disabled after 10 consecutive failures`,
          );
        }
      }
      await this.webhookRepository.save(webhook);
    }

    return {
      success,
      statusCode,
      responseTimeMs,
      error,
    };
  }

  private recordMetrics(
    tenantId: string,
    status: string,
    responseTimeMs: number,
  ): void {
    try {
      // Increment delivery counter with tenant and status labels
      this.metricsService.incrementCounter('webhook_deliveries_total', 1, {
        tenant_id: tenantId,
        status,
      });

      // Record latency (convert to seconds for Prometheus convention)
      // Note: MetricsService doesn't have histogram support, so we'll use a gauge
      // for average latency tracking
      this.metricsService.setGauge(
        'webhook_delivery_latency_seconds',
        responseTimeMs / 1000,
        { tenant_id: tenantId },
      );
    } catch (err) {
      this.logger.debug(`Failed to record metrics: ${(err as Error).message}`);
    }
  }

  // Get available events
  getAvailableEvents(): string[] {
    return [...WEBHOOK_EVENTS];
  }

  private toResponseDto(webhook: Webhook): WebhookResponseDto {
    return {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      isEnabled: webhook.isEnabled,
      headers: webhook.headers,
      ipAllowlist: webhook.ipAllowlist || [],
      rateLimit: webhook.rateLimit ?? 60,
      lastTriggeredAt: webhook.lastTriggeredAt,
      lastStatusCode: webhook.lastStatusCode,
      lastError: webhook.lastError,
      failureCount: webhook.failureCount,
      createdAt: webhook.createdAt,
    };
  }

  private async httpPost(
    url: string,
    body: string,
    headers: Record<string, string>,
  ): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 30000, // 30 second timeout
      };

      const req = httpModule.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            body: responseBody,
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(body);
      req.end();
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
