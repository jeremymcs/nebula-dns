/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * API Bootstrap Entry Point
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { validateEncryptionConfig } from './config/encryption.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate encryption configuration before starting the application
  // This will fail fast in production if encryption keys are missing
  try {
    validateEncryptionConfig();
  } catch (error) {
    logger.error('Failed to validate encryption configuration');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // Request body size limits (prevent DoS via large payloads)
  const bodyLimit = process.env.MAX_BODY_SIZE || '1mb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter for standardized error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS configuration - Using non-standard ports
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:4010', // API (for self-reference)
    'http://localhost:4011', // UI (Docker)
    'http://localhost:4012', // UI (Local dev)
    'http://localhost:3000', // Fallback for local dev
    'http://localhost:3001', // Fallback for local dev
  ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Nebula DNS API')
    .setDescription(
      `
## Overview
Nebula DNS is a multi-tenant, enterprise-grade DNS security and content filtering platform. This API provides programmatic access to all platform features including policy management, analytics, and user administration.

## Authentication
All endpoints (except /auth/login and /health) require a valid JWT token. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-token>
\`\`\`

Tokens expire after 15 minutes. Use the refresh token endpoint to obtain new access tokens without re-authenticating.

## Rate Limiting
API requests are rate limited per tenant:
- Standard endpoints: 1000 requests/minute
- Report endpoints: 100 requests/minute
- Authentication endpoints: 10 requests/minute

Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\`: Maximum requests allowed
- \`X-RateLimit-Remaining\`: Requests remaining in current window
- \`X-RateLimit-Reset\`: Unix timestamp when the limit resets

## Multi-Tenancy
All data is scoped to the authenticated user's tenant. Users can only access resources belonging to their tenant.

## Error Responses
All errors follow a consistent format:
\`\`\`json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [...]
}
\`\`\`

## Pagination
List endpoints support cursor-based pagination:
- \`limit\`: Number of items per page (default: 20, max: 100)
- \`cursor\`: Opaque cursor for the next page

Response includes pagination metadata:
\`\`\`json
{
  "data": [...],
  "pagination": {
    "cursor": "abc123",
    "hasMore": true,
    "total": 150
  }
}
\`\`\`
`,
    )
    .setVersion('1.0.0')
    .setContact(
      'Nebula DNS Support',
      'https://nebuladns.io/support',
      'support@nebuladns.io',
    )
    .setLicense('Proprietary', 'https://nebuladns.io/license')
    .addServer('http://localhost:4010', 'Development Server')
    .addServer('https://api.nebuladns.io', 'Production Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
      'bearer',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for programmatic access',
      },
      'apiKey',
    )
    .addTag('auth', 'Authentication and session management')
    .addTag('users', 'User management within your organization')
    .addTag('tenants', 'Tenant/organization settings')
    .addTag('policies', 'DNS filtering policy management')
    .addTag('locations', 'Network location configuration')
    .addTag('lists', 'Custom allow/block domain lists')
    .addTag('reports', 'Analytics and reporting')
    .addTag('scheduled-reports', 'Automated report scheduling')
    .addTag('webhooks', 'Webhook configuration for event notifications')
    .addTag('api-keys', 'API key management for integrations')
    .addTag('agents', 'Endpoint agent management')
    .addTag('block-pages', 'Custom block page templates')
    .addTag('playbooks', 'Security automation playbooks')
    .addTag('siem', 'SIEM integration configuration')
    .addTag('mfa', 'Multi-factor authentication')
    .addTag('sso', 'Single sign-on configuration')
    .addTag('audit-logs', 'Audit trail and activity logs')
    .addTag('health', 'System health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Export OpenAPI spec as JSON endpoint
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Nebula DNS API Documentation',
  });

  const port = process.env.PORT || 4010;
  await app.listen(port);

  logger.log(`🚀 Nebula DNS API running on port ${port}`);
  logger.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
