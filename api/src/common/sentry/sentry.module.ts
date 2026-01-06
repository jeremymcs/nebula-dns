/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Sentry Error Tracking Module
 */

import {
  Global,
  Module,
  DynamicModule,
  Provider,
  Logger,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

export interface SentryModuleOptions {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
}

@Global()
@Module({})
export class SentryModule {
  private static readonly logger = new Logger('SentryModule');

  static forRootAsync(): DynamicModule {
    const sentryProvider: Provider = {
      provide: 'SENTRY',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dsn = configService.get<string>('SENTRY_DSN');
        const environment = configService.get<string>(
          'NODE_ENV',
          'development',
        );
        const release = configService.get<string>('APP_VERSION', '1.0.0');

        if (!dsn) {
          this.logger.warn(
            'Sentry DSN not configured - error tracking disabled',
          );
          return null;
        }

        Sentry.init({
          dsn,
          environment,
          release,
          tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
          profilesSampleRate: environment === 'production' ? 0.1 : 0,
          integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],
          beforeSend(event, hint) {
            // Filter out noise
            const error = hint.originalException as Error;
            if (error?.message?.includes('ECONNREFUSED')) {
              return null;
            }
            return event;
          },
        });

        this.logger.log(`Sentry initialized for ${environment}`);
        return Sentry;
      },
    };

    return {
      module: SentryModule,
      imports: [ConfigModule],
      providers: [sentryProvider, SentryService],
      exports: [sentryProvider, SentryService],
    };
  }
}

import {
  Injectable,
  Inject,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class SentryService {
  private readonly logger = new Logger(SentryService.name);

  constructor(
    @Inject('SENTRY') private readonly sentry: typeof Sentry | null,
  ) {}

  captureException(error: Error, context?: Record<string, any>): void {
    if (!this.sentry) {
      this.logger.error('Error (Sentry disabled):', error.message);
      return;
    }

    Sentry.withScope((scope) => {
      if (context) {
        scope.setExtras(context);
      }
      Sentry.captureException(error);
    });
  }

  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
  ): void {
    if (!this.sentry) {
      this.logger.log(`Message (Sentry disabled): ${message}`);
      return;
    }

    Sentry.captureMessage(message, level);
  }

  setUser(user: { id: string; email?: string; tenantId?: string }): void {
    if (!this.sentry) return;

    Sentry.setUser({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
    } as any);
  }

  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    data?: Record<string, any>;
  }): void {
    if (!this.sentry) return;

    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.category || 'app',
      data: breadcrumb.data,
      level: 'info',
    });
  }
}

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  constructor(private readonly sentryService: SentryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;

    // Add breadcrumb for this request
    this.sentryService.addBreadcrumb({
      message: `${method} ${url}`,
      category: 'http',
      data: { userId: user?.id },
    });

    // Set user context if available
    if (user) {
      this.sentryService.setUser({
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
      });
    }

    return next.handle().pipe(
      catchError((error) => {
        // Don't report 4xx errors
        const status = error.status || error.getStatus?.() || 500;
        if (status >= 500) {
          this.sentryService.captureException(error, {
            url,
            method,
            userId: user?.id,
            tenantId: user?.tenantId,
          });
        }
        return throwError(() => error);
      }),
    );
  }
}
