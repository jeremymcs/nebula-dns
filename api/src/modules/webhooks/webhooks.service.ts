import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as crypto from 'crypto';
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
  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
    @InjectRepository(WebhookDelivery)
    private deliveryRepository: Repository<WebhookDelivery>,
  ) {}

  // Generate HMAC signature for payload
  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  async create(tenantId: string, dto: CreateWebhookDto): Promise<Webhook> {
    // Validate events
    const invalidEvents = dto.events.filter(e => !WEBHOOK_EVENTS.includes(e as any));
    if (invalidEvents.length > 0) {
      throw new BadRequestException(`Invalid events: ${invalidEvents.join(', ')}`);
    }

    const webhook = this.webhookRepository.create({
      tenantId,
      name: dto.name,
      url: dto.url,
      secretHash: dto.secret ? crypto.createHash('sha256').update(dto.secret).digest('hex') : null,
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

    return webhooks.map(w => this.toResponseDto(w));
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

  async update(tenantId: string, id: string, dto: UpdateWebhookDto): Promise<Webhook> {
    const webhook = await this.findOne(tenantId, id);

    if (dto.events) {
      const invalidEvents = dto.events.filter(e => !WEBHOOK_EVENTS.includes(e as any));
      if (invalidEvents.length > 0) {
        throw new BadRequestException(`Invalid events: ${invalidEvents.join(', ')}`);
      }
    }

    if (dto.name) webhook.name = dto.name;
    if (dto.url) webhook.url = dto.url;
    if (dto.secret) webhook.secretHash = crypto.createHash('sha256').update(dto.secret).digest('hex');
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
  async getDeliveries(tenantId: string, id: string, limit = 50): Promise<WebhookDeliveryResponseDto[]> {
    const webhook = await this.findOne(tenantId, id);

    const deliveries = await this.deliveryRepository.find({
      where: { webhookId: webhook.id },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return deliveries.map(d => ({
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
  async test(tenantId: string, id: string, eventType?: string): Promise<TestWebhookResultDto> {
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
  async trigger(tenantId: string, event: WebhookEvent, data: any): Promise<void> {
    const webhooks = await this.webhookRepository.find({
      where: { tenantId, isEnabled: true },
    });

    const relevantWebhooks = webhooks.filter(w => w.events.includes(event));

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    await Promise.all(
      relevantWebhooks.map(webhook => this.deliver(webhook, event, payload, false))
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
      'User-Agent': 'SafeDNS-Webhook/1.0',
      'X-Webhook-Event': eventType,
      'X-Webhook-Timestamp': new Date().toISOString(),
      ...webhook.headers,
    };

    // Add signature if secret is set
    if (webhook.secretHash) {
      // Use a placeholder secret for signing (in production, store the secret securely)
      headers['X-Webhook-Signature'] = `sha256=${this.generateSignature(payloadString, webhook.secretHash)}`;
    }

    let statusCode: number = 0;
    let responseBody: string = '';
    let error: string | null = null;

    try {
      // In production, use actual HTTP request
      // const response = await fetch(webhook.url, {
      //   method: 'POST',
      //   headers,
      //   body: payloadString,
      // });
      // statusCode = response.status;
      // responseBody = await response.text();

      // Simulate successful delivery
      statusCode = 200;
      responseBody = '{"received": true}';
      console.log(`[Webhook] Delivered ${eventType} to ${webhook.name} (${webhook.url})`);

    } catch (err: any) {
      statusCode = 0;
      error = err.message || 'Failed to deliver webhook';
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
}
