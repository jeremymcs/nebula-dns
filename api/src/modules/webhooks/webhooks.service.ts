import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { Webhook, WebhookEvent } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookResponseDto,
  WebhookDeliveryResponseDto,
  TestWebhookResultDto,
  WEBHOOK_EVENTS,
} from './dto/webhook.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly maxRetries = 3;
  private readonly retryDelays = [1000, 5000, 30000]; // 1s, 5s, 30s

  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
    @InjectRepository(WebhookDelivery)
    private deliveryRepository: Repository<WebhookDelivery>,
  ) {}

  // Generate HMAC signature for payload
  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  async create(tenantId: string, dto: CreateWebhookDto): Promise<Webhook> {
    // Validate events
    const invalidEvents = dto.events.filter(
      (e) => !WEBHOOK_EVENTS.includes(e as any),
    );
    if (invalidEvents.length > 0) {
      throw new BadRequestException(
        `Invalid events: ${invalidEvents.join(', ')}`,
      );
    }

    const webhook = this.webhookRepository.create({
      tenantId,
      name: dto.name,
      url: dto.url,
      // Store secret directly for HMAC signing (in production, encrypt at rest)
      secretHash: dto.secret || null,
      events: dto.events as WebhookEvent[],
      headers: dto.headers || {},
    } as Partial<Webhook>);

    return this.webhookRepository.save(webhook);
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
        (e) => !WEBHOOK_EVENTS.includes(e as any),
      );
      if (invalidEvents.length > 0) {
        throw new BadRequestException(
          `Invalid events: ${invalidEvents.join(', ')}`,
        );
      }
    }

    if (dto.name) webhook.name = dto.name;
    if (dto.url) webhook.url = dto.url;
    if (dto.secret) webhook.secretHash = dto.secret;
    if (dto.events) webhook.events = dto.events as WebhookEvent[];
    if (dto.isEnabled !== undefined) webhook.isEnabled = dto.isEnabled;
    if (dto.headers) webhook.headers = dto.headers;

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

  // Trigger webhooks for an event
  async trigger(
    tenantId: string,
    event: WebhookEvent,
    data: any,
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

  // Deliver webhook
  private async deliver(
    webhook: Webhook,
    eventType: string,
    payload: any,
    isTest: boolean,
  ): Promise<TestWebhookResultDto> {
    const startTime = Date.now();
    const payloadString = JSON.stringify(payload);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Nebula DNS-Webhook/1.0',
      'X-Webhook-Event': eventType,
      'X-Webhook-Timestamp': new Date().toISOString(),
      ...webhook.headers,
    };

    // Add HMAC-SHA256 signature if secret is configured
    if (webhook.secretHash) {
      headers['X-Webhook-Signature'] =
        `sha256=${this.generateSignature(payloadString, webhook.secretHash)}`;
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
            `Delivered ${eventType} to ${webhook.name} (${webhook.url})`,
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
      } catch (err: any) {
        error = err.message || 'Failed to deliver webhook';

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

    // Record delivery (skip for tests)
    if (!isTest) {
      const delivery = this.deliveryRepository.create({
        webhookId: webhook.id,
        eventType,
        payload,
        statusCode,
        responseBody: responseBody?.substring(0, 1000), // Limit stored response
        responseTimeMs,
        error,
        retryCount,
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
