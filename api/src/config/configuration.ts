/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Application Configuration with Validation
 */

import { plainToInstance } from 'class-transformer';
import {
  DEFAULT_EMAIL_FROM_ADDRESS,
  DEFAULT_EMAIL_FROM_NAME,
} from '../common/product-branding';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  IsEnum,
  Min,
  Max,
  validateSync,
  IsBoolean,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Test = 'test',
  Staging = 'staging',
  Production = 'production',
}

class EnvironmentVariables {
  // App
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 4010;

  @IsString()
  APP_NAME: string = 'nebula-dns';

  @IsString()
  @IsOptional()
  APP_VERSION?: string = '1.0.0';

  // Database
  @IsUrl({ require_tld: false })
  DATABASE_URL: string;

  // Redis
  @IsUrl({ require_tld: false })
  REDIS_URL: string;

  // JWT
  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRY: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRY: string = '7d';

  // Frontend
  @IsUrl({ require_tld: false })
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:4012';

  // Email (SendGrid)
  @IsString()
  @IsOptional()
  SENDGRID_API_KEY?: string;

  @IsString()
  @IsOptional()
  EMAIL_FROM_ADDRESS: string = DEFAULT_EMAIL_FROM_ADDRESS;

  @IsString()
  @IsOptional()
  EMAIL_FROM_NAME: string = DEFAULT_EMAIL_FROM_NAME;

  // Stripe
  @IsString()
  @IsOptional()
  STRIPE_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  STRIPE_WEBHOOK_SECRET?: string;

  @IsString()
  @IsOptional()
  STRIPE_PRICE_STARTER_MONTHLY?: string;

  @IsString()
  @IsOptional()
  STRIPE_PRICE_STARTER_YEARLY?: string;

  @IsString()
  @IsOptional()
  STRIPE_PRICE_PRO_MONTHLY?: string;

  @IsString()
  @IsOptional()
  STRIPE_PRICE_PRO_YEARLY?: string;

  @IsString()
  @IsOptional()
  STRIPE_PRICE_ENTERPRISE_MONTHLY?: string;

  @IsString()
  @IsOptional()
  STRIPE_PRICE_ENTERPRISE_YEARLY?: string;

  // Sentry
  @IsString()
  @IsOptional()
  SENTRY_DSN?: string;

  // ClickHouse
  @IsUrl({ require_tld: false })
  @IsOptional()
  CLICKHOUSE_URL?: string;

  // Rate Limiting
  @IsNumber()
  @IsOptional()
  @Min(1)
  RATE_LIMIT_WINDOW_MS: number = 60000;

  @IsNumber()
  @IsOptional()
  @Min(1)
  RATE_LIMIT_MAX_REQUESTS: number = 100;

  // Security
  @IsBoolean()
  @IsOptional()
  ENABLE_CORS: boolean = true;

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = '*';

  // Feature Flags
  @IsBoolean()
  @IsOptional()
  FEATURE_MFA_ENABLED: boolean = true;

  @IsBoolean()
  @IsOptional()
  FEATURE_SSO_ENABLED: boolean = true;

  @IsBoolean()
  @IsOptional()
  FEATURE_WEBHOOKS_ENABLED: boolean = true;

  // Admin RBAC Enforcement
  @IsBoolean()
  @IsOptional()
  ADMIN_RBAC_ENABLED: boolean = false;

  @IsBoolean()
  @IsOptional()
  ADMIN_RBAC_SHADOW_MODE: boolean = true;
}

export function validate(config: Record<string, unknown>) {
  // Transform string values to appropriate types
  const transformedConfig = {
    ...config,
    PORT: config.PORT ? parseInt(config.PORT as string, 10) : 4010,
    RATE_LIMIT_WINDOW_MS: config.RATE_LIMIT_WINDOW_MS
      ? parseInt(config.RATE_LIMIT_WINDOW_MS as string, 10)
      : 60000,
    RATE_LIMIT_MAX_REQUESTS: config.RATE_LIMIT_MAX_REQUESTS
      ? parseInt(config.RATE_LIMIT_MAX_REQUESTS as string, 10)
      : 100,
    ENABLE_CORS: config.ENABLE_CORS === 'true' || config.ENABLE_CORS === true,
    FEATURE_MFA_ENABLED:
      config.FEATURE_MFA_ENABLED === 'true' ||
      config.FEATURE_MFA_ENABLED === true,
    FEATURE_SSO_ENABLED:
      config.FEATURE_SSO_ENABLED === 'true' ||
      config.FEATURE_SSO_ENABLED === true,
    FEATURE_WEBHOOKS_ENABLED:
      config.FEATURE_WEBHOOKS_ENABLED === 'true' ||
      config.FEATURE_WEBHOOKS_ENABLED === true,
    // Admin RBAC flags - ADMIN_RBAC_ENABLED requires explicit 'true', ADMIN_RBAC_SHADOW_MODE defaults true
    ADMIN_RBAC_ENABLED: config.ADMIN_RBAC_ENABLED === 'true',
    ADMIN_RBAC_SHADOW_MODE: config.ADMIN_RBAC_SHADOW_MODE !== 'false',
  };

  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    transformedConfig,
    {
      enableImplicitConversion: true,
    },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map((error) => {
      const constraints = error.constraints
        ? Object.values(error.constraints)
        : [];
      return `${error.property}: ${constraints.join(', ')}`;
    });

    throw new Error(
      `Environment validation failed:\n${errorMessages.join('\n')}`,
    );
  }

  return validatedConfig;
}

export default () => ({
  app: {
    name: process.env.APP_NAME || 'nebula-dns',
    version: process.env.APP_VERSION || '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '4010', 10),
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:4012',
  },
  email: {
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    fromAddress: process.env.EMAIL_FROM_ADDRESS || DEFAULT_EMAIL_FROM_ADDRESS,
    fromName: process.env.EMAIL_FROM_NAME || DEFAULT_EMAIL_FROM_NAME,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    prices: {
      starterMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
      starterYearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
      proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
      proYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
      enterpriseMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
      enterpriseYearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
    },
  },
  sentry: {
    dsn: process.env.SENTRY_DSN,
  },
  clickhouse: {
    url: process.env.CLICKHOUSE_URL,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  security: {
    cors: {
      enabled: process.env.ENABLE_CORS !== 'false',
      origins: (process.env.CORS_ORIGINS || '*').split(','),
    },
  },
  features: {
    mfa: process.env.FEATURE_MFA_ENABLED !== 'false',
    sso: process.env.FEATURE_SSO_ENABLED !== 'false',
    webhooks: process.env.FEATURE_WEBHOOKS_ENABLED !== 'false',
  },
  admin: {
    rbacEnabled: process.env.ADMIN_RBAC_ENABLED === 'true',
    rbacShadowMode: process.env.ADMIN_RBAC_SHADOW_MODE !== 'false',
  },
});
