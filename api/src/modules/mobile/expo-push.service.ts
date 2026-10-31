import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface ExpoPushTicket {
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: Record<string, unknown>;
}

export interface ExpoPushClient {
  sendPushNotifications(
    messages: ExpoPushMessage[],
  ): Promise<ExpoPushTicket[]>;
}

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);
  private readonly accessToken?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly client?: ExpoPushClient,
  ) {
    this.accessToken = this.configService.get<string>('EXPO_ACCESS_TOKEN');
  }

  async send(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    if (messages.length === 0) {
      return [];
    }

    if (!this.accessToken && !this.client) {
      this.logger.debug('EXPO_ACCESS_TOKEN not set; skipping push delivery');
      return messages.map(() => ({
        status: 'error' as const,
        message: 'Expo not configured',
      }));
    }

    if (this.client) {
      return this.client.sendPushNotifications(messages);
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Expo push failed: ${response.status} ${text}`);
      return messages.map(() => ({
        status: 'error' as const,
        message: `HTTP ${response.status}`,
      }));
    }

    const payload = (await response.json()) as { data?: ExpoPushTicket[] };
    return payload.data ?? [];
  }
}
